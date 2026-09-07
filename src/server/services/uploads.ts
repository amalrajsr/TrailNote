import "server-only";
import { createHash } from "node:crypto";
import ImageKit, { NotFoundError, toFile } from "@imagekit/nodejs";
import { and, asc, eq, inArray, lt, lte, sql } from "drizzle-orm";
import sharp from "sharp";
import type { Database } from "../../db/client";
import * as s from "../../db/schema";
import { getImageKitEnvironment } from "../env";
import { DomainError } from "../result";

const PRESETS = [
  "w-1600,h-1600,c-at_max,f-webp,q-82,md-false",
  "w-1440,h-1440,c-at_max,f-webp,q-74,md-false",
  "w-1280,h-1280,c-at_max,f-webp,q-66,md-false",
] as const;

export type RemoteFile = { fileId: string; filePath: string; size: number; width: number; height: number; mime?: string; embeddedMetadata?: Record<string, unknown> };
export interface UploadProvider {
  upload(input: { bytes: Uint8Array; assetId: string; attempt: number; pre: string }): Promise<{ fileId: string }>;
  get(fileId: string): Promise<RemoteFile>;
  delete(fileId: string): Promise<void>;
  purge(path: string): Promise<void>;
}

export function imageKitProvider(): UploadProvider {
  const config = getImageKitEnvironment();
  const client = new ImageKit({ privateKey: config.privateKey, maxRetries: 2, timeout: 12_000 });
  return {
    async upload({ bytes, assetId, attempt, pre }) {
      const result = await client.files.upload({
        file: await toFile(bytes, "photo.jpg"),
        fileName: `attempt-${attempt}.webp`,
        folder: `/fieldnotes/${process.env.APP_ENV ?? "development"}/uploads/${assetId}`,
        useUniqueFileName: false,
        overwriteFile: false,
        checks: '"file.type" = "image" AND "file.size" < "3.2MB"',
        transformation: { pre },
        responseFields: ["embeddedMetadata"],
      });
      if (!result.fileId) throw new Error("IMAGEKIT_MISSING_FILE_ID");
      return { fileId: result.fileId };
    },
    async get(fileId) {
      const file = await client.files.get(fileId);
      if (!file.fileId || !file.filePath || !file.size || !file.width || !file.height) throw new Error("IMAGEKIT_INCOMPLETE_METADATA");
      return { fileId: file.fileId, filePath: file.filePath, size: file.size, width: file.width, height: file.height, mime: file.mime, embeddedMetadata: file.embeddedMetadata };
    },
    async delete(fileId) {
      try { await client.files.delete(fileId); } catch (error) { if (!(error instanceof NotFoundError)) throw error; }
    },
    async purge(path) {
      await client.cache.invalidation.create({ url: `${config.urlEndpoint.replace(/\/$/, "")}/${path.replace(/^\//, "")}` });
    },
  };
}

export async function validateUploadSource(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > 3_200_000) throw new DomainError("VALIDATION", "Prepare this photo again; the upload must be 3 MB or smaller.");
  let metadata: sharp.Metadata;
  try { metadata = await sharp(bytes, { animated: true, limitInputPixels: 40_000_001 }).metadata(); }
  catch { throw new DomainError("VALIDATION", "This photo could not be decoded. Choose a JPEG, PNG, or WebP still image."); }
  if (!metadata.width || !metadata.height) throw new DomainError("VALIDATION", "This photo has invalid dimensions.");
  if (metadata.width * metadata.height > 40_000_000 || metadata.width > 12_000 || metadata.height > 12_000) throw new DomainError("VALIDATION", "This photo is too large. Use an image under 40 megapixels.");
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) throw new DomainError("VALIDATION", "Use a JPEG, PNG, or WebP still image.");
  if ((metadata.pages ?? 1) !== 1) throw new DomainError("VALIDATION", "Animated images are not supported.");
  return metadata;
}

const sourceDigest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
async function enqueueDelete(db: Database, assetId: string, reason: string, now: number) {
  await db.insert(s.mediaCleanupJobs).values({ assetId, operation: "delete", reason, nextAttemptAt: now, createdAt: now, updatedAt: now });
}

