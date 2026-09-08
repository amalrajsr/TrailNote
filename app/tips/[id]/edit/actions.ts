"use server";

import { ZodError } from "zod";
import { getDatabase } from "../../../../src/db";
import { viewer } from "../../../../src/server/auth";
import {
  formText,
  parseContributionForm,
} from "../../../../src/server/contribution-form";
import { DomainError } from "../../../../src/server/result";
import { editContribution } from "../../../../src/server/services/contributions";
import type { ComposerActionState } from "../../../destinations/[slug]/add/actions";

export async function shareEdit(
  _previous: ComposerActionState,
  data: FormData,
): Promise<ComposerActionState> {
  try {
    const user = await viewer();
    if (!user)
      return {
        status: "auth",
        message: "Sign in with Google to save changes.",
        returnTo: `/tips/${encodeURIComponent(formText(data, "id"))}/edit`,
      };
    const input = parseContributionForm(data);
    const { db } = await getDatabase();
    const result = await editContribution(
      db,
      user.id,
      formText(data, "id"),
      Number(formText(data, "expectedRevision")),
      formText(data, "mutationId"),
      input,
    );
    return { status: "success", tipId: result.id };
  } catch (error) {
    if (error instanceof ZodError)
      return {
        status: "error",
        message: "Review the highlighted fields and try again.",
        fieldErrors: error.flatten().fieldErrors,
      };
    if (error instanceof DomainError)
      return { status: "error", message: error.message };
    return {
      status: "error",
      message:
        "Your changes could not be saved. Your draft is retained; try again.",
    };
  }
}
