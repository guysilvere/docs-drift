import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toPosixPath } from '../collectors/files.js';
import type { RuleSeverity } from '../config/schema.js';
import { parseMarkdown, type ParsedMarkdown } from '../markdown/parser.js';
import type { Violation } from '../types.js';
import { splitLinkTarget } from './paths.js';

const EXTERNAL_PROTOCOL_RE = /^(?:https?|mailto|tel|data|javascript|ftp):/i;
const LINE_ANCHOR_RE = /^L\d+(?:-L?\d+)?$/i;

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Vérifie la validité des ancres `#section` locales (intra-fichier et inter-fichiers Markdown) */
export function checkAnchorsRule(
  parsed: ParsedMarkdown,
  allParsedByPath: Map<string, ParsedMarkdown>,
  rootDir: string,
  severity: Exclude<RuleSeverity, 'off'>,
): Violation[] {
  const violations: Violation[] = [];
  const fileDir = dirname(join(rootDir, parsed.file));

  for (const link of parsed.links) {
    if (link.kind !== 'link') continue;
    const url = link.url.trim();
    if (!url || EXTERNAL_PROTOCOL_RE.test(url)) continue;

    const { rawPath, anchor } = splitLinkTarget(url);
    if (!anchor) continue;

    const decodedAnchor = safeDecode(anchor).trim().toLowerCase();
    if (!decodedAnchor || LINE_ANCHOR_RE.test(decodedAnchor)) {
      continue;
    }

    // Ancre intra-fichier (#section)
    if (!rawPath) {
      if (!parsed.headingSlugs.has(decodedAnchor)) {
        violations.push({
          ruleId: 'anchors/exists',
          severity,
          file: parsed.file,
          line: link.line,
          column: link.column,
          message: `Ancre locale introuvable : "#${anchor}"`,
          reference: url,
        });
      }
      continue;
    }

    // Ancre inter-fichiers (./autre.md#section)
    let resolvedTarget: string;
    if (rawPath.startsWith('file://')) {
      try {
        resolvedTarget = fileURLToPath(rawPath);
      } catch {
        continue;
      }
    } else {
      const decodedPath = safeDecode(rawPath);
      resolvedTarget = decodedPath.startsWith('/')
        ? join(rootDir, decodedPath)
        : resolve(fileDir, decodedPath);
    }

    if (!existsSync(resolvedTarget)) {
      // Déjà signalé par paths/exists
      continue;
    }

    if (statSync(resolvedTarget).isDirectory() || extname(resolvedTarget).toLowerCase() !== '.md') {
      continue;
    }

    const relTarget = toPosixPath(relative(rootDir, resolvedTarget));
    let targetParsed = allParsedByPath.get(relTarget);
    if (!targetParsed) {
      const content = readFileSync(resolvedTarget, 'utf8');
      targetParsed = parseMarkdown(relTarget, content);
      allParsedByPath.set(relTarget, targetParsed);
    }

    if (!targetParsed.headingSlugs.has(decodedAnchor)) {
      violations.push({
        ruleId: 'anchors/exists',
        severity,
        file: parsed.file,
        line: link.line,
        column: link.column,
        message: `Ancre "#${anchor}" introuvable dans "${rawPath}"`,
        reference: url,
      });
    }
  }

  return violations;
}
