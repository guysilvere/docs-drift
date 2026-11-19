import type { ExceptionEntry } from '../config/schema.js';
import type { RuleId, Violation } from '../types.js';

export interface InlineDirective {
  kind: 'ignore-next-line' | 'ignore-file' | 'disable' | 'enable' | 'sql';
  ruleId: RuleId | 'all';
  line: number;
  reason?: string;
  expires?: string;
}

const DIRECTIVE_RE = /<!--\s*docs-drift:\s*([a-z-]+)([\s\S]*?)-->/gi;
const ATTR_REASON_RE = /reason="([^"]+)"/;
const ATTR_EXPIRES_RE = /expires="(\d{4}-\d{2}-\d{2})"/;
const RULE_TOKEN_RE = /\b([a-z]+\/[a-z-]+)\b/;

/** Retourne la date du jour au format YYYY-MM-DD (UTC) */
export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Vérifie si une date d'expiration YYYY-MM-DD est dépassée */
export function isExpired(expires: string | undefined, referenceDate: string): boolean {
  if (!expires) return false;
  return expires < referenceDate;
}

/** Extrait toutes les directives `<!-- docs-drift: ... -->` d'un contenu Markdown */
export function parseDirectives(content: string): InlineDirective[] {
  const directives: InlineDirective[] = [];
  const lines = content.split('\n');

  for (let idx = 0; idx < lines.length; idx += 1) {
    const lineText = lines[idx];
    if (!lineText || !lineText.includes('docs-drift:')) continue;

    DIRECTIVE_RE.lastIndex = 0;
    let match = DIRECTIVE_RE.exec(lineText);
    while (match !== null) {
      const rawKind = match[1]?.toLowerCase();
      const body = match[2] ?? '';

      if (
        rawKind === 'ignore-next-line' ||
        rawKind === 'ignore-file' ||
        rawKind === 'disable' ||
        rawKind === 'enable' ||
        rawKind === 'sql'
      ) {
        const reasonMatch = ATTR_REASON_RE.exec(body);
        const expiresMatch = ATTR_EXPIRES_RE.exec(body);
        const strippedBody = body
          .replace(ATTR_REASON_RE, '')
          .replace(ATTR_EXPIRES_RE, '')
          .trim();
        const ruleMatch = RULE_TOKEN_RE.exec(strippedBody);

        const directive: InlineDirective = {
          kind: rawKind,
          ruleId: (ruleMatch?.[1] as RuleId | undefined) ?? 'all',
          line: idx + 1,
        };
        if (reasonMatch?.[1]) directive.reason = reasonMatch[1];
        if (expiresMatch?.[1]) directive.expires = expiresMatch[1];

        directives.push(directive);
      }

      match = DIRECTIVE_RE.exec(lineText);
    }
  }

  return directives;
}

/** Vérifie si une directive s'applique à une règle donnée */
function matchesRule(target: RuleId | 'all', ruleId: RuleId): boolean {
  return target === 'all' || target === ruleId;
}

export interface FilterResult {
  kept: Violation[];
  suppressedCount: number;
  expiredWarnings: Violation[];
}

/** Applique les directives inline et exceptions configurées, en signalant les exceptions expirées */
export function applySuppressions(
  violations: readonly Violation[],
  directivesByFile: Map<string, InlineDirective[]>,
  configExceptions: readonly ExceptionEntry[],
  referenceDate = todayIsoDate(),
): FilterResult {
  const kept: Violation[] = [];
  const expiredWarnings: Violation[] = [];
  const reportedExpiredKeys = new Set<string>();
  let suppressedCount = 0;

  // Vérifie d'abord les exceptions de configuration expirées
  for (const exc of configExceptions) {
    if (isExpired(exc.expires, referenceDate)) {
      const key = `cfg:${exc.file}:${exc.rule}:${exc.expires}`;
      if (!reportedExpiredKeys.has(key)) {
        reportedExpiredKeys.add(key);
        expiredWarnings.push({
          ruleId: exc.rule,
          severity: 'warn',
          file: exc.file,
          line: 1,
          column: 1,
          message: `Exception expirée le ${exc.expires} (raison : ${exc.reason})`,
        });
      }
    }
  }

  // Vérifie les directives inline expirées
  for (const [file, directives] of directivesByFile.entries()) {
    for (const d of directives) {
      if (d.kind !== 'enable' && d.kind !== 'sql' && isExpired(d.expires, referenceDate)) {
        const key = `inline:${file}:${d.line}:${d.ruleId}:${d.expires}`;
        if (!reportedExpiredKeys.has(key)) {
          reportedExpiredKeys.add(key);
          const ruleForWarn: RuleId = d.ruleId === 'all' ? 'paths/exists' : d.ruleId;
          expiredWarnings.push({
            ruleId: ruleForWarn,
            severity: 'warn',
            file,
            line: d.line,
            column: 1,
            message: `Directive docs-drift expirée le ${d.expires}${d.reason ? ` (${d.reason})` : ''}`,
          });
        }
      }
    }
  }

  for (const v of violations) {
    // 1. Exception dans .docs-drift.yml (non expirée)
    const matchingConfig = configExceptions.find(
      (exc) =>
        exc.file === v.file &&
        exc.rule === v.ruleId &&
        !isExpired(exc.expires, referenceDate),
    );
    if (matchingConfig) {
      suppressedCount += 1;
      continue;
    }

    // 2. Directives inline dans le fichier
    const directives = directivesByFile.get(v.file) ?? [];
    let isSuppressed = false;

    // 2a. ignore-file
    for (const d of directives) {
      if (
        d.kind === 'ignore-file' &&
        matchesRule(d.ruleId, v.ruleId) &&
        !isExpired(d.expires, referenceDate)
      ) {
        isSuppressed = true;
        break;
      }
    }

    // 2b. ignore-next-line
    if (!isSuppressed) {
      for (const d of directives) {
        if (
          d.kind === 'ignore-next-line' &&
          d.line === v.line - 1 &&
          matchesRule(d.ruleId, v.ruleId) &&
          !isExpired(d.expires, referenceDate)
        ) {
          isSuppressed = true;
          break;
        }
      }
    }

    // 2c. disable / enable range
    if (!isSuppressed) {
      let disabled = false;
      for (const d of directives) {
        if (d.line > v.line) break;
        if (!matchesRule(d.ruleId, v.ruleId)) continue;
        if (d.kind === 'disable' && !isExpired(d.expires, referenceDate)) {
          disabled = true;
        } else if (d.kind === 'enable') {
          disabled = false;
        }
      }
      if (disabled) {
        isSuppressed = true;
      }
    }

    if (isSuppressed) {
      suppressedCount += 1;
    } else {
      kept.push(v);
    }
  }

  return { kept, suppressedCount, expiredWarnings };
}
