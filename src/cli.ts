#!/usr/bin/env node
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONFIG_FILENAME, ConfigError, writeDefaultConfig } from './config/loader.js';
import { runCheck } from './engine/runner.js';
import { formatTextReport } from './reporters/text.js';
import { isKnownRule, RULES_REGISTRY } from './rules/registry.js';

export const EXIT_OK = 0;
export const EXIT_VIOLATIONS = 1;
export const EXIT_ERROR = 2;
export const VERSION = '0.1.0';

const HELP_TEXT = `docs-drift v${VERSION} — Linter de cohérence documentation Markdown <-> code réel

Usage :
  docs-drift check [--cwd <dir>]    Vérifie la documentation du dépôt (défaut)
  docs-drift init [--force]         Génère un fichier ${CONFIG_FILENAME} minimal
  docs-drift explain <rule>         Affiche la documentation d'une règle
  docs-drift --help | -h            Affiche cette aide
  docs-drift --version | -v         Affiche la version

Règles disponibles :
  paths/exists                      Existence des chemins, dossiers et médias locaux
  anchors/exists                    Validité des ancres Markdown locales (#section)
  scripts/exists                    Existence des scripts npm/pnpm/yarn dans package.json

Codes de sortie :
  0  Aucune violation
  1  Violations détectées
  2  Erreur de configuration ou d'exécution
`;

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function parseCwdOption(args: readonly string[], defaultCwd: string): { cwd: string; remaining: string[] } {
  let cwd = defaultCwd;
  const remaining: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--cwd') {
      const next = args[i + 1];
      if (!next) {
        throw new ConfigError('Option --cwd attend un chemin de dossier.');
      }
      cwd = resolve(defaultCwd, next);
      i += 1;
    } else if (arg !== undefined) {
      remaining.push(arg);
    }
  }

  return { cwd, remaining };
}

/** Exécute la CLI avec une liste d'arguments (sans node/script) */
export function runCli(args: readonly string[], defaultCwd = process.cwd()): CliResult {
  try {
    const { cwd, remaining } = parseCwdOption(args, defaultCwd);
    const [command = 'check', ...rest] = remaining;

    if (command === '--help' || command === '-h' || command === 'help') {
      return { exitCode: EXIT_OK, stdout: HELP_TEXT, stderr: '' };
    }

    if (command === '--version' || command === '-v') {
      return { exitCode: EXIT_OK, stdout: `${VERSION}\n`, stderr: '' };
    }

    if (command === 'explain') {
      const ruleId = rest[0];
      if (!ruleId) {
        const list = Object.keys(RULES_REGISTRY).join(', ');
        return {
          exitCode: EXIT_ERROR,
          stdout: '',
          stderr: `Erreur : indiquez un identifiant de règle (${list}).\n`,
        };
      }
      if (!isKnownRule(ruleId)) {
        const list = Object.keys(RULES_REGISTRY).join(', ');
        return {
          exitCode: EXIT_ERROR,
          stdout: '',
          stderr: `Règle inconnue : "${ruleId}". Règles disponibles : ${list}.\n`,
        };
      }
      const meta = RULES_REGISTRY[ruleId];
      const out = [
        `${meta.id} — ${meta.title}`,
        '',
        meta.summary,
        '',
        `Invalide : ${meta.examples.invalid}`,
        `Valide   : ${meta.examples.valid}`,
        '',
      ].join('\n');
      return { exitCode: EXIT_OK, stdout: out, stderr: '' };
    }

    if (!existsSync(cwd) || !statSync(cwd).isDirectory()) {
      return {
        exitCode: EXIT_ERROR,
        stdout: '',
        stderr: `Erreur : dossier introuvable : "${cwd}".\n`,
      };
    }

    if (command === 'init') {
      const force = rest.includes('--force');
      writeDefaultConfig(cwd, force);
      return {
        exitCode: EXIT_OK,
        stdout: `Fichier ${CONFIG_FILENAME} créé avec succès.\n`,
        stderr: '',
      };
    }

    if (command === 'check') {
      const summary = runCheck({ rootDir: cwd });
      const report = formatTextReport(summary);
      return {
        exitCode: summary.errors > 0 ? EXIT_VIOLATIONS : EXIT_OK,
        stdout: report,
        stderr: '',
      };
    }

    return {
      exitCode: EXIT_ERROR,
      stdout: '',
      stderr: `Commande inconnue : "${command}". Utilisez "docs-drift --help".\n`,
    };
  } catch (err) {
    if (err instanceof ConfigError) {
      return { exitCode: EXIT_ERROR, stdout: '', stderr: `Erreur de configuration : ${err.message}\n` };
    }
    const detail = err instanceof Error ? err.message : String(err);
    return { exitCode: EXIT_ERROR, stdout: '', stderr: `Erreur inattendue : ${detail}\n` };
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  const result = runCli(process.argv.slice(2));
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.exitCode);
}
