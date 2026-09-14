"use client";
import { Menu } from "../ui/overlays";
import { authClient } from "../../lib/auth-client";
import { useRouter } from "next/navigation";
import { ProfileAvatar, type ProfileAvatarData } from "../profiles/avatar";
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
  const router = useRouter();

  return (
    <Menu
      trigger={
        <button className="quiet" aria-label={`Account menu for @${username}`}>
          <ProfileAvatar name={name} avatar={avatar} />
        </button>
      }
      items={[
        { label: "My tips", href: "/me" },
        ...(role === "moderator"
          ? [{ label: "Moderator dashboard", href: "/moderation" }]
          : []),
        { label: "View public profile", href: `/users/${id}` },
        { label: "Community guidelines", href: "/community-guidelines" },
        {
          label: "Sign out",
          onSelect: async () => {
            await authClient.signOut();
            for (const key of Object.keys(sessionStorage))
              if (key.startsWith("fieldnotes:draft:"))
                sessionStorage.removeItem(key);
            router.replace("/?signedOut=1");
            router.refresh();
          },
        },
      ]}
    />
  );
}
