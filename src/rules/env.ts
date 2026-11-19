import { DEFAULT_IGNORED_ENV_VARS } from '../collectors/env.js';
import type { RuleSeverity } from '../config/schema.js';
import type { ParsedMarkdown } from '../markdown/parser.js';
import type { Violation } from '../types.js';

const PROCESS_ENV_RE = /\b(?:process\.env|import\.meta\.env|Bun\.env)\.([A-Z][A-Z0-9_]{2,})\b/g;
const SHELL_VAR_RE = /\$\{?([A-Z][A-Z0-9_]{2,})\}?/g;
const DOTENV_ASSIGN_RE = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]{2,})\s*=/;
const DOTENV_LANGS = new Set(['env', 'dotenv', 'sh', 'bash', 'zsh', 'shell']);
const PLACEHOLDER_ENV_RE = /^(?:VAR|FOO|BAR|BAZ|KEY|SECRET|TOKEN|MY_|YOUR_|EXAMPLE_|PLACEHOLDER)/;

/** Vérifie que les variables d'environnement documentées existent dans `.env.example` */
export function checkEnvRule(
  parsed: ParsedMarkdown,
  envKeys: Set<string> | null,
  customIgnored: readonly string[],
  envFile: string,
  severity: Exclude<RuleSeverity, 'off'>,
): Violation[] {
  if (envKeys === null) {
    return [];
  }

  const ignored = new Set<string>([...DEFAULT_IGNORED_ENV_VARS, ...customIgnored]);
  const violations: Violation[] = [];

  const reportIfMissing = (
    varName: string,
    line: number,
    column: number,
    reference: string,
    seenOnLine: Set<string>,
  ): void => {
    if (ignored.has(varName) || PLACEHOLDER_ENV_RE.test(varName) || envKeys.has(varName)) {
      return;
    }
    const dedupKey = `${line}:${varName}`;
    if (seenOnLine.has(dedupKey)) return;
    seenOnLine.add(dedupKey);

    violations.push({
      ruleId: 'env/exists',
      severity,
      file: parsed.file,
      line,
      column,
      message: `Variable d'environnement "${varName}" absente de ${envFile}`,
      reference,
    });
  };

  const seenOnLine = new Set<string>();

  for (const snippet of parsed.codeSnippets) {
    const lines = snippet.value.split('\n');
    const isDotenvBlock =
      snippet.kind === 'block' && snippet.lang !== null && DOTENV_LANGS.has(snippet.lang.toLowerCase());

    for (let idx = 0; idx < lines.length; idx += 1) {
      const lineText = lines[idx];
      if (!lineText) continue;

      const lineNumber = snippet.kind === 'block' ? snippet.line + 1 + idx : snippet.line;
      const trimmed = lineText.trimStart();
      if (snippet.kind === 'block' && trimmed.startsWith('#')) {
        continue;
      }

      // 1. process.env.X / import.meta.env.X / Bun.env.X
      PROCESS_ENV_RE.lastIndex = 0;
      let match = PROCESS_ENV_RE.exec(lineText);
      while (match !== null) {
        const varName = match[1];
        if (varName) {
          const col = snippet.kind === 'block' ? match.index + 1 : snippet.column;
          reportIfMissing(varName, lineNumber, col, match[0], seenOnLine);
        }
        match = PROCESS_ENV_RE.exec(lineText);
      }

      // 2. $VAR / ${VAR}
      SHELL_VAR_RE.lastIndex = 0;
      match = SHELL_VAR_RE.exec(lineText);
      while (match !== null) {
        const varName = match[1];
        if (varName) {
          const col = snippet.kind === 'block' ? match.index + 1 : snippet.column;
          reportIfMissing(varName, lineNumber, col, match[0], seenOnLine);
        }
        match = SHELL_VAR_RE.exec(lineText);
      }

      // 3. Assignations KEY=value dans les blocs env/dotenv/bash
      if (isDotenvBlock) {
        const assignMatch = DOTENV_ASSIGN_RE.exec(lineText);
        if (assignMatch?.[1]) {
          reportIfMissing(assignMatch[1], lineNumber, 1, assignMatch[1], seenOnLine);
        }
      }
    }
  }

  return violations;
}
