import { getDatabase } from "../../../src/db";
import { consumeRateLimit } from "../../../src/server/rate-limit";
import { DomainError } from "../../../src/server/result";
import {
  anonymousKey,
  assertSameOrigin,
  privateHeaders,
} from "../../../src/server/security";
import { submitContactRemoval } from "../../../src/server/services/reports";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { db } = await getDatabase();
    await consumeRateLimit(
      db,
      anonymousKey(request),
      "contact_removal",
      5,
      86_400_000,
    );
    const requestBody = await request.json();
    await submitContactRemoval(db, requestBody);
    return Response.json({ ok: true }, { headers: privateHeaders() });
  } catch (error) {
    const domain = error instanceof DomainError ? error : null;
    return Response.json(
      {
        code: domain?.code ?? "VALIDATION",
        message: domain?.message ?? "Please check the request and try again.",
      },
      {
        status:
          domain?.code === "NOT_FOUND"
            ? 404
            : domain?.code === "RATE_LIMITED"
              ? 429
              : 422,
        headers: privateHeaders(),
      },
    );
  }
}
