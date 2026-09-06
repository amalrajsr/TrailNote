import "server-only";
import { createClient, type Config } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

export async function connectDatabase(config: Config) {
  if (config.url.startsWith("file:") && config.url !== "file::memory:")
    mkdirSync(dirname(config.url.slice(5)), { recursive: true });
  const client = createClient(config);
  try {
    await client.execute("PRAGMA foreign_keys = ON");
    const result = await client.execute("PRAGMA foreign_keys");
    if (Number(result.rows[0]?.foreign_keys) !== 1)
      throw new Error("Database foreign-key enforcement is unavailable");
    return { db: drizzle(client, { schema }), client };
  } catch (error) {
    client.close();
    throw error;
  }
}
export type Database = Awaited<ReturnType<typeof connectDatabase>>["db"];
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
