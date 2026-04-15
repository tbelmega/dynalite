# Implementation Plan

> Top-level tasks use checkbox (`[ ]` / `[~]` / `[x]`) syntax.

**Goal:** Remove `// @ts-nocheck` from every helper TypeScript module under `test/helpers.ts`, `test/util/instance/**`, and `test/util/legacy/**`, and replace it with explicit, narrow, maintainable TypeScript types. Every function in scope must declare parameter types and return types explicitly. Shared helper contracts must model real attribute shapes and nullability precisely, without `any`, non-null assertions, or broad “escape hatch” casts.

**Tech Stack:** CommonJS TypeScript, Node HTTP types, Mocha, `should`, Bun-based `tsgo` compilation, ESLint

## Capabilities

The repository should end with all helper modules participating in normal TypeScript checking. The helper stack should expose clear contracts for request bodies, response bodies, callback signatures, helper instance state, table definitions, and legacy assertion payloads. Each file should state function inputs and outputs explicitly so later test migrations can rely on these modules without reintroducing unchecked shapes. The plan should also be executable by an orchestrator agent that keeps its own context window lean and delegates each task to a fresh worker with isolated context.

## Component Architecture

- `types/types.ts` remains the single shared destination for reusable helper-domain types, especially request/response envelopes, helper state, callback signatures, table-definition shapes, and serialization/validation assertion payloads.
- `test/helpers.ts` is the bridge between the legacy helper export surface and the instance helper factory. It should end with fully-typed imports/exports and no unchecked module glue.
- `test/util/instance/configure.ts` defines the canonical instance-helper state object and should become the source of truth for the configured helper shape.
- `test/util/instance/request.ts`, `safe-cleanup.ts`, `table-data.ts`, `table-lifecycle.ts`, and `test-tables.ts` progressively attach behavior onto the configured helper object and therefore depend on a shared typed helper interface rather than ad hoc mutation.
- `test/util/instance/helpers.ts` wires the instance helper composition together and should consume only typed attachment APIs.
- `test/util/legacy/naming.ts`, `request.ts`, `table-lifecycle.ts`, `table-data.ts`, and `assertions.ts` expose the older callback-oriented helper surface and need narrow contracts for legacy tests and assertion helpers.
- `test/util/legacy/helpers.ts` aggregates the legacy helper globals and exported functions. It is the highest-risk legacy file because it mixes mutable module state, server lifecycle, and re-exported helper functions.

## Interactions

- Execute the tasks strictly in order because later slices depend on the shared contracts introduced earlier.
- The top-level orchestrator should preserve a relatively clean context window by avoiding detailed re-analysis after each task and instead relying on the saved plan, the current tree state, and short worker result summaries.
- Before each task, spawn a fresh worker with `fork_context: false`; do not reuse the previous worker.
- Each worker prompt must be self-contained and include:
  - the exact owned files for that task
  - the plan path `docs/plans/2026-04-14-helper-types-no-ts-nocheck.md`
  - the conversion guide path `docs/convert-test-file-to-typescript.md`
  - the repo rules that matter here: explicit parameter and return types for every function, narrow/null-accurate types, no `any`, no non-null assertions, no unrelated refactors, preserve CommonJS runtime behavior
  - the required verification commands for that task
  - the exact commit message to use on success
- Each worker should read the full plan file to understand the overall sequencing, shared-type strategy, and downstream constraints, but must execute only the assigned task.
- The full plan file is background context only; the owned-files list in the worker prompt is authoritative for what the worker may edit.
- Workers must not preemptively implement future-task work, even if they notice adjacent cleanup opportunities while reading the full plan.
- Start each task by removing `// @ts-nocheck` from the owned file or files and running `bun run typecheck` to expose the next real typing failures at the public helper interface.
- Add reusable helper types to `types/types.ts` only when the type is genuinely shared across modules. Keep one-off local helper types inside the owning file.
- Every touched function must declare explicit parameter types and an explicit return type, including local nested functions and callback signatures where practical.
- Nullability must reflect runtime behavior exactly. If a field is absent until later initialization, model that as optional or `T | null`; otherwise keep it non-nullable.
- Do not use `any`, non-null assertions (`!`), or blanket type assertions to bypass errors. If TypeScript cannot prove a shape, add a tighter type, a runtime guard, or refactor the helper contract.
- Keep CommonJS runtime behavior unchanged. Do not mix this work with module-format changes or unrelated refactors.
- After implementing each task, the worker should run the full verification set for that task, inspect the diff for only the owned files plus intentional shared-type changes, and commit only if every command passes.
- After a task succeeds, the worker should update this plan file to mark the completed task subtasks as done before creating the commit.
- The orchestrator should carry forward only the minimal outcome of each task: commit SHA if created, files touched, new shared types added to `types/types.ts`, verification result, and any blocker if the task failed.
- Each worker should return a short handoff summary containing: files changed, shared types added or modified, commands run, pass/fail results, plan checkboxes updated, and commit SHA or blocker.

---

