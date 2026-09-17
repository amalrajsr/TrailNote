"use client";
import { Menu } from "../ui/overlays";
import { ProfileAvatar, type ProfileAvatarData } from "../profiles/avatar";
import { useLogout } from "../auth/logout-provider";
export function AccountMenu({
  id,
  name,
  username,
  role,
  avatar,
}: {
  id: string;
  name: string;
  username: string;
  role: "traveler" | "moderator";
  avatar: ProfileAvatarData;
}) {
  const signOut = useLogout();

  return (
    <Menu
      trigger={
        <button className="quiet" aria-label={`Account menu for @${username}`}>
          <ProfileAvatar name={name} avatar={avatar} />
        </button>
      }
      items={[
        { label: "Profile", href: "/me" },
        ...(role === "moderator"
          ? [{ label: "Moderator dashboard", href: "/moderation" }]
          : []),
        { label: "View public profile", href: `/users/${id}` },
        { label: "Community guidelines", href: "/community-guidelines" },
        {
          label: "Sign out",
          onSelect: signOut,
        },
      ]}
    />
  );
}
