"use client";

import { Compass } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "../../lib/auth-client";

export function SignInPanel({
  returnTo,
  hasDraft,
  oauthError,
}: {
  returnTo: string;
  hasDraft: boolean;
  oauthError: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(oauthError);

  async function signIn() {
    setPending(true);
    setError(false);
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: returnTo,
      errorCallbackURL: `/sign-in?returnTo=${encodeURIComponent(returnTo)}&error=oauth`,
    });
    if (result.error) {
      setError(true);
      setPending(false);
    }
  }

  return (
    <section className="auth-panel form-card">
      <Compass size={32} strokeWidth={1.5} aria-hidden="true" />
      <h1 className="editorial">Share what you know</h1>
      <p className="muted">
        Continue with Google to add tips and help keep information useful.
      </p>
      {error && (
        <div className="error-notice" role="alert">
          Google sign-in didn&apos;t finish.
          {hasDraft ? " Your draft is still here." : " Please try again."}
        </div>
      )}
      <button className="btn secondary" disabled={pending} onClick={signIn}>
        <Image src="/google-g.svg" width={20} height={20} alt="" />
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>
      {hasDraft && (
        <p className="status-message">Your tip is saved in this tab.</p>
      )}
      {oauthError && hasDraft && (
        <Link className="quiet" href={returnTo}>
          Back to my tip
        </Link>
      )}
      <p className="small muted">
        By continuing, you agree to our <Link href="/terms">Terms</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </section>
  );
}
