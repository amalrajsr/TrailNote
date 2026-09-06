# Dependency baseline

Verified for W00 on 6 September 2026 with Node.js 24.18.0 and pnpm 12.3.4.
All versions in `package.json` are exact and `pnpm-lock.yaml` is authoritative for
transitive packages.

## Core compatibility set

| Area             | Package/version                                                                            | Decision                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application      | `next@16.3.4`, `react@19.2.8`, `react-dom@19.2.8`                                          | App Router and React Server Components; Node runtime                                                                                                                   |
| Language         | `typescript@5.9.3`, strict mode                                                            | No JavaScript application modules or relaxed checking                                                                                                                  |
| Styling          | `tailwindcss@4.3.3`, `@tailwindcss/postcss@4.3.3`                                          | Tailwind v4 CSS-first `@theme` conventions; no v3 config assumptions                                                                                                   |
| Database         | `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `@libsql/client@0.18.0`                       | Stable Drizzle line and `drizzle-orm/libsql`; use the stable `relations()` API, not Drizzle v1 RC relational-query examples                                            |
| Authentication   | `better-auth@1.7.3`                                                                        | Compatible peer range includes Next 16, React 19, Drizzle ORM 0.45.2 and Drizzle Kit 0.31.10; use its SQLite Drizzle adapter and generated schema mapping              |
| Images           | `@imagekit/nodejs@7.11.0`, `sharp@0.35.4`                                                  | Instantiate `ImageKit` with the private key; use SDK `files.upload`, `files.get`, `files.delete`, and `cache.invalidation.create` methods behind a server-only adapter |
| Validation/forms | `zod@4.5.4`, `react-hook-form@7.87.0`, `@hookform/resolvers@5.9.1`                         | Shared Zod schemas; repeat validation on the server                                                                                                                    |
| UI utilities     | `lucide-react@1.41.0`, `clsx@2.1.1`, `tailwind-merge@3.6.0`                                | Lucide is the sole general icon family                                                                                                                                 |
| Tests            | `vitest@4.1.11`, Testing Library, `@playwright/test@1.63.0`, `@axe-core/playwright@4.13.0` | Vitest 4 satisfies Better Auth's stable peer range; Playwright covers browser/visual checks                                                                            |

Production builds use Next.js 16's supported `--webpack` option. Turbopack's CSS
worker requires an internal loopback port that is unavailable in the restricted
local build environment; development retains the default Turbopack server.
`experimental.useTypeScriptCli` is disabled so Next uses TypeScript 5's compiler
API instead of its detached CLI child process; `pnpm typecheck` remains the
explicit strict checker used locally and in CI.

## Environment boundary

Only `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` may be read by
client modules. Database tokens, Better Auth/Google credentials, the ImageKit
private key, and operational secrets stay in `server-only` modules. Empty values
are treated as missing, and provider-specific accessors name missing variables
without logging values.

Local development defaults to `file:./data/trailnote.db`. A non-file database URL
requires `TURSO_AUTH_TOKEN`; auth, uploads and scheduled operations report their
own missing credential sets only when those capabilities are invoked.
