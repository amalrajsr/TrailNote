import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../db";
import * as schema from "../db/schema";
import { env, getAuthEnvironment } from "./env";
import { DomainError } from "./result";
import { createProfile } from "./services/profiles";
let instance: ReturnType<typeof makeAuth> | undefined;
function makeAuth(db: Awaited<ReturnType<typeof getDatabase>>["db"]) {
  const config = getAuthEnvironment();
  return betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    secret: config.secret,
    baseURL: config.baseUrl,
    trustedOrigins: [config.baseUrl],
    onAPIError: { throw: true },
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
            await createProfile(db, user.id, user.name);
          },
        },
        session: {
          create: {
            before: async (session: { userId: string }) => {
              const profile = await db
                .select({ status: schema.profiles.status })
                .from(schema.profiles)
                .where(eq(schema.profiles.userId, session.userId))
                .then((rows) => rows[0]);
              if (profile?.status === "suspended")
                throw new Error("ACCOUNT_BLOCKED");
            },
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
export async function viewerState() {
  if (
    !env.BETTER_AUTH_SECRET ||
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET
  )
    return { kind: "anonymous" as const };
  const requestHeaders = await headers();
  if (!requestHeaders.get("cookie")) return { kind: "anonymous" as const };
  const session = await (
    await getAuth()
  ).api.getSession({ headers: requestHeaders });
  if (!session) return { kind: "anonymous" as const };
  const { db } = await getDatabase();
  const row = (
    await db
      .select({
        profile: schema.profiles,
        avatarPath: schema.uploadAssets.imagekitPath,
        avatarWidth: schema.uploadAssets.width,
        avatarHeight: schema.uploadAssets.height,
      })
      .from(schema.profiles)
      .leftJoin(
        schema.uploadAssets,
        and(
          eq(schema.uploadAssets.attachedProfileUserId, schema.profiles.userId),
          eq(schema.uploadAssets.status, "attached"),
        ),
      )
      .where(eq(schema.profiles.userId, session.user.id))
  )[0];
  const profile = row?.profile;
  if (!profile) return { kind: "anonymous" as const };
  if (profile.status !== "active") {
    await db
      .delete(schema.session)
      .where(eq(schema.session.userId, session.user.id));
    return { kind: "blocked" as const };
  }
  return {
    kind: "active" as const,
    user: {
      id: session.user.id,
      name: profile.displayName,
      username: profile.username,
      bio: profile.bio,
      instagramUrl: profile.instagramUrl,
      youtubeUrl: profile.youtubeUrl,
      role: profile.role,
      avatar:
        row.avatarPath && row.avatarWidth && row.avatarHeight
          ? {
              path: row.avatarPath,
              width: row.avatarWidth,
              height: row.avatarHeight,
            }
          : null,
    },
  };
}

export async function viewer() {
  const state = await viewerState();
  return state.kind === "active" ? state.user : null;
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
