"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="system-page">
      <p className="eyebrow">TrailNote</p>
      <h1>Something went wrong</h1>
      <p>
        We could not load this page. Your information has not been submitted.
        Please try again.
      </p>
      <button className="btn" onClick={() => retry()} type="button">
        Try again
      </button>
    </main>
  );
}
