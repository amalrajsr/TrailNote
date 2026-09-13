import { getDatabase } from "../../../src/db";
import {
  categoryCountsForDestinations,
  destinationPage,
  InvalidDestinationCursorError,
  searchDestinations,
} from "../../../src/server/queries/destinations";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q");
  if (q && q.length > 80)
    return Response.json({ error: "Search is too long." }, { status: 400 });
  try {
    const { db } = await getDatabase();
    if (q !== null)
      return Response.json(
        { destinations: await searchDestinations(db, q) },
        { headers: { "Cache-Control": "no-store" } },
      );

    const cursor = params.get("cursor");
    if (cursor && cursor.length > 500)
      return Response.json({ error: "Invalid cursor." }, { status: 400 });
    const requestedLimit = params.get("limit");
    const limit = requestedLimit ? Number(requestedLimit) : undefined;
    if (
      limit !== undefined &&
      (!Number.isInteger(limit) || limit < 1 || limit > 24)
    )
      return Response.json({ error: "Invalid page size." }, { status: 400 });
    const page = await destinationPage(db, { after: cursor, limit });
    const categoryCounts = await categoryCountsForDestinations(
      db,
      page.destinations.map((destination) => destination.id),
    );
    return Response.json(
      { ...page, categoryCounts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof InvalidDestinationCursorError)
      return Response.json({ error: "Invalid cursor." }, { status: 400 });
    return Response.json(
      { error: "Couldn't load destinations. Try again." },
      { status: 503 },
    );
  }
}
