import { collectFiles } from '../collectors/files.js';
import { getLastCommitTimestampMs, inspectGitRepo, parseDurationMs } from '../collectors/git.js';
import type { RuleSeverity, StaleMapping } from '../config/schema.js';
import type { Violation } from '../types.js';

export interface StaleCheckOptions {
  rootDir: string;
  markdownFiles: readonly string[];
  exclude: readonly string[];
  maxAge?: string;
  criticalDocs: readonly string[];
  mappings: readonly StaleMapping[];
  severity: Exclude<RuleSeverity, 'off'>;
  nowMs?: number;
}

/** Vérifie la fraîcheur temporelle (--stale) et le delta Git entre code associé et documentation */
export function checkStaleRule(options: StaleCheckOptions): Violation[] {
  const hasMaxAge = Boolean(options.maxAge);
  const hasMappings = options.mappings.length > 0;
  if (!hasMaxAge && !hasMappings) {
    return [];
  }

  const gitInfo = inspectGitRepo(options.rootDir);
  if (!gitInfo.isGitRepo) {
    return [];
  }

  if (gitInfo.isShallow) {
    return [
      {
        ruleId: 'git/stale',
        severity: 'warn',
        file: '.',
        line: 1,
        column: 1,
        message:
          'Historique Git incomplet (shallow clone) : analyse git/stale ignorée (utilisez fetch-depth: 0 en CI).',
      },
    ];
  }

  const violations: Violation[] = [];
  const nowMs = options.nowMs ?? Date.now();

  // 1. Dérive temporelle (--stale <durée>)
  if (options.maxAge) {
    const maxAgeMs = parseDurationMs(options.maxAge);
    if (maxAgeMs !== null) {
      const targetDocs =
        options.criticalDocs.length > 0
          ? options.markdownFiles.filter((f) => options.criticalDocs.includes(f))
          : options.markdownFiles;

      for (const docFile of targetDocs) {
        const lastTs = getLastCommitTimestampMs(options.rootDir, docFile);
        if (lastTs === null) continue;
        const ageMs = nowMs - lastTs;
        if (ageMs > maxAgeMs) {
          const ageDays = Math.floor(ageMs / (24 * 3600 * 1000));
          violations.push({
            ruleId: 'git/stale',
            severity: options.severity,
            file: docFile,
            line: 1,
            column: 1,
            message: `Documentation non mise à jour depuis ${ageDays} jour(s) (seuil : ${options.maxAge})`,
          });
        }
      }
    }
  }

  // 2. Delta code / doc (mappings configurés)
  for (const mapping of options.mappings) {
    const docTs = getLastCommitTimestampMs(options.rootDir, mapping.doc);
    if (docTs === null) continue;

    const codeFiles = collectFiles(options.rootDir, mapping.code, options.exclude);
    let newestCodeTs = 0;
    let newestCodeFile = '';

    for (const codeFile of codeFiles) {
      const ts = getLastCommitTimestampMs(options.rootDir, codeFile);
      if (ts !== null && ts > newestCodeTs) {
        newestCodeTs = ts;
        newestCodeFile = codeFile;
      }
    }

    if (newestCodeTs > docTs && newestCodeFile) {
      violations.push({
        ruleId: 'git/stale',
        severity: options.severity,
        file: mapping.doc,
        line: 1,
        column: 1,
        message: `Documentation en retard sur le code associé (dernier changement : "${newestCodeFile}")`,
        reference: newestCodeFile,
      });
    }
  }

  return violations;
}
