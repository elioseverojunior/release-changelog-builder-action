import {expect, test} from "bun:test"

import type {Category} from "../configuration.js"

import {CategoryBuilder, ConfigurationBuilder} from "./configuration-builder.js"

test("ConfigurationBuilder builds default configuration", () => {
  const builder = new ConfigurationBuilder()
  const config = builder.build()

  expect(config.template).toBe("#{{CHANGELOG}}")
  expect(config.prTemplate).toBe("- #{{TITLE}}\n   - PR: ##{{NUMBER}}")
  expect(config.commitTemplate).toBe("- #{{TITLE}}")
  expect(config.emptyTemplate).toBe("- no changes")
  expect(config.categories.length).toBe(4)
  expect(config.ignoreLabels).toEqual(["ignore"])
  expect(config.sort.order).toBe("ASC")
})

test("ConfigurationBuilder template methods", () => {
  const config = new ConfigurationBuilder()
    .template("#{{CHANGELOG}}\n\n#{{UNCATEGORIZED}}")
    .prTemplate("- #{{TITLE}} (#{{NUMBER}})")
    .commitTemplate("- #{{TITLE}}")
    .emptyTemplate("- nothing changed")
    .build()

  expect(config.template).toBe("#{{CHANGELOG}}\n\n#{{UNCATEGORIZED}}")
  expect(config.prTemplate).toBe("- #{{TITLE}} (#{{NUMBER}})")
  expect(config.commitTemplate).toBe("- #{{TITLE}}")
  expect(config.emptyTemplate).toBe("- nothing changed")
})

test("ConfigurationBuilder category method", () => {
  const config = new ConfigurationBuilder()
    .category(c => c.title("## Features").labels(["feature", "feat"]))
    .category(c => c.title("## Bug Fixes").labels(["fix", "bug"]))
    .build()

  const categories = config.categories!
  expect(categories).toHaveLength(6)
  expect(categories[4]!.title).toBe("## Features")
  expect(categories[4]!.labels).toEqual(["feature", "feat"])
  expect(categories[5]!.title).toBe("## Bug Fixes")
  expect(categories[5]!.labels).toEqual(["fix", "bug"])
})

test("ConfigurationBuilder categories method replaces all", () => {
  const customCategories: Category[] = [{title: "## Custom", labels: ["custom"]}]
  const config = new ConfigurationBuilder().categories(customCategories).build()

  const categories = config.categories!
  expect(categories).toHaveLength(1)
  expect(categories[0]!.title).toBe("## Custom")
})

test("ConfigurationBuilder ignoreLabels", () => {
  const config = new ConfigurationBuilder().ignoreLabels(["skip", "wip"]).build()

  expect(config.ignoreLabels).toEqual(["skip", "wip"])
})

test("ConfigurationBuilder ignoreLabel adds to existing", () => {
  const config = new ConfigurationBuilder().ignoreLabel("skip").ignoreLabel("wip").build()

  expect(config.ignoreLabels).toContain("skip")
  expect(config.ignoreLabels).toContain("wip")
})

test("ConfigurationBuilder labelExtractor", () => {
  const config = new ConfigurationBuilder().labelExtractor({pattern: "\\[(FEAT|FIX)\\]", onProperty: "title", target: "$1"}).build()

  const labelExtractor = config.labelExtractor!
  expect(labelExtractor).toHaveLength(1)
  expect(labelExtractor[0]!.pattern).toBe("\\[(FEAT|FIX)\\]")
  expect(labelExtractor[0]!.target).toBe("$1")
})

test("ConfigurationBuilder duplicateFilter", () => {
  const config = new ConfigurationBuilder()
    .duplicateFilter({pattern: "\\[JIRA-\\d+\\]", onProperty: "title", target: "$1", method: "match"})
    .build()

  const duplicateFilter = config.duplicateFilter
  expect(duplicateFilter).toBeDefined()
  expect(duplicateFilter?.pattern).toBe("\\[JIRA-\\d+\\]")
  expect(duplicateFilter?.method).toBe("match")
})

test("ConfigurationBuilder reference", () => {
  const config = new ConfigurationBuilder().reference({pattern: "#(\\d+)", onProperty: "body", target: "$1", method: "replace"}).build()

  const reference = config.reference
  expect(reference).toBeDefined()
  expect(reference?.pattern).toBe("#(\\d+)")
})

test("ConfigurationBuilder transformer", () => {
  const config = new ConfigurationBuilder()
    .transformer({pattern: "FIX:", target: "Fix:"})
    .transformer({pattern: /FEAT:/g, target: "Feature:"})
    .build()

  expect(config.transformers).toHaveLength(2)
})

test("ConfigurationBuilder customPlaceholder", () => {
  const config = new ConfigurationBuilder().customPlaceholder("MY_VAR", "BODY", {pattern: "MY_VAR=(\\w+)", target: "$1"}).build()

  const customPlaceholders = config.customPlaceholders!
  expect(customPlaceholders).toHaveLength(1)
  expect(customPlaceholders[0]!.name).toBe("MY_VAR")
  expect(customPlaceholders[0]!.source).toBe("BODY")
})

test("ConfigurationBuilder trimValues", () => {
  const config = new ConfigurationBuilder().trimValues(true).build()

  expect(config.trimValues).toBe(true)
})

test("ConfigurationBuilder tagResolver", () => {
  const config = new ConfigurationBuilder()
    .tagResolver({
      method: "semver",
      filter: {pattern: "v\\d+.*"},
      transformer: {pattern: "^v(.+)", target: "$1"},
    })
    .build()

  expect(config.tagResolver.method).toBe("semver")
  expect(config.tagResolver.filter).toBeDefined()
  expect(config.tagResolver.transformer).toBeDefined()
})

