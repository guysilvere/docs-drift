import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectFiles } from './files.js';

export interface SqlSchema {
  /** Map table (en minuscules) -> Set de noms de colonnes (en minuscules) */
  tables: Map<string, Set<string>>;
}

const TABLE_CONSTRAINT_PREFIXES = new Set([
  'PRIMARY',
  'FOREIGN',
  'UNIQUE',
  'CHECK',
  'CONSTRAINT',
  'INDEX',
  'KEY',
]);

/** Supprime les commentaires SQL (`-- ...` et `/* ... *\/`) */
function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/** Nettoie un identifiant SQL (`"users"`, `` `users` ``, `[users]`, `public.users`) */
function normalizeIdent(raw: string): string {
  const cleaned = raw.trim().replace(/^["`[]|["`\]]$/g, '');
  const dotIdx = cleaned.lastIndexOf('.');
  const base = dotIdx === -1 ? cleaned : cleaned.slice(dotIdx + 1);
  return base.replace(/^["`[]|["`\]]$/g, '').toLowerCase();
}

/** Découpe le corps d'un `CREATE TABLE (...)` au niveau de parenthèses 0 */
function splitTopLevelCommas(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);

    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else if (ch !== undefined) {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Applique les instructions DDL d'un fichier SQL sur le schéma en mémoire */
export function applySqlMigration(schema: SqlSchema, rawSql: string): void {
  const sql = stripSqlComments(rawSql);
  const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);

  for (const stmt of statements) {
    // 1. CREATE TABLE [IF NOT EXISTS] name ( ... )
    const createMatch =
      /^CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_."`[\]]+)\s*\(([\s\S]+)\)$/i.exec(
        stmt,
      );
    if (createMatch?.[1] && createMatch[2]) {
      const tableName = normalizeIdent(createMatch[1]);
      const cols = schema.tables.get(tableName) ?? new Set<string>();
      for (const item of splitTopLevelCommas(createMatch[2])) {
        const firstTokenMatch = /^([a-zA-Z0-9_"`[\]]+)/.exec(item);
        const firstToken = firstTokenMatch?.[1];
        if (!firstToken) continue;
        const upper = firstToken.replace(/^["`[]|["`\]]$/g, '').toUpperCase();
        if (TABLE_CONSTRAINT_PREFIXES.has(upper)) continue;
        cols.add(normalizeIdent(firstToken));
      }
      schema.tables.set(tableName, cols);
      continue;
    }

    // 2. DROP TABLE [IF EXISTS] name
    const dropMatch = /^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_."`[\]]+)/i.exec(stmt);
    if (dropMatch?.[1]) {
      schema.tables.delete(normalizeIdent(dropMatch[1]));
      continue;
    }

    // 3. ALTER TABLE name ADD [COLUMN] col ...
    const alterAddMatch =
      /^ALTER\s+TABLE\s+([a-zA-Z0-9_."`[\]]+)\s+ADD\s+(?:COLUMN\s+)?([a-zA-Z0-9_"`[\]]+)/i.exec(
        stmt,
      );
    if (alterAddMatch?.[1] && alterAddMatch[2]) {
      const tableName = normalizeIdent(alterAddMatch[1]);
      const colName = normalizeIdent(alterAddMatch[2]);
      if (!TABLE_CONSTRAINT_PREFIXES.has(colName.toUpperCase())) {
        const cols = schema.tables.get(tableName) ?? new Set<string>();
        cols.add(colName);
        schema.tables.set(tableName, cols);
      }
      continue;
    }

    // 4. ALTER TABLE name DROP [COLUMN] col
    const alterDropColMatch =
      /^ALTER\s+TABLE\s+([a-zA-Z0-9_."`[\]]+)\s+DROP\s+(?:COLUMN\s+)?(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_"`[\]]+)/i.exec(
        stmt,
      );
    if (alterDropColMatch?.[1] && alterDropColMatch[2]) {
      const tableName = normalizeIdent(alterDropColMatch[1]);
      const colName = normalizeIdent(alterDropColMatch[2]);
      schema.tables.get(tableName)?.delete(colName);
      continue;
    }

    // 5. ALTER TABLE name RENAME [COLUMN] old TO new
    const alterRenameColMatch =
      /^ALTER\s+TABLE\s+([a-zA-Z0-9_."`[\]]+)\s+RENAME\s+(?:COLUMN\s+)?([a-zA-Z0-9_"`[\]]+)\s+TO\s+([a-zA-Z0-9_"`[\]]+)/i.exec(
        stmt,
      );
    if (alterRenameColMatch?.[1] && alterRenameColMatch[2] && alterRenameColMatch[3]) {
      const tableName = normalizeIdent(alterRenameColMatch[1]);
      const oldCol = normalizeIdent(alterRenameColMatch[2]);
      const newCol = normalizeIdent(alterRenameColMatch[3]);
      const cols = schema.tables.get(tableName);
      if (cols) {
        cols.delete(oldCol);
        cols.add(newCol);
      }
      continue;
    }

    // 6. ALTER TABLE name RENAME TO new_name
    const alterRenameTableMatch =
      /^ALTER\s+TABLE\s+([a-zA-Z0-9_."`[\]]+)\s+RENAME\s+TO\s+([a-zA-Z0-9_."`[\]]+)/i.exec(stmt);
    if (alterRenameTableMatch?.[1] && alterRenameTableMatch[2]) {
      const oldTable = normalizeIdent(alterRenameTableMatch[1]);
      const newTable = normalizeIdent(alterRenameTableMatch[2]);
      const cols = schema.tables.get(oldTable);
      if (cols) {
        schema.tables.delete(oldTable);
        schema.tables.set(newTable, cols);
      }
    }
  }
}

/** Collecte et reconstruit le schéma SQL depuis les fichiers de migrations, ou `null` si aucun fichier */
export function collectSqlSchema(
  rootDir: string,
  migrationGlobs: readonly string[],
  exclude: readonly string[],
): SqlSchema | null {
  const files = collectFiles(rootDir, migrationGlobs, exclude);
  if (files.length === 0) {
    return null;
  }

  const schema: SqlSchema = { tables: new Map() };
  for (const relFile of files) {
    const content = readFileSync(join(rootDir, relFile), 'utf8');
    applySqlMigration(schema, content);
  }
  return schema;
}
