export interface TemplateContext {
  [key: string]: string | undefined
}

export interface ParsedTemplate {
  placeholders: string[]
  segments: TemplateSegment[]
}

export type TemplateSegment = {type: "text"; value: string} | {type: "placeholder"; key: string}

const PLACEHOLDER_REGEX = /#{{([A-Z_][A-Z0-9_]*)}}/g

export function parseTemplate(template: string): ParsedTemplate {
  const placeholders: string[] = []
  const segments: TemplateSegment[] = []

  let lastIndex = 0

  for (const match of template.matchAll(PLACEHOLDER_REGEX)) {
    const key = match[1]!
    const index = match.index ?? 0
    const fullMatch = match[0]!

    if (index > lastIndex) {
      segments.push({type: "text", value: template.slice(lastIndex, index)})
    }

    segments.push({type: "placeholder", key})
    placeholders.push(key)
    lastIndex = index + fullMatch.length
  }

  if (lastIndex < template.length) {
    segments.push({type: "text", value: template.slice(lastIndex)})
  }

  return {placeholders, segments}
}

export function renderTemplate(template: string, context: TemplateContext): string {
  const {segments} = parseTemplate(template)

  let result = ""
  for (const segment of segments) {
    if (segment.type === "text") {
      result += segment.value
    } else {
      const value = context[segment.key]
      if (value !== undefined) {
        result += value
      }
    }
  }

  return result
}