test("ConfigurationBuilder sort", () => {
  const config = new ConfigurationBuilder().sort({order: "DESC", onProperty: "title"}).build()

  expect(config.sort.order).toBe("DESC")
  expect(config.sort.onProperty).toBe("title")
})

test("ConfigurationBuilder excludeMergeBranches", () => {
  const config = new ConfigurationBuilder().excludeMergeBranches(["main", "develop"]).build()

  expect(config.excludeMergeBranches).toEqual(["main", "develop"])
})

test("ConfigurationBuilder maxTagsToFetch", () => {
  const config = new ConfigurationBuilder().maxTagsToFetch(500).build()

  expect(config.maxTagsToFetch).toBe(500)
})

test("ConfigurationBuilder maxPullRequests", () => {
  const config = new ConfigurationBuilder().maxPullRequests(1000).build()

  expect(config.maxPullRequests).toBe(1000)
})

test("ConfigurationBuilder maxBackTrackTimeDays", () => {
  const config = new ConfigurationBuilder().maxBackTrackTimeDays(730).build()

  expect(config.maxBackTrackTimeDays).toBe(730)
})

test("ConfigurationBuilder baseBranches", () => {
  const config = new ConfigurationBuilder().baseBranches(["main", "release"]).build()

  expect(config.baseBranches).toEqual(["main", "release"])
})

test("ConfigurationBuilder offlineMode", () => {
  const config = new ConfigurationBuilder().offlineMode(true).build()

  expect(config.offlineMode).toBe(true)
})

test("ConfigurationBuilder commitMode", () => {
  const config = new ConfigurationBuilder().commitMode().build()

  const categories = config.categories!
  const labelExtractor = config.labelExtractor!
  expect(categories).toHaveLength(4)
  expect(categories[0]!.labels).toEqual(["feature", "feat"])
  expect(categories[1]!.labels).toEqual(["fix", "bug"])
  expect(labelExtractor).toHaveLength(1)
  expect(labelExtractor[0]!.pattern).toContain("feat|fix")
})

test("CategoryBuilder builds category with all options", () => {
  const category = new CategoryBuilder()
    .key("features")
    .title("## 🚀 Features")
    .labels(["feature", "feat"])
    .excludeLabels(["wip"])
    .rules([{pattern: "feat", onProperty: "labels", flags: "gu"}])
    .exhaustive(true)
    .exhaustiveRules(false)
    .consume(true)
    .mode("PR")
    .emptyContent("- no features")
    .build()

  expect(category.key).toBe("features")
  expect(category.title).toBe("## 🚀 Features")
  expect(category.labels).toEqual(["feature", "feat"])
  expect(category.excludeLabels).toEqual(["wip"])
  expect(category.rules).toHaveLength(1)
  expect(category.exhaustive).toBe(true)
  expect(category.exhaustiveRules).toBe(false)
  expect(category.consume).toBe(true)
  expect(category.mode).toBe("PR")
  expect(category.emptyContent).toBe("- no features")
})

test("CategoryBuilder nested categories", () => {
  const category = new CategoryBuilder()
    .title("## Features")
    .labels(["feature"])
    .category(c => c.title("### UI").labels(["ui"]))
    .category(c => c.title("### API").labels(["api"]))
    .build()

  const categories = category.categories!
  expect(categories).toHaveLength(2)
  expect(categories[0]!.title).toBe("### UI")
  expect(categories[1]!.title).toBe("### API")
})

test("CategoryBuilder throws without title", () => {
  expect(() => new CategoryBuilder().build()).toThrow("Category title is required")
})

test("CategoryBuilder label/label methods", () => {
  const category = new CategoryBuilder().title("Test").label("feat").label("feature").build()

  expect(category.labels).toEqual(["feat", "feature"])
})

test("CategoryBuilder excludeLabel method", () => {
  const category = new CategoryBuilder().title("Test").excludeLabel("wip").build()

  expect(category.excludeLabels).toEqual(["wip"])
})

test("CategoryBuilder rule method", () => {
  const category = new CategoryBuilder().title("Test").rule({pattern: "bug", onProperty: "labels", flags: "i"}).build()

  const rules = category.rules!
  expect(rules).toHaveLength(1)
  expect(rules[0]!.pattern).toBe("bug")
  expect(rules[0]!.onProperty).toBe("labels")
  expect(rules[0]!.flags).toBe("i")
})

test("Full fluent API example", () => {
  const config = new ConfigurationBuilder()
    .template("#{{CHANGELOG}}")
    .prTemplate("- #{{TITLE}} (#{{NUMBER}}) - @#{{AUTHOR}}")
    .category(c => c.title("## 🚀 Features").labels(["feature", "feat"]).key("features"))
    .category(c => c.title("## 🐛 Bug Fixes").labels(["fix", "bug"]).key("fixes"))
    .category(c => c.title("## 📦 Dependencies").labels(["dependencies"]).key("deps"))
    .category(c => c.title("## 🧪 Tests").labels(["test"]).key("tests"))
    .ignoreLabels(["skip", "wip"])
    .labelExtractor({pattern: "\\[(FEAT|FIX|DOC)\\]", onProperty: "title", target: "$1"})
    .sort({order: "DESC", onProperty: "mergedAt"})
    .trimValues(true)
    .tagResolver({method: "semver", filter: {pattern: "v\\d+.*"}})
    .build()

  expect(config.categories.length).toBeGreaterThanOrEqual(7)
  expect(config.template).toBe("#{{CHANGELOG}}")
  expect(config.ignoreLabels).toEqual(["skip", "wip"])
  expect(config.sort.order).toBe("DESC")
  expect(config.trimValues).toBe(true)
})
