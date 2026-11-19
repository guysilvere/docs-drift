import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RuleSeverity } from '../config/schema.js';
import type { ParsedMarkdown } from '../markdown/parser.js';
import type { Violation } from '../types.js';

const SCRIPT_CMD_RE = /\b(?:npm|pnpm|yarn)\s+run\s+([a-zA-Z0-9:_./-]+)/g;
const PLACEHOLDER_SCRIPT_RE = /^(?:<.*>|cmd|script|command|\.\.\.)$/;
const IGNORED_CODE_LANGS = new Set(['json', 'yaml', 'yml', 'ts', 'typescript', 'js', 'javascript', 'sql', 'html', 'css']);

/** Lit l'ensemble des noms de scripts déclarés dans `package.json`, ou `null` s'il est absent */
export function loadPackageScripts(rootDir: string): Set<string> | null {
  const pkgPath = join(rootDir, 'package.json');
  if (!existsSync(pkgPath)) {
    return null;
  }

  try {
    const raw = readFileSync(pkgPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('scripts' in parsed) ||
      typeof parsed.scripts !== 'object' ||
      parsed.scripts === null
    ) {
      return new Set<string>();
    }
    return new Set(Object.keys(parsed.scripts));
  } catch {
    return null;
  }
}

/** Vérifie que les commandes `npm/pnpm/yarn run <script>` citées existent dans `package.json` */
export function checkScriptsRule(
  parsed: ParsedMarkdown,
  packageScripts: Set<string> | null,
  severity: Exclude<RuleSeverity, 'off'>,
): Violation[] {
  if (packageScripts === null) {
    return [];
  }

  const violations: Violation[] = [];

  for (const snippet of parsed.codeSnippets) {
    if (snippet.kind === 'block' && snippet.lang && IGNORED_CODE_LANGS.has(snippet.lang.toLowerCase())) {
      continue;
    }

    const lines = snippet.value.split('\n');
    for (let idx = 0; idx < lines.length; idx += 1) {
      const lineText = lines[idx];
      if (!lineText) continue;

      // Ignore les commentaires shell dans un bloc de code
      if (snippet.kind === 'block' && lineText.trimStart().startsWith('#')) {
        continue;
      }

      SCRIPT_CMD_RE.lastIndex = 0;
      let match = SCRIPT_CMD_RE.exec(lineText);
      while (match !== null) {
        const scriptName = match[1];
        if (scriptName && !PLACEHOLDER_SCRIPT_RE.test(scriptName) && !packageScripts.has(scriptName)) {
          const lineNumber = snippet.kind === 'block' ? snippet.line + 1 + idx : snippet.line;
          const columnNumber = snippet.kind === 'block' ? match.index + 1 : snippet.column;
          violations.push({
            ruleId: 'scripts/exists',
            severity,
            file: parsed.file,
            line: lineNumber,
            column: columnNumber,
            message: `Script "${scriptName}" introuvable dans package.json`,
            reference: match[0],
          });
        }
        match = SCRIPT_CMD_RE.exec(lineText);
      }
    }
  }

  return violations;
}
