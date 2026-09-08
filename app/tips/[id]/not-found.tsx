import Link from "next/link";

export default function TipNotFound() {
  return (
    <main id="main" className="container unavailable-tip">
      <p className="eyebrow">Tip unavailable</p>
      <h1 className="page-title">This tip isn&apos;t available</h1>
      <p className="muted">
        It may have been removed, or the link may be incomplete.
      </p>
      <Link className="btn" href="/">
        Explore destinations
      </Link>
    </main>
  );
}
