# Brandforge Local Healthcheck Report

## Issues Found
- Prisma schema drift vs migrations caused missing columns/tables (seed failed: `Project.moduleVenture` missing).
- Venture module stages created with legacy keys (`intake`, `validation`, `persona`, `business_plan`) while runtime uses `venture_*` keys, breaking UI->API->Job wiring for Venture flow.
- Output panel silently ignored fetch failures and always showed debug panels, hiding user-facing error state.
- `db:up` failed with unclear Docker daemon errors when Docker was not running.

## Fixes Applied
- Added a migration to align DB schema with `prisma/schema.prisma`, including `moduleVenture` and related registry tables/enums.
- Updated Venture stage keys in project creation to `venture_intake`, `venture_idea_validation`, `venture_buyer_persona`, `venture_business_plan`.
- Improved Output panel UX: show fetch/approve/save errors; hide debug panels outside development.
- Added Docker preflight check to `db:up` for clear failures when Docker is not running.
- Updated `DATABASE_URL` guidance in `.env.example` to use `127.0.0.1:5432`.
- Added a focused Venture smoke test script to validate venture_intake -> approve -> invalidation.

## Files Touched
- `.env.example`
- `package.json`
- `scripts/check-docker.sh`
- `prisma/migrations/20260114094000_sync_schema/migration.sql`
- `app/api/projects/route.ts`
- `components/project/StageOutputPanel.tsx`
- `scripts/smoke-test-venture-flow.ts`

## Commands Run
- `npm run db:up`
- `npm run verify:db`
- `npx prisma migrate reset --force`
- `npx prisma migrate deploy`
- `npx prisma migrate dev --skip-seed`
- `npx prisma db seed`
- `npm run dev` (short timeout)
- `npm run worker` (short timeout)
- `npx tsx -r tsconfig-paths/register scripts/smoke-test-venture-flow.ts`

## Smoke Test Results
- Project created.
- `venture_intake` executed with MOCK provider.
- Output version approved.
- Downstream invalidation verified (`venture_idea_validation`, `venture_buyer_persona` -> `NOT_STARTED`).

## How to Verify Manually
1) `npm run db:up`
2) `npm run verify:db`
3) `npx prisma migrate dev --skip-seed`
4) `npx prisma db seed`
5) In separate terminals:
   - `npm run dev`
   - `npm run worker`
6) Run smoke test:
   - `npx tsx -r tsconfig-paths/register scripts/smoke-test-venture-flow.ts`
7) UI validation:
   - Create a project with Venture module enabled.
   - Run Venture Intake, approve output.
   - Confirm downstream stages reset to `NOT_STARTED`.
