import { z } from "zod";

const optionalValue = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.url().optional(),
);

const environmentSchema = z.object({
  APP_ENV: z
    .enum(["development", "test", "preview", "production"])
    .default("development"),
  TURSO_DATABASE_URL: optionalValue,
  TURSO_AUTH_TOKEN: optionalValue,
  BETTER_AUTH_SECRET: optionalValue,
  BETTER_AUTH_URL: optionalUrl,
  GOOGLE_CLIENT_ID: optionalValue,
  GOOGLE_CLIENT_SECRET: optionalValue,
  IMAGEKIT_PRIVATE_KEY: optionalValue,
  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: optionalUrl,
  RATE_LIMIT_SECRET: optionalValue,
  CRON_SECRET: optionalValue,
  NEXT_PUBLIC_APP_URL: optionalUrl,
});

export type Environment = z.infer<typeof environmentSchema>;

export type DatabaseEnvironment = {
  url: string;
  authToken?: string;
};

function missing(names: readonly string[]): never {
  throw new Error(
    `Missing required environment variables: ${names.join(", ")}`,
  );
}

function missingNames(
  entries: ReadonlyArray<readonly [name: string, value: unknown]>,
): string[] {
  return entries.filter(([, value]) => !value).map(([name]) => name);
}

export function parseEnvironment(
  source: Record<string, string | undefined>,
): Environment {
  const parsed = environmentSchema.safeParse(source);

  if (!parsed.success) {
    const fields = [
      ...new Set(
        parsed.error.issues.map(
          (issue) => issue.path.join(".") || "environment",
        ),
      ),
    ];
    throw new Error(`Invalid environment variables: ${fields.join(", ")}`);
  }

  return parsed.data;
}

export function requireDatabaseEnvironment(
  env: Environment,
): DatabaseEnvironment {
  const url =
    env.TURSO_DATABASE_URL ??
    (env.APP_ENV === "development" || env.APP_ENV === "test"
      ? "file:./data/trailnote.db"
      : undefined);

  if (!url) {
    return missing(["TURSO_DATABASE_URL"]);
  }

  if (!url.startsWith("file:") && !env.TURSO_AUTH_TOKEN) {
    return missing(["TURSO_AUTH_TOKEN"]);
  }

  return { url, authToken: env.TURSO_AUTH_TOKEN };
}

export function requireAuthEnvironment(env: Environment) {
  const absent = missingNames([
    ["BETTER_AUTH_SECRET", env.BETTER_AUTH_SECRET],
    ["GOOGLE_CLIENT_ID", env.GOOGLE_CLIENT_ID],
    ["GOOGLE_CLIENT_SECRET", env.GOOGLE_CLIENT_SECRET],
  ]);

  if (absent.length > 0) {
    return missing(absent);
  }

  return {
    secret: env.BETTER_AUTH_SECRET,
    baseUrl: env.BETTER_AUTH_URL ?? "http://localhost:3000",
    googleClientId: env.GOOGLE_CLIENT_ID,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET,
  };
}

export function requireImageKitEnvironment(env: Environment) {
  const absent = missingNames([
    ["IMAGEKIT_PRIVATE_KEY", env.IMAGEKIT_PRIVATE_KEY],
    [
      "NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT",
      env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
    ],
  ]);

  if (absent.length > 0) {
    return missing(absent);
  }

  return {
    privateKey: env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
  };
}

export function requireOperationsEnvironment(env: Environment) {
  const absent = missingNames([
    ["RATE_LIMIT_SECRET", env.RATE_LIMIT_SECRET],
    ["CRON_SECRET", env.CRON_SECRET],
  ]);

  if (absent.length > 0) {
    return missing(absent);
  }

  return {
    rateLimitSecret: env.RATE_LIMIT_SECRET!,
    cronSecret: env.CRON_SECRET!,
  };
}
