import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RuleSeverity } from '../config/schema.js';
import type { ParsedMarkdown } from '../markdown/parser.js';
import type { Violation } from '../types.js';

const EXTERNAL_PROTOCOL_RE = /^(?:https?|mailto|tel|data|javascript|ftp):/i;
const PLACEHOLDER_RE = /<[^>]+>|\$\{[^}]+\}|\{[^}]+\}|\.\.\.|\*/;

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Sépare une URL Markdown en `{ rawPath, anchor }` */
export function splitLinkTarget(url: string): { rawPath: string; anchor: string | null } {
  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const anchor = hashIndex === -1 ? null : url.slice(hashIndex + 1);
  const queryIndex = beforeHash.indexOf('?');
  const rawPath = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
  return { rawPath: rawPath.trim(), anchor };
}

/** Vérifie l'existence de tous les fichiers, dossiers et médias locaux cités dans le Markdown */
export function checkPathsRule(
  parsed: ParsedMarkdown,
  rootDir: string,
  severity: Exclude<RuleSeverity, 'off'>,
): Violation[] {
  const violations: Violation[] = [];
  const fileDir = dirname(join(rootDir, parsed.file));

  for (const link of parsed.links) {
    const url = link.url.trim();
    if (!url || url.startsWith('#') || EXTERNAL_PROTOCOL_RE.test(url)) {
      continue;
    }

    const { rawPath } = splitLinkTarget(url);
    if (!rawPath || PLACEHOLDER_RE.test(rawPath)) {
      continue;
    }

    let resolvedPath: string;
    if (rawPath.startsWith('file://')) {
      try {
        resolvedPath = fileURLToPath(rawPath);
      } catch {
        violations.push({
          ruleId: 'paths/exists',
          severity,
          file: parsed.file,
          line: link.line,
          column: link.column,
          message: `URL file:// invalide : "${url}"`,
          reference: url,
        });
        continue;
      }
    } else {
      const decoded = safeDecode(rawPath);
      resolvedPath = decoded.startsWith('/')
        ? join(rootDir, decoded)
        : resolve(fileDir, decoded);
    }

    if (!existsSync(resolvedPath)) {
      const label = link.kind === 'image' ? 'Image/média introuvable' : 'Chemin introuvable';
      violations.push({
        ruleId: 'paths/exists',
        severity,
        file: parsed.file,
        line: link.line,
        column: link.column,
        message: `${label} : "${rawPath}"`,
        reference: url,
      });
    }
  }

  return violations;
}
