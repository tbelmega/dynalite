# Repository Guidelines

## Project Structure & Module Organization

Core runtime code lives at the repo root and in a few focused directories:

- `index.js` and `cli.js`: server entrypoints
- `actions/`: DynamoDB API operation handlers
- `validations/`: request validation logic
- `db/`: storage, lifecycle, and generated PEG parser output
- `test/`: Mocha integration and behavior tests
- `ssl/`: local self-signed cert fixtures for HTTPS tests

Treat `db/*.js` parser files as generated artifacts from `db/*.pegjs`; prefer updating the `.pegjs` source and rebuilding.

## Build, Test, and Development Commands

Prefer Bun for local development in this fork:

- `bun install`: install dependencies from `bun.lock`
- `bun run build`: regenerate parser files from `db/*.pegjs`
- `bun run test`: run lint plus the full Mocha suite

Fallback npm commands still work:

- `npm install`
- `npm run build`
- `npm test`

## Coding Style & Naming Conventions

This codebase is currently CommonJS JavaScript, not TypeScript. Follow the existing style:

- use 2-space indentation
- prefer existing `var`-based style unless a broader refactor justifies change
- keep module/file names consistent with DynamoDB operation names, e.g. `actions/query.js`
- avoid unrelated formatting churn

Linting uses ESLint via `eslint.config.mjs`. `bun run test` runs lint automatically.

## Type Safety

When introducing TypeScript in this repository, use the type system aggressively and keep the rules consistent:

- always declare function parameter types and return types explicitly
- prefer narrow domain types over vague shapes like `object`, `Record<string, unknown>`, or broad unions when a tighter type is available
- do not mark a type nullable unless the code really returns `null` or `undefined`
- do not bypass type checks with `any`, non-null assertions, or unchecked casts
- keep runtime validation and static types aligned; if a value crosses a trust boundary, validate it before narrowing
- prefer optional chaining and explicit guards over assertion-based access
- optimize naming for the reader: use descriptive names and avoid abbreviations

For this codebase specifically:

- keep generated parser files in `db/` behind narrow typed wrappers if TypeScript is added around them
- convert small, self-contained modules first and preserve existing runtime behavior at each step
- do not combine new TypeScript types with unrelated Bun, module-format, or architectural changes in the same patch

## Testing Guidelines

Tests use Mocha with `should`. Add or update tests in `test/` alongside the affected behavior, using existing names like `test/updateItem.js` or `test/query.js`.

Run after every small change:

- `bun run build`
- `bun run test`

Coverage is strong overall, but runtime-sensitive areas like `index.js` and `db/lifecycle.js` deserve extra caution.

## Commit & Pull Request Guidelines

Use short imperative commit messages without prefixes:

- `Add Bun lockfile`
- `Document Bun development workflow`
- `Remove editor settings from gitignore`

Keep commits small and verifiable. For PRs, include:

- a clear summary
- linked issues if relevant
- notes on build/test results
- any workflow changes called out explicitly

## Safety Notes

- Do not revert unrelated work in the tree.
- Keep changes incremental; prefer baby steps with build and test verification after each step.
- Avoid mixing Bun, TypeScript, and module-system changes in one patch.
