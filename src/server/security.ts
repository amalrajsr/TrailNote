import "server-only";
import { createHash } from "node:crypto";
import { env } from "./env";
import { DomainError } from "./result";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = new URL(
    env.NEXT_PUBLIC_APP_URL ?? env.BETTER_AUTH_URL ?? request.url,
  ).origin;
  if (origin !== expected)
    throw new DomainError("FORBIDDEN", "This request origin is not allowed.");
}

export function privateHeaders(extra?: HeadersInit) {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    ...Object.fromEntries(new Headers(extra)),
  };
}

export function anonymousKey(request: Pick<Request, "headers">) {
  const address =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return createHash("sha256")
    .update(`${env.RATE_LIMIT_SECRET ?? "development-only"}:${address}`)
    .digest("hex");
}

export function safeLog(
  event: string,
  fields: Record<string, string | number | boolean | null | undefined> = {},
) {
  console.info(JSON.stringify({ event, at: Date.now(), ...fields }));
}