export async function uploadPhoto(db: Database, provider: UploadProvider, userId: string, uploadRequestId: string, slot: number, bytes: Uint8Array, now = Date.now()) {
  await validateUploadSource(bytes);
  if (!/^[0-9a-f-]{36}$/i.test(uploadRequestId) || !Number.isInteger(slot) || slot < 0 || slot > 2) throw new DomainError("VALIDATION", "The photo request is invalid.");
  const digest = sourceDigest(bytes);
  const existing = await db.select().from(s.uploadAssets).where(and(eq(s.uploadAssets.ownerId, userId), eq(s.uploadAssets.uploadRequestId, uploadRequestId), eq(s.uploadAssets.slot, slot))).orderBy(asc(s.uploadAssets.attempt));
  if (existing.some((row) => row.sourceDigest !== digest)) throw new DomainError("CONFLICT", "This photo slot changed. Remove it and add the new photo again.");
  const completed = existing.find((row) => row.status === "ready" && row.expiresAt > now);
  if (completed) return completed;
  if (existing.some((row) => row.status === "processing")) throw new DomainError("CONFLICT", "This photo is still being verified. Wait a moment and retry.");
  const processing = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(s.uploadAssets).where(and(eq(s.uploadAssets.ownerId, userId), eq(s.uploadAssets.status, "processing")));
  if ((processing[0]?.count ?? 0) >= 2) throw new DomainError("RATE_LIMITED", "Two photos are already processing. Wait for one to finish.");
  for (let attempt = existing.length + 1; attempt <= 3; attempt += 1) {
    const assetId = crypto.randomUUID();
    await db.insert(s.uploadAssets).values({ id: assetId, ownerId: userId, uploadRequestId, slot, attempt, status: "processing", sourceDigest: digest, expiresAt: now + 86_400_000, createdAt: now, updatedAt: now });
    try {
      const uploaded = await provider.upload({ bytes, assetId, attempt, pre: PRESETS[attempt - 1] });
      const remote = await provider.get(uploaded.fileId);
      const acceptable = remote.fileId === uploaded.fileId && remote.filePath.includes(`/${assetId}/attempt-${attempt}.webp`) && remote.size > 0 && remote.size <= 400_000 && remote.width > 0 && remote.height > 0 && remote.mime === "image/webp" && (!remote.embeddedMetadata || Object.keys(remote.embeddedMetadata).length === 0);
      if (acceptable) {
        const [ready] = await db.update(s.uploadAssets).set({ imagekitFileId: remote.fileId, imagekitPath: remote.filePath, status: "ready", byteSize: remote.size, width: remote.width, height: remote.height, format: "webp", updatedAt: Date.now() }).where(eq(s.uploadAssets.id, assetId)).returning();
        return ready;
      }
      await db.update(s.uploadAssets).set({ imagekitFileId: remote.fileId, imagekitPath: remote.filePath, status: "rejected", errorCode: remote.size > 400_000 ? "TOO_LARGE" : "VERIFY_FAILED", updatedAt: Date.now() }).where(eq(s.uploadAssets.id, assetId));
      await enqueueDelete(db, assetId, "upload_rejected", Date.now());
    } catch (error) {
      await db.update(s.uploadAssets).set({ status: "rejected", errorCode: "PROVIDER_ERROR", updatedAt: Date.now() }).where(eq(s.uploadAssets.id, assetId));
      await enqueueDelete(db, assetId, "upload_failed", Date.now());
      if (attempt === 3) throw error;
    }
  }
  throw new DomainError("UPLOAD_FAILED", "The photo could not meet the size limit without losing detail. Remove it or try another photo.");
}

export async function cancelUpload(db: Database, userId: string, assetId: string, now = Date.now()) {
  const asset = (await db.select().from(s.uploadAssets).where(and(eq(s.uploadAssets.id, assetId), eq(s.uploadAssets.ownerId, userId))))[0];
  if (!asset) throw new DomainError("NOT_FOUND", "This photo is unavailable.");
  if (asset.status === "attached") throw new DomainError("CONFLICT", "An attached photo cannot be removed here.");
  if (!["deleted", "deleting"].includes(asset.status)) {
    await db.update(s.uploadAssets).set({ status: "deleting", updatedAt: now }).where(eq(s.uploadAssets.id, assetId));
    await enqueueDelete(db, assetId, "upload_cancelled", now);
  }
}

export async function runCleanup(db: Database, provider: UploadProvider, now = Date.now(), limit = 20) {
  const expired = await db.select({ id: s.uploadAssets.id }).from(s.uploadAssets).where(and(inArray(s.uploadAssets.status, ["ready", "reserved"]), lt(s.uploadAssets.expiresAt, now))).limit(limit);
  for (const asset of expired) {
    await enqueueDelete(db, asset.id, "upload_expired", now);
    await db.update(s.uploadAssets).set({ status: "deleting", updatedAt: now }).where(eq(s.uploadAssets.id, asset.id));
  }
  const jobs = await db.select({ job: s.mediaCleanupJobs, asset: s.uploadAssets }).from(s.mediaCleanupJobs).innerJoin(s.uploadAssets, eq(s.uploadAssets.id, s.mediaCleanupJobs.assetId)).where(and(inArray(s.mediaCleanupJobs.status, ["pending", "failed"]), lte(s.mediaCleanupJobs.nextAttemptAt, now))).limit(limit);
  let completed = 0;
  for (const { job, asset } of jobs) {
    const leased = await db.update(s.mediaCleanupJobs).set({ status: "running", leaseUntil: now + 60_000, updatedAt: now }).where(and(eq(s.mediaCleanupJobs.id, job.id), inArray(s.mediaCleanupJobs.status, ["pending", "failed"]))).returning({ id: s.mediaCleanupJobs.id });
    if (!leased.length) continue;
    try {
      if (asset.imagekitFileId) await provider.delete(asset.imagekitFileId);
      if (asset.imagekitPath) await provider.purge(asset.imagekitPath);
      await db.update(s.uploadAssets).set({ status: "deleted", updatedAt: Date.now() }).where(eq(s.uploadAssets.id, asset.id));
      await db.update(s.mediaCleanupJobs).set({ status: "done", leaseUntil: null, updatedAt: Date.now() }).where(eq(s.mediaCleanupJobs.id, job.id));
      completed += 1;
    } catch {
      const attempts = job.attempts + 1;
      await db.update(s.mediaCleanupJobs).set({ status: "failed", attempts, leaseUntil: null, lastErrorCode: "PROVIDER_ERROR", nextAttemptAt: now + Math.min(86_400_000, 60_000 * 2 ** attempts), updatedAt: Date.now() }).where(eq(s.mediaCleanupJobs.id, job.id));
    }
  }
  return { examined: jobs.length, completed };
}
