import "./load-env";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDatabase } from "../src/db";
import { profiles } from "../src/db/schema";

async function main() {
  const userId = z.uuid().parse(process.argv[2]);
  const { db, client } = await getDatabase();
  try {
    const changed = await db
      .update(profiles)
      .set({ role: "moderator", updatedAt: Date.now() })
      .where(eq(profiles.userId, userId))
      .returning({ id: profiles.userId });
    if (!changed.length) throw new Error("No profile exists for that user ID.");
    console.info(`Moderator granted to ${userId}.`);
  } finally {
    client.close();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Moderator grant failed.",
  );
  process.exitCode = 1;
});
