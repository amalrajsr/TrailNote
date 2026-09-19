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

export type ComposerActionState = {
  status: "idle" | "error" | "auth" | "success" | "unchanged";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  tipId?: string;
  returnTo?: string;
};

export async function shareContribution(
  _previous: ComposerActionState,
  data: FormData,
): Promise<ComposerActionState> {
  const slug = formText(data, "slug");
  const returnTo = `/destinations/${encodeURIComponent(slug)}/add`;

  try {
    const input = parseContributionForm(data);
    const user = await viewer();
    if (!user) {
      return {
        status: "auth",
        message:
          "Sign in with Google to share this tip. Your draft is still available.",
        returnTo,
      };
    }
    const { db } = await getDatabase();
    const result = await createContribution(
      db,
      user.id,
      formText(data, "mutationId"),
      input,
    );
    return { status: "success", tipId: result.id };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        status: "error",
        message: "Review the highlighted fields and try again.",
        fieldErrors: error.flatten().fieldErrors,
      };
    }
    if (error instanceof DomainError) {
      return { status: "error", message: error.message };
    }
    if (error instanceof Error && /price|₹/.test(error.message)) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: { price: [error.message] },
      };
    }
    return {
      status: "error",
      message:
        "Your tip could not be shared. Your draft is retained; try again.",
    };
  }
}
