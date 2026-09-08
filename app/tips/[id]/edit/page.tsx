import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ContributionComposer } from "../../../../src/components/contributions/composer";
import { getDatabase } from "../../../../src/db";
import * as s from "../../../../src/db/schema";
import { viewer } from "../../../../src/server/auth";
import { ownedContribution } from "../../../../src/server/queries/account";

export const metadata = { title: "Edit your tip", robots: { index: false } };

export default async function EditTipPage({
  params,
}: PageProps<"/tips/[id]/edit">) {
  const { id } = await params;
  const user = await viewer();
  if (!user)
    redirect(`/sign-in?returnTo=${encodeURIComponent(`/tips/${id}/edit`)}`);
  const { db } = await getDatabase();
  const tip = await ownedContribution(db, user.id, id);
  if (!tip || tip.status === "deleted") notFound();
  const [[destination], [contact], photos] = await Promise.all([
    db
      .select()
      .from(s.destinations)
      .where(eq(s.destinations.id, tip.destinationId)),
    db
      .select({ phone: s.contacts.phoneE164 })
      .from(s.contacts)
      .where(eq(s.contacts.contributionId, tip.id)),
    db
      .select({
        id: s.uploadAssets.id,
        path: s.uploadAssets.imagekitPath,
        width: s.uploadAssets.width,
        height: s.uploadAssets.height,
        bytes: s.uploadAssets.byteSize,
        alt: s.contributionPhotos.altText,
      })
      .from(s.contributionPhotos)
      .innerJoin(
        s.uploadAssets,
        eq(s.uploadAssets.id, s.contributionPhotos.assetId),
      )
      .where(
        and(
          eq(s.contributionPhotos.contributionId, tip.id),
          eq(s.contributionPhotos.revision, tip.revision),
        ),
      )
      .orderBy(s.contributionPhotos.position),
  ]);
  if (!destination) notFound();
  return (
    <main id="main" className="container">
      <div className="composer-wrap">
        <Link className="back" href={`/tips/${tip.id}`}>
          ← Back to tip
        </Link>
        <h1 className="page-title">Edit your tip</h1>
        <p className="muted">
          New edits start a new version. Earlier confirmations stay with the
          previous version.
        </p>
        <ContributionComposer
          destination={destination}
          initialCategory={tip.category}
          initialMutationId={crypto.randomUUID()}
          signedIn
          mode="edit"
          edit={{
            id: tip.id,
            revision: tip.revision,
            parentContributionId: tip.parentContributionId,
            parentRevision: tip.parentRevision,
          }}
          initialDraft={{
            category: tip.category,
            body: tip.body,
            visitedChoice: tip.visitedMonth ?? "",
            visitedMonth: tip.visitedMonth ?? "",
            price: tip.pricePaise === null ? "" : String(tip.pricePaise / 100),
            priceUnit: tip.priceUnit ?? "",
            priceUnitLabel: tip.priceUnitLabel ?? "",
            placeName: tip.placeName ?? "",
            roomType: tip.roomType ?? "",
            bookingMethod: tip.bookingMethod ?? "",
            dish: tip.dish ?? "",
            fromName: tip.fromName ?? "",
            toName: tip.toName ?? "",
            transportMode: tip.transportMode ?? "",
            durationMinutes: tip.durationMinutes?.toString() ?? "",
            walkMinutes: tip.walkMinutes?.toString() ?? "",
            locationText: tip.locationText ?? "",
            mapsUrl: tip.mapsUrl ?? "",
            phone: contact?.phone ?? "",
            publicServiceContact: !!contact,
            photos: photos.flatMap((photo) =>
              photo.path && photo.width && photo.height && photo.bytes
                ? [
                    {
                      id: photo.id,
                      path: photo.path,
                      width: photo.width,
                      height: photo.height,
                      bytes: photo.bytes,
                      alt: photo.alt,
                    },
                  ]
                : [],
            ),
          }}
        />
      </div>
    </main>
  );
}
