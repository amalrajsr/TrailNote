import { getDatabase } from "../../../src/db";
import { searchDestinations } from "../../../src/server/queries/destinations";
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.length > 80)
    return Response.json({ error: "Search is too long." }, { status: 400 });
  try {
    const { db } = await getDatabase();
    return Response.json(
      { destinations: await searchDestinations(db, q) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Couldn't load destinations. Try again." },
      { status: 503 },
    );
  }
}
