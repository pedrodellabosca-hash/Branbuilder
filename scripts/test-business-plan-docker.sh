#!/usr/bin/env sh
set -eu

CONTAINER_NAME="brandforge-pg-test"
POSTGRES_PORT="55432"
POSTGRES_DB="brandforge_test"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"
WAIT_SECONDS="30"
LOG_FILE=".business-plan-docker-test.log"

REUSE_CONTAINER="${REUSE_CONTAINER:-}"
BP_STAGES="${BP_STAGES:-1,2,3}"
UPDATE_BP_SNAPSHOTS="${UPDATE_BP_SNAPSHOTS:-0}"

# Default reuse policy:
# - CI: do not reuse (clean, deterministic)
# - Local: reuse for speed
if [ -z "${REUSE_CONTAINER}" ]; then
  if [ "${CI:-}" = "1" ]; then
    REUSE_CONTAINER="0"
  else
    REUSE_CONTAINER="1"
  fi
fi

cleanup() {
  if [ "${REUSE_CONTAINER}" != "1" ]; then
    docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker no esta disponible. Aborta."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker no esta disponible. Aborta."
  exit 1
fi

reuse=0
if [ "${REUSE_CONTAINER}" = "1" ]; then
  if docker ps --filter "name=^/${CONTAINER_NAME}$" --format '{{.ID}}' | grep -q .; then
    if docker exec "${CONTAINER_NAME}" sh -c "pg_isready -U '${POSTGRES_USER}' -d '${POSTGRES_DB}'" >/dev/null 2>&1; then
      echo "Postgres listo."
      reuse=1
    else
      docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
    fi
  fi
fi

if [ "${reuse}" -eq 0 ]; then
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  docker run -d --pull=missing --name "${CONTAINER_NAME}" \
    -e POSTGRES_DB="${POSTGRES_DB}" \
    -e POSTGRES_USER="${POSTGRES_USER}" \
    -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
    -p "${POSTGRES_PORT}:5432" \
    postgres:16 >/dev/null

  echo "Esperando Postgres en docker..."
  elapsed=0
  while true; do
    if docker exec "${CONTAINER_NAME}" sh -c "pg_isready -U '${POSTGRES_USER}' -d '${POSTGRES_DB}'" >/dev/null 2>&1; then
      break
    fi

    if [ "${elapsed}" -ge "${WAIT_SECONDS}" ]; then
      echo "Timeout esperando Postgres."
      docker ps -a --filter "name=${CONTAINER_NAME}" || true
      docker logs --tail 200 "${CONTAINER_NAME}" || true
      exit 1
    fi

    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo "Postgres listo."
fi

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"
export DATABASE_URL
export RUN_DB_TESTS="1"
export NODE_ENV="test"
export NODE_OPTIONS=""
unset NODE_OPTIONS

# Ensure schema is applied for tests
npx prisma migrate deploy

: > "${LOG_FILE}"

run_stage() {
  stage="$1"

  if [ "${UPDATE_BP_SNAPSHOTS}" = "1" ]; then
    case "${stage}" in
      1) cmd="npm run test:business-plan:update-snapshot" ;;
      2) cmd="npm run test:business-plan:stage2:update-snapshot" ;;
      3) cmd="npm run test:business-plan:stage3:update-snapshot" ;;
      *) echo "Unknown stage: ${stage}"; exit 1 ;;
    esac
  else
    case "${stage}" in
      1) cmd="npm run test:business-plan" ;;
      2) cmd="npm run test:business-plan:stage2" ;;
      3) cmd="npm run test:business-plan:stage3" ;;
      *) echo "Unknown stage: ${stage}"; exit 1 ;;
    esac
  fi

  echo "Running Business Plan Stage ${stage}: ${cmd}" | tee -a "${LOG_FILE}"
  sh -c "${cmd}" >>"${LOG_FILE}" 2>&1 || {
    status=$?
    echo "Tests FAIL (exit ${status})"
    tail -n 200 "${LOG_FILE}" || true
    exit "${status}"
  }
}

old_ifs="$IFS"
IFS=","
for stage in ${BP_STAGES}; do
  run_stage "${stage}"
done
IFS="$old_ifs"

echo "Tests OK"
