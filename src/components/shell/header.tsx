import Link from "next/link";
import { Compass } from "lucide-react";
import { viewer } from "../../server/auth";
import { AccountMenu } from "./user-menu";
export async function Header() {
  const user = await viewer();
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="wordmark">
          <Compass size={29} strokeWidth={1.5} aria-hidden />
          fieldnotes
        </Link>
        <nav aria-label="Main navigation" className="nav">
          <Link className="desktop-link" href="/">
            Explore
          </Link>
          <Link className="desktop-link" href="/search">
            Share a tip
          </Link>
          {user ? (
            <AccountMenu name={user.name} />
          ) : (
            <Link className="btn secondary" href="/sign-in">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
