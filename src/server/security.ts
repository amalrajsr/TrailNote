import "server-only";
import { createHash } from "node:crypto";
import { env } from "./env";
import { DomainError } from "./result";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = new URL(
    env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL ?? request.url,
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

export function anonymousKey(
  request: Pick<Request, "headers">,
  now = Date.now(),
) {
  const production = process.env.APP_ENV === "production";
  const address =
    (production
      ? request.headers.get("x-vercel-forwarded-for")
      : (request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip"))
    )
      ?.split(",")[0]
      ?.trim() ?? "unknown";
  return createHash("sha256")
    .update(
      `${env.RATE_LIMIT_SECRET ?? "development-only"}:${Math.floor(now / 86_400_000)}:${address}`,
    )
    .digest("hex");
}

const sensitiveField =
  /body|contact|draft|email|file|image|ip|phone|secret|token/i;

export function safeLog(
  event: string,
  fields: Record<string, string | number | boolean | null | undefined> = {},
) {
  console.info(
    JSON.stringify({
      event,
      at: Date.now(),
      ...Object.fromEntries(
        Object.entries(fields).filter(([key]) => !sensitiveField.test(key)),
      ),
    }),
  );
}
