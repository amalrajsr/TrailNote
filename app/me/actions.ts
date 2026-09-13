"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDatabase } from "../../src/db";
import { viewer } from "../../src/server/auth";
import { DomainError, type ActionResult } from "../../src/server/result";
import { consumeRateLimit } from "../../src/server/rate-limit";
import { deleteContribution } from "../../src/server/services/contributions";
import { profileInput } from "../../src/lib/validation/profile";
import { updateProfile } from "../../src/server/services/profiles";

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updateOwnProfile(
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await viewer();
  if (!user)
    return {
      status: "error",
      message: "Sign in with Google to update your profile.",
    };
  const parsed = profileInput.safeParse({
    displayName: formData.get("displayName"),
    username: formData.get("username"),
    avatarIntent: formData.get("avatarIntent"),
    avatarId: formData.get("avatarId"),
  });
  if (!parsed.success)
    return {
      status: "error",
      message: "Review the highlighted profile fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  try {
    const { db } = await getDatabase();
    if (parsed.data.username !== user.username)
      await consumeRateLimit(db, user.id, "profile_username", 5, 86_400_000);
    await updateProfile(db, user.id, parsed.data);
    revalidatePath("/", "layout");
    return { status: "success", message: "Profile updated." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof DomainError
          ? error.message
          : "Could not update your profile. Try again.",
      fieldErrors:
        error instanceof DomainError && error.code === "CONFLICT"
          ? { username: [error.message] }
          : undefined,
    };
  }
}

export async function deleteOwnTip(
  id: string,
  revision: number,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await viewer();
    if (!user)
      throw new DomainError(
        "UNAUTHENTICATED",
        "Sign in with Google to continue.",
      );
    const parsed = z
      .object({ id: z.uuid(), revision: z.number().int().positive() })
      .parse({ id, revision });
    const { db } = await getDatabase();
    const result = await deleteContribution(
      db,
      user.id,
      parsed.id,
      parsed.revision,
    );
    revalidatePath("/me");
    revalidatePath(`/tips/${parsed.id}`);
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      code: error instanceof DomainError ? error.code : "VALIDATION",
      message:
        error instanceof DomainError
          ? error.message
          : "Could not delete this tip.",
    };
  }
}
