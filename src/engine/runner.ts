import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectFiles } from '../collectors/files.js';
import { loadConfig } from '../config/loader.js';
import type { DocsDriftConfig } from '../config/schema.js';
import { parseMarkdown, type ParsedMarkdown } from '../markdown/parser.js';
import { checkAnchorsRule } from '../rules/anchors.js';
import { checkPathsRule } from '../rules/paths.js';
import { checkScriptsRule, loadPackageScripts } from '../rules/scripts.js';
import type { CheckSummary, Violation } from '../types.js';

export interface RunCheckOptions {
  rootDir: string;
  config?: DocsDriftConfig;
}

/** Exécute l'ensemble des règles actives sur les fichiers Markdown du dépôt */
export function runCheck(options: RunCheckOptions): CheckSummary {
  const start = performance.now();
  const config = options.config ?? loadConfig(options.rootDir);
  const files = collectFiles(options.rootDir, config.include, config.exclude);

  const parsedMap = new Map<string, ParsedMarkdown>();
  for (const relFile of files) {
    const absPath = join(options.rootDir, relFile);
    const content = readFileSync(absPath, 'utf8');
    parsedMap.set(relFile, parseMarkdown(relFile, content));
  }

  const packageScripts =
    config.rules['scripts/exists'] !== 'off' ? loadPackageScripts(options.rootDir) : null;

  const violations: Violation[] = [];

  for (const parsed of parsedMap.values()) {
    if (config.rules['paths/exists'] !== 'off') {
      violations.push(...checkPathsRule(parsed, options.rootDir, config.rules['paths/exists']));
    }
    if (config.rules['anchors/exists'] !== 'off') {
      violations.push(
        ...checkAnchorsRule(parsed, parsedMap, options.rootDir, config.rules['anchors/exists']),
      );
    }
    if (config.rules['scripts/exists'] !== 'off') {
      violations.push(
        ...checkScriptsRule(parsed, packageScripts, config.rules['scripts/exists']),
      );
    }
  }

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
    durationMs,
    violations,
  };
}
