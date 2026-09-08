"use server";

import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { getDatabase } from "../../../src/db";
import { viewer } from "../../../src/server/auth";
import type { ActionResult } from "../../../src/server/result";
import { DomainError } from "../../../src/server/result";
import {
  removeConfirmation,
  setConfirmation,
  setHelpful,
} from "../../../src/server/services/reactions";
import {
  cardsForRows,
  contributionDetail,
  viewerReactionState,
} from "../../../src/server/queries/contributions";
import { visibleContribution } from "../../../src/server/services/contributions";
import { reportContribution } from "../../../src/server/services/reports";

const targetSchema = z.object({
  id: z.uuid(),
  revision: z.number().int().min(1),
});

type ReactionData = {
  confirmationMonth: string | null;
  confirmationCount: number;
  helpful: boolean;
  helpfulCount: number;
};

async function failure(error: unknown): Promise<ActionResult<never>> {
  if (error instanceof ZodError)
    return {
      ok: false,
      code: "VALIDATION",
      message: "This action could not be validated. Refresh and try again.",
    };
  if (error instanceof DomainError)
    return { ok: false, code: error.code, message: error.message };
  return {
    ok: false,
    code: "INTERNAL",
    message:
      "The action could not be saved. Your previous choice is unchanged.",
  };
}

async function requireActionViewer() {
  const user = await viewer();
  if (!user)
    throw new DomainError(
      "UNAUTHENTICATED",
      "Sign in with Google to continue.",
    );
  return user;
}

async function resultFor(
  id: string,
  userId: string,
): Promise<ActionResult<ReactionData>> {
  const { db } = await getDatabase();
  const detail = await contributionDetail(db, id);
  const [tip] = await cardsForRows(db, [await visibleContribution(db, id)]);
  const state = await viewerReactionState(db, id, userId);
  return {
    ok: true,
    data: {
      confirmationMonth: state.confirmationMonth,
      confirmationCount: detail.confirmationCount,
      helpful: state.helpful,
      helpfulCount: tip.helpfulCount,
    },
  };
}

async function refreshAffected(id: string) {
  const { db } = await getDatabase();
  const detail = await contributionDetail(db, id);
  revalidatePath(`/tips/${id}`);
  revalidatePath(`/destinations/${detail.destination.slug}`);
}

export async function confirmTip(
  id: string,
  revision: number,
  month: string,
): Promise<ActionResult<ReactionData>> {
  try {
    const parsed = targetSchema.extend({ month: z.string() }).parse({
      id,
      revision,
      month,
    });
    const user = await requireActionViewer();
    const { db } = await getDatabase();
    const saved = await setConfirmation(
      db,
      user.id,
      parsed.id,
      parsed.revision,
      parsed.month,
    );
    await refreshAffected(parsed.id);
    const result = await resultFor(parsed.id, user.id);
    return result.ok
      ? {
          ...result,
          data: { ...result.data, confirmationMonth: saved.month },
        }
      : result;
  } catch (error) {
    return failure(error);
  }
}

export async function undoConfirmation(
  id: string,
  revision: number,
): Promise<ActionResult<ReactionData>> {
  try {
    const parsed = targetSchema.parse({ id, revision });
    const user = await requireActionViewer();
    const { db } = await getDatabase();
    await removeConfirmation(db, user.id, parsed.id, parsed.revision);
    await refreshAffected(parsed.id);
    return resultFor(parsed.id, user.id);
  } catch (error) {
    return failure(error);
  }
}

export async function markHelpful(
  id: string,
  helpful: boolean,
): Promise<ActionResult<ReactionData>> {
  try {
    const parsed = z.object({ id: z.uuid(), helpful: z.boolean() }).parse({
      id,
      helpful,
    });
    const user = await requireActionViewer();
    const { db } = await getDatabase();
    await setHelpful(db, user.id, parsed.id, parsed.helpful);
    await refreshAffected(parsed.id);
    return resultFor(parsed.id, user.id);
  } catch (error) {
    return failure(error);
  }
}

export async function reportTip(
  id: string,
  revision: number,
  reason: string,
  details: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionViewer();
    const { db } = await getDatabase();
    const result = await reportContribution(db, user.id, {
      id,
      revision,
      reason,
      details,
    });
    revalidatePath(`/tips/${id}`);
    return { ok: true, data: result };
  } catch (error) {
    return failure(error);
  }
}
