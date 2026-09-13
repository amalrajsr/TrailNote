import { z } from "zod";
import { textLength } from "./contribution";

const usernamePattern = /^[a-z0-9](?:[a-z0-9-]{1,34}[a-z0-9])?$/;

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
  avatarIntent: z.enum(["keep", "replace", "remove"]),
  avatarId: z.preprocess(
    (value) => (value === "" ? null : value),
    z.uuid().nullable(),
  ),
});

export type ProfileInput = z.infer<typeof profileInput>;

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
