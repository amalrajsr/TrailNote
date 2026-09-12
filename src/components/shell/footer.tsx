import Link from "next/link";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <strong className="footer-wordmark">TrailNote</strong>
          <p>Tell the next traveller what you wish someone had told you.</p>
        </div>
        <nav className="footer-col" aria-label="Explore">
          <strong>Explore</strong>
          <Link href="/search">Search destinations</Link>
          <Link href="/search">Share a tip</Link>
        </nav>
        <nav className="footer-col" aria-label="Community">
          <strong>Community</strong>
          <Link href="/community-guidelines">Guidelines</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact-removal">Contact removal</Link>
        </nav>
      </div>
    </footer>
  );
}
