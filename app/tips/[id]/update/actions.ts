"use server";

import { ZodError } from "zod";
import { getDatabase } from "../../../../src/db";
import { viewer } from "../../../../src/server/auth";
import {
  formText,
  parseContributionForm,
} from "../../../../src/server/contribution-form";
import { DomainError } from "../../../../src/server/result";
import { createContribution } from "../../../../src/server/services/contributions";
import type { ComposerActionState } from "../../../destinations/[slug]/add/actions";

export async function shareUpdate(
  _previous: ComposerActionState,
  data: FormData,
): Promise<ComposerActionState> {
  const parentId = formText(data, "parentContributionId");
  const returnTo = `/tips/${encodeURIComponent(parentId)}/update`;
  try {
    const input = parseContributionForm(data);
    const user = await viewer();
    if (!user)
      return {
        status: "auth",
        message:
          "Sign in with Google to share this update. Your draft is still available.",
        returnTo,
      };
    const { db } = await getDatabase();
    await createContribution(db, user.id, formText(data, "mutationId"), input);
    return { status: "success", tipId: parentId };
  } catch (error) {
    if (error instanceof ZodError)
      return {
        status: "error",
        message: "Review the highlighted fields and try again.",
        fieldErrors: error.flatten().fieldErrors,
      };
    if (error instanceof DomainError)
      return { status: "error", message: error.message };
    if (error instanceof Error && /price|₹/.test(error.message))
      return {
        status: "error",
        message: error.message,
        fieldErrors: { price: [error.message] },
      };
    return {
      status: "error",
      message:
        "Your update could not be shared. Your draft is retained; try again.",
    };
  }
}
