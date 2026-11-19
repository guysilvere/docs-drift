export { DEFAULT_IGNORED_ENV_VARS, loadEnvExampleKeys } from './collectors/env.js';
export { collectFiles, globToRegExp, toPosixPath } from './collectors/files.js';
export {
  getLastCommitTimestampMs,
  inspectGitRepo,
  parseDurationMs,
  type GitStatusInfo,
} from './collectors/git.js';
export { applySqlMigration, collectSqlSchema, type SqlSchema } from './collectors/sql.js';
export {
  collectSvelteKitRoutes,
  extractServerMethods,
  normalizeRoutePath,
  type HttpMethod,
  type SvelteKitRouteInfo,
} from './collectors/sveltekit.js';
export { CONFIG_FILENAME, ConfigError, loadConfig, writeDefaultConfig } from './config/loader.js';
export {
  docsDriftConfigSchema,
  getDefaultConfig,
  ruleIdSchema,
  ruleSeveritySchema,
  type DocsDriftConfig,
  type ExceptionEntry,
  type RuleSeverity,
  type StaleMapping,
} from './config/schema.js';
export {
  applySuppressions,
  isExpired,
  parseDirectives,
  todayIsoDate,
  type FilterResult,
  type InlineDirective,
} from './engine/ignore.js';
export { runCheck, type RunCheckOptions } from './engine/runner.js';
export { parseMarkdown, type ParsedMarkdown } from './markdown/parser.js';
export { createSlugger, slugifyHeading } from './markdown/slugify.js';
export { formatTextReport } from './reporters/text.js';
export { isKnownRule, RULES_REGISTRY } from './rules/registry.js';
export type { CheckSummary, RuleId, RuleMetadata, Violation } from './types.js';
