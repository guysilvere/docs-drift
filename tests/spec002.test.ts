import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EXIT_ERROR, runCli } from '../src/cli.js';
import { runCheck } from '../src/engine/runner.js';

const tempDirs: string[] = [];

function createFixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'docs-drift-s002-'));
  tempDirs.push(dir);
  for (const [relPath, content] of Object.entries(files)) {
    const abs = join(dir, relPath);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return dir;
}

function gitCommit(cwd: string, message: string, isoDate: string): void {
  execFileSync('git', ['add', '.'], { cwd, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', message], {
    cwd,
    stdio: 'ignore',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
      GIT_AUTHOR_DATE: isoDate,
      GIT_COMMITTER_DATE: isoDate,
    },
  });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('SPEC-002 — règle env/exists', () => {
  it('détecte les variables absentes de .env.example et ignore les variables standard', () => {
    const dir = createFixture({
      '.env.example': '# Config\nDATABASE_URL=file:local.db\nexport PAYMENT_API_KEY=sandbox\n',
      'README.md': [
        '# Env',
        '',
        'Utilise `process.env.DATABASE_URL` et `process.env.NODE_ENV`.',
        'Variable cassée : `process.env.OLD_STRIPE_SECRET`',
        '',
        '```env',
        'PAYMENT_API_KEY=ok',
        'MISSING_WEBHOOK_SECRET=123',
        '```',
      ].join('\n'),
    });

    const summary = runCheck({ rootDir: dir });
    expect(summary.errors).toBe(2);
    expect(summary.violations.map((v) => v.ruleId)).toEqual(['env/exists', 'env/exists']);
    expect(summary.violations[0]?.message).toContain('OLD_STRIPE_SECRET');
    expect(summary.violations[1]?.message).toContain('MISSING_WEBHOOK_SECRET');
  });

  it('saute proprement env/exists si .env.example est absent', () => {
    const dir = createFixture({
      'README.md': '# Doc\n\n`process.env.CUSTOM_KEY`\n',
    });
    const summary = runCheck({ rootDir: dir });
    expect(summary.errors).toBe(0);
  });
});

describe('SPEC-002 — balises <!-- docs-drift: ... --> et exceptions datées', () => {
  it('supprime une violation avec ignore-next-line non expiré', () => {
    const dir = createFixture({
      'README.md': [
        '# Doc',
        '',
        '<!-- docs-drift: ignore-next-line paths/exists reason="Migration prévue" expires="2099-12-31" -->',
        'Voir [ancien](./missing.md).',
      ].join('\n'),
    });

    const summary = runCheck({ rootDir: dir, referenceDate: '2026-11-19' });
    expect(summary.errors).toBe(0);
    expect(summary.warnings).toBe(0);
    expect(summary.suppressed).toBe(1);
  });

  it('réactive la violation et avertit si une directive ou exception est expirée', () => {
    const dir = createFixture({
      '.docs-drift.yml': [
        'exceptions:',
        '  - file: README.md',
        '    rule: anchors/exists',
        '    reason: "Temporaire"',
        '    expires: "2025-01-01"',
      ].join('\n'),
      'README.md': [
        '# Doc',
        '',
        '<!-- docs-drift: ignore-next-line paths/exists reason="Ancien" expires="2025-06-01" -->',
        'Voir [ancien](./missing.md) et [ancre](#fantome).',
      ].join('\n'),
    });

    const summary = runCheck({ rootDir: dir, referenceDate: '2026-11-19' });
    expect(summary.errors).toBe(2);
    expect(summary.warnings).toBe(2);
    expect(summary.violations.some((v) => v.message.includes('expirée'))).toBe(true);
  });

  it('supporte disable / enable sur un bloc de lignes', () => {
    const dir = createFixture({
      'README.md': [
        '# Doc',
        '<!-- docs-drift: disable paths/exists -->',
        '[un](./a.md)',
        '[deux](./b.md)',
        '<!-- docs-drift: enable paths/exists -->',
        '[trois](./c.md)',
      ].join('\n'),
    });

    const summary = runCheck({ rootDir: dir });
    expect(summary.errors).toBe(1);
    expect(summary.suppressed).toBe(2);
    expect(summary.violations[0]?.line).toBe(6);
  });
});

describe('SPEC-002 — règle git/stale (--stale et delta code/doc)', () => {
  it('détecte une doc trop ancienne (--stale) et un delta code/doc', () => {
    const dir = createFixture({
      '.docs-drift.yml': [
        'rules:',
        '  git/stale: error',
        'stale:',
        '  mappings:',
        '    - doc: docs/DATABASE.md',
        '      code:',
        '        - "src/db/**"',
      ].join('\n'),
      'docs/DATABASE.md': '# Database\n',
      'src/db/schema.ts': 'export const v = 1;\n',
    });

    execFileSync('git', ['init', '-b', 'testing'], { cwd: dir, stdio: 'ignore' });
    gitCommit(dir, 'chore: initial', '2026-01-01T10:00:00Z');

    // Modifie uniquement le code plus tard sans toucher docs/DATABASE.md
    writeFileSync(join(dir, 'src/db/schema.ts'), 'export const v = 2;\n', 'utf8');
    gitCommit(dir, 'feat(db): update schema', '2026-06-01T10:00:00Z');

    const nowMs = Date.parse('2026-06-15T10:00:00Z');
    const summary = runCheck({ rootDir: dir, staleMaxAge: '90d', nowMs });

    expect(summary.errors).toBe(2);
    expect(summary.violations.every((v) => v.ruleId === 'git/stale')).toBe(true);
    expect(summary.violations.some((v) => v.message.includes('seuil : 90d'))).toBe(true);
    expect(summary.violations.some((v) => v.message.includes('src/db/schema.ts'))).toBe(true);
  });

  it('rejette une durée --stale invalide avec code 2', () => {
    const res = runCli(['check', '--stale', 'invalid']);
    expect(res.exitCode).toBe(EXIT_ERROR);
    expect(res.stderr).toContain('--stale');
  });
});
