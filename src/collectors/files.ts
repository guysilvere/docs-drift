import { readdirSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

/** Convertit un motif glob simple (`**`, `*`, `?`) en expression régulière */
export function globToRegExp(pattern: string): RegExp {
  const normalized = pattern.replaceAll('\\', '/');
  let regexStr = '^';
  let i = 0;

  while (i < normalized.length) {
    const ch = normalized[i];
    if (ch === '*') {
      if (normalized[i + 1] === '*') {
        if (normalized[i + 2] === '/') {
          regexStr += '(?:.*/)?';
          i += 3;
          continue;
        }
        regexStr += '.*';
        i += 2;
        continue;
      }
      regexStr += '[^/]*';
      i += 1;
      continue;
    }
    if (ch === '?') {
      regexStr += '[^/]';
      i += 1;
      continue;
    }
    if (ch !== undefined && /[.+^${}()|[\]\\]/.test(ch)) {
      regexStr += `\\${ch}`;
    } else if (ch !== undefined) {
      regexStr += ch;
    }
    i += 1;
  }

  regexStr += '$';
  return new RegExp(regexStr);
}

/** Normalise un chemin relatif en format POSIX (`/`) */
export function toPosixPath(filePath: string): string {
  return filePath.split(sep).join(posix.sep);
}

/** Vérifie si un chemin relatif correspond à au moins un motif glob */
function matchesAny(relPath: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((re) => re.test(relPath));
}

/** Collecte les fichiers correspondant aux motifs `include` hors `exclude` */
export function collectFiles(
  rootDir: string,
  include: readonly string[],
  exclude: readonly string[],
): string[] {
  const includeRegexes = include.map(globToRegExp);
  const excludeRegexes = exclude.map(globToRegExp);
  const results: string[] = [];

  function walk(currentDir: string): void {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = join(currentDir, entry.name);
      const relPath = toPosixPath(relative(rootDir, absPath));

      if (entry.isDirectory()) {
        // Évite de descendre dans un dossier explicitement exclu (ex. node_modules/**)
        if (matchesAny(`${relPath}/`, excludeRegexes) || matchesAny(relPath, excludeRegexes)) {
          continue;
        }
        walk(absPath);
      } else if (entry.isFile()) {
        if (matchesAny(relPath, excludeRegexes)) {
          continue;
        }
        if (matchesAny(relPath, includeRegexes)) {
          results.push(relPath);
        }
      }
    }
  }

  walk(rootDir);
  results.sort();
  return results;
}
