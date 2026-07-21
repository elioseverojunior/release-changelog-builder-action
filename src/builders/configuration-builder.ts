import type {Category, Configuration, Extractor, Property, Rule} from "../configuration.js"

export class CategoryBuilder {
  private _category: Category = {
    title: "",
    labels: [],
    categories: [],
  }

  key(key: string): this {
    this._category.key = key
    return this
  }

  title(title: string): this {
    this._category.title = title
    return this
  }

  labels(labels: string[]): this {
    this._category.labels = labels
    return this
  }

  label(label: string): this {
    if (!this._category.labels) this._category.labels = []
    this._category.labels.push(label)
    return this
  }

  excludeLabels(labels: string[]): this {
    this._category.excludeLabels = labels
    return this
  }

  excludeLabel(label: string): this {
    if (!this._category.excludeLabels) this._category.excludeLabels = []
    this._category.excludeLabels.push(label)
    return this
  }

  rules(rules: Rule[]): this {
    this._category.rules = rules
    return this
  }

  rule(rule: Omit<Rule, "flags"> & {flags?: string; onProperty?: string}): this {
    if (!this._category.rules) this._category.rules = []
    this._category.rules.push({
      pattern: rule.pattern,
      onProperty: rule.onProperty,
      flags: rule.flags || "gu",
    })
    return this
  }

  exhaustive(exhaustive: boolean): this {
    this._category.exhaustive = exhaustive
    return this
  }

  exhaustiveRules(exhaustiveRules: boolean): this {
    this._category.exhaustiveRules = exhaustiveRules
    return this
  }

  consume(consume: boolean): this {
    this._category.consume = consume
    return this
  }

  mode(mode: "HYBRID" | "COMMIT" | "PR"): this {
    this._category.mode = mode
    return this
  }

  emptyContent(content: string): this {
    this._category.emptyContent = content
    return this
  }

  category(builderFn: (builder: CategoryBuilder) => CategoryBuilder): this {
    if (!this._category.categories) this._category.categories = []
    const childBuilder = new CategoryBuilder()
    builderFn(childBuilder)
    this._category.categories.push(childBuilder.build())
    return this
  }

  build(): Category {
    if (!this._category.title) {
      throw new Error("Category title is required")
    }
    return {...this._category}
  }
}

export class ConfigurationBuilder {
  private _config: Configuration = {
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
    transformers: [],
    tagResolver: {method: "semver"},
    baseBranches: [],
    customPlaceholders: [],
    trimValues: false,
    offlineMode: false,
  }

  template(template: string): this {
    this._config.template = template
    return this
  }

  prTemplate(template: string): this {
    this._config.prTemplate = template
    return this
  }

  commitTemplate(template: string): this {
    this._config.commitTemplate = template
    return this
  }

  emptyTemplate(template: string): this {
    this._config.emptyTemplate = template
    return this
  }

  category(builderFn: (builder: CategoryBuilder) => CategoryBuilder): this {
    const builder = new CategoryBuilder()
    builderFn(builder)
    this._config.categories.push(builder.build())
    return this
  }

  categories(categories: Category[]): this {
    this._config.categories = categories
    return this
  }

  ignoreLabels(labels: string[]): this {
    this._config.ignoreLabels = labels
    return this
  }

  ignoreLabel(label: string): this {
    if (!this._config.ignoreLabels) this._config.ignoreLabels = []
    this._config.ignoreLabels.push(label)
    return this
  }

  labelExtractor(extractor: Omit<Extractor, "method"> & {method?: "replace" | "match"; onProperty?: Property[] | Property}): this {
    if (!this._config.labelExtractor) this._config.labelExtractor = []
    this._config.labelExtractor.push({
      pattern: extractor.pattern,
      onProperty: extractor.onProperty,
      target: extractor.target,
      method: extractor.method || "replace",
      flags: extractor.flags || "gu",
    })
    return this
  }

  duplicateFilter(filter: Omit<Extractor, "method"> & {method?: "replace" | "match"; onProperty?: Property[] | Property}): this {
    this._config.duplicateFilter = {
      pattern: filter.pattern,
      onProperty: filter.onProperty,
      target: filter.target,
      method: filter.method || "match",
      flags: filter.flags || "gu",
    }
    return this
  }

  reference(ref: Omit<Extractor, "method"> & {method?: "replace" | "match"; onProperty?: Property[] | Property}): this {
    this._config.reference = {
      pattern: ref.pattern,
      onProperty: ref.onProperty,
      target: ref.target,
      method: ref.method || "replace",
      flags: ref.flags || "gu",
    }
    return this
  }

  transformer(transformer: {pattern: string | RegExp; target: string}): this {
    if (!this._config.transformers) this._config.transformers = []
    const pattern = transformer.pattern instanceof RegExp ? transformer.pattern.source : transformer.pattern
    this._config.transformers.push({pattern, target: transformer.target})
    return this
  }

  customPlaceholder(name: string, source: string, transformer: {pattern: string | RegExp; target: string}): this {
    if (!this._config.customPlaceholders) this._config.customPlaceholders = []
    const pattern = transformer.pattern instanceof RegExp ? transformer.pattern.source : transformer.pattern
    this._config.customPlaceholders.push({
      name,
      source,
      transformer: {pattern, target: transformer.target},
    })
    return this
  }

  trimValues(trim: boolean): this {
    this._config.trimValues = trim
    return this
  }

  tagResolver(resolver: {
    method: "semver" | "sort"
    filter?: {pattern: string | RegExp; flags?: string}
    transformer?: {pattern: string | RegExp; target: string}
  }): this {
    this._config.tagResolver = {
      method: resolver.method,
      filter: resolver.filter
        ? {
            pattern: resolver.filter.pattern instanceof RegExp ? resolver.filter.pattern.source : resolver.filter.pattern,
            flags: resolver.filter.flags || "gu",
          }
        : undefined,
      transformer: resolver.transformer
        ? {
            pattern: resolver.transformer.pattern instanceof RegExp ? resolver.transformer.pattern.source : resolver.transformer.pattern,
            target: resolver.transformer.target,
          }
        : undefined,
    }
    return this
  }

  sort(sort: {order: "ASC" | "DESC"; onProperty: "mergedAt" | "title"}): this {
    this._config.sort = {order: sort.order, onProperty: sort.onProperty}
    return this
  }

  excludeMergeBranches(branches: string[]): this {
    this._config.excludeMergeBranches = branches
    return this
  }

  maxTagsToFetch(count: number): this {
    this._config.maxTagsToFetch = count
    return this
  }

  maxPullRequests(count: number): this {
    this._config.maxPullRequests = count
    return this
  }

  maxBackTrackTimeDays(days: number): this {
    this._config.maxBackTrackTimeDays = days
    return this
  }

  baseBranches(branches: string[]): this {
    this._config.baseBranches = branches
    return this
  }

  offlineMode(enabled: boolean): this {
    this._config.offlineMode = enabled
    return this
  }

  commitMode(): this {
    this._config.categories = [
      {title: "## 🚀 Features", labels: ["feature", "feat"]},
      {title: "## 🐛 Fixes", labels: ["fix", "bug"]},
      {title: "## 🧪 Tests", labels: ["test"]},
      {title: "## 📦 Other", labels: []},
    ]
    this._config.labelExtractor = [
      {
        pattern: "^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test){1}(\\([\\w\\-\\.]+\\))?(!)?: ([\\w ])+([\\s\\S]*)",
        onProperty: "title",
        target: "$1",
        method: "match",
        flags: "gu",
      },
    ]
    return this
  }

  build(): Configuration {
    return {...this._config}
  }
}
