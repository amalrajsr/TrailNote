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
      <div className="auth-layout">
        <aside className="auth-story" aria-labelledby="auth-story-title">
          <p className="eyebrow">Travel notes, not travel noise</p>
          <h1 id="auth-story-title">
            Find the details that make a place easier.
          </h1>
          <p className="auth-story-lede">
            TrailNote keeps the useful bits of a trip close at hand, shared by
            people who have actually been there.
          </p>
          <ul className="auth-story-list">
            <li>
              <span>01</span>
              <p>
                <strong>Practical by design</strong>
                Prices, routes, timing, and the small things guidebooks miss.
              </p>
            </li>
            <li>
              <span>02</span>
              <p>
                <strong>Shared by travellers</strong>
                First-hand notes that get more useful with every contribution.
              </p>
            </li>
            <li>
              <span>03</span>
              <p>
                <strong>Made for the next trip</strong>
                Save your place in the conversation and add what you learned.
              </p>
            </li>
          </ul>
        </aside>
        <SignInPanel
          returnTo={returnTo}
          hasDraft={query.draft === "1" || returnTo.includes("/add")}
          oauthError={query.error === "oauth"}
        />
      </div>
    </main>
  );
}
