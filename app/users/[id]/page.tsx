import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TipCard } from "../../../src/components/contributions/card";
import { ProfileAvatar } from "../../../src/components/profiles/avatar";
import { getDatabase } from "../../../src/db";
import { DomainError } from "../../../src/server/result";
import { publicProfile } from "../../../src/server/queries/profiles";

export const metadata = {
  title: "Traveler profile",
  robots: { index: false, follow: true },
};

export default async function UserProfilePage({
  params,
  searchParams,
}: PageProps<"/users/[id]">) {
  const { id } = await params;
  const { cursor } = await searchParams;
  const { db } = await getDatabase();
  let profile;
  try {
    profile = await publicProfile(
      db,
      id,
      typeof cursor === "string" ? cursor : undefined,
    );
  } catch (error) {
    if (!(error instanceof DomainError && error.code === "VALIDATION"))
      throw error;
    notFound();
  }
  if (!profile) notFound();

  return (
    <main id="main" className="container page-top public-profile-page">
      <header className="public-profile-hero">
        <ProfileAvatar
          name={profile.displayName}
          avatar={profile.avatar}
          className="public-profile-avatar"
          sizes="88px"
        />
        <div>
          <p className="eyebrow">TrailNote contributor</p>
          <h1 className="page-title">{profile.displayName}</h1>
          <p className="profile-handle">@{profile.username}</p>
        </div>
      </header>

      <section className="public-profile-tips" aria-labelledby="shared-tips">
        <h2 id="shared-tips">Tips shared by {profile.displayName}</h2>
        {profile.cards.length ? (
          <div className="tip-list">
            {profile.cards.map((tip) => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </div>
        ) : (
          <div className="empty-state profile-empty-state">
            <h3>No published tips yet</h3>
            <p className="muted">There is nothing public to show here yet.</p>
          </div>
        )}
        {profile.nextCursor && (
          <Link
            className="btn secondary profile-next"
            href={`/users/${profile.id}?cursor=${encodeURIComponent(profile.nextCursor)}`}
          >
            Older tips <ArrowRight size={17} aria-hidden="true" />
          </Link>
        )}
      </section>
    </main>
  );
}
