import Link from "next/link";
import { notFound } from "next/navigation";
import { getDatabase } from "../../../../src/db";
import { categories, type Category } from "../../../../src/lib/constants";
import { destinationBySlug } from "../../../../src/server/queries/destinations";
import { ContributionComposer } from "../../../../src/components/contributions/composer";
import { viewer } from "../../../../src/server/auth";

export const metadata = {
  title: "Share a travel tip",
  robots: { index: false },
};

export default async function AddContributionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { db } = await getDatabase();
  const [destination, user] = await Promise.all([
    destinationBySlug(db, slug),
    viewer(),
  ]);
  if (!destination) notFound();

  const initialCategory = categories.includes(query.category as Category)
    ? (query.category as Category)
    : "general";
  const initialMutationId = crypto.randomUUID();

  return (
    <main id="main" className="container">
      <div className="composer-wrap">
        <Link className="back" href={`/destinations/${slug}`}>
          ← Back to {destination.name}
        </Link>
        <h1 className="page-title">Help the next traveler.</h1>
        <p className="muted">One useful detail is enough.</p>
        <ContributionComposer
          key={initialMutationId}
          destination={destination}
          initialCategory={initialCategory}
          initialMutationId={initialMutationId}
          signedIn={!!user}
        />
      </div>
    </main>
  );
}
