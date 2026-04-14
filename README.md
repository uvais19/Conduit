# Conduit

Conduit is an AI-powered social media management platform built with Next.js, TypeScript, Drizzle, and Auth.js.

## Prerequisites

- Node.js 18+
- npm 9+
- Neon Postgres database (for persistence)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env.local
```

3. Fill required values in `.env.local`:
- `DATABASE_URL`
- `AUTH_SECRET`
- `ENCRYPTION_KEY`
- `GEMINI_API_KEY` (or configure fallback provider)

4. Run database migrations:

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

5. Start development server:

```bash
npm run dev
```

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## What Is Persisted

- Content strategy in Postgres
- Auth users/sessions in Postgres
- Optimization proposals and competitor profiles in Postgres when `DATABASE_URL` is set
- In-memory fallback remains available for proposal/competitor flows in local/dev when DB is not configured

## Deployment (Vercel)

1. Create a Vercel project linked to this repository.
2. Set all production environment variables from `.env.example`.
3. Ensure `DATABASE_URL` points to production Neon database.
4. Run Drizzle migrations against production database.
5. Deploy and run smoke tests on critical routes:
- `/login`
- `/dashboard`
- `/strategy/optimize`
- `/analytics`
- `/analytics/competitors`

## Current Remaining Launch Tasks

- Complete final QA pass for role-based workflows and publishing edge cases
- Wire remaining in-memory stores to DB for full durability
- Add broader API integration tests for route handlers
