import Link from "next/link";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <strong className="footer-wordmark">TrailNote</strong>
          <p className="small muted">
            Tell the next traveller what you wish someone had told you.
          </p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/community-guidelines">Guidelines</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact-removal">Contact removal</Link>
        </nav>
      </div>
    </footer>
  );
}
