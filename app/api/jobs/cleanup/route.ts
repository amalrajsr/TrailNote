import { timingSafeEqual } from "node:crypto";
import { getDatabase } from "../../../../src/db";
import { env } from "../../../../src/server/env";
import { privateHeaders, safeLog } from "../../../../src/server/security";
import {
  imageKitProvider,
  runCleanup,
} from "../../../../src/server/services/uploads";

export const runtime = "nodejs";
export const maxDuration = 45;

function authorized(request: Request) {
  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = env.CRON_SECRET ?? "";
  return (
    !!supplied &&
    !!expected &&
    supplied.length === expected.length &&
    timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  );
}

export async function POST(request: Request) {
  if (!authorized(request))
    return Response.json(
      { message: "Unauthorized" },
      { status: 401, headers: privateHeaders() },
    );
  const started = Date.now();
  const { db } = await getDatabase();
  const result = await runCleanup(db, imageKitProvider());
  safeLog("media_cleanup", { ...result, durationMs: Date.now() - started });
  return Response.json(result, { headers: privateHeaders() });
}
