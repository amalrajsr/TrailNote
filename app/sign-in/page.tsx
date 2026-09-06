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
    <main id="main" className="container">
      <SignInPanel
        returnTo={returnTo}
        hasDraft={query.draft === "1" || returnTo.includes("/add")}
        oauthError={query.error === "oauth"}
      />
    </main>
  );
}
