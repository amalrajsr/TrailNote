import { getDatabase } from "../../../../../src/db";
import { consumeRateLimit } from "../../../../../src/server/rate-limit";
import { DomainError } from "../../../../../src/server/result";
import {
  anonymousKey,
  assertSameOrigin,
  privateHeaders,
} from "../../../../../src/server/security";
import { revealContact } from "../../../../../src/server/services/contacts";

export async function POST(
  request: Request,
  context: RouteContext<"/api/contacts/[contributionId]/reveal">,
) {
  try {
    assertSameOrigin(request);
    const { contributionId } = await context.params;
    const { db } = await getDatabase();
    await consumeRateLimit(
      db,
      anonymousKey(request),
      "contact_reveal",
      30,
      3_600_000,
    );
    const contact = await revealContact(db, contributionId);
    return Response.json(contact, { headers: privateHeaders() });
  } catch (error) {
    const domain = error instanceof DomainError ? error : null;
    return Response.json(
      {
        code: domain?.code ?? "INTERNAL",
        message: domain?.message ?? "Couldn't reveal this contact. Try again.",
      },
      {
        status:
          domain?.code === "NOT_FOUND"
            ? 404
            : domain?.code === "FORBIDDEN"
              ? 403
              : domain?.code === "RATE_LIMITED"
                ? 429
                : 422,
        headers: privateHeaders(),
      },
    );
  }
}
