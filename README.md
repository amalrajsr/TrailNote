# TrailNote

TrailNote is a mobile-first knowledge base for practical, first-hand travel
information in India. The implementation contract lives in
[`docs/implementation-plan.md`](docs/implementation-plan.md), and progress is
tracked in [`docs/implementation-status.md`](docs/implementation-status.md).

## Local setup

Requirements: Node.js 24 and Corepack.

```bash
corepack pnpm install --frozen-lockfile
cp .env.example .env.local
corepack pnpm dev
```

Local database development defaults to `file:./data/trailnote.db`. Provider
credentials are validated only when their corresponding capability is used, so
the UI and local database can be developed without Google, Turso, or ImageKit.

Do not commit `.env` files. Only `.env.example` belongs in version control.

## Quality checks

```bash
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

The database, browser, visual, moderator, and account scripts are wired in
`package.json`; their implementations arrive with the work orders that own those
features.
