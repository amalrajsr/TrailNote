"use client";
import { Menu } from "../ui/overlays";
import { authClient } from "../../lib/auth-client";
import { useRouter } from "next/navigation";
export function AccountMenu({ name }: { name: string }) {
  const router = useRouter();

  return (
    <Menu
      trigger={
        <button className="quiet" aria-label="Account menu">
          <span className="avatar" aria-hidden>
            {Array.from(name)[0]}
          </span>
        </button>
      }
      items={[
        { label: "My contributions", href: "/me" },
        { label: "Community guidelines", href: "/community-guidelines" },
        {
          label: "Sign out",
          onSelect: async () => {
            await authClient.signOut();
            for (const key of Object.keys(sessionStorage))
              if (key.startsWith("fieldnotes:draft:"))
                sessionStorage.removeItem(key);
            router.push("/");
            router.refresh();
          },
        },
      ]}
    />
  );
}
