import { getDatabase } from "../../../src/db";
import { requireViewer } from "../../../src/server/auth";
import { consumeRateLimit } from "../../../src/server/rate-limit";
import { DomainError } from "../../../src/server/result";
import {
  assertSameOrigin,
  privateHeaders,
  safeLog,
} from "../../../src/server/security";
import {
  imageKitProvider,
  uploadPhoto,
} from "../../../src/server/services/uploads";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request) {
  const started = Date.now();
  try {
    assertSameOrigin(request);
    if (Number(request.headers.get("content-length") ?? 0) > 3_350_000)
      return Response.json(
        { code: "VALIDATION", message: "The prepared photo is too large." },
        { status: 413, headers: privateHeaders() },
      );
    const user = await requireViewer();
    const { db } = await getDatabase();
    await consumeRateLimit(db, user.id, "upload", 30, 3_600_000);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      throw new DomainError("VALIDATION", "Choose a photo to upload.");
    const asset = await uploadPhoto(
      db,
      imageKitProvider(),
      user.id,
      String(form.get("uploadRequestId") ?? ""),
      Number(form.get("slot")),
      new Uint8Array(await file.arrayBuffer()),
    );
    safeLog("photo_upload", {
      operationId: asset.id,
      durationMs: Date.now() - started,
      bytes: asset.byteSize,
    });
    return Response.json(
      {
        id: asset.id,
        path: asset.imagekitPath,
        width: asset.width,
        height: asset.height,
        bytes: asset.byteSize,
      },
      { headers: privateHeaders() },
    );
  } catch (error) {
    const domain = error instanceof DomainError ? error : null;
    safeLog("photo_upload_failed", {
      durationMs: Date.now() - started,
      code: domain?.code ?? "INTERNAL",
    });
    return Response.json(
      {
        code: domain?.code ?? "UPLOAD_FAILED",
        message:
          domain?.message ??
          "The photo could not be uploaded. Your tip text is retained; retry the photo.",
      },
      {
        status:
          domain?.code === "UNAUTHENTICATED"
            ? 401
            : domain?.code === "FORBIDDEN"
              ? 403
              : domain?.code === "CONFLICT"
                ? 409
                : domain?.code === "RATE_LIMITED"
                  ? 429
                  : 422,
        headers: privateHeaders(),
      },
    );
  }
}
