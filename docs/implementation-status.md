# Implementation status

Last updated: 8 September 2026

| Work order                                           | Status      | Changed files / evidence                                                                                                                                                                                                                   | Limitations                                                                                                                                      |
| ---------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| W00 — foundation and compatibility                   | Complete    | Exact `pnpm-lock.yaml` dependency graph; environment template/validation; CI; error and not-found boundaries; `docs/dependency-baseline.md`                                                                                                | Hosted CI awaits the first push; local `.env` must use documented `TURSO_*` names for remote checks                                              |
| W01 — schema, migrations and data fixtures           | In progress | Drizzle schema/migration, auth schema, local/production seeds; 5 database integration tests                                                                                                                                                | Empty/existing local migration passes; remote Turso staging migration was not authorized or run                                                  |
| W02 — domain services and invariants                 | Complete    | Contribution/reaction services, shared validation/utilities; 7 transactional integration tests and 3 domain unit tests                                                                                                                     | Provider-backed photo attachment is verified separately by W06                                                                                   |
| W03 — design primitives and shell                    | Complete    | Semantic tokens, responsive shell/primitives/Radix overlays, development gallery; 390/1440 screenshots and browser checks                                                                                                                  | Manual real-device keyboard check remains part of W10                                                                                            |
| W04 — real search and destination reading            | Complete    | Home/search/destination routes, DTO queries, cursor listing, accessible combobox; query integration and public browser tests                                                                                                               | Screenshots use deterministic fictional local fixtures                                                                                           |
| W05 — Google auth, draft and text contribution       | In progress | Better Auth Google route/client, sign-in screen, composer, draft recovery, validated Server Action and database-backed browser publish                                                                                                     | Manual Google OAuth staging flow remains provider-dependent and unrun; browser auth uses test-created database sessions, not Google              |
| W06 — ImageKit pipeline and photo UX                 | In progress | Browser normalization/photo controls, authenticated upload/delete routes, atomic attachment, responsive delivery, retry/verification service, cleanup reconciliation, 4 upload integration tests                                           | Real ImageKit staging flow and the complete visual image corpus remain provider-dependent and unrun                                              |
| W07 — detail, confirmations and changed information  | Complete    | Public detail/update routes; redacted detail/viewer DTOs; revision-aware reaction actions; update timeline/history; contain-fit lightbox; canonical copy fallback; 7 service tests and 8 focused browser journeys; `detail-{390,1440}.png` | Real ImageKit-backed photo rendering remains part of W06's unrun provider corpus; reports and contact reveal remain W08 scope                    |
| W08 — own content, reports, contacts and moderation  | In progress | `/me`, author edit/delete, progressive contact reveal/removal, reports, protected moderation queue/actions, moderator/account support scripts, policy pages; 20 database integration tests                                                 | No W08-specific browser journeys/screenshots yet; account-erasure's real ImageKit delete/purge requires provider credentials and was not invoked |
| W09 — resilient behavior and operational integration | Not started | —                                                                                                                                                                                                                                          | Depends on W04–W08                                                                                                                               |
| W10 — complete quality audit and release evidence    | Not started | —                                                                                                                                                                                                                                          | Depends on W00–W09                                                                                                                               |

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

## W01–W05 carried-forward and current suite verification

- Local migration applied successfully to `file:./data/trailnote.db`; the
  development seed reran idempotently. Remote Turso was deliberately not mutated.
- `corepack pnpm test` — passed, 2 files / 8 unit tests.
- `corepack pnpm test:integration` — passed, 3 files / 16 integration tests.
  Coverage includes migration constraints, seed idempotency, alias and wildcard
  search, visible root counts, pagination, transactional rollback, concurrency,
  revision-aware confirmations and cross-user authorization.
- `corepack pnpm lint`, `corepack pnpm typecheck`, and `corepack pnpm build` —
  passed after the final composer layout adjustment.
