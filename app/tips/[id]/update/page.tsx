import Link from "next/link";
import { notFound } from "next/navigation";
import { ContributionComposer } from "../../../../src/components/contributions/composer";
import { getDatabase } from "../../../../src/db";
import { formatMoney, priceSuffix } from "../../../../src/lib/money";
import { viewer } from "../../../../src/server/auth";
import { contributionDetail } from "../../../../src/server/queries/contributions";
import { DomainError } from "../../../../src/server/result";

export const metadata = {
  title: "Share changed information",
  robots: { index: false },
};

async function loadRequested(id: string) {
  try {
    const { db } = await getDatabase();
    return await contributionDetail(db, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

export default async function UpdateContributionPage({
  params,
}: PageProps<"/tips/[id]/update">) {
  const { id } = await params;
  const { db } = await getDatabase();
  const [requested, user] = await Promise.all([loadRequested(id), viewer()]);
  const detail = requested.parent
    ? await contributionDetail(db, requested.parent.id)
    : requested;
  const priceLabel = detail.price
    ? `${formatMoney(detail.price.paise, detail.price.unit)} ${priceSuffix(detail.price.unit, detail.price.unitLabel)}`.trim()
    : null;

  return (
    <main id="main" className="container">
      <div className="composer-wrap">
        <Link className="back" href={`/tips/${detail.id}`}>
          ← Back to the original tip
        </Link>
        <h1 className="page-title">What has changed?</h1>
        <p className="muted">
          Share what you observed. The original traveler&apos;s report stays
          intact.
        </p>
        <ContributionComposer
          destination={detail.destination}
          initialCategory={detail.category}
          initialMutationId={crypto.randomUUID()}
          signedIn={!!user}
          mode="update"
          original={{
            id: detail.id,
            revision: detail.revision,
            title: detail.title,
            body: detail.body,
            priceLabel,
          }}
        />
      </div>
    </main>
  );
}
