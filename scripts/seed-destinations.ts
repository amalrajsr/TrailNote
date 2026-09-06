import "./load-env";
import { getDatabase } from "../src/db";
import { seedDestinations } from "../src/db/seed-destinations";
async function main() {
  const { db, client } = await getDatabase();
  try {
    await seedDestinations(db);
    console.info(
      "Curated destinations and aliases seeded. No traveler content created.",
    );
  } finally {
    client.close();
  }
}
main().catch(() => {
  console.error(
    "Destination seed failed; check migrations and database access.",
  );
  process.exitCode = 1;
});
