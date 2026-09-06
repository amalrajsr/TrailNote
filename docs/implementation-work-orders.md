# Implementation work orders

This file is an execution guide for the model implementing [the plan](implementation-plan.md). It is not a request to build extra features. Read [UI spec](ui-spec.md) and inspect [visual reference](design-reference.html) before frontend work.

## Execution protocol

1. Work in the current repository; inspect current files and git status first. Preserve unrelated/user changes. Do not reinitialize or overwrite the product brief.
2. Read the current work order's dependencies and relevant contract sections. Complete one work order at a time. Small internal subtasks are allowed; required acceptance criteria cannot be deferred without recording them.
3. Create `docs/implementation-status.md` with each W-ID marked Not started / In progress / Blocked / Complete, changed files, verification commands/results, screenshot paths and unresolved limitations. A blocked provider check does not become Complete just because mocks pass.
4. Use real domain functions, types and persistence. Fixtures belong only in development/test boundaries. Production components must not import fake arrays or return simulated success.
5. Make only necessary design changes. Tokens, spacing, form order and terminology are specified; do not simplify them to save implementation effort.
6. Every write validates on the server. Every changed query must preserve visibility, permissions and DTO redaction. Never spread database rows into client props.
7. Run relevant checks. Do not add tests that merely mirror trivial CSS or implementation details; prioritize domain invariants, concurrency, auth, real provider integration and core browser journeys.
8. Before declaring completion, list each acceptance item and its evidence. Report failing/unrun checks honestly. Never disable strict TypeScript, lint rules, tests or image limits to obtain green output.
9. Do not update visual baselines solely because tests fail. Compare with the reference and fix the implementation, unless an intentional user-approved design change explains the difference.
10. Avoid dependency/API drift. Read the pinned baseline; if an API changed, verify official documentation and update the smallest adapter plus tests. Do not swap the specified stack.

## W00 — foundation and compatibility

Dependencies: none. Read plan §§1,5,12.

Deliver: Next.js App Router/TypeScript project in place, pnpm lockfile, exact dependency baseline, scripts, env validation/example, formatting/linting, top-level error/not-found layouts, CI workflow. Respect existing files; don't scaffold into a nested accidental application directory.

Establish Node24 + stable Next16/React peer compatibility, stable Drizzle/libSQL pair, Better Auth adapter/schema version, Tailwind version conventions and ImageKit Node SDK method names. Record exact values after resolution in `dependency-baseline.md`. Choose a single relations API; do not consume Drizzle RC examples while pinning stable Drizzle. Create operational gitignore additions for `.env*` except `.env.example`, build/test outputs, local DB files and dependencies, preserving the user's entries.

Acceptance: clean install from lockfile, real lint/typecheck/build commands pass; no secrets/client-server boundary leakage; app boots; CI runs the same commands. Missing credentials are reported specifically; local UI/database development remains possible.

## W01 — schema, migrations and data fixtures

Dependencies: W00. Read plan §§4,6,7,11.

Deliver: generated auth schema, travel/operations schema including mutation receipts and payload digests, migrations, singleton DB adapter, migration/seed scripts, development fixture dataset and destination-only production seed. Include foreign keys, CHECK constraints and required indexes, not merely TypeScript enums.

Acceptance: migrations apply to empty and existing local DB without drift; remote Turso staging apply succeeds when credentials exist; all FK/check/unique behaviors tested; development seed reruns idempotently and refuses production; no fabricated production tips. Validate circular parent/revision relationships and photo revision association order.

## W02 — domain services and invariants

Dependencies: W01. Read plan §§4,7.

Deliver: shared Zod schemas, money/month/freshness utilities, contribution create/edit/delete/update services, confirmations/helpful services, idempotency/concurrency handling and typed ActionResult. Use a temporary DB integration harness with realistic users.

Acceptance: null versus0 money; visible unit semantics; optional fields; future-month rejection; unique confirmation; no self-confirm; historical confirmations excluded; Changed leaves original intact; stale edit returns conflict; same mutation replay creates one record; transaction rollback leaves no partially attached photos; published update/root visibility rules hold.

