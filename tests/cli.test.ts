import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EXIT_ERROR, EXIT_OK, EXIT_VIOLATIONS, runCli } from '../src/cli.js';
import { CONFIG_FILENAME } from '../src/config/loader.js';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'docs-drift-cli-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('docs-drift CLI', () => {
  it('affiche l’aide avec le code de sortie 0', () => {
    const res = runCli(['--help']);
    expect(res.exitCode).toBe(EXIT_OK);
    expect(res.stdout).toContain('docs-drift check');
  });

  it('affiche la version avec --version', () => {
    const res = runCli(['--version']);
    expect(res.exitCode).toBe(EXIT_OK);
    expect(res.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('retourne le code 2 pour une commande inconnue', () => {
    const res = runCli(['unknown-cmd']);
    expect(res.exitCode).toBe(EXIT_ERROR);
    expect(res.stderr).toContain('Commande inconnue');
  });

  it('explique une règle connue et échoue sur une règle inconnue', () => {
    const ok = runCli(['explain', 'paths/exists']);
    expect(ok.exitCode).toBe(EXIT_OK);
    expect(ok.stdout).toContain('paths/exists');

    const missing = runCli(['explain']);
    expect(missing.exitCode).toBe(EXIT_ERROR);

    const unknown = runCli(['explain', 'fake/rule']);
    expect(unknown.exitCode).toBe(EXIT_ERROR);
  });

  it('génère .docs-drift.yml avec init et refuse d’écraser sans --force', () => {
    const dir = createTempDir();
    const first = runCli(['init'], dir);
    expect(first.exitCode).toBe(EXIT_OK);
    expect(existsSync(join(dir, CONFIG_FILENAME))).toBe(true);

    const second = runCli(['init'], dir);
    expect(second.exitCode).toBe(EXIT_ERROR);

    const forced = runCli(['init', '--force'], dir);
    expect(forced.exitCode).toBe(EXIT_OK);
  });

  it('retourne le code 2 sur un fichier .docs-drift.yml invalide', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, CONFIG_FILENAME), 'rules:\n  paths/exists: invalid-level\n', 'utf8');
    const res = runCli(['check'], dir);
    expect(res.exitCode).toBe(EXIT_ERROR);
    expect(res.stderr).toContain('invalide');
  });

  it('retourne le code 1 lorsqu’une violation est détectée', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'README.md'), '# Titre\n\nVoir [doc](./missing.md).\n', 'utf8');
    const res = runCli(['check'], dir);
    expect(res.exitCode).toBe(EXIT_VIOLATIONS);
    expect(res.stdout).toContain('paths/exists');
    expect(res.stdout).toContain('README.md:3:');
  });

  it('valide son propre dépôt avec le code 0 (self-check)', () => {
    const repoRoot = resolve(process.cwd());
    const res = runCli(['check', '--cwd', repoRoot]);
    expect(res.exitCode).toBe(EXIT_OK);
    expect(res.stdout).toContain('docs-drift OK');
  });
});
