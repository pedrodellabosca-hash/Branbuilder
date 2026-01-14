# Brandforge Local Healthcheck Report

## Issues Found
- Venture v1 prompt wrappers and schemas were missing after reset, so venture_* stages were not runnable.
- Prisma schema lacked Project.moduleVenture, causing seed/runtime project creation failures.
- Venture flow smoke test depended on a missing gating map.

## Fixes Applied
- Added Venture prompt wrappers with signature checks and JSON parsing for intake, validation, persona, and plan.
- Added Venture Zod schemas and registered venture_* stage keys.
- Wired venture_* prompts in the prompt registry and stage auto-creation.
- Added minimal stage dependency map for venture pipeline tests.
- Added moduleVenture to Prisma schema with a migration.
- Added venture prompt verification and smoke test scripts that run without tsconfig-paths.

## Files Touched
- app/api/projects/route.ts
- lib/prompts/registry.ts
- lib/prompts/stages/venture-intake.ts
- lib/prompts/stages/venture-validation.ts
- lib/prompts/stages/venture-persona.ts
- lib/prompts/stages/venture-plan.ts
- lib/stages/gating.ts
- lib/stages/runStage.ts
- lib/stages/schemas.ts
- prisma/schema.prisma
- prisma/migrations/20260114120000_add_module_venture/migration.sql
- scripts/test-venture-prompts.ts
- scripts/smoke-test-venture-flow.ts
- PROMPT_MAPPING_REPORT.md

## Commands Run
- `npm run verify:db`
- `npx prisma migrate dev --skip-seed`
- `npx prisma db seed`
- `npx tsx scripts/test-venture-prompts.ts`
- `npx tsx scripts/smoke-test-venture-flow.ts`

## Command Issues
- `npm run verify:db` failed: configured script target is missing from the repository.
- `npx prisma migrate dev --skip-seed` failed: migration `20260114094000_sync_schema` fails on shadow DB (WorkflowSetVersion missing).

## Smoke Test Results
- `venture_intake` executed with MOCK provider.
- Output version approved.
- Downstream invalidation verified (venture_idea_validation, venture_buyer_persona -> NOT_STARTED).

## How to Verify Manually
1) `npm run verify:db`
2) `npx prisma migrate dev --skip-seed`
3) `npx prisma db seed`
4) `npx tsx scripts/test-venture-prompts.ts`
5) `npx tsx scripts/smoke-test-venture-flow.ts`
