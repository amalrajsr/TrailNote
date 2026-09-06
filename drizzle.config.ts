import { defineConfig } from "drizzle-kit";

// Generation is offline. Migrations load credentials through the script below.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema/*.ts",
  out: "./drizzle",
  strict: true,
});
