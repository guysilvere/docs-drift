import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ENV_KEY_LINE_RE = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/;

/** Variables système/CI standard exclues par défaut pour éviter les faux positifs */
export const DEFAULT_IGNORED_ENV_VARS = new Set<string>([
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'PWD',
  'TERM',
  'LANG',
  'LC_ALL',
  'TZ',
  'NODE_ENV',
  'CI',
  'PORT',
  'HOST',
  'DEBUG',
  'GITHUB_TOKEN',
  'GITHUB_SHA',
  'GITHUB_REF',
  'GITHUB_WORKSPACE',
  'GITHUB_REPOSITORY',
  'GITHUB_ACTIONS',
]);

/** Charge les clés déclarées dans `.env.example` (ou `null` si le fichier est absent) */
export function loadEnvExampleKeys(rootDir: string, envFile = '.env.example'): Set<string> | null {
  const fullPath = join(rootDir, envFile);
  if (!existsSync(fullPath)) {
    return null;
  }

  const content = readFileSync(fullPath, 'utf8');
  const keys = new Set<string>();

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = ENV_KEY_LINE_RE.exec(line);
    if (match?.[1]) {
      keys.add(match[1]);
    }
  }

  return keys;
}
