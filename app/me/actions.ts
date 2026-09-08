"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDatabase } from "../../src/db";
import { viewer } from "../../src/server/auth";
import { DomainError, type ActionResult } from "../../src/server/result";
import { deleteContribution } from "../../src/server/services/contributions";

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
