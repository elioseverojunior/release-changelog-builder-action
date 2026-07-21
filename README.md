# release-changelog-builder-action

A GitHub Action that builds release notes / changelogs from merged pull requests — fast, flexible, and exactly the way you want.

**Inspired by** [mikepenz/release-changelog-builder-action](https://github.com/mikepenz/release-changelog-builder-action).

## Features

- **PR Mode** (default): Changelog from merged PRs with full metadata (labels, reviewers, reviews, assignees)
- **Commit Mode**: Changelog from commits (conventional commits support via `label_extractor`)
- **Hybrid Mode**: Both PRs and commits
- **Initial Release**: Falls back to initial commit when no previous tag exists
- **Offline Mode**: Local git only (no API calls) — for commit mode
- **Cache Export/Import**: Reuse fetched data across runs
- **Monorepo Support**: `includeOnlyPaths` filters by changed files
- **Platforms**: GitHub and Gitea

## Installation

```bash
bun install
```

## Development

```bash
# Run all checks (lint, typecheck, test)
bun run fix:all && bun run typecheck && bun run test

# Run tests only
bun test

# Typecheck only
bun run typecheck

# Lint and format
bun run fix:all
```

## Build

```bash
bun run build
```

## Usage

```yaml
- name: Build Changelog
  id: build_changelog
  uses: ./dist/action
  with:
    configurationJson: |
      {
        "template": "#{{CHANGELOG}}",
        "categories": [
          { "title": "## 🚀 Features", "labels": ["feature"] },
          { "title": "## 🐛 Fixes", "labels": ["fix"] }
        ]
      }
    token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input                     | Description                                   |
| ------------------------- | --------------------------------------------- |
| `configurationJson`       | Inline JSON configuration                     |
| `configuration`           | Path to configuration file                    |
| `owner`                   | Repository owner (defaults to current repo)   |
| `repo`                    | Repository name (defaults to current repo)    |
| `fromTag`                 | Previous tag to compare from                  |
| `toTag`                   | New tag to compare to                         |
| `includeOpen`             | Include open PRs (default: false)             |
| `ignorePreReleases`       | Ignore pre-releases when finding previous tag |
| `failOnError`             | Fail action on error (default: false)         |
| `fetchViaCommits`         | Fetch PRs via commits (squash merge support)  |
| `fetchReviewers`          | Fetch approved reviewers                      |
| `fetchReleaseInformation` | Fetch tag release dates                       |
| `fetchReviews`            | Fetch PR reviews                              |
| `mode`                    | `PR` \| `COMMIT` \| `HYBRID` (default: PR)    |
| `offlineMode`             | Local git only, no API calls                  |
| `outputFile`              | Write changelog to file                       |
| `token`                   | GitHub token (defaults to `github.token`)     |
| `baseUrl`                 | GitHub Enterprise URL                         |
| `exportCache`             | Export data for reuse                         |
| `exportOnly`              | Only export cache, no changelog               |
| `cache`                   | Cache from previous run                       |
| `platform`                | `github` \| `gitea` (default: GitHub)         |
| `includeOnlyPaths`        | Path patterns for monorepo filtering          |

## Outputs

| Output              | Description                |
| ------------------- | -------------------------- |
| `changelog`         | Generated changelog        |
| `owner`             | Repository owner           |
| `repo`              | Repository name            |
| `fromTag`           | Resolved from tag          |
| `toTag`             | Resolved to tag            |
| `failed`            | Whether action failed      |
| `pull_requests`     | Comma-separated PR numbers |
| `categorized_prs`   | Count of categorized PRs   |
| `uncategorized_prs` | Count of uncategorized PRs |
| `open_prs`          | Count of open PRs          |
| `changed_files`     | Changed file count         |
| `additions`         | Lines added                |
| `deletions`         | Lines deleted              |
| `changes`           | Total changes              |
| `commits`           | Commit count               |
| `contributors`      | Contributor usernames      |
| `categorized`       | Categorized PRs as JSON    |
| `cache`             | Cache file path            |

## Initial Release Handling

For the first release (no previous tag), the action automatically falls back to the initial commit using `git rev-list --max-parents=0 HEAD`. Users can also pre-create an initial tag (e.g., `v0.0.1`) to define the starting point.

## Configuration

Full JSON configuration supports:

- `template`, `pr_template`, `commit_template`, `empty_template`
- `categories` with labels, rules, nested categories, modes
- `label_extractor`, `duplicate_filter`, `reference`, `transformers`
- `tag_resolver` (semver/sort, filter, transformer)
- `sort`, `exclude_merge_branches`, `max_tags_to_fetch`, etc.

See [mikepenz docs](https://github.com/mikepenz/release-changelog-builder-action#configuration) for full specification.
