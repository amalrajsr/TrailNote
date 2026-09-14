import type { MetadataRoute } from "next";
import { env } from "../src/server/env";

const baseUrl = new URL(
  env.NEXT_PUBLIC_APP_URL ?? env.BETTER_AUTH_URL ?? "http://localhost:3000",
);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/me/",
        "/moderation/",
        "/sign-in",
        "/contact-removal",
      ],
    },
    sitemap: new URL("/sitemap.xml", baseUrl).toString(),
  };
}
