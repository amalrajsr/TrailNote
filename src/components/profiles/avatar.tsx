import Image from "next/image";

export type ProfileAvatarData = {
  path: string;
  width: number;
  height: number;
} | null;

export function ProfileAvatar({
  name,
  avatar,
  className = "avatar",
  sizes = "40px",
}: {
  name: string;
  avatar: ProfileAvatarData;
  className?: string;
  sizes?: string;
}) {
  return (
    <span className={className} aria-hidden="true">
      {avatar ? (
        <Image
          className="profile-avatar-image"
          src={avatar.path}
          width={avatar.width}
          height={avatar.height}
          sizes={sizes}
          alt=""
        />
      ) : (
        (Array.from(name)[0]?.toUpperCase() ?? "T")
      )}
    </span>
  );
}
