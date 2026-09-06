import "./load-env";
import { getDatabase } from "../src/db";
import {
  seedDevelopment,
  assertDevelopmentSeed,
} from "../src/db/seed-development";
import { env, getDatabaseEnvironment } from "../src/server/env";
async function main() {
  const { url } = getDatabaseEnvironment();
  assertDevelopmentSeed(env.APP_ENV, url);
  const { db, client } = await getDatabase();
  try {
    await seedDevelopment(db, env.APP_ENV, url);
    console.info("Fictional local development fixtures seeded.");
  } finally {
    client.close();
  }
}
main().catch(() => {
  console.error(
    "Development seed refused or failed. Use a migrated local file database with APP_ENV=development/test.",
  );
  process.exitCode = 1;
});
