#!/usr/bin/env node
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseDurationMs } from './collectors/git.js';
import { CONFIG_FILENAME, ConfigError, loadConfig, writeDefaultConfig } from './config/loader.js';
import { applyPrudentFixes } from './engine/fixer.js';
import { runCheck, type RunCheckOptions } from './engine/runner.js';
import { formatJsonReport } from './reporters/json.js';
import { formatMarkdownReport } from './reporters/markdown.js';
import { formatSarifReport } from './reporters/sarif.js';
import { formatTextReport } from './reporters/text.js';
import { isKnownRule, RULES_REGISTRY } from './rules/registry.js';

export const EXIT_OK = 0;
export const EXIT_VIOLATIONS = 1;
export const EXIT_ERROR = 2;
export const VERSION = '0.5.0';

export type OutputFormat = 'text' | 'json' | 'sarif' | 'markdown';
const VALID_FORMATS = new Set<OutputFormat>(['text', 'json', 'sarif', 'markdown']);

const HELP_TEXT = `docs-drift v${VERSION} — Linter de cohérence documentation Markdown <-> code réel

Usage :
  docs-drift check [options]    Vérifie la documentation du dépôt (défaut)
  docs-drift init [--force]     Génère ${CONFIG_FILENAME}
  docs-drift explain <rule>     Documentation détaillée d'une règle
  docs-drift --help | -h        Affiche cette aide
  docs-drift --version | -v     Affiche la version

Options de check :
  --cwd <dir>                   Dossier cible à analyser
  --stale <durée>               Seuil de fraîcheur Git (ex. 90d, 12w, 48h)
  --format <fmt>                Format de sortie : text (défaut), json, sarif, markdown
  --fix                         Corrige prudemment les chemins déplacés sans ambiguïté
  --dry-run                     Prévisualise --fix sans modifier les fichiers

Règles disponibles :
  paths/exists        Existence des chemins, dossiers et médias locaux
  anchors/exists      Validité des ancres Markdown locales (#section)
  scripts/exists      Existence des scripts npm/pnpm/yarn dans package.json
  env/exists          Cohérence des variables d'environnement (.env.example)
  git/stale           Dérive temporelle (--stale 90d) et delta code/doc
  sveltekit/routes    Routes API et méthodes HTTP SvelteKit (+server.ts)
  sql/schema          Tables et colonnes SQL issues des migrations

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

interface ParsedCliOptions {
  cwd: string;
  staleMaxAge?: string;
  format: OutputFormat;
  fix: boolean;
  dryRun: boolean;
  remaining: string[];
}

function parseCliOptions(args: readonly string[], defaultCwd: string): ParsedCliOptions {
  let cwd = defaultCwd;
  let staleMaxAge: string | undefined;
  let format: OutputFormat = 'text';
  let fix = false;
  let dryRun = false;
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
    } else if (arg === '--stale') {
      const next = args[i + 1];
      if (!next || parseDurationMs(next) === null) {
        throw new ConfigError('Option --stale attend une durée valide (ex. 90d, 12w, 48h).');
      }
      staleMaxAge = next;
      i += 1;
    } else if (arg === '--format') {
      const next = args[i + 1] as OutputFormat | undefined;
      if (!next || !VALID_FORMATS.has(next)) {
        throw new ConfigError('Option --format attend : text, json, sarif ou markdown.');
      }
      format = next;
      i += 1;
    } else if (arg === '--fix') {
      fix = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg !== undefined) {
      remaining.push(arg);
    }
  }

  const result: ParsedCliOptions = { cwd, format, fix, dryRun, remaining };
  if (staleMaxAge !== undefined) result.staleMaxAge = staleMaxAge;
  return result;
}

function formatReport(format: OutputFormat, summary: ReturnType<typeof runCheck>): string {
  switch (format) {
    case 'json':
      return formatJsonReport(summary, VERSION);
    case 'sarif':
      return formatSarifReport(summary, VERSION);
    case 'markdown':
      return formatMarkdownReport(summary);
    case 'text':
    default:
      return formatTextReport(summary);
  }
}

/** Exécute la CLI avec une liste d'arguments (sans node/script) */
export function runCli(args: readonly string[], defaultCwd = process.cwd()): CliResult {
  try {
    const { cwd, staleMaxAge, format, fix, dryRun, remaining } = parseCliOptions(args, defaultCwd);
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
      const config = loadConfig(cwd);
      const checkOpts: RunCheckOptions = { rootDir: cwd, config };
      if (staleMaxAge !== undefined) checkOpts.staleMaxAge = staleMaxAge;

      let summary = runCheck(checkOpts);
      let fixNotice = '';

      if (fix) {
        const fixSummary = applyPrudentFixes(cwd, summary.violations, config.exclude, dryRun);
        if (format === 'text' && (fixSummary.applied.length > 0 || fixSummary.skipped.length > 0)) {
          const lines: string[] = [];
          const verb = dryRun ? 'Prévisualisation --fix (dry-run)' : 'Corrections --fix appliquées';
          lines.push(`${verb} : ${fixSummary.applied.length} corrigée(s), ${fixSummary.skipped.length} ignorée(s)`);
          for (const item of fixSummary.applied) {
            lines.push(`  FIX  ${item.file}:${item.line} ${item.from} -> ${item.to}`);
          }
          for (const item of fixSummary.skipped) {
            lines.push(`  SKIP ${item.file}:${item.line} ${item.reference} (${item.reason})`);
          }
          lines.push('');
          fixNotice = `${lines.join('\n')}\n`;
        }
        if (!dryRun && fixSummary.applied.length > 0) {
          summary = runCheck(checkOpts);
        }
      }

      const report = formatReport(format, summary);
      return {
        exitCode: summary.errors > 0 ? EXIT_VIOLATIONS : EXIT_OK,
        stdout: `${fixNotice}${report}`,
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
