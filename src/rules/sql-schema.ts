import type { SqlSchema } from '../collectors/sql.js';
import type { RuleSeverity } from '../config/schema.js';
import type { InlineDirective } from '../engine/ignore.js';
import type { ParsedMarkdown } from '../markdown/parser.js';
import type { Violation } from '../types.js';

const SQL_DOC_FILENAME_RE = /(?:^|\/)(?:database|schema)(?:\.[^/]+)?\.md$/i;
const SQL_TABLE_CLAUSE_RE = /\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/gi;
const TABLE_DOT_COL_RE = /\b([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
const SQL_EXPLICIT_REF_RE = /^sql:([a-zA-Z_][a-zA-Z0-9_]*)(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?$/;

const IGNORED_SQL_TABLE_TOKENS = new Set([
  'select',
  'where',
  'values',
  'set',
  'dual',
  'sqlite_master',
  'pragma_table_info',
]);

/** Vérifie les tables et colonnes SQL documentées contre le schéma reconstruit des migrations */
export function checkSqlSchemaRule(
  parsed: ParsedMarkdown,
  schema: SqlSchema | null,
  directives: readonly InlineDirective[],
  severity: Exclude<RuleSeverity, 'off'>,
): Violation[] {
  if (schema === null || schema.tables.size === 0) {
    return [];
  }

  const isDatabaseDoc =
    SQL_DOC_FILENAME_RE.test(parsed.file) || directives.some((d) => d.kind === 'sql');
  const violations: Violation[] = [];
  const seen = new Set<string>();

  const pushUnique = (
    line: number,
    column: number,
    message: string,
    reference: string,
  ): void => {
    const key = `${line}:${reference}`;
    if (seen.has(key)) return;
    seen.add(key);
    violations.push({
      ruleId: 'sql/schema',
      severity,
      file: parsed.file,
      line,
      column,
      message,
      reference,
    });
  };

  for (const snippet of parsed.codeSnippets) {
    // 1. Références explicites `sql:table` ou `sql:table.column` dans n'importe quel fichier
    if (snippet.kind === 'inline') {
      const explicit = SQL_EXPLICIT_REF_RE.exec(snippet.value.trim());
      if (explicit?.[1]) {
        const table = explicit[1].toLowerCase();
        const col = explicit[2]?.toLowerCase();
        const cols = schema.tables.get(table);
        if (!cols) {
          pushUnique(
            snippet.line,
            snippet.column,
            `Table SQL "${table}" introuvable dans les migrations`,
            snippet.value.trim(),
          );
        } else if (col && !cols.has(col)) {
          pushUnique(
            snippet.line,
            snippet.column,
            `Colonne "${col}" introuvable dans la table SQL "${table}"`,
            snippet.value.trim(),
          );
        }
        continue;
      }
    }

    // 2. Blocs ```sql : vérifier FROM/JOIN/INTO/UPDATE <table> et table.column
    if (snippet.kind === 'block' && snippet.lang?.toLowerCase() === 'sql') {
      const lines = snippet.value.split('\n');
      for (let idx = 0; idx < lines.length; idx += 1) {
        const lineText = lines[idx];
        if (!lineText || lineText.trimStart().startsWith('--')) continue;
        const lineNumber = snippet.line + 1 + idx;

        SQL_TABLE_CLAUSE_RE.lastIndex = 0;
        let match = SQL_TABLE_CLAUSE_RE.exec(lineText);
        while (match !== null) {
          const table = match[1]?.toLowerCase();
          if (table && !IGNORED_SQL_TABLE_TOKENS.has(table) && !schema.tables.has(table)) {
            pushUnique(
              lineNumber,
              match.index + 1,
              `Table SQL "${table}" introuvable dans les migrations`,
              table,
            );
          }
          match = SQL_TABLE_CLAUSE_RE.exec(lineText);
        }

        TABLE_DOT_COL_RE.lastIndex = 0;
        match = TABLE_DOT_COL_RE.exec(lineText);
        while (match !== null) {
          const table = match[1]?.toLowerCase();
          const col = match[2]?.toLowerCase();
          if (table && col && schema.tables.has(table)) {
            const cols = schema.tables.get(table);
            if (cols && !cols.has(col)) {
              pushUnique(
                lineNumber,
                match.index + 1,
                `Colonne "${col}" introuvable dans la table SQL "${table}"`,
                `${table}.${col}`,
              );
            }
          }
          match = TABLE_DOT_COL_RE.exec(lineText);
        }
      }
      continue;
    }

    // 3. Dans DATABASE.md / SCHEMA.md ou fichiers annotés `<!-- docs-drift: sql -->` :
    // vérifier `table.column` pour les tables connues du schéma
    if (isDatabaseDoc && snippet.kind === 'inline') {
      TABLE_DOT_COL_RE.lastIndex = 0;
      let match = TABLE_DOT_COL_RE.exec(snippet.value);
      while (match !== null) {
        const table = match[1]?.toLowerCase();
        const col = match[2]?.toLowerCase();
        if (table && col && schema.tables.has(table)) {
          const cols = schema.tables.get(table);
          if (cols && !cols.has(col)) {
            pushUnique(
              snippet.line,
              snippet.column,
              `Colonne "${col}" introuvable dans la table SQL "${table}"`,
              `${table}.${col}`,
            );
          }
        }
        match = TABLE_DOT_COL_RE.exec(snippet.value);
      }
    }
  }

  return violations;
}
