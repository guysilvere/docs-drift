import type { CheckSummary } from '../types.js';
import { sanitizePublicPath } from './json.js';

function escapeCell(text: string): string {
  return text.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

/** Formate un rapport Markdown synthétique utilisable en commentaire de Pull Request */
export function formatMarkdownReport(summary: CheckSummary): string {
  const statusLabel = summary.errors > 0 ? 'ECHEC' : 'OK';
  const lines: string[] = [
    `## docs-drift — ${statusLabel}`,
    '',
    `- **Fichiers analysés** : ${summary.filesChecked}`,
    `- **Erreurs** : ${summary.errors}`,
    `- **Avertissements** : ${summary.warnings}`,
    ...(summary.suppressed > 0 ? [`- **Ignorées** : ${summary.suppressed}`] : []),
    `- **Durée** : ${summary.durationMs} ms`,
    '',
  ];

  if (summary.violations.length === 0) {
    lines.push('Aucune dérive documentaire détectée.');
    return `${lines.join('\n')}\n`;
  }

  lines.push('| Fichier | Ligne | Sévérité | Règle | Message |');
  lines.push('| --- | ---: | --- | --- | --- |');

  for (const v of summary.violations) {
    const file = sanitizePublicPath(v.file);
    const sev = v.severity === 'error' ? 'ERROR' : 'WARN';
    lines.push(
      `| \`${escapeCell(file)}\` | ${v.line} | ${sev} | \`${v.ruleId}\` | ${escapeCell(v.message)} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}
