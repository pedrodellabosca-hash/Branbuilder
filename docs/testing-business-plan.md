# Business Plan Tests (Local)

## Recommended

```sh
npm run test:business-plan:docker
```

## Update snapshot (Stage 1)

```sh
npm run test:business-plan:update-snapshot
```

## Stage 2

```sh
npm run test:business-plan:stage2
npm run test:business-plan:stage2:update-snapshot
```

Note: CI does not regenerate snapshots automatically.

## Stage 3

```sh
npm run test:business-plan:stage3
npm run test:business-plan:stage3:update-snapshot
```

Note: CI does not regenerate snapshots automatically.

## What update-snapshot does
- Re-generates `scripts/tests/business-plan/__snapshots__/stage1.json`.
- Use only when the output change is intentional.
- Commit the snapshot alongside the engine/test change.
- CI does not regenerate snapshots automatically (fails on mismatch).

## What test:business-plan:docker does
- Starts a local Postgres test DB in Docker (port 55432).
- Sets `DATABASE_URL` for `brandforge_test` with `schema=public`.
- Runs `prisma migrate deploy`.
- Runs `npm run test:business-plan`.
- Cleans up the container on exit; may reuse an already-healthy container for speed.
- Respects `REUSE_CONTAINER` (default 1 locally, 0 when `CI=1`).

## Manual option (advanced)

```sh
docker rm -f brandforge-pg-test || true
docker run -d --name brandforge-pg-test -e POSTGRES_DB=brandforge_test -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:16
export DATABASE_URL="postgresql://postgres:postgres@localhost:55432/brandforge_test?schema=public"
npx prisma migrate deploy
npm run test:business-plan
docker rm -f brandforge-pg-test
```

## Warning
- Do NOT use `env -i` unless you also pass `DATABASE_URL` and ensure Postgres is running.
- The test runner clears `NODE_OPTIONS` to avoid the `--localstorage-file` warning.
  If the warning still appears, it is coming from your host tooling.