## File Map

| Path | Role |
|------|------|
| `docs/plans/2026-04-14-helper-types-no-ts-nocheck.md` | Execution plan for removing unchecked helper typing |
| `types/types.ts` | Shared destination for reusable helper and request/response types |
| `test/helpers.ts` | Top-level helper bridge between legacy and instance helpers |
| `test/util/instance/configure.ts` | Creates the configured helper state object |
| `test/util/instance/helpers.ts` | Composes the instance helper by attaching behaviors |
| `test/util/instance/request.ts` | Instance helper request lifecycle and request option builders |
| `test/util/instance/safe-cleanup.ts` | Safe deletion and cleanup helpers for instance-mode tests |
| `test/util/instance/table-data.ts` | Instance helper bulk put, scan, and clear-table utilities |
| `test/util/instance/table-lifecycle.ts` | Instance helper create/delete/wait table lifecycle utilities |
| `test/util/instance/test-tables.ts` | Instance helper seeded test table creation and account-id resolution |
| `test/util/legacy/naming.ts` | Legacy random naming and string-decrement helpers |
| `test/util/legacy/request.ts` | Legacy request transport and serialization assertion helpers |
| `test/util/legacy/table-lifecycle.ts` | Legacy table lifecycle helpers |
| `test/util/legacy/table-data.ts` | Legacy table data helpers |
| `test/util/legacy/assertions.ts` | Legacy validation, serialization, and access-denied assertion helpers |
| `test/util/legacy/helpers.ts` | Legacy helper aggregate module with global mutable state |

## [x] Task 1: Establish shared helper contracts in `types/types.ts`

- [x] Spawn a fresh worker with `fork_context: false` and a self-contained prompt that owns `types/types.ts` plus the smallest helper file or files needed to surface the first shared-type failures, and nothing else.
- [x] Remove `// @ts-nocheck` from the owned helper file or files, then run `bun run typecheck` to surface the missing contracts.
- [x] Add reusable types for helper callbacks, helper request options, helper response bodies, helper state, table definitions, and legacy assertion inputs to `types/types.ts`.
- [x] Ensure every new shared type is narrow: model known attributes explicitly, keep optional fields only where runtime behavior truly omits them, and prefer discriminated or named types over `Record<string, unknown>` when the structure is known.
- [x] Define shared callback and async result types that allow instance and legacy helpers to state explicit parameter and return types without `any`.
- [x] Run `bun run typecheck`, `bun run build:test-ts`, and `bun run test:migration`.
- [x] Review the post-verification diff and confirm it is limited to the owned files plus intentional shared-contract edits.
- [x] Update this plan file to mark the completed subtasks as done.
- [x] Commit with message: `Add typed helper contracts for test utilities`

## [ ] Task 2: Type the instance helper configuration and composition layer

- [ ] Spawn a fresh worker with `fork_context: false` and a self-contained prompt that owns `test/util/instance/configure.ts`, `test/util/instance/helpers.ts`, optional `types/types.ts` edits, and nothing else.
- [ ] Remove `// @ts-nocheck` from `test/util/instance/configure.ts` and `test/util/instance/helpers.ts`, then run `bun run typecheck` to expose the current helper-shape mismatches.
- [ ] Make `createConfiguredTestHelper` return an explicitly-declared configured helper type that accurately models nullable server state, request options, generated table names, and environment-derived configuration values.
- [ ] Type `createTestHelper` and each attached method registration so the composed helper surface is explicit and incremental, without relying on unchecked property writes.
- [ ] Declare explicit parameter and return types for `createConfiguredTestHelper`, `getRandomPort`, `createTestHelper`, and every local helper function in these files.
- [ ] Run `bun run typecheck`, `bun run build:test-ts`, and `bun run test:migration`.
- [ ] Review the post-verification diff and confirm it is limited to the owned files plus intentional shared-type additions.
- [ ] Update this plan file to mark the completed subtasks as done.
- [ ] Commit with message: `Type instance helper configuration`

## [ ] Task 3: Type the instance request and lifecycle modules

- [ ] Spawn a fresh worker with `fork_context: false` and a self-contained prompt that owns `test/util/instance/request.ts`, `test/util/instance/table-lifecycle.ts`, optional `types/types.ts` edits, and nothing else.
- [ ] Remove `// @ts-nocheck` from `test/util/instance/request.ts` and `test/util/instance/table-lifecycle.ts`, then run `bun run typecheck` to surface the current request/response and callback errors.
- [ ] Introduce precise request/response contracts for `startServer`, `stopServer`, `request`, `opts`, `createAndWait`, `createAndWaitWithRetry`, `deleteAndWait`, `waitUntilActive`, and `waitUntilDeleted`.
- [ ] Model the DynamoDB response bodies these files inspect with narrow optional fields, especially `Table`, `TableStatus`, `GlobalSecondaryIndexes`, and `__type`.
- [ ] Type nested retry helpers and callback signatures explicitly so control flow remains readable and no branch relies on non-null assertions.
- [ ] Run `bun run typecheck`, `bun run build:test-ts`, and `bun run test:migration`.
- [ ] Review the post-verification diff and confirm it is limited to the owned files plus intentional shared-type additions.
- [ ] Update this plan file to mark the completed subtasks as done.
- [ ] Commit with message: `Type instance request and lifecycle helpers`

