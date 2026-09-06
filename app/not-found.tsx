import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-start justify-center gap-4 px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-zinc-600">
        404
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
        This trail ends here
      </h1>
      <p className="max-w-xl text-base leading-7 text-zinc-700">
        The page may have moved or the link may be incomplete.
      </p>
      <Link
        className="inline-flex min-h-12 items-center rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
        href="/"
      >
        Explore destinations
      </Link>
    </main>
  );
}
