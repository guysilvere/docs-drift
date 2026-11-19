import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCheck } from '../src/engine/runner.js';

const tempDirs: string[] = [];

function createFixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'docs-drift-s003-'));
  tempDirs.push(dir);
  for (const [relPath, content] of Object.entries(files)) {
    const abs = join(dir, relPath);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('SPEC-003 — règle sveltekit/routes', () => {
  it('valide les routes dynamiques, groupes de layout et méthodes HTTP exportées', () => {
    const dir = createFixture({
      'src/routes/(app)/api/users/[id]/+server.ts': [
        'export async function GET() { return new Response("ok"); }',
        'export const PATCH = async () => new Response("ok");',
      ].join('\n'),
      'src/routes/(marketing)/pricing/+page.svelte': '<h1>Pricing</h1>\n',
      'docs/API.md': [
        '# API',
        '',
        '- Valide : `GET /api/users/:id`',
        '- Valide : `PATCH /api/users/{id}`',
        '- Valide page : `GET /pricing`',
        '- Méthode absente : `DELETE /api/users/[id]`',
        '- Route absente : `POST /api/legacy/orders`',
      ].join('\n'),
    });

    const summary = runCheck({ rootDir: dir });
    expect(summary.errors).toBe(2);
    expect(summary.violations.map((v) => v.ruleId)).toEqual([
      'sveltekit/routes',
      'sveltekit/routes',
    ]);
    expect(summary.violations[0]?.message).toContain('DELETE');
    expect(summary.violations[1]?.message).toContain('/api/legacy/orders');
  });
});

describe('SPEC-003 — règle sql/schema', () => {
  it('reconstruit les migrations (CREATE, ALTER ADD/DROP/RENAME, DROP) et détecte les écarts', () => {
    const dir = createFixture({
      'migrations/0001_init.sql': [
        '-- Création initiale',
        'CREATE TABLE users (',
        '  id INTEGER PRIMARY KEY,',
        '  email TEXT NOT NULL,',
        '  legacy_col TEXT',
        ');',
        'CREATE TABLE temp_logs (id INTEGER PRIMARY KEY);',
      ].join('\n'),
      'migrations/0002_alter.sql': [
        'ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT "user";',
        'ALTER TABLE users DROP COLUMN legacy_col;',
        'ALTER TABLE users RENAME COLUMN email TO email_address;',
        'DROP TABLE temp_logs;',
      ].join('\n'),
      'docs/DATABASE.md': [
        '# Base de données',
        '',
        'Colonnes valides : `users.id`, `users.email_address`, `users.role`.',
        'Colonne supprimée : `users.legacy_col`.',
        'Ancien nom de colonne : `users.email`.',
        '',
        '```sql',
        'SELECT users.id, users.role FROM users;',
        'SELECT * FROM temp_logs;',
        '```',
      ].join('\n'),
      'README.md': 'Référence explicite : `sql:users.role` et `sql:orders.total`.\n',
    });

    const summary = runCheck({ rootDir: dir });
    expect(summary.errors).toBe(4);
    expect(summary.violations.every((v) => v.ruleId === 'sql/schema')).toBe(true);
    expect(summary.violations.some((v) => v.message.includes('orders'))).toBe(true);
    expect(summary.violations.some((v) => v.message.includes('legacy_col'))).toBe(true);
    expect(summary.violations.some((v) => v.message.includes('"email"'))).toBe(true);
    expect(summary.violations.some((v) => v.message.includes('temp_logs'))).toBe(true);
  });
});
