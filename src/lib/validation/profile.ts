import { z } from "zod";
import { textLength } from "./contribution";

const usernamePattern = /^[a-z0-9](?:[a-z0-9-]{1,34}[a-z0-9])?$/;
const instagramUsernamePattern = /^[a-zA-Z0-9._]{1,30}$/;
const youtubeHandlePattern = /^[a-zA-Z0-9._-]{1,100}$/;

function trimmedNullable(value: unknown) {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed || null;
}

function parseProfileUrl(value: string, hosts: Set<string>) {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:" ||
    !hosts.has(url.hostname.toLowerCase()) ||
    url.search ||
    url.hash
  )
    return null;
  return url;
}

export function normalizeInstagramProfile(value: string) {
  const trimmed = value.trim();
  const username = trimmed.startsWith("@")
    ? trimmed.slice(1)
    : !trimmed.includes("/")
      ? trimmed
      : null;
  if (username) {
    return instagramUsernamePattern.test(username)
      ? `https://www.instagram.com/${username}/`
      : null;
  }
  const url = parseProfileUrl(
    trimmed,
    new Set(["instagram.com", "www.instagram.com"]),
  );
  if (!url) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length === 1 && instagramUsernamePattern.test(parts[0])
    ? `https://www.instagram.com/${parts[0]}/`
    : null;
}

export function normalizeYouTubeProfile(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("@")) {
    const handle = trimmed.slice(1);
    return youtubeHandlePattern.test(handle)
      ? `https://www.youtube.com/@${handle}`
      : null;
  }
  if (!trimmed.includes("/")) {
    return youtubeHandlePattern.test(trimmed)
      ? `https://www.youtube.com/@${trimmed}`
      : null;
  }
  const url = parseProfileUrl(
    trimmed,
    new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]),
  );
  if (!url) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || !["channel", "c", "user"].includes(parts[0]))
    return parts.length === 1 &&
      parts[0].startsWith("@") &&
      youtubeHandlePattern.test(parts[0].slice(1))
      ? `https://www.youtube.com/${parts[0]}`
      : null;
  return youtubeHandlePattern.test(parts[1])
    ? `https://www.youtube.com/${parts[0]}/${parts[1]}`
    : null;
}

const profileBio = z.preprocess(
  trimmedNullable,
  z
    .string()
    .refine((value) => textLength(value) <= 160, "Use at most 160 characters.")
    .refine(
      (value) => !/[\u0000-\u001f\u007f]/.test(value),
      "Remove control characters from the bio.",
    )
    .nullable(),
);

function profileUrl(
  normalize: (value: string) => string | null,
  message: string,
) {
  return z.preprocess(
    trimmedNullable,
    z
      .string()
      .transform((value, context) => {
        const normalized = normalize(value);
        if (!normalized) {
          context.addIssue({ code: "custom", message });
          return z.NEVER;
        }
        return normalized;
      })
      .nullable(),
  );
}

export const usernameInput = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .refine(
    (value) => usernamePattern.test(value),
    "Use 3–36 letters, numbers, or internal hyphens.",
  );

export const profileInput = z.object({
  displayName: z
    .string()
    .trim()
    .refine(
      (value) => textLength(value) >= 1 && textLength(value) <= 50,
      "Use between 1 and 50 characters.",
    )
    .refine(
      (value) => !/[\u0000-\u001f\u007f]/.test(value),
      "Remove control characters from the name.",
    ),
  username: usernameInput,
  bio: profileBio,
  instagramUrl: profileUrl(
    normalizeInstagramProfile,
    "Use an Instagram profile URL or username.",
  ),
  youtubeUrl: profileUrl(
    normalizeYouTubeProfile,
    "Use a YouTube channel URL or handle.",
  ),
  avatarIntent: z.enum(["keep", "replace", "remove"]),
  avatarId: z.preprocess(
    (value) => (value === "" ? null : value),
    z.uuid().nullable(),
  ),
});

export type ProfileInput = {
  displayName: string;
  username: string;
  bio?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  avatarIntent: "keep" | "replace" | "remove";
  avatarId: string | null;
};

export function usernameCandidates(name: string, userId: string) {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = normalized || "traveler";
  const compactId = userId.toLowerCase().replace(/[^a-z0-9]/g, "");
  const suffixes = [6, 10, 16, compactId.length]
    .map((length) => compactId.slice(0, length))
    .filter(
      (suffix, index, values) => suffix && values.indexOf(suffix) === index,
    );
  return suffixes.map((suffix) => {
    const prefix = base.slice(0, 35 - suffix.length).replace(/-+$/g, "") || "u";
    return `${prefix}-${suffix}`;
  });
}
