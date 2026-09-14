# TrailNote

Practical, first-hand travel tips for exploring India.

TrailNote helps travellers discover destinations and share useful, current
details such as costs, transport, stays, food, safety, and accessibility.

## Getting started

### Requirements

- Node.js 24
- Corepack

### Setup

```bash
corepack enable
corepack pnpm install --frozen-lockfile
cp .env.example .env.local
corepack pnpm db:migrate
corepack pnpm db:seed:dev
corepack pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Local development uses a file-based database by default. Google, Turso,
ImageKit, and Geoapify credentials are only needed for their respective
features. See [`.env.example`](.env.example) for all configuration options.

## Commands

```bash
corepack pnpm dev               # Start the development server
corepack pnpm build             # Create a production build
corepack pnpm lint              # Run ESLint
corepack pnpm typecheck         # Check TypeScript
corepack pnpm test              # Run unit tests
corepack pnpm test:integration  # Run integration tests
corepack pnpm test:e2e          # Run end-to-end tests
```

## Documentation

- [Implementation plan](docs/implementation-plan.md)
- [Implementation status](docs/implementation-status.md)
- [Product specification](docs/crowdsourced-practical-travel-intelligence.md)

## Tech stack

Next.js, React, TypeScript, Drizzle ORM, libSQL, Better Auth, and Tailwind CSS.
