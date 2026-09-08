# Implementation status

Last updated: 7 September 2026

| Work order                                           | Status      | Changed files / evidence                                                                                                                                                                         | Limitations                                                                                         |
| ---------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| W00 — foundation and compatibility                   | Complete    | Exact `pnpm-lock.yaml` dependency graph; environment template/validation; CI; error and not-found boundaries; `docs/dependency-baseline.md`                                                      | Hosted CI awaits the first push; local `.env` must use documented `TURSO_*` names for remote checks |
| W01 — schema, migrations and data fixtures           | In progress | Drizzle schema/migration, auth schema, local/production seeds; 5 database integration tests                                                                                                      | Empty/existing local migration passes; remote Turso staging migration was not authorized or run     |
| W02 — domain services and invariants                 | Complete    | Contribution/reaction services, shared validation/utilities; 5 transactional integration tests and 3 domain unit tests                                                                           | Provider-backed photo attachment is verified separately by W06                                      |
| W03 — design primitives and shell                    | Complete    | Semantic tokens, responsive shell/primitives/Radix overlays, development gallery; 390/1440 screenshots and browser checks                                                                        | Manual real-device keyboard check remains part of W10                                               |
| W04 — real search and destination reading            | Complete    | Home/search/destination routes, DTO queries, cursor listing, accessible combobox; query integration and public browser tests                                                                     | Screenshots use deterministic fictional local fixtures                                              |
| W05 — Google auth, draft and text contribution       | In progress | Better Auth Google route/client, sign-in screen, composer, draft recovery and validated Server Action                                                                                            | Manual Google OAuth staging flow and authenticated browser publish require provider verification    |
| W06 — ImageKit pipeline and photo UX                 | In progress | Browser normalization/photo controls, authenticated upload/delete routes, atomic attachment, responsive delivery, retry/verification service, cleanup reconciliation, 4 upload integration tests | Real ImageKit staging flow and the complete visual image corpus remain provider-dependent and unrun |
| W07 — detail, confirmations and changed information  | Not started | —                                                                                                                                                                                                | Depends on W02, W04–W06                                                                             |
| W08 — own content, reports, contacts and moderation  | Not started | —                                                                                                                                                                                                | Depends on W02, W05, W07                                                                            |
| W09 — resilient behavior and operational integration | Not started | —                                                                                                                                                                                                | Depends on W04–W08                                                                                  |
| W10 — complete quality audit and release evidence    | Not started | —                                                                                                                                                                                                | Depends on W00–W09                                                                                  |

## W00 verification

- `corepack pnpm install --frozen-lockfile` — passed; 517 packages restored from
  the locked content-addressed store with no resolution drift.
- `corepack pnpm format:check` — passed.
- `corepack pnpm lint` — passed.
- `corepack pnpm typecheck` — passed with strict TypeScript.
- `corepack pnpm test` — passed, 1 file / 5 environment-boundary tests.
- `corepack pnpm peers check` — passed with no peer dependency issues.
- `corepack pnpm build` — passed with the documented webpack production builder;
  `/` and `/_not-found` are statically generated.
- Production server boot — passed on localhost; `/` returned HTTP 200 and an
  unmatched route returned the custom body with HTTP 404.
- Client bundle variable-name scan — no server-secret variable references found
  under `.next/static`.
- CI runs the same install, format, lint, typecheck, test, and build commands. It
  has not run on a hosted runner because this worktree has not been pushed.

No screenshots are required for W00. The error and missing-page presentation is
foundational only; W03 owns final tokens, primitives, responsive screenshots,
and visual fidelity.

## W01–W05 verification

- Local migration applied successfully to `file:./data/trailnote.db`; the
  development seed reran idempotently. Remote Turso was deliberately not mutated.
- `corepack pnpm test` — passed, 2 files / 8 unit tests.
- `corepack pnpm test:integration` — passed, 3 files / 14 integration tests.
  Coverage includes migration constraints, seed idempotency, alias and wildcard
  search, visible root counts, pagination, transactional rollback, concurrency,
  revision-aware confirmations and cross-user authorization.
- `corepack pnpm lint`, `corepack pnpm typecheck`, and `corepack pnpm build` —
  passed after the final composer layout adjustment.
- `corepack pnpm test:e2e` against an isolated, deterministically seeded local
  server — 12 UI tests passed at 320/390/1440, including no horizontal overflow, alias keyboard
  selection, filter/back state, dialog focus restoration, and axe scans with no
  serious/critical findings, plus the guest composer validation/draft return
  journey.
- Screenshot evidence: `docs/screenshots/home-{390,1440}.png`,
  `destination-{390,1440}.png`, `components-{390,1440}.png`,
  `composer-{390,1440}.png`, and `sign-in-390.png`.

## W06 local verification

- Browser preparation validates JPEG/PNG/WebP inputs up to 20 MB, rejects
  animated PNG/WebP markers, honors decoded orientation, flattens transparency,
  preserves aspect ratio, avoids upscaling, and uses four bounded resize/quality
  passes to keep each relay upload below 3 MB.
- The authenticated upload handler accepts one multipart photo, enforces origin,
  envelope, persistent rate, decoded-format, dimension, and per-user processing
  limits, and never accepts browser-provided delivery metadata.
- ImageKit uploads use non-identifying attempt paths and fixed pre-transforms.
  Stored file metadata, byte size (at most 400,000), WebP MIME, path, dimensions,
  and metadata removal are checked before an asset becomes ready.
- Composer controls expose preparing/uploading/ready/error states, retry, remove,
  keyboard-operable reordering, optional alt text, a maximum of three photos,
  guest sign-in before file selection, and a disabled Share action while uploads
  are active. Ready IDs are revalidated and claimed atomically during publish.
- Cleanup covers rejected, cancelled, expired, abandoned, and lease-expired work;
  provider deletion and cache purge remain retryable.
- `corepack pnpm format:check`, `corepack pnpm lint`, `corepack pnpm typecheck`,
  unit tests, 14 integration tests, 12 browser tests, and the webpack production
  build pass locally. The real provider corpus and staging credentials were not
  available, so W06 remains in progress rather than being marked complete.
