# AGENTS.md

## Toolchain

- **Runtime/Package mgr**: Bun (managed by mise). `bun.lock` is lockfile.
- **Config**: `mise.toml` manages tools/bun + env (`GITHUB_TOKEN` sourced via `gh auth token`, mise-only).
- **TypeScript**: `tsc -p tsconfig.base.json --noEmit` for typechecking (strict mode). _Note: `tsconfig.json` has `"include": []` — run against `tsconfig.base.json` directly._ Test files excluded via `tsconfig.base.json`.

## Commands (run in this order before commit)

```sh
bun run fix:all
bun run typecheck
bun run test
```

Use `mise run` to invoke tasks defined in `mise.toml` (e.g. `mise run uap` to update action pinning).

## Testing

- **Framework**: Bun built-in test runner.
- **Files**: `**/*.test.ts` alongside source (e.g. `src/foo.test.ts`).
- **Coverage gate**: `bunfig.toml` enforces 100% lines/functions/statements for all files in `src/`, excluding `**/bin/**`, `**/__tests__/**`, `**/integration-*/**`.
- **Run single test**: `bun test src/path/to/file.test.ts`.

## Development Workflow

### Mandatory: TDD

1. Write test first (red).
2. Write minimal code to pass (green).
3. Refactor while keeping green.

### Principles

- **100% coverage** at all times.
- **TDD** for new code AND when refactoring existing code (test first, then refactor).
- **KISS/DRY/YAGNI/TDA/SOLID** — apply what fits, don't over-engineer.

## Architecture

This is a **TypeScript implementation inspired by** [mikepenz/release-changelog-builder-action](https://github.com/mikepenz/release-changelog-builder-action) — a GitHub Action that generates changelogs from merged PRs.

- **Entrypoint**: `src/index.ts` — GitHub Action entrypoint. Builds to `dist/action/index.js`.
- **Build**: `bun run build` (or `bun build src/index.ts --outdir dist/action --target node --format esm --external @actions/core --outfile index.js`)
- **Source layout**:
  - `src/index.ts` — Action entrypoint (inputs, outputs, orchestrates build)
  - `src/configuration.ts` — Configuration parser, built-in templates, validation
  - `src/transform.ts` — Changelog template engine (parse, render, placeholder replacement)
  - `src/tags.ts` — Tag resolution, semver sorting, initial release handling (initial commit fallback)
  - `src/commits.ts` — Git diff, commit history, PR/commit conversion
  - `src/pull-requests.ts` — PR fetching, categorization, GitHub/Gitea API
  - `src/repositories/` — Repository abstractions (GitHub, Gitea, Offline)
  - `src/utils.ts` — Shared utilities, cache, output helpers
  - `src/*.test.ts` — Co-located tests (excluded from tsc via tsconfig.base.json)

### Key Features

- **PR Mode** (default): Changelog from merged PRs with full metadata (labels, reviewers, reviews, assignees)
- **Commit Mode**: Changelog from commits (conventional commits support via `label_extractor`)
- **Hybrid Mode**: Both PRs and commits
- **Initial Release**: Falls back to initial commit when no previous tag exists
- **Offline Mode**: Local git only (no API calls) — for commit mode
- **Cache Export/Import**: Reuse fetched data across runs
- **Monorepo Support**: `includeOnlyPaths` filters by changed files
- **Platforms**: GitHub and Gitea

### Configuration

Full JSON configuration via `configuration` (file path) or `configurationJson` (inline). Supports:

- `template`, `pr_template`, `commit_template`, `empty_template`
- `categories` with labels, rules, modes, nested categories
- `label_extractor`, `duplicate_filter`, `reference`, `transformers`
- `tag_resolver` (semver/sort, filter, transformer)
- `sort`, `exclude_merge_branches`, `max_tags_to_fetch`, etc.

## GitHub Actions

- **Pin to commit SHA**: All `uses:` references in `.github/workflows/*.yml` and `.github/actions/*/action.yml` MUST use the full commit SHA of the release tag (e.g. `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`). Never use `@v{major}` or `@v{major}.{minor}` tag annotations — they are mutable and undermine supply-chain security. The comment after the pin documents the SemVer for human readability.
- **Name every job and step in Title Case**: Every `jobs:` and `steps:` entry MUST have a `name:` key using Title Case (e.g., `Setup`, `Lint`, `Build Action`, `Run Tests`). Separate job properties from `steps:` with an empty line.
- **Use `gh` CLI to inspect runs**: `gh run view <run-id>`, `gh run view <run-id> --log-failed`, `gh run list`.

## Code Style

- **ESLint**: Flat config v9+, strict TS rules. `explicit-function-return-type: error`, `no-explicit-any: error` (relaxed in test files).
- **Imports**: `import-x/order` enforced — builtin → external → internal → parent → sibling. `bun:` prefixed to external. Blank lines between groups.
- **Barrel files**: Prefer barrel exports (`index.ts`) for cleaner imports.

  ```typescript
  // Without barrel files ❌
  import {Button} from "./components/Button"
  import {Modal} from "./components/Modal"

  // With barrel files ✅
  import {Button, Modal} from "./components/"
  ```

- **Format**: Prettier with `prettier-plugin-organize-imports`. Double quotes, trailing commas, 80-width.
- **Fluent Builder pattern**: prefer chained builder methods with a terminal `.build()` call over large constructors.
- **No `console.log` restriction** (off by config).
- **Unused vars**: `error` (prefix with `_` to ignore).
- **Naming convention overrides**: `// eslint-disable-next-line @typescript-eslint/naming-convention` comments are **FORBIDDEN** unless explicitly approved by the human. All snake_case or non-conforming names must be fixed to follow camelCase/PascalCase conventions, not skipped.

### TypeScript Naming Conventions

Follow the TypeScript team's official style guide:

- **camelCase**: Use for variables, functions, methods, and object properties.
  - `const totalItems = 10;`
  - `function calculateTotal() {}`
- **PascalCase**: Use for classes, interfaces, types (aliases), enums, and components.
  - `class UserProfile {}`
  - `interface ApiResponse {}`
- **UPPER_CASE**: Use strictly for global constants or immutable values known at compile time.
  - `const MAX_RETRY_ATTEMPTS = 5;`

Avoid **snake_case** unless dealing with data from external APIs (e.g., SQL databases, or JSON configuration schemas that must match an external contract like the GitHub Action configuration API).

### Naming Convention Exceptions

- **Interface properties matching external APIs**: snake_case is permitted for TypeScript interfaces that must serialize to/from an external JSON schema (e.g., `Configuration`, `Category` in `src/configuration.ts`). These are explicitly allowed in ESLint via the `property` selector.
- **Test file object literals**: Use builder methods (e.g., `.labelExtractor(...)`) instead of inline snake_case object literals to satisfy the `property` selector rule.

### Streaming Response Failure Handling

If a model response fails with "Streaming response failed" or similar streaming errors, the agent MUST automatically retry the response generation in a loop until:

1. The response succeeds, OR
2. The human explicitly requests a different action

Do NOT ask the human to retry — just retry automatically.

## Initial Release Handling (Critical)

The **initial release** (no previous tag) is handled in `src/tags.ts` via `findPredecessorTag()`:

- When only one tag exists, falls back to `git rev-list --max-parents=0 HEAD` (initial commit)
- This initial commit becomes the `fromTag` for the first release
- Users can also pre-create an initial tag (e.g., `v0.0.1`) to define the starting point
