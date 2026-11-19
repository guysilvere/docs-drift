import type { CheckSummary } from '../types.js';

/** Formate un rapport terminal lisible sans couleur (fichier:ligne:colonne [rule-id] message) */
export function formatTextReport(summary: CheckSummary): string {
  const lines: string[] = [];

  for (const v of summary.violations) {
    const level = v.severity === 'error' ? 'ERROR' : 'WARN ';
    lines.push(`${v.file}:${v.line}:${v.column} ${level} [${v.ruleId}] ${v.message}`);
  }

  if (lines.length > 0) {
    lines.push('');
  }

  const status = summary.errors > 0 ? 'FAIL' : 'OK';
  const suppressedPart =
    summary.suppressed > 0 ? `, ${summary.suppressed} ignorée(s)` : '';
  lines.push(
    `docs-drift ${status} — ${summary.filesChecked} fichier(s) analysé(s), ${summary.errors} erreur(s), ${summary.warnings} avertissement(s)${suppressedPart} (${summary.durationMs} ms)`,
  );

  return `${lines.join('\n')}\n`;
}
