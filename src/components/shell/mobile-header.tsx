"use client";

import { Menu as MenuIcon } from "lucide-react";
import { useLogout } from "../auth/logout-provider";
import { Menu } from "../ui/overlays";

type Viewer = {
  id: string;
  name: string;
  username: string;
  role: "traveler" | "moderator";
};

export function MobileHeaderMenu({ user }: { user: Viewer | null }) {
  const signOut = useLogout();

  return (
    <div className="mobile-header-menu">
      <Menu
        trigger={
          <button
            className="mobile-menu-trigger"
            type="button"
            aria-label="Open navigation menu"
          >
            <MenuIcon size={19} aria-hidden="true" />
          </button>
        }
        items={[
          { label: "Explore tips", href: "/#tips" },
          { label: "Places", href: "/search" },
          { label: "Share a tip", href: "/search?intent=share" },
          ...(user
            ? [
                { label: "Profile", href: "/me", separator: true },
                ...(user.role === "moderator"
                  ? [{ label: "Moderator dashboard", href: "/moderation" }]
                  : []),
                { label: "Public profile", href: `/users/${user.id}` },
                {
                  label: "Community guidelines",
                  href: "/community-guidelines",
                },
                {
                  label: "Sign out",
                  onSelect: signOut,
                  separator: true,
                  tone: "danger" as const,
                },
              ]
            : [
                {
                  label: "Sign in",
                  href: "/sign-in",
                  separator: true,
                  tone: "primary" as const,
                },
              ]),
        ]}
      />
    </div>
  );
}
