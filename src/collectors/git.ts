import { execFileSync } from 'node:child_process';

export interface GitStatusInfo {
  isGitRepo: boolean;
  isShallow: boolean;
}

/** Exécute une commande git en lecture seule sans shell (sécurité anti-injection) */
function runGit(rootDir: string, args: readonly string[]): string | null {
  try {
    return execFileSync('git', args, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/** Vérifie si `rootDir` est un dépôt Git et s'il s'agit d'un clone superficiel (shallow) */
export function inspectGitRepo(rootDir: string): GitStatusInfo {
  const inside = runGit(rootDir, ['rev-parse', '--is-inside-work-tree']);
  if (inside !== 'true') {
    return { isGitRepo: false, isShallow: false };
  }
  const shallow = runGit(rootDir, ['rev-parse', '--is-shallow-repository']);
  return { isGitRepo: true, isShallow: shallow === 'true' };
}

/** Retourne le timestamp Unix (en ms) du dernier commit ayant modifié `relPath`, ou `null` */
export function getLastCommitTimestampMs(rootDir: string, relPath: string): number | null {
  const out = runGit(rootDir, ['log', '-1', '--format=%ct', '--', relPath]);
  if (!out) return null;
  const seconds = Number.parseInt(out, 10);
  if (Number.isNaN(seconds)) return null;
  return seconds * 1000;
}

/** Parse une durée compacte (`90d`, `12w`, `48h`) en millisecondes */
export function parseDurationMs(duration: string): number | null {
  const match = /^(\d+)([hdw])$/.exec(duration.trim());
  if (!match?.[1] || !match[2]) return null;
  const value = Number.parseInt(match[1], 10);
  const unit = match[2];
  const hourMs = 3600 * 1000;
  if (unit === 'h') return value * hourMs;
  if (unit === 'd') return value * 24 * hourMs;
  if (unit === 'w') return value * 7 * 24 * hourMs;
  return null;
}
