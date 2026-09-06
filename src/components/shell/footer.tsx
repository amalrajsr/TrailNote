import Link from "next/link";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <strong className="footer-wordmark">fieldnotes</strong>
          <p className="small muted">
            Useful things, from people who&apos;ve been there.
          </p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/guidelines">Guidelines</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact-removal">Contact removal</Link>
        </nav>
      </div>
    </footer>
  );
}
