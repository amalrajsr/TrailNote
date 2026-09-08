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
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-start justify-center gap-4 px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-zinc-600">
        TrailNote
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
        Something went wrong
      </h1>
      <p className="max-w-xl text-base leading-7 text-zinc-700">
        We could not load this page. Your information has not been submitted.
        Please try again.
      </p>
      <button
        className="min-h-12 rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
        onClick={() => retry()}
        type="button"
      >
        Try again
      </button>
    </main>
  );
}
