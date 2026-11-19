export { collectFiles, globToRegExp, toPosixPath } from './collectors/files.js';
export { CONFIG_FILENAME, ConfigError, loadConfig, writeDefaultConfig } from './config/loader.js';
export {
  docsDriftConfigSchema,
  getDefaultConfig,
  ruleSeveritySchema,
  type DocsDriftConfig,
  type RuleSeverity,
} from './config/schema.js';
export { runCheck, type RunCheckOptions } from './engine/runner.js';
export { parseMarkdown, type ParsedMarkdown } from './markdown/parser.js';
export { createSlugger, slugifyHeading } from './markdown/slugify.js';
export { formatTextReport } from './reporters/text.js';
export { isKnownRule, RULES_REGISTRY } from './rules/registry.js';
export type { CheckSummary, RuleId, RuleMetadata, Violation } from './types.js';
