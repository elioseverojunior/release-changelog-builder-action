export interface Regex {
  pattern: string | RegExp
  flags?: string
  target?: string
  method?: "replace" | "replaceAll" | "match" | "regexr"
  onEmpty?: string
}

export interface Extractor extends Regex {
  onProperty?: Property[] | Property
}

export interface Rule extends Regex {
  onProperty?: Property
}

export interface Sort {
  order: "ASC" | "DESC"
  onProperty: "mergedAt" | "title"
}

export interface TagResolver {
  method: string
  filter?: Regex
  transformer?: Regex | Regex[]
}

export interface Configuration {
  maxTagsToFetch: number
  maxPullRequests: number
  maxBackTrackTimeDays: number
  excludeMergeBranches: string[]
  sort: Sort
  tagResolver: TagResolver
  baseBranches: string[]
  offlineMode?: boolean
  template: string
  prTemplate: string
  commitTemplate: string
  emptyTemplate: string
  categories: Category[]
  ignoreLabels: string[]
  labelExtractor: Extractor[]
  duplicateFilter?: Extractor
  reference?: Extractor
  transformers: Regex[]
  customPlaceholders?: Placeholder[]
  trimValues: boolean
}

export interface Category {
  key?: string
  title: string
  labels?: string[]
  excludeLabels?: string[]
  rules?: Rule[]
  exhaustive?: boolean
  exhaustiveRules?: boolean
  emptyContent?: string
  categories?: Category[]
  consume?: boolean
  mode?: "HYBRID" | "COMMIT" | "PR"
  entries?: string[]
}

export type Property =
  | "number"
  | "title"
  | "branch"
  | "author"
  | "labels"
  | "milestone"
  | "body"
  | "assignees"
  | "requestedReviewers"
  | "approvedReviewers"
  | "status"

export interface Placeholder {
  name: string
  source: string
  transformer: Regex
}

export class PlaceholderGroup extends Map<string, Placeholder[]> {}

export const DEFAULT_CONFIGURATION: Configuration = {
  maxTagsToFetch: 200,
  maxPullRequests: 200,
  maxBackTrackTimeDays: 365,
  excludeMergeBranches: [],
  sort: {
    order: "ASC",
    onProperty: "mergedAt",
  },
  template: "#{{CHANGELOG}}",
  prTemplate: "- #{{TITLE}}\n   - PR: ##{{NUMBER}}",
  commitTemplate: "- #{{TITLE}}",
  emptyTemplate: "- no changes",
  categories: [
    {title: "## 🚀 Features", labels: ["feature"]},
    {title: "## 🐛 Fixes", labels: ["fix"]},
    {title: "## 🧪 Tests", labels: ["test"]},
    {title: "## 📦 Uncategorized", labels: []},
  ],
  ignoreLabels: ["ignore"],
  labelExtractor: [],
  duplicateFilter: undefined,
  transformers: [],
  tagResolver: {
    method: "semver",
    filter: undefined,
    transformer: undefined,
  },
  baseBranches: [],
  customPlaceholders: [],
  trimValues: false,
  offlineMode: false,
}

export const DEFAULT_COMMIT_CONFIGURATION: Configuration = {
  ...DEFAULT_CONFIGURATION,
  categories: [
    {title: "## 🚀 Features", labels: ["feature", "feat"]},
    {title: "## 🐛 Fixes", labels: ["fix", "bug"]},
    {title: "## 🧪 Tests", labels: ["test"]},
    {title: "## 📦 Other", labels: []},
  ],
  labelExtractor: [
    {
      pattern: "^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test){1}(\\([\\w\\-\\.]+\\))?(!)?: ([\\w ])+([\\s\\S]*)",
      onProperty: "title",
      target: "$1",
      method: "match",
      flags: "gu",
    },
  ],
}

export {CategoryBuilder, ConfigurationBuilder} from "./builders/configuration-builder.js"
