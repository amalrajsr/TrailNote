import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="system-page">
      <p className="eyebrow">404</p>
      <h1>This trail ends here</h1>
      <p>The page may have moved or the link may be incomplete.</p>
      <Link className="btn" href="/">
        Explore destinations
      </Link>
    </main>
  );
}
