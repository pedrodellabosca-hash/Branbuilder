# Business Plan Testing

## Overview
The Business Plan Engine uses staged, deterministic tests to validate core
behavior and regressions. Each stage focuses on a different level of the
engine so failures point to a specific area quickly.

## Stage Coverage

### Stage 1 (Structure + Diff)
- Validates snapshot creation, section structure, and basic diff behavior.
- Ensures template ordering and core invariants are stable.
- Uses a strict golden snapshot for deterministic output.

### Stage 2 (Generation + Queue + Snapshot)
- Exercises the real generation flow through the job queue.
- Confirms job completion metadata and generated content are recorded.
- Uses a strict golden snapshot for deterministic output.

## Snapshot Rules
- Tests are strict by default; mismatch = failure.
- Snapshots only update when an explicit environment flag is set.
- CI never regenerates snapshots; mismatches are treated as failures.

```sh
UPDATE_BP_STAGE1_SNAPSHOT=1
UPDATE_BP_STAGE2_SNAPSHOT=1
UPDATE_BP_STAGE3_SNAPSHOT=1
```

## Conventions

### Script Names
- `npm run test:business-plan` (Stage 1)
- `npm run test:business-plan:update-snapshot`
- `npm run test:business-plan:stage2`
- `npm run test:business-plan:stage2:update-snapshot`
- `npm run test:business-plan:stage3`
- `npm run test:business-plan:stage3:update-snapshot`

### Snapshot Locations
- `scripts/tests/business-plan/__snapshots__/stage1.json`
- `scripts/tests/business-plan/__snapshots__/stage2.json`
- `scripts/tests/business-plan/__snapshots__/stage3.json`