Do not build elaborate generic repository abstractions or a universal form-generation framework. Domain-specific functions are easier to audit and implement consistently.

## W03 — design primitives and shell

Dependencies: W00. Read UI §§1–3,10; inspect all reference views.

Deliver: tokens, header/footer/container, buttons/inputs/select/textarea, category controls, status badge, accessible dialog/popover/menu, skeleton/empty/error components. Create a development-only component gallery or isolated test route for all interaction states; exclude it from production routing.

Acceptance: theme matches reference, controls have min44px targets, input values >=16px, focus visible, control boundaries readable, keyboard/dialog behavior works, reduced motion honored; screenshots at390/1440 and overflow check320. No default unthemed component library styles.

## W04 — real search and destination reading

Dependencies: W01,W02,W03. Read plan §7; UI §§4,5.

Deliver: public DTO/query layer, alias-aware search endpoint, home/results/destination pages, contribution cards, category/sort URL state, bounded pagination, metadata/loading/error/empty states. Decorative home SVG is repository-native; use real count data. Read queries do not require auth.

Acceptance: `bad` finds Badami, `Mysore` finds Mysuru once; stale responses ignored; SQL LIKE wildcards treated safely; filters/back/refresh work; empty/error distinct; hidden/suspended content excluded; root counts do not include updates; no N+1 aggregates; 12-per-page cap. Compare home/destination screenshots to reference.

## W05 — Google auth, draft and text contribution

Dependencies: W02,W03,W04. Read plan §§3,8; UI §§7,8.

Deliver: Better Auth Google-only route/client, real DB sessions, authorization helpers, sign-in panel/route, composer quick/category modes, draft recovery, required/optional fields, Server Action submission, repeat contribution success. Implement live session expiry/error paths.

Acceptance: anonymous reads; guest text → Google return → restored draft → explicit Share; OAuth cancellation preserves stored text; no contact/file promise across redirect; no auto publish; invalid return URL rejected; Google is the sole provider; all categories accept just useful text and inherited context; duplicate submit safe; optional expanded errors render accessibly; manual staging Google flow succeeds. CI sessions created directly by test harness, never a shipping auth bypass route.

## W06 — ImageKit pipeline and photo UX

Dependencies: W01,W02,W05. Read plan §9 completely; UI §§3,7,9.

Deliver: lazy browser normalization, authenticated bounded multipart handler, Sharp validation, reservation/idempotency, ImageKit pre-transform adapter with3 attempts, authoritative final metadata verification, photo attachment, progress/retry/remove/reorder, custom delivery loader and cleanup/reconciliation service. Configure function duration deliberately to support the bounded45-second handler, within the selected hosting plan.

Acceptance corpus: portrait with orientation tag; 12MP photo; detailed foliage/stone; text/sign/menu; transparent PNG; low-detail image <200KB; already-small image; corrupt file; fake MIME; animated image; >20MB source; >40MP dimensions. Accept only verified <=400,000-byte stored WebP, no upscaling, correct orientation, no EXIF/GPS. High-detail image must exercise fallback. Visual review confirms useful text/detail remains readable.

Failure acceptance: timeout after remote success is reconciled; abandoned ready files expire; rejected attempts deleted; upload from userA cannot be attached by userB; same file ID cannot be moved to unrelated contributions; unknown remote ID rejected; failed photo retains tip text; remote DB/image divergence repaired by jobs. Record actual stored bytes for every successful corpus photo and observed real ImageKit responses. Unit mocks alone do not complete W06.

## W07 — detail, confirmations and changed information

Dependencies: W02,W04,W05,W06. Read plan §4; UI §6.

Deliver: complete contribution detail, fact blocks, contain-fit photos/lightbox, current-version confirmation and month correction/undo, Helpful, linked update composer/timeline, revision-history disclosure, copy canonical link.

Acceptance: changed fare keeps original amount and attribution; confirmations after editing attach only to new revision; old observer month doesn't make content appear fresh; update badge cannot be cleared by helpful/new confirmation; guests return to intent without automatically voting; optimistic failure rolls back; hidden root hides direct update routes; 390/1440 screenshots match hierarchy.