## [ ] Task 4: Type the instance cleanup, table-data, and test-table modules

- [ ] Spawn a fresh worker with `fork_context: false` and a self-contained prompt that owns `test/util/instance/safe-cleanup.ts`, `test/util/instance/table-data.ts`, `test/util/instance/test-tables.ts`, optional `types/types.ts` edits, and nothing else.
- [ ] Remove `// @ts-nocheck` from `test/util/instance/safe-cleanup.ts`, `test/util/instance/table-data.ts`, and `test/util/instance/test-tables.ts`, then run `bun run typecheck` to expose the remaining instance-helper gaps.
- [ ] Type every public attachment and every nested retry/scanning helper, including segment counts, batch write action shapes, table-name arrays, and cleanup callbacks.
- [ ] Replace vague request/response assumptions with explicit types for `ListTables`, `Scan`, `BatchWriteItem`, `DeleteTable`, and `DescribeTable` response bodies as used by these modules.
- [ ] Encode the seeded test-table definitions with named types for attribute definitions, key schema, projections, and provisioned throughput so the literal table array no longer relies on unchecked inference.
- [ ] Run `bun run typecheck`, `bun run build:test-ts`, and `bun run test:migration`.
- [ ] Review the post-verification diff and confirm it is limited to the owned files plus intentional shared-type additions.
- [ ] Update this plan file to mark the completed subtasks as done.
- [ ] Commit with message: `Type instance data and cleanup helpers`

## [ ] Task 5: Type the legacy naming, request, and table helper modules

- [ ] Spawn a fresh worker with `fork_context: false` and a self-contained prompt that owns `test/util/legacy/naming.ts`, `test/util/legacy/request.ts`, `test/util/legacy/table-lifecycle.ts`, `test/util/legacy/table-data.ts`, optional `types/types.ts` edits, and nothing else.
- [ ] Remove `// @ts-nocheck` from `test/util/legacy/naming.ts`, `test/util/legacy/request.ts`, `test/util/legacy/table-lifecycle.ts`, and `test/util/legacy/table-data.ts`, then run `bun run typecheck` to expose the remaining legacy helper contract mismatches.
- [ ] Give `createLegacyNaming`, `createLegacyRequestApi`, `createLegacyTableLifecycle`, and `createLegacyTableData` explicit dependency parameter types and explicit returned API shapes.
- [ ] Type every nested function in these modules, including string-decrement helpers, retry loops, request callbacks, scan iteration callbacks, and batch write helpers.
- [ ] Reuse the shared request/response and table-definition types from `types/types.ts` wherever the legacy and instance stacks describe the same runtime shape.
- [ ] Run `bun run typecheck`, `bun run build:test-ts`, and `bun run test:migration`.
- [ ] Review the post-verification diff and confirm it is limited to the owned files plus intentional shared-type additions.
- [ ] Update this plan file to mark the completed subtasks as done.
- [ ] Commit with message: `Type legacy request and table helpers`

## [ ] Task 6: Type the legacy assertion and aggregate helper surface

- [ ] Spawn a fresh worker with `fork_context: false` and a self-contained prompt that owns `test/util/legacy/assertions.ts`, `test/util/legacy/helpers.ts`, `test/helpers.ts`, optional `types/types.ts` edits, and nothing else.
- [ ] Remove `// @ts-nocheck` from `test/util/legacy/assertions.ts`, `test/util/legacy/helpers.ts`, and `test/helpers.ts`, then run `bun run typecheck` to expose the final unchecked bridge and export issues.
- [ ] Type the assertion-case inputs in `legacy/assertions.ts` precisely, including message unions, dotted-property traversal state, and supported serialization test value shapes.
- [ ] Type the mutable legacy module state in `legacy/helpers.ts` so global server lifecycle, exported table names, environment-derived configuration, and forwarded helper APIs all have explicit contracts with correct nullability.
- [ ] Finish by typing the top-level `test/helpers.ts` bridge so the CommonJS export surface remains unchanged while the legacy exports and `createTestHelper` attachment are statically checked.
- [ ] Run `bun run typecheck`, `bun run build:test-ts`, `bun run test:migration`, and `bun run test`.
- [ ] Review the post-verification diff and confirm it is limited to the owned files plus intentional shared-type additions.
- [ ] Update this plan file to mark the completed subtasks as done.
- [ ] Commit with message: `Remove ts-nocheck from test helper modules`

## Tickets

- Chore: remove `// @ts-nocheck` from the typed helper bridge and helper implementation modules
- Chore: add explicit parameter and return types for every helper function and callback
- Chore: introduce narrow shared helper contracts without `any`, non-null assertions, or loose nullability
