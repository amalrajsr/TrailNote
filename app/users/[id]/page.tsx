import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileAvatar } from "../../../src/components/profiles/avatar";
import { PublicProfileTipCard } from "../../../src/components/profiles/public-tip-card";
import { getDatabase } from "../../../src/db";
import { DomainError } from "../../../src/server/result";
import { publicProfile } from "../../../src/server/queries/profiles";

function PublicSocialLinks({
  instagramUrl,
  youtubeUrl,
}: {
  instagramUrl: string | null;
  youtubeUrl: string | null;
}) {
  if (!instagramUrl && !youtubeUrl) return null;

  return (
    <div className="public-profile-socials" aria-label="Social profiles">
      {instagramUrl && (
        <a
          className="public-profile-social-link"
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
        >
          <InstagramIcon />
          Instagram
          <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      )}
      {youtubeUrl && (
        <a
          className="public-profile-social-link"
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
        >
          <YouTubeIcon />
          YouTube
          <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

function YouTubeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="4" fill="currentColor" />
      <path d="m10 8.5 6 3.5-6 3.5v-7Z" fill="white" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export const metadata = {
  title: "Traveller profile",
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
      <section className="public-profile-card" aria-labelledby="public-profile-name">
        <ProfileAvatar
          name={profile.displayName}
          avatar={profile.avatar}
          className="public-profile-avatar"
          sizes="88px"
        />

        <div className="public-profile-copy">
          <div className="public-profile-identity">
            <h1 className="public-profile-name" id="public-profile-name">
              {profile.displayName}
            </h1>
            <span className="profile-handle">@{profile.username}</span>
          </div>

          {profile.bio && <p className="public-profile-bio">{profile.bio}</p>}

          <PublicSocialLinks
            instagramUrl={profile.instagramUrl}
            youtubeUrl={profile.youtubeUrl}
          />

          <div className="public-profile-meta" aria-label="Contributor summary">
            <span>
              <strong>{profile.stats.publishedTips}</strong> published tips
            </span>
            <span>
              <strong>{profile.stats.places}</strong> places
            </span>
            <span>Joined TrailNote in {profile.joinedYear}</span>
          </div>
        </div>
      </section>

      <section className="public-profile-tips" aria-labelledby="shared-tips">
        <div className="public-profile-kicker">Shared TrailNotes</div>
        <h2 id="shared-tips">Tips from {profile.displayName}</h2>
        <p className="public-profile-tips-description">
          First-hand practical notes from places {profile.displayName} has visited.
        </p>

        <div className="public-profile-divider" />

        {profile.cards.length ? (
          <div className="public-profile-tip-grid">
            {profile.cards.map((tip) => (
              <PublicProfileTipCard key={tip.id} tip={tip} />
            ))}
          </div>
        ) : (
          <div className="public-profile-empty-state">
            <h3>No published tips yet</h3>
            <p>There is nothing public to show here yet.</p>
          </div>
        )}

        {profile.nextCursor && (
          <div className="public-profile-pagination">
            <Link
              className="public-profile-next"
              href={`/users/${profile.id}?cursor=${encodeURIComponent(profile.nextCursor)}`}
            >
              Older tips <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
