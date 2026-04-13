# Converting a Test File to TypeScript

This guide documents the current process used to convert `test/bench.js` into `test/bench.ts` without changing the runtime model of the test suite.

## Goal

Convert one test file at a time to TypeScript, keep Mocha running compiled JavaScript, and verify each step with `typecheck` and the full test suite.
Prefer deterministic scripted edits and reduced-noise verification during migration to minimize agent token use while preserving per-file safety and verification.
If you discover a process change that would significantly reduce repeated migration work or agent-visible output, suggest that improvement explicitly.

## Current Repo Conventions

- Compiled TypeScript tests run from `dist/test/`, not from `test/`.
- Shared TypeScript support modules used by tests should emit into `dist/` as well.
- For now, move all added shared test and protocol-shape types into `types/types.ts`. We can split them into narrower files after the migration is complete.
- Ignore generated `dist/**` output in ESLint.

## Steps

1. Rename the test file from `.js` to `.ts`.
   Example: `test/bench.js` -> `test/bench.ts`

2. Run the per-file migration helper scripts.

```sh
node scripts/rewrite-should-style.js test/yourFile.ts
node scripts/rewrite-test-helper-paths.js test/yourFile.ts
node scripts/ensure-should-require.js test/yourFile.ts
```

These scripts are intentionally narrow and idempotent. Run them on the single file you are converting, not on the whole suite during migration work.
Treat them as a first pass, not as a substitute for reading the converted file.
After major manual edits, rerun any relevant helper script if needed.

3. Keep existing CommonJS runtime imports with `require(...)`.
   If you need types, add `import type ...` alongside them.
   Important: write relative `require(...)` paths so they still resolve from the emitted file location under `dist/test/`, not just from the source file under `test/`.

4. Add explicit types only where TypeScript needs them.
   Start with callback parameters and helper-specific response types.

5. Move all new reusable type aliases into `types/types.ts`.
   Do this even if the type currently seems specific to one file. We can sort and extract them later.
   Do not create new type files during migration.

6. Replace implicit assumptions with explicit guards where TS requires them.
   Example: check `res.statusCode != null` before asserting on it.

7. Prefer type-safe expressions over prototype magic when TypeScript cannot see an assertion library extension.
   Example: use `should(res.statusCode).equal(200)` instead of `res.statusCode.should.equal(200)`.
   In practice, prefer `should(value)...` over `value.should...` for typed arrays, objects, numbers, and nested response fields.

8. Prefer local protocol-shape types over AWS SDK command input/output types when the test is asserting against raw DynamoDB JSON wire shapes.
   This matters especially for `AttributeValue`-like objects where the tests use base64 strings for binary members rather than SDK runtime types.

9. If a converted test depends on shared TypeScript modules outside `test/`, make sure the test build emits from repo root.
   Current config: `tsconfig.test.json` should use `"rootDir": "."` and include both `test/**/*.ts` and `types/**/*.ts`.

10. If a codemod result and a manual edit conflict, prefer the manual edit and leave the script for future refinement.

## Supporting Config

The converted test relies on these repo-level pieces:

- `tsconfig.json` for repo-wide typechecking
- `tsconfig.test.json` for emitted test output
- `build:test-ts` script in `package.json`
- `test` script compiling TS tests first, then running Mocha on emitted JS in `dist/test/`
- `dist/` ignored in `.gitignore`
- current ESLint config ignores `test/**/*.ts` until a TypeScript-aware ESLint setup is added
- current ESLint config also ignores generated `dist/**`

## Verification Flow

Run these after each small step:

```sh
bun run typecheck
bun run build:test-ts
bun run test:migration
```

Before the final verification run, inspect the diff for the converted file and any shared type changes you made.
Use `bun run test:migration` during iteration to keep agent-visible output compact.
Reserve `bun run test` for the broader final verification pass.

## Notes From `bench.ts`

- Use SDK types for response bodies when available.
- Emit compiled TS tests into `dist/`, not beside source files.

## Notes From `batchGetItem.ts`

- Check emitted runtime import paths against `dist/test/`, not only the source path under `test/`.
- Shared imported type modules are fine, but they must emit into `dist/` with the tests.
- Prefer protocol-shape aliases when SDK command types do not match the raw JSON request or response bodies used by the tests.
- Move all newly added types into `types/types.ts` during migration, even if they are currently used by only one converted file.
