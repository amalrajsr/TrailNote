"use server";

import { revalidatePath } from "next/cache";
import { getDatabase } from "../../src/db";
import { viewer } from "../../src/server/auth";
import { DomainError, type ActionResult } from "../../src/server/result";
import {
  resolveContactRemoval,
  resolveReport,
} from "../../src/server/services/moderation";

async function moderatorId() {
  const user = await viewer();
  if (!user)
    throw new DomainError(
      "UNAUTHENTICATED",
      "Sign in with Google to continue.",
    );
  return user.id;
}
async function action<T>(
  fn: (
    db: Awaited<ReturnType<typeof getDatabase>>["db"],
    userId: string,
  ) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const { db } = await getDatabase();
    const result = await fn(db, await moderatorId());
    revalidatePath("/moderation");
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      code: error instanceof DomainError ? error.code : "INTERNAL",
      message:
        error instanceof DomainError
          ? error.message
          : "This action could not be saved.",
    };
  }
}
export async function reviewReport(
  reportId: string,
  disposition: "hide" | "dismiss",
  reason: string,
) {
  return action((db, userId) =>
    resolveReport(db, userId, { reportId, disposition, reason }),
  );
}
export async function reviewContactRequest(
  requestId: string,
  disposition: "hide" | "dismiss",
  reason: string,
) {
  return action((db, userId) =>
    resolveContactRemoval(db, userId, { requestId, disposition, reason }),
  );
}
