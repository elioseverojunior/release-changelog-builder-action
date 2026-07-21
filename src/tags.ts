import {spawnSync} from "node:child_process"

const GIT = "/usr/local/bin/git"

export interface TagResolverConfig {
  method: "semver" | "sort"
  filter?: {pattern: string | RegExp; flags?: string}
  transformer?: {pattern: string | RegExp; target: string}
}

export interface TagInfo {
  name: string
  date: Date
  commitHash: string
}

function runGit(cwd: string, args: string[]): string {
  const result = spawnSync(GIT, args, {cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]})
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`)
  }
  return result.stdout.trim()
}

function getTags(cwd: string): TagInfo[] {
  try {
    // Use git tag --format which works better with shell escaping
    const format = "%(refname:short)|%(creatordate:iso)|%(objectname:short)"
    const output = runGit(cwd, ["tag", "--format", format, "--sort=creatordate"])
    if (!output) return []

    return output.split("\n").map(line => {
      const [name, date, commitHash] = line.split("|")
      return {name: name!, date: new Date(date!), commitHash: commitHash!}
    })
  } catch {
    return []
  }
}

function sortTagsSemver(tags: TagInfo[]): TagInfo[] {
  const parseVersion = (tag: string): number[] => {
    const clean = tag.replace(/^v/, "")
    const parts = clean.split(".").map(p => {
      const firstPart = p.split(/[^0-9]/)[0] ?? "0"
      return parseInt(firstPart, 10) || 0
    })
    while (parts.length < 3) parts.push(0)
    return parts
  }

  return [...tags].sort((a, b) => {
    const aParts = parseVersion(a.name!)
    const bParts = parseVersion(b.name!)
    for (let i = 0; i < 3; i++) {
      const aVal = aParts[i] ?? 0
      const bVal = bParts[i] ?? 0
      if (aVal !== bVal) return aVal - bVal
    }
    return 0
  })
}

function filterTags(tags: TagInfo[], filter?: {pattern: string | RegExp; flags?: string}): TagInfo[] {
  if (!filter) return tags
  const regex = filter.pattern instanceof RegExp ? filter.pattern : new RegExp(filter.pattern, filter.flags)
  return tags.filter(t => regex.test(t.name))
}

function transformTag(tag: string, transformer?: {pattern: string | RegExp; target: string}): string {
  if (!transformer) return tag
  const regex = transformer.pattern instanceof RegExp ? transformer.pattern : new RegExp(transformer.pattern)
  return tag.replace(regex, transformer.target)
}

export function resolveTags(cwd: string, config: TagResolverConfig, maxTags?: number): TagInfo[] {
  let tags = getTags(cwd)
  tags = filterTags(tags, config.filter)

  // If maxTags is specified, limit by date (most recent first) before semver sort
  // Use semver as tiebreaker when dates are equal
  if (maxTags && tags.length > maxTags) {
    tags.sort((a, b) => {
      const dateDiff = b.date.getTime() - a.date.getTime()
      if (dateDiff !== 0) return dateDiff
      // Tiebreaker: use semver (newer semver is "greater")
      const aParts = parseSemver(a.name!)
      const bParts = parseSemver(b.name!)
      for (let i = 0; i < 3; i++) {
        if (aParts[i]! !== bParts[i]!) return bParts[i]! - aParts[i]!
      }
      return 0
    })
    tags = tags.slice(0, maxTags)
  }

  if (config.method === "semver") {
    tags = sortTagsSemver(tags)
  } else {
    tags.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  tags = tags.map(t => ({...t, name: transformTag(t.name, config.transformer)}))

  return tags
}

function parseSemver(tag: string): [number, number, number] {
  const clean = tag.replace(/^v/, "")
  const parts = clean.split(".").map(p => parseInt(p.split(/[^0-9]/)[0] ?? "0", 10) || 0)
  while (parts.length < 3) parts.push(0)
  return [parts[0]!, parts[1]!, parts[2]!]
}

export function findPredecessorTag(
  cwd: string,
  options: {maxTagsToFetch?: number; tagResolver?: TagResolverConfig} = {},
): string | undefined {
  const config = options.tagResolver ?? {method: "semver"}
  const tags = resolveTags(cwd, config, options.maxTagsToFetch)

  if (tags.length === 0) {
    return undefined
  }

  if (tags.length === 1) {
    try {
      return runGit(cwd, ["rev-list", "--max-parents=0", "HEAD"])
    } catch {
      return undefined
    }
  }

  // Return the tag before the latest one (predecessor of the latest tag)
  // Tags are sorted ascending (oldest first), so latest is at index length-1
  const predecessorIndex = tags.length - 2
  if (predecessorIndex < 0) return undefined
  return tags[predecessorIndex]?.name
}

export function getInitialCommit(cwd: string): string | undefined {
  try {
    return runGit(cwd, ["rev-list", "--max-parents=0", "HEAD"])
  } catch {
    return undefined
  }
}

export function getCommitRange(fromTag: string, toTag: string, cwd: string): string[] {
  try {
    const output = runGit(cwd, ["log", "--oneline", "--no-merges", `${fromTag}..${toTag}`])
    return output ? output.split("\n").filter(Boolean) : []
  } catch {
    return []
  }
}
