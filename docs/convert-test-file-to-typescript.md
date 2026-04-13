# Converting a Test File to TypeScript

This guide documents the current process used to convert `test/bench.js` into `test/bench.ts` without changing the runtime model of the test suite.

## Goal

Convert one test file at a time to TypeScript, keep Mocha running compiled JavaScript, and verify each step with `typecheck` and the full test suite.

## Steps

1. Rename the test file from `.js` to `.ts`.
   Example: `test/bench.js` -> `test/bench.ts`

2. Keep existing CommonJS runtime imports with `require(...)`.
   If you need types, add `import type ...` alongside them.

3. Add explicit types only where TypeScript needs them.
   Start with callback parameters and helper-specific response types.

4. If the test uses an API response shape repeatedly, extract a local type into `types/`.
   Example: `types/ScanCommandResponse.ts`

5. Replace implicit assumptions with explicit guards where TS requires them.
   Example: check `res.statusCode != null` before asserting on it.

6. Prefer type-safe expressions over prototype magic when TypeScript cannot see an assertion library extension.
   Example: use `should(res.statusCode).equal(200)` instead of `res.statusCode.should.equal(200)`.

## Supporting Config

The converted test relies on these repo-level pieces:

- `tsconfig.json` for repo-wide typechecking
- `tsconfig.test.json` for emitted test output
- `build:test-ts` script in `package.json`
- `test` script compiling TS tests first, then running Mocha on emitted JS in `dist/`
- `dist/` ignored in `.gitignore`
- current ESLint config ignores `test/**/*.ts` until a TypeScript-aware ESLint setup is added

## Verification Flow

Run these after each small step:

```sh
bun run typecheck
bun run test
```

## Notes From `bench.ts`

- Use SDK types for response bodies when available.
- Emit compiled TS tests into `dist/`, not beside source files.
