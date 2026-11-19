import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvExampleKeys } from '../collectors/env.js';
import { collectFiles } from '../collectors/files.js';
import { collectSqlSchema } from '../collectors/sql.js';
import { collectSvelteKitRoutes } from '../collectors/sveltekit.js';
import { loadConfig } from '../config/loader.js';
import type { DocsDriftConfig } from '../config/schema.js';
import { parseMarkdown, type ParsedMarkdown } from '../markdown/parser.js';
import { checkAnchorsRule } from '../rules/anchors.js';
import { checkEnvRule } from '../rules/env.js';
import { checkPathsRule } from '../rules/paths.js';
import { checkScriptsRule, loadPackageScripts } from '../rules/scripts.js';
import { checkSqlSchemaRule } from '../rules/sql-schema.js';
import { checkStaleRule } from '../rules/stale.js';
import { checkSvelteKitRoutesRule } from '../rules/sveltekit-routes.js';
import type { CheckSummary, Violation } from '../types.js';
import { applySuppressions, parseDirectives, type InlineDirective } from './ignore.js';

export interface RunCheckOptions {
  rootDir: string;
  config?: DocsDriftConfig;
  staleMaxAge?: string;
  referenceDate?: string;
  nowMs?: number;
}

/** Exécute l'ensemble des règles actives sur les fichiers Markdown du dépôt */
export function runCheck(options: RunCheckOptions): CheckSummary {
  const start = performance.now();
  const config = options.config ?? loadConfig(options.rootDir);
  const files = collectFiles(options.rootDir, config.include, config.exclude);

  const parsedMap = new Map<string, ParsedMarkdown>();
  const directivesMap = new Map<string, InlineDirective[]>();

  for (const relFile of files) {
    const absPath = join(options.rootDir, relFile);
    const content = readFileSync(absPath, 'utf8');
    parsedMap.set(relFile, parseMarkdown(relFile, content));
    directivesMap.set(relFile, parseDirectives(content));
  }

  const packageScripts =
    config.rules['scripts/exists'] !== 'off' ? loadPackageScripts(options.rootDir) : null;
  const envKeys =
    config.rules['env/exists'] !== 'off'
      ? loadEnvExampleKeys(options.rootDir, config.envFile)
      : null;
  const sveltekitRoutes =
    config.rules['sveltekit/routes'] !== 'off'
      ? collectSvelteKitRoutes(options.rootDir, config.sveltekitRoutesDir)
      : null;
  const sqlSchema =
    config.rules['sql/schema'] !== 'off'
      ? collectSqlSchema(options.rootDir, config.sqlMigrations, config.exclude)
      : null;

  const rawViolations: Violation[] = [];

  for (const parsed of parsedMap.values()) {
    const fileDirectives = directivesMap.get(parsed.file) ?? [];

    if (config.rules['paths/exists'] !== 'off') {
      rawViolations.push(
        ...checkPathsRule(parsed, options.rootDir, config.rules['paths/exists']),
      );
    }
    if (config.rules['anchors/exists'] !== 'off') {
      rawViolations.push(
        ...checkAnchorsRule(parsed, parsedMap, options.rootDir, config.rules['anchors/exists']),
      );
    }
    if (config.rules['scripts/exists'] !== 'off') {
      rawViolations.push(
        ...checkScriptsRule(parsed, packageScripts, config.rules['scripts/exists']),
      );
    }
    if (config.rules['env/exists'] !== 'off') {
      rawViolations.push(
        ...checkEnvRule(
          parsed,
          envKeys,
          config.ignoreEnv,
          config.envFile,
          config.rules['env/exists'],
        ),
      );
    }
    if (config.rules['sveltekit/routes'] !== 'off') {
      rawViolations.push(
        ...checkSvelteKitRoutesRule(parsed, sveltekitRoutes, config.rules['sveltekit/routes']),
      );
    }
    if (config.rules['sql/schema'] !== 'off') {
      rawViolations.push(
        ...checkSqlSchemaRule(parsed, sqlSchema, fileDirectives, config.rules['sql/schema']),
      );
    }
  }

  if (config.rules['git/stale'] !== 'off') {
    const effectiveMaxAge = options.staleMaxAge ?? config.stale.maxAge;
    const staleOpts: Parameters<typeof checkStaleRule>[0] = {
      rootDir: options.rootDir,
      markdownFiles: files,
      exclude: config.exclude,
      criticalDocs: config.stale.criticalDocs,
      mappings: config.stale.mappings,
      severity: config.rules['git/stale'],
    };
    if (effectiveMaxAge !== undefined) staleOpts.maxAge = effectiveMaxAge;
    if (options.nowMs !== undefined) staleOpts.nowMs = options.nowMs;

    rawViolations.push(...checkStaleRule(staleOpts));
  }

  const { kept, suppressedCount, expiredWarnings } = applySuppressions(
    rawViolations,
    directivesMap,
    config.exceptions,
    options.referenceDate,
  );

  const violations = [...kept, ...expiredWarnings];
  violations.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    return a.ruleId.localeCompare(b.ruleId);
  });

  const errors = violations.filter((v) => v.severity === 'error').length;
  const warnings = violations.filter((v) => v.severity === 'warn').length;
  const durationMs = Math.round(performance.now() - start);

  return {
    filesChecked: files.length,
    errors,
    warnings,
    suppressed: suppressedCount,
    durationMs,
    violations,
  };
}
