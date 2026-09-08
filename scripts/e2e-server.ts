import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { migrate } from "drizzle-orm/libsql/migrator";
import { connectDatabase } from "../src/db/client";
import { seedDevelopment } from "../src/db/seed-development";

async function main() {
  const directory = await mkdtemp(join(tmpdir(), "fieldnotes-e2e-"));
  const databaseUrl = `file:${join(directory, "fieldnotes.db")}`;
  const connection = await connectDatabase({ url: databaseUrl });

  try {
    await migrate(connection.db, { migrationsFolder: "./drizzle" });
    await seedDevelopment(connection.db, "test", databaseUrl);
  } finally {
    connection.client.close();
  }

  const server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3100",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        APP_ENV: "test",
        TURSO_DATABASE_URL: databaseUrl,
        NEXT_DIST_DIR: ".next-playwright",
      },
    },
  );

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => server.kill(signal));
  }

  const [code] = (await once(server, "exit")) as [number | null];
  await rm(directory, { recursive: true, force: true });
  process.exitCode = code ?? 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "E2E server failed.");
  process.exitCode = 1;
});
