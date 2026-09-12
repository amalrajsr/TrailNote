import { getDatabase } from "../../../src/db";
import { env } from "../../../src/server/env";
import { requireViewer } from "../../../src/server/auth";
import { consumeRateLimit } from "../../../src/server/rate-limit";
import { DomainError } from "../../../src/server/result";
import { assertSameOrigin, privateHeaders } from "../../../src/server/security";
import {
  saveGeoapifyDestination,
  searchGeoapifyDestinations,
} from "../../../src/server/services/destination-search";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireViewer();
    const body = (await request.json()) as Record<string, unknown>;
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const providerPlaceId =
      typeof body.providerPlaceId === "string"
        ? body.providerPlaceId.trim()
        : "";
    if (
      query.length < 2 ||
      query.length > 80 ||
      !providerPlaceId ||
      providerPlaceId.length > 500
    )
      throw new DomainError("VALIDATION", "That destination is invalid.");
    if (!env.GEOAPIFY_API_KEY)
      throw new DomainError(
        "INTERNAL",
        "Destination saving is not configured.",
      );

    const { db } = await getDatabase();
    await consumeRateLimit(db, user.id, "destination_create", 10, 86_400_000);
    const verified = (
      await searchGeoapifyDestinations(query, env.GEOAPIFY_API_KEY)
    ).find((result) => result.providerPlaceId === providerPlaceId);
    if (!verified)
      throw new DomainError(
        "NOT_FOUND",
        "That destination is no longer available.",
      );

    const destination = await saveGeoapifyDestination(db, verified);
    return Response.json(
      { destination },
      {
        status: destination.created ? 201 : 200,
        headers: privateHeaders(),
      },
    );
  } catch (error) {
    const domain = error instanceof DomainError ? error : null;
    return Response.json(
      {
        error:
          domain?.message ??
          "Couldn't save that destination. Please try again.",
      },
      {
        status:
          domain?.code === "UNAUTHENTICATED"
            ? 401
            : domain?.code === "FORBIDDEN"
              ? 403
              : domain?.code === "NOT_FOUND"
                ? 404
                : domain?.code === "RATE_LIMITED"
                  ? 429
                  : domain?.code === "INTERNAL"
                    ? 503
                    : 400,
        headers: privateHeaders(),
      },
    );
  }
}
