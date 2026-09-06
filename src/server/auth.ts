import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDatabase } from "../db";
import * as schema from "../db/schema";
import { env, getAuthEnvironment } from "./env";
import { DomainError } from "./result";
let instance: ReturnType<typeof makeAuth> | undefined;
function makeAuth(db: Awaited<ReturnType<typeof getDatabase>>["db"]) {
  const config = getAuthEnvironment();
  return betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    secret: config.secret,
    baseURL: config.baseUrl,
    trustedOrigins: [config.baseUrl],
    socialProviders: {
      google: {
        clientId: config.googleClientId!,
        clientSecret: config.googleClientSecret!,
      },
    },
    advanced: { database: { generateId: "uuid" } },
    plugins: [nextCookies()],
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await db
              .insert(schema.profiles)
              .values({
                userId: user.id,
                displayName: user.name.split(" ")[0] || "Traveler",
              })
              .onConflictDoNothing();
          },
        },
      },
    },
  });
}
export async function getAuth() {
  if (!instance) instance = makeAuth((await getDatabase()).db);
  return instance;
}
export async function viewer() {
  if (
    !env.BETTER_AUTH_SECRET ||
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET
  )
    return null;
  const requestHeaders = await headers();
  if (!requestHeaders.get("cookie")) return null;
  const session = await (
    await getAuth()
  ).api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { db } = await getDatabase();
  const profile = (
    await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, session.user.id))
  )[0];
  if (!profile || profile.status !== "active") return null;
  return { id: session.user.id, name: profile.displayName, role: profile.role };
}
export async function requireViewer() {
  const user = await viewer();
  if (!user)
    throw new DomainError(
      "UNAUTHENTICATED",
      "Sign in with Google to continue. Your draft is still available.",
    );
  return user;
}
