import "./load-env";
import { migrate } from "drizzle-orm/libsql/migrator";
import { getDatabase } from "../src/db";

async function main() {
  const { db, client } = await getDatabase();
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.info("Database migrations applied.");
  } finally {
    client.close();
  }
}
main().catch(() => {
  console.error(
    "Migration failed. Check the environment and database access; credentials were not logged.",
  );
  process.exitCode = 1;
});