## W08 — own content, reports, contacts and moderation

Dependencies: W02,W05,W07. Read plan §§4,10; UI §8.

Deliver: `/me`, author edit/delete, confirmation dialogs, reports, private contact storage/reveal/copy/call, public removal requests, moderator grant script, protected queue/actions/audit log, suspension filtering, account deletion support script. No full social profile or admin analytics dashboard.

Acceptance: cross-user edits fail; stale edit retained; contact absent from HTML/RSC/DTO/revisions until reveal; request does not expose queue; moderator role checked at every action; hide/restore/suspend has immediate consistent visibility; contact removals work without Google; deleting content schedules photo cleanup; account deletion script tested on related-data fixture graph without orphan public updates.

## W09 — resilient behavior and operational integration

Dependencies: W04–W08. Read plan §§7,10,12.

Deliver: persistent atomic rate limiting; Origin/CSRF boundaries; actual scheduled cleanup endpoint/config; retry leases/orphan reconciliation; logging redaction; policy pages; sitemap/canonical/robots; error monitoring hooks; staging migration/backup/restore/rollback runbook.

Acceptance: concurrent rate limit requests enforce caps; replay doesn't charge twice; cleanup authenticated and resumable; jobs recover from remote delete/purge errors; hidden content/contacts absent from sitemap/caches; removed files no longer served after managed purge; logs contain no sensitive user fields; no production placeholders or demo credentials. Provider outages show recoverable product states.

## W10 — complete quality audit and release evidence

Dependencies: W00–W09. Read plan §§11–13 and UI §§9,10.

Deliver: core browser E2E suite, approved deterministic visual baselines, mobile/desktop screenshots, accessibility results, measured performance report, staging provider verification, release checklist with actual results. Populate `docs/implementation-status.md` with final pass/fail/unrun status.

Acceptance: lint/typecheck/build/unit/integration/E2E pass; axe no serious/critical violations; manually keyboard test search/composer/dialog/lightbox/moderation; zoom200%;320/390/768/1024/1440 widths; real mobile keyboard and slow network; staged Google/Turso/ImageKit checks pass; all stored image corpus values <=400KB; no test bypass in production; three Lighthouse runs and staging query benchmark documented; backup/restore and cleanup verified.

When screenshots differ, compare spacing/type/card hierarchy against the supplied reference before accepting baselines. Do not claim pixel perfection from passing tests alone. Record any external blocker separately from completed implementation work.

## Copy-paste starting prompt

```text
Implement the application described in docs/implementation-plan.md.
Read that file, docs/ui-spec.md, docs/implementation-work-orders.md,
and inspect docs/design-reference.html before coding UI.

The product brief is crowdsourced-practical-travel-intelligence.md.
The stack is fixed: Next.js App Router + TypeScript, Turso, Drizzle,
ImageKit, and Google-only Better Auth. Do not swap providers or add scope.

Start with the first incomplete work order and execute in dependency order.
Keep docs/implementation-status.md current. Implement real functionality;
do not replace persistence/auth/uploads with production mocks or hardcoded data.
Preserve optional fields, quick-tip speed, revision-aware confirmations,
changed-price history and verified image size limits.

Match the visual reference and UI tokens at 390px and 1440px, and verify
all specified states, accessibility and intermediate screen widths.
Do not simplify the design or update baselines to conceal differences.

At each work-order boundary report files changed, acceptance checks passed,
checks not run and their concrete blockers, and screenshot evidence for UI.
Complete independently executable work even when external credentials are missing.
Never describe an untested integration or a mock as production-ready.
```

## Continuation prompt for a new implementation session

```text
Read docs/implementation-status.md and the four implementation/design documents.
Inspect current code and git changes. Resume the first unfinished work order.
Do not restart scaffolding, change the chosen design, discard existing work,
or call an externally blocked check complete. Verify the relevant acceptance
criteria and update the status file with evidence.
```
