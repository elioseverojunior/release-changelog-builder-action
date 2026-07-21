import {spawnSync} from "node:child_process"
import {mkdtempSync, rmSync} from "node:fs"
import {tmpdir} from "node:os"
import {join} from "node:path"

import {expect, test} from "bun:test"

const GIT = "/usr/local/bin/git"

function runGit(cwd: string, args: string[]): string {
  const result = spawnSync(GIT, args, {cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]})
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`)
  }
  return result.stdout.trim()
}

function createTestRepo(): string {
  const tempDir = mkdtempSync(join(tmpdir(), "tags-test-"))
  runGit(tempDir, ["init"])
  runGit(tempDir, ["config", "user.email", "test@test.com"])
  runGit(tempDir, ["config", "user.name", "Test"])
  runGit(tempDir, ["config", "tag.gpgSign", "false"])
  return tempDir
}

function cleanupTestRepo(tempDir: string): void {
  rmSync(tempDir, {recursive: true, force: true})
}

test("resolveTags returns tags sorted by semver", async () => {
  const tempDir = createTestRepo()
  try {
    runGit(tempDir, ["commit", "--allow-empty", "-m", "initial"])
    runGit(tempDir, ["tag", "-a", "v1.0.0", "-m", "v1.0.0"])
    runGit(tempDir, ["commit", "--allow-empty", "-m", "second"])
    runGit(tempDir, ["tag", "-a", "v2.0.0", "-m", "v2.0.0"])
    runGit(tempDir, ["commit", "--allow-empty", "-m", "third"])
    runGit(tempDir, ["tag", "-a", "v1.5.0", "-m", "v1.5.0"])

    const {resolveTags} = await import("./tags.js")
    const tags = resolveTags(tempDir, {method: "semver"})
    expect(tags.map(t => t.name)).toEqual(["v1.0.0", "v1.5.0", "v2.0.0"])
  } finally {
    cleanupTestRepo(tempDir)
  }
})

test("resolveTags filters tags with pattern", async () => {
  const tempDir = createTestRepo()
  try {
    runGit(tempDir, ["commit", "--allow-empty", "-m", "initial"])
    runGit(tempDir, ["tag", "-a", "v1.0.0", "-m", "v1.0.0"])
    runGit(tempDir, ["commit", "--allow-empty", "-m", "second"])
    runGit(tempDir, ["tag", "-a", "v2.0.0", "-m", "v2.0.0"])
    runGit(tempDir, ["commit", "--allow-empty", "-m", "third"])
    runGit(tempDir, ["tag", "-a", "release-1.0", "-m", "release-1.0"])

    const {resolveTags} = await import("./tags.js")
    const tags = resolveTags(tempDir, {method: "semver", filter: {pattern: "^v"}})
    expect(tags.map(t => t.name)).toEqual(["v1.0.0", "v2.0.0"])
  } finally {
    cleanupTestRepo(tempDir)
  }
})

test("resolveTags transforms tag names", async () => {
  const tempDir = createTestRepo()
  try {
    runGit(tempDir, ["commit", "--allow-empty", "-m", "initial"])
    runGit(tempDir, ["tag", "-a", "v1.0.0", "-m", "v1.0.0"])
    runGit(tempDir, ["commit", "--allow-empty", "-m", "second"])
    runGit(tempDir, ["tag", "-a", "v2.0.0", "-m", "v2.0.0"])

    const {resolveTags} = await import("./tags.js")
    const tags = resolveTags(tempDir, {
      method: "semver",
      transformer: {pattern: "^v(.+)", target: "$1"},
    })
    expect(tags.map(t => t.name)).toEqual(["1.0.0", "2.0.0"])
  } finally {
    cleanupTestRepo(tempDir)
  }
})

test("resolveTags respects maxTags limit", async () => {
  const tempDir = createTestRepo()
  try {
    runGit(tempDir, ["commit", "--allow-empty", "-m", "initial"])
    for (let i = 1; i <= 5; i++) {
      runGit(tempDir, ["tag", "-a", `v1.0.${i}`, "-m", `v1.0.${i}`])
    }

    const {resolveTags} = await import("./tags.js")
    const tags = resolveTags(tempDir, {method: "semver"}, 3)
    expect(tags.length).toBe(3)
  } finally {
    cleanupTestRepo(tempDir)
  }
})

test("findPredecessorTag returns undefined when no tags", async () => {
  const tempDir = createTestRepo()
  try {
    runGit(tempDir, ["commit", "--allow-empty", "-m", "initial"])
    const {findPredecessorTag} = await import("./tags.js")
    const tag = findPredecessorTag(tempDir, {})
    expect(tag).toBeUndefined()
  } finally {
    cleanupTestRepo(tempDir)
  }
})

test("findPredecessorTag returns initial commit when only one tag", async () => {
  const tempDir = createTestRepo()
  try {
    runGit(tempDir, ["commit", "--allow-empty", "-m", "initial"])
    runGit(tempDir, ["tag", "-a", "v1.0.0", "-m", "v1.0.0"])

    const {findPredecessorTag} = await import("./tags.js")
    const tag = findPredecessorTag(tempDir, {})
    expect(tag).toBeDefined()
    expect(tag).not.toBe("v1.0.0")
  } finally {
    cleanupTestRepo(tempDir)
  }
})

test("findPredecessorTag returns previous tag for second tag", async () => {
  const tempDir = createTestRepo()
  try {
    runGit(tempDir, ["commit", "--allow-empty", "-m", "initial"])
    runGit(tempDir, ["tag", "-a", "v1.0.0", "-m", "v1.0.0"])
    runGit(tempDir, ["commit", "--allow-empty", "-m", "second"])
    runGit(tempDir, ["tag", "-a", "v2.0.0", "-m", "v2.0.0"])

    const {findPredecessorTag} = await import("./tags.js")
    const tag = findPredecessorTag(tempDir, {})
    expect(tag).toBe("v1.0.0")
  } finally {
    cleanupTestRepo(tempDir)
  }
})

test("findPredecessorTag returns correct predecessor for multiple tags", async () => {
  const tempDir = createTestRepo()
  try {
    runGit(tempDir, ["commit", "--allow-empty", "-m", "initial"])
    runGit(tempDir, ["tag", "-a", "v1.0.0", "-m", "v1.0.0"])
    runGit(tempDir, ["commit", "--allow-empty", "-m", "second"])
    runGit(tempDir, ["tag", "-a", "v1.5.0", "-m", "v1.5.0"])
    runGit(tempDir, ["commit", "--allow-empty", "-m", "third"])
    runGit(tempDir, ["tag", "-a", "v2.0.0", "-m", "v2.0.0"])

    const {findPredecessorTag} = await import("./tags.js")
    const tag = findPredecessorTag(tempDir, {})
    expect(tag).toBe("v1.5.0")
  } finally {
    cleanupTestRepo(tempDir)
  }
})

test("findPredecessorTag respects maxTagsToFetch limit", async () => {
  const tempDir = createTestRepo()
  try {
    runGit(tempDir, ["commit", "--allow-empty", "-m", "initial"])
    for (let i = 1; i <= 5; i++) {
      runGit(tempDir, ["commit", "--allow-empty", "-m", `commit${i}`])
      runGit(tempDir, ["tag", "-a", `v1.0.${i}`, "-m", `v1.0.${i}`])
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const {findPredecessorTag} = await import("./tags.js")
    const tag = findPredecessorTag(tempDir, {maxTagsToFetch: 2})
    expect(tag).toBe("v1.0.4")
  } finally {
    cleanupTestRepo(tempDir)
  }
})

test("getCommitRange returns commits between tags", async () => {
  const tempDir = createTestRepo()
  try {
    runGit(tempDir, ["commit", "--allow-empty", "-m", "initial"])
    runGit(tempDir, ["tag", "-a", "v1.0.0", "-m", "v1.0.0"])
    runGit(tempDir, ["commit", "--allow-empty", "-m", "feat: new feature"])
    runGit(tempDir, ["commit", "--allow-empty", "-m", "fix: bug fix"])
    runGit(tempDir, ["tag", "-a", "v2.0.0", "-m", "v2.0.0"])

    const {getCommitRange} = await import("./tags.js")
    const commits = getCommitRange("v1.0.0", "v2.0.0", tempDir)
    expect(commits.length).toBe(2)
    expect(commits[0]).toContain("fix: bug fix")
    expect(commits[1]).toContain("feat: new feature")
  } finally {
    cleanupTestRepo(tempDir)
  }
})

test("getCommitRange returns empty for non-existent tags", async () => {
  const tempDir = createTestRepo()
  try {
    runGit(tempDir, ["commit", "--allow-empty", "-m", "initial"])
    const {getCommitRange} = await import("./tags.js")
    const commits = getCommitRange("v1.0.0", "v2.0.0", tempDir)
    expect(commits).toEqual([])
  } finally {
    cleanupTestRepo(tempDir)
  }
})
