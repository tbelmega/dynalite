# Test TypeScript Migration Handoff

This file records the current state of the remaining test-file migration so a fresh agent can resume without replaying prior context.

## Current Branch State

- Main checkout branch: `main`
- Current `main` tip: `484f5e2`
- Active implementation worktree: `.worktrees/test-ts-migration`
- Active worktree branch: `test-ts-migration`
- Current worktree HEAD: `90ec4d6`
- `main` has not been fast-forwarded with the latest two migrations yet

## Source Of Truth For Migration Process

- Follow [`docs/convert-test-file-to-typescript.md`](/home/thiemo/workspace/dynalite/docs/convert-test-file-to-typescript.md)
- Important repo rule from the user: each migrated test file must be its own commit
- A single migration commit may touch multiple files if needed for that test migration
- The file rename must use `git mv`, not delete-and-recreate

## Completed Migrations

These test files have already been migrated:

1. `test/describeTable.ts` via `bc028b0`
2. `test/describeTimeToLive.ts` via `2e791c5`
3. `test/tagResource.ts` via `13e65f0`
4. `test/untagResource.ts` via `caa8a56`
5. `test/listTagsOfResource.ts` via `a073572`
6. `test/deleteTable.ts` via `0e10755`
7. `test/listTables.ts` via `bb3acce`
8. `test/connection.ts` via `700cb6a`
9. `test/updateTable.ts` via `7402568`
10. `test/getItem.ts` via `b736985`
11. `test/deleteItem.ts` via `526c32a`
12. `test/createTable.ts` via `484f5e2`
13. `test/updateItem.ts` via `c0aff7f` on `test-ts-migration`
14. `test/query.ts` via `90ec4d6` on `test-ts-migration`

## Remaining Files

These source `.js` tests still need migration:

1. `test/scan.js`
2. `test/helpers.js`

## Required Ordering Constraint

`test/helpers.js` must be migrated last.

Reason:

- Already-migrated `.ts` tests currently use runtime imports like `require('../../test/helpers')`
- Those imports resolve from emitted `dist/test/*.js` back to the source `test/helpers.js`
- Renaming `test/helpers.js` too early will break both remaining JS tests and already-migrated TS tests

When migrating `test/helpers.js`:

- rename with `git mv test/helpers.js test/helpers.ts`
- update already-migrated TS tests that still import `../../test/helpers` so their emitted runtime import becomes `./helpers`
- verify the emitted `dist/test/*.js` files resolve `./helpers` to `dist/test/helpers.js`

## Verification Commands

After each single-file migration and before its commit, all of these must pass:

```sh
bun run typecheck
bun run build:test-ts
bun run test:migration
```

Only after the final remaining migration is complete:

```sh
bun run test
```

## Shared Type Migration Pattern

During the completed migrations, reusable protocol and test helper types were added to `types/types.ts`.

Continue that pattern:

- put new reusable test/protocol types in `types/types.ts`
- do not create new type files during this migration
- prefer raw DynamoDB wire-shape types over SDK runtime types when the test asserts against raw JSON bodies

## Notes From Completed Work

- `scripts/add-test-helper-types.js` was adjusted earlier in the migration and is already committed
- `test/connection.ts` required a runtime import fix from `require('..')` to `require('../..')` so the emitted `dist/test/connection.js` resolves the package root correctly
- Table-related tests now rely on expanded shared types in `types/types.ts`, including:
  - `TableDescriptionSummary`
  - `GlobalSecondaryIndexDescription`
  - `UpdateTableResponse`
  - `CreateTableResponse`
  - `GetItemRequest`
  - `GetItemResponse`
- `test/updateItem.ts` added shared update-related types in `types/types.ts`:
  - `UpdateAttributeUpdate`
  - `UpdateItemRequest`
  - `UpdateItemResponse`
- `test/query.ts` added shared query-related types in `types/types.ts`:
  - `QueryCondition`
  - `QueryRequest`
  - `QueryResponse`
- `test/query.ts` now uses a local typed `forEach` wrapper around `async.forEach`; reuse that pattern in `test/scan.ts` if the same callback-inference issue appears
- Both `c0aff7f` and `90ec4d6` passed:
  - `bun run typecheck`
  - `bun run build:test-ts`
  - `bun run test:migration`

## Suggested Resume Sequence

Resume with:

1. continue from `.worktrees/test-ts-migration` at `90ec4d6`
2. migrate `test/scan.js`
3. stop after the `test/scan.js` migration is verified and committed
4. do not start `test/helpers.js` in that follow-up session

This preserves the verified per-file commit sequence already established on the worktree branch and leaves the shared-helper migration for a later handoff.
