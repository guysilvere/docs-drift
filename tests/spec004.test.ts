import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EXIT_ERROR, EXIT_OK, EXIT_VIOLATIONS, runCli } from '../src/cli.js';
import { jsonReportSchema } from '../src/reporters/json.js';
import type { SarifReport } from '../src/reporters/sarif.js';

const tempDirs: string[] = [];

function createFixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'docs-drift-s004-'));
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

describe('SPEC-004 — formateurs JSON, SARIF et Markdown', () => {
  it('produit une sortie JSON valide selon jsonReportSchema', () => {
    const dir = createFixture({
      'README.md': '# Doc\n\nVoir [absent](./nope.md).\n',
    });

    const res = runCli(['check', '--format', 'json'], dir);
    expect(res.exitCode).toBe(EXIT_VIOLATIONS);

    const parsed = jsonReportSchema.parse(JSON.parse(res.stdout));
    expect(parsed.tool).toBe('docs-drift');
    expect(parsed.status).toBe('fail');
    expect(parsed.summary.errors).toBe(1);
    expect(parsed.violations[0]?.file).toBe('README.md');
    expect(parsed.violations[0]?.ruleId).toBe('paths/exists');
  });

  it('produit un rapport SARIF 2.1.0 valide pour GitHub Code Scanning', () => {
    const dir = createFixture({
      'README.md': '# Doc\n\nVoir [absent](./nope.md).\n',
    });

    const res = runCli(['check', '--format', 'sarif'], dir);
    expect(res.exitCode).toBe(EXIT_VIOLATIONS);

    const sarif = JSON.parse(res.stdout) as SarifReport;
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs[0]?.tool.driver.name).toBe('docs-drift');
    expect(sarif.runs[0]?.tool.driver.rules.length).toBeGreaterThanOrEqual(7);
    expect(sarif.runs[0]?.results[0]?.ruleId).toBe('paths/exists');
    expect(sarif.runs[0]?.results[0]?.locations[0]?.physicalLocation.artifactLocation.uri).toBe(
      'README.md',
    );
  });

  it('produit un tableau Markdown lisible en commentaire PR', () => {
    const dir = createFixture({
      'README.md': '# Doc\n\nVoir [absent](./nope.md).\n',
    });

    const res = runCli(['check', '--format', 'markdown'], dir);
    expect(res.exitCode).toBe(EXIT_VIOLATIONS);
    expect(res.stdout).toContain('## docs-drift — ECHEC');
    expect(res.stdout).toContain('| `README.md` | 3 | ERROR | `paths/exists` |');
  });

  it('rejette un format inconnu avec le code de sortie 2', () => {
    const res = runCli(['check', '--format', 'xml']);
    expect(res.exitCode).toBe(EXIT_ERROR);
    expect(res.stderr).toContain('--format');
  });
});

describe('SPEC-004 — mode --fix prudent', () => {
  it('corrige un fichier déplacé sans ambiguïté en conservant l’ancre', () => {
    const dir = createFixture({
      'docs/guides/INSTALL.md': '# Install\n\n## Prerequis\n',
      'README.md': '# Accueil\n\nVoir [Install](./INSTALL.md#prerequis).\n',
    });

    // Dry-run : ne modifie pas le fichier sur disque
    const dry = runCli(['check', '--fix', '--dry-run'], dir);
    expect(dry.exitCode).toBe(EXIT_VIOLATIONS);
    expect(dry.stdout).toContain('dry-run');
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toContain('./INSTALL.md#prerequis');

    // Fix réel : réécrit le chemin et la ré-analyse passe à EXIT_OK
    const applied = runCli(['check', '--fix'], dir);
    expect(applied.exitCode).toBe(EXIT_OK);
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toContain(
      './docs/guides/INSTALL.md#prerequis',
    );
  });

  it('ne modifie rien en cas d’ambiguïté (2 fichiers portant le même nom)', () => {
    const dir = createFixture({
      'docs/a/guide.md': '# Guide A\n',
      'docs/b/guide.md': '# Guide B\n',
      'README.md': '# Accueil\n\nVoir [Guide](./guide.md).\n',
    });

    const res = runCli(['check', '--fix'], dir);
    expect(res.exitCode).toBe(EXIT_VIOLATIONS);
    expect(res.stdout).toContain('Ambiguïté');
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toContain('./guide.md');
  });
});
