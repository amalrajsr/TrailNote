import "server-only";

import { and, eq } from "drizzle-orm";
import type { Database } from "../../db/client";
import * as s from "../../db/schema";
import { DomainError } from "../result";
import { visibleContribution } from "./contributions";

/** This is deliberately a post-reveal shape; never add it to a public DTO. */
export async function revealContact(db: Database, contributionId: string) {
  await visibleContribution(db, contributionId);
  const contact = (
    await db
      .select({ id: s.contacts.id, phone: s.contacts.phoneE164 })
      .from(s.contacts)
      .where(
        and(
          eq(s.contacts.contributionId, contributionId),
          eq(s.contacts.status, "visible"),
        ),
      )
  )[0];
  if (!contact)
    throw new DomainError("NOT_FOUND", "This contact is no longer available.");
  return contact;
}
