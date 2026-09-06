import "server-only";
import { getDatabaseEnvironment } from "../server/env";
import { connectDatabase } from "./client";

const globalDatabase = globalThis as typeof globalThis & {
  fieldnotesDatabase?: ReturnType<typeof connectDatabase>;
};
export function getDatabase() {
  if (!globalDatabase.fieldnotesDatabase) {
    globalDatabase.fieldnotesDatabase = connectDatabase(
      getDatabaseEnvironment(),
    ).catch((error) => {
      globalDatabase.fieldnotesDatabase = undefined;
      throw error;
    });
  }
  return globalDatabase.fieldnotesDatabase;
}
