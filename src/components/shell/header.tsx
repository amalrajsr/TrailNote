import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { viewerState } from "../../server/auth";
import { AccountMenu } from "./user-menu";
export async function Header() {
  const state = await viewerState();
  if (state.kind === "blocked") redirect("/sign-in?error=blocked");
  const user = state.kind === "active" ? state.user : null;
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="wordmark">
          <Compass size={29} strokeWidth={1.5} aria-hidden />
          TrailNote
        </Link>
        <nav aria-label="Main navigation" className="nav">
          <Link className="desktop-link" href="/#tips">
            Explore tips
          </Link>
          <Link className="desktop-link" href="/#places">
            Places
          </Link>
          <Link className="desktop-link" href="/search">
            Share a tip
          </Link>
          {user ? (
            <AccountMenu
              id={user.id}
              name={user.name}
              username={user.username}
              role={user.role}
              avatar={user.avatar}
            />
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