- `corepack pnpm test:e2e` against an isolated, deterministically seeded local
  server — 20 UI tests passed at 320/390/1440, including no horizontal overflow,
  alias keyboard selection, filter/back state, dialog focus restoration, and axe
  scans with no serious/critical findings, plus guest composer draft return.
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
  unit tests, 16 integration tests, 20 browser tests, and the webpack production
  build pass locally. The real provider corpus and staging credentials were not
  available, so W06 remains in progress rather than being marked complete.

## W07 verification

- Detail queries return explicit DTO fields only, keep contacts redacted, enforce
  visible active authors and parent visibility, and separate current-version
  updates from `Updates on an earlier version` after a root edit.
- The changed-fare fixture and browser journey retain the original report at
  `₹35 / person / trip` and attribute the linked update at
  `₹40 / person / trip`; a new authenticated browser update leaves the original
  `₹35 / person / trip` price intact.
- Integration tests prove current-revision confirmation uniqueness, stale
  confirmation removal conflicts, old observer months are excluded from
  freshness, edits reset current confirmation counts, and prior updates/history
  stay attached to their original revision. The warning badge remains after a
  new confirmation.
- Database-backed Better Auth test sessions exercise confirm, month correction,
  undo and Helpful without a production auth bypass. Guest confirmation returns
  to a focused intent without casting a vote. A forced transport failure proves
  optimistic Helpful state and count roll back to server truth.
- Update mode locks destination/category, presents the original report read-only,
  restores a guest draft across sign-in, publishes through the real contribution
  service, and links direct update detail back to the visible root.
- Photo UI uses stored dimensions, contain-fit frames, lazy responsive delivery,
  descriptive alt text, a labelled Radix lightbox, Escape/focus handling and
  previous/next controls. Actual ImageKit media corpus rendering is not claimed;
  that remains the recorded W06 provider blocker.
- Canonical `Copy link` strips query intent, announces success, and falls back to
  a selected read-only URL after an unavailable or stalled Clipboard API.
- `corepack pnpm format:check`, `corepack pnpm lint`, `corepack pnpm typecheck`,
  8 unit tests, 16 integration tests, 20 browser tests, and the Next.js 16 webpack
  production build pass. The browser suite includes an axe scan of detail with no
  serious/critical findings.
- Screenshot evidence compared with the clean detail reference:
  `docs/screenshots/detail-390.png` and
  `docs/screenshots/detail-1440.png`. Previously referenced W03–W05 local captures
  are now also retained under `docs/screenshots/`.

## W08 current verification

- Contact detail DTO serialization is tested to exclude the phone number until the
  same-origin reveal endpoint succeeds. Contact-removal requests are public but
  rate-limited and queue-only; moderator-only resolution hides the contact
  immediately.
- Report queues contain report context and targets but no reporter email or contact
  number. Integration tests prove a traveler cannot resolve either queue, while a
  moderator can hide a contribution, restore it, and suspend an author with public
  visibility changing immediately.
- Author editing reuses the contribution validation/concurrency service; cross-user
  and stale-edit rejection remain covered by the contribution service tests. Author
  deletion uses the existing transactional cleanup scheduling path.
- The account-erasure support service is tested against a related root/update graph:
  it removes the dependent update rather than orphaning it, removes related data,
  and leaves `PRAGMA foreign_key_check` clean. Its CLI performs ImageKit delete and
  purge before database erasure; that real provider call is deliberately unrun.
- `corepack pnpm format:check`, `corepack pnpm lint`, `corepack pnpm typecheck`,
  unit tests (8), integration tests (20), and the Next.js 16 webpack build pass
  locally.
- The existing browser suite initially passed 12 journeys before its copy-link case
  timed out with an empty live-status message; the same focused case passed on an
  immediate isolated rerun. W08-specific authenticated account/moderation browser
  journeys and 390/1440 screenshots are still unrun, so W08 remains in progress.
