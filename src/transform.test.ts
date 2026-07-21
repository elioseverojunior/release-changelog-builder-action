import {expect, test} from "bun:test"

import type {TemplateContext} from "./transform.js"
import {parseTemplate, renderTemplate} from "./transform.js"

test("parseTemplate extracts placeholders", () => {
  const template = "#{{CHANGELOG}}\n\n#{{UNCATEGORIZED}}"
  const result = parseTemplate(template)

  expect(result.placeholders).toContain("CHANGELOG")
  expect(result.placeholders).toContain("UNCATEGORIZED")
  expect(result.segments.length).toBeGreaterThan(0)
})

test("parseTemplate handles nested placeholders", () => {
  const template = "- #{{TITLE}} (#{{NUMBER}})"
  const result = parseTemplate(template)

  expect(result.placeholders).toContain("TITLE")
  expect(result.placeholders).toContain("NUMBER")
})

test("renderTemplate replaces simple placeholders", () => {
  const template = "#{{CHANGELOG}}"
  const context: TemplateContext = {
    CHANGELOG: "## Features\n- feat: new feature",
  }
  const result = renderTemplate(template, context)

  expect(result).toBe("## Features\n- feat: new feature")
})

test("renderTemplate replaces multiple placeholders", () => {
  const template = "- #{{TITLE}} (#{{NUMBER}})"
  const context: TemplateContext = {
    TITLE: "Add new feature",
    NUMBER: "123",
  }
  const result = renderTemplate(template, context)

  expect(result).toBe("- Add new feature (123)")
})

test("renderTemplate handles missing placeholders", () => {
  const template = "- #{{TITLE}} (#{{NUMBER}})"
  const context: TemplateContext = {
    TITLE: "Add new feature",
  }
  const result = renderTemplate(template, context)

  expect(result).toBe("- Add new feature ()")
})

test("renderTemplate handles empty context", () => {
  const template = "#{{CHANGELOG}}"
  const context: TemplateContext = {}
  const result = renderTemplate(template, context)

  expect(result).toBe("")
})

test("renderTemplate preserves text around placeholders", () => {
  const template = "## Changelog\n\n#{{CHANGELOG}}\n\n---\nGenerated at #{{DATE}}"
  const context: TemplateContext = {
    CHANGELOG: "### Features\n- feat: new",
    DATE: "2024-01-01",
  }
  const result = renderTemplate(template, context)

  expect(result).toBe("## Changelog\n\n### Features\n- feat: new\n\n---\nGenerated at 2024-01-01")
})

test("renderTemplate handles category placeholders", () => {
  const template = "#{{CHANGELOG}}\n\n#{{FEATURES}}\n#{{FIXES}}"
  const context: TemplateContext = {
    CHANGELOG: "",
    FEATURES: "## Features\n- feat: new",
    FIXES: "## Fixes\n- fix: bug",
  }
  const result = renderTemplate(template, context)

  expect(result).toContain("## Features\n- feat: new")
  expect(result).toContain("## Fixes\n- fix: bug")
})

test("renderTemplate handles empty category with empty template", () => {
  const template = "#{{CHANGELOG}}\n\n#{{EMPTY_CATEGORY}}"
  const context: TemplateContext = {
    CHANGELOG: "",
    EMPTY_CATEGORY: "- no changes",
  }
  const result = renderTemplate(template, context)

  expect(result).toBe("\n\n- no changes")
})

test("renderTemplate handles special characters in values", () => {
  const template = "#{{TITLE}}"
  const context: TemplateContext = {
    TITLE: 'Fix: handle "quotes" & <tags>',
  }
  const result = renderTemplate(template, context)

  expect(result).toBe('Fix: handle "quotes" & <tags>')
})

test("renderTemplate handles multiline values", () => {
  const template = "#{{BODY}}"
  const context: TemplateContext = {
    BODY: "Line 1\nLine 2\nLine 3",
  }
  const result = renderTemplate(template, context)

  expect(result).toBe("Line 1\nLine 2\nLine 3")
})
