import { redirect } from "next/navigation";
import { SignInPanel } from "../../src/components/auth/sign-in-panel";
import { safeReturnUrl } from "../../src/lib/urls";
import { viewer } from "../../src/server/auth";

export const metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string; draft?: string }>;
}) {
  const query = await searchParams;
  const returnTo = safeReturnUrl(query.returnTo);
  if (await viewer()) redirect(returnTo);

  return (
    <main id="main" className="container auth-page">
      <div className="auth-layout" aria-labelledby="auth-story-title">
        <section className="auth-story">
          <p className="eyebrow">Traveller knowledge for India</p>
          <h1 id="auth-story-title">
            Useful things people wish they knew before arriving.
          </h1>
          <p className="auth-story-lede">
            First-hand, practical notes from travellers — how to get there, what
            things cost, what to avoid, and the small details that make a trip
            easier.
          </p>

          <div
            className="auth-preview"
            aria-label="Examples of useful TrailNote tips"
          >
            <div className="auth-india-map" aria-hidden="true" />
            <article className="auth-note auth-note-a">
              <strong>Hampi</strong>
              <p>
                Bus from Hospet to Hampi is cheap, frequent and easier than an
                auto.
              </p>
              <small>Getting around</small>
            </article>
            <article className="auth-note auth-note-b">
              <strong>Varkala</strong>
              <p>Confirm the auto fare before leaving the cliff after dark.</p>
              <small>Useful to know</small>
            </article>
          </div>
        </section>

        <aside className="auth-zone" aria-label="Sign in">
          <p className="auth-micro-copy">
            <strong>First-hand. Practical. Traveller-maintained.</strong>
            Built around small details that genuinely help the next traveller.
          </p>
          <SignInPanel
            returnTo={returnTo}
            hasDraft={query.draft === "1" || returnTo.includes("/add")}
            oauthError={query.error === "oauth"}
            blockedError={query.error === "blocked"}
          />
        </aside>
      </div>
    </main>
  );
}
