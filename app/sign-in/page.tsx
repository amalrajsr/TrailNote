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
          <p id="auth-story-title" className="eyebrow">
            Travel notes, not travel noise
          </p>
          <p className="auth-story-lede">
            Practical details shared by people who&apos;ve actually been there.
          </p>
        </aside>
        <SignInPanel
          returnTo={returnTo}
          hasDraft={query.draft === "1" || returnTo.includes("/add")}
          oauthError={query.error === "oauth"}
          blockedError={query.error === "blocked"}
        />
      </div>
    </main>
  );
}
