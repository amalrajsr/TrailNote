import { getDatabase } from "../../../../../src/db";
import { categories, type Category } from "../../../../../src/lib/constants";
import { destinationBySlug } from "../../../../../src/server/queries/destinations";
import { listContributions } from "../../../../../src/server/queries/contributions";
import { DomainError } from "../../../../../src/server/result";

export async function GET(
  request: Request,
  context: RouteContext<"/api/destinations/[slug]/tips">,
) {
  try {
    const { slug } = await context.params;
    const query = new URL(request.url).searchParams;
    const rawCategory = query.get("category");
    if (rawCategory && !categories.includes(rawCategory as Category))
      return Response.json({ error: "Invalid category." }, { status: 400 });
    const category = rawCategory as Category | null;
    const rawSort = query.get("sort") ?? "recent";
    if (rawSort !== "recent" && rawSort !== "newest")
      return Response.json({ error: "Invalid sort order." }, { status: 400 });
    const cursor = query.get("cursor") ?? undefined;
    if (!cursor)
      return Response.json({ error: "A cursor is required." }, { status: 400 });

    const { db } = await getDatabase();
    const destination = await destinationBySlug(db, slug);
    if (!destination)
      return Response.json(
        { error: "Destination not found." },
        { status: 404 },
      );

    return Response.json(
      await listContributions(db, {
        destinationId: destination.id,
        category: category ?? undefined,
        sort: rawSort,
        cursor,
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DomainError && error.code === "VALIDATION")
      return Response.json({ error: error.message }, { status: 400 });
    return Response.json(
      { error: "Couldn’t load more tips. Try again." },
      { status: 503 },
    );
  }
}
