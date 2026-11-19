import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCheck } from '../src/engine/runner.js';
import { slugifyHeading } from '../src/markdown/slugify.js';

const tempDirs: string[] = [];

function createFixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'docs-drift-rules-'));
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

describe('slugifyHeading', () => {
  it('génère des slugs compatibles GitHub avec accents français', () => {
    expect(slugifyHeading('1. Contexte & problème')).toBe('1-contexte--problème');
    expect(slugifyHeading('Installation rapide')).toBe('installation-rapide');
  });
});

describe('règle paths/exists', () => {
  it('détecte les fichiers et images absents tout en ignorant les URLs externes et placeholders', () => {
    const dir = createFixture({
      'docs/guide.md': '# Guide\n',
      'README.md': [
        '# Projet',
        '',
        '- Valide : [guide](./docs/guide.md)',
        '- Externe : [site](https://example.com/nope)',
        '- Placeholder : [modele](./docs/<nom>.md)',
        '- Cassé : [ancien](./docs/obsolete.md)',
        '- Image cassée : ![capture](./assets/missing.png)',
      ].join('\n'),
    });

    const summary = runCheck({ rootDir: dir });
    expect(summary.errors).toBe(2);
    expect(summary.violations.map((v) => v.ruleId)).toEqual(['paths/exists', 'paths/exists']);
    expect(summary.violations[0]?.line).toBe(6);
    expect(summary.violations[1]?.line).toBe(7);
  });
});

describe('règle anchors/exists', () => {
  it('valide les ancres intra-fichier et inter-fichiers', () => {
    const dir = createFixture({
      'docs/guide.md': '# Guide\n\n## Configuration\n\nTexte.\n',
      'README.md': [
        '# Accueil',
        '',
        '## Installation',
        '',
        '- Intra OK : [Install](#installation)',
        '- Inter OK : [Config](./docs/guide.md#configuration)',
        '- Intra KO : [Oups](#section-fantome)',
        '- Inter KO : [Oups](./docs/guide.md#inexistante)',
      ].join('\n'),
    });

    const summary = runCheck({ rootDir: dir });
    expect(summary.errors).toBe(2);
    expect(summary.violations.map((v) => v.ruleId)).toEqual(['anchors/exists', 'anchors/exists']);
    expect(summary.violations[0]?.line).toBe(7);
    expect(summary.violations[1]?.line).toBe(8);
  });
});

describe('règle scripts/exists', () => {
  it('vérifie les commandes npm/pnpm/yarn run contre package.json', () => {
    const dir = createFixture({
      'package.json': JSON.stringify({
        name: 'fixture',
        scripts: {
          build: 'tsc',
          'test:run': 'vitest run',
        },
      }),
      'README.md': [
        '# Fixture',
        '',
        'Utilisez `npm run build` ou `npm run test:run`.',
        'Placeholder : `npm run <cmd>`',
        '',
        '```bash',
        '# Commentaire ignoré : npm run ghost',
        'npm run build',
        'pnpm run deploy:old',
        '```',
      ].join('\n'),
    });

    const summary = runCheck({ rootDir: dir });
    expect(summary.errors).toBe(1);
    expect(summary.violations[0]?.ruleId).toBe('scripts/exists');
    expect(summary.violations[0]?.line).toBe(9);
    expect(summary.violations[0]?.message).toContain('deploy:old');
  });

  it('saute proprement la règle scripts/exists sans package.json', () => {
    const dir = createFixture({
      'README.md': '# Sans pkg\n\nLancez `npm run whatever`.\n',
    });

    const summary = runCheck({ rootDir: dir });
    expect(summary.errors).toBe(0);
  });
});

describe('configuration par sévérité', () => {
  it('respecte warn et off dans .docs-drift.yml', () => {
    const dir = createFixture({
      '.docs-drift.yml': 'rules:\n  paths/exists: warn\n  anchors/exists: off\n',
      'README.md': '# Titre\n\n[KO](./missing.md) et [Ancre KO](#nope).\n',
    });

    const summary = runCheck({ rootDir: dir });
    expect(summary.errors).toBe(0);
    expect(summary.warnings).toBe(1);
    expect(summary.violations[0]?.ruleId).toBe('paths/exists');
  });
});
