import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/libsql";

// Schema generation only. Does not connect to a provider or enable a login route.
export const auth = betterAuth({
  database: drizzleAdapter(drizzle({ connection: { url: "file::memory:" } }), {
    provider: "sqlite",
  }),
  advanced: { database: { generateId: "uuid" } },
  socialProviders: {
    google: {
      clientId: "schema-generation",
      clientSecret: "schema-generation",
    },
  },
});
