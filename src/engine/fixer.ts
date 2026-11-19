import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join, posix } from 'node:path';
import { collectFiles, toPosixPath } from '../collectors/files.js';
import { splitLinkTarget } from '../rules/paths.js';
import type { Violation } from '../types.js';

export interface AppliedFix {
  file: string;
  line: number;
  from: string;
  to: string;
}

export interface SkippedFix {
  file: string;
  line: number;
  reference: string;
  reason: string;
}

export interface FixSummary {
  dryRun: boolean;
  applied: AppliedFix[];
  skipped: SkippedFix[];
}

/** Construit un index `basename -> liste de chemins relatifs POSIX` pour tous les fichiers du dépôt */
function buildBasenameIndex(rootDir: string, exclude: readonly string[]): Map<string, string[]> {
  const allFiles = collectFiles(rootDir, ['**/*'], exclude);
  const index = new Map<string, string[]>();

  for (const relPath of allFiles) {
    const name = posix.basename(relPath);
    const list = index.get(name) ?? [];
    list.push(relPath);
    index.set(name, list);
  }

  return index;
}

/** Calcule le chemin relatif POSIX propre depuis un fichier Markdown vers sa cible */
function computeRelativeLink(sourceRelFile: string, targetRelFile: string): string {
  const sourceDir = posix.dirname(toPosixPath(sourceRelFile));
  const rel = posix.relative(sourceDir === '.' ? '' : sourceDir, toPosixPath(targetRelFile));
  return rel.startsWith('.') ? rel : `./${rel}`;
}

/**
 * Applique des corrections prudentes sur les violations `paths/exists` :
 * ne réécrit un chemin que s'il existe une correspondance UNIQUE de nom de fichier dans le dépôt.
 */
export function applyPrudentFixes(
  rootDir: string,
  violations: readonly Violation[],
  exclude: readonly string[],
  dryRun = false,
): FixSummary {
  const pathViolations = violations.filter(
    (v) => v.ruleId === 'paths/exists' && v.reference !== undefined,
  );
  if (pathViolations.length === 0) {
    return { dryRun, applied: [], skipped: [] };
  }

  const index = buildBasenameIndex(rootDir, exclude);
  const applied: AppliedFix[] = [];
  const skipped: SkippedFix[] = [];

  // Regroupe les remplacements par fichier pour n'écrire chaque fichier qu'une seule fois
  const byFile = new Map<string, Violation[]>();
  for (const v of pathViolations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }

  for (const [relFile, fileViolations] of byFile.entries()) {
    const absPath = join(rootDir, relFile);
    const lines = readFileSync(absPath, 'utf8').split('\n');
    let modified = false;

    for (const v of fileViolations) {
      const ref = v.reference;
      if (!ref || ref.startsWith('file://')) {
        skipped.push({
          file: relFile,
          line: v.line,
          reference: ref ?? '',
          reason: 'Référence non éligible au --fix automatique',
        });
        continue;
      }

      const { rawPath, anchor } = splitLinkTarget(ref);
      const targetName = basename(rawPath);
      const candidates = index.get(targetName) ?? [];

      if (candidates.length === 0) {
        skipped.push({
          file: relFile,
          line: v.line,
          reference: ref,
          reason: `Aucun fichier nommé "${targetName}" trouvé dans le dépôt`,
        });
        continue;
      }

      if (candidates.length > 1) {
        skipped.push({
          file: relFile,
          line: v.line,
          reference: ref,
          reason: `Ambiguïté : ${candidates.length} fichiers portent le nom "${targetName}"`,
        });
        continue;
      }

      const uniqueTarget = candidates[0];
      if (!uniqueTarget) continue;

      const newBasePath = computeRelativeLink(relFile, uniqueTarget);
      const newRef = anchor ? `${newBasePath}#${anchor}` : newBasePath;

      const lineIndex = v.line - 1;
      const currentLine = lines[lineIndex];
      if (currentLine === undefined || !currentLine.includes(`(${ref})`)) {
        skipped.push({
          file: relFile,
          line: v.line,
          reference: ref,
          reason: 'Motif de lien introuvable sur la ligne cible',
        });
        continue;
      }

      lines[lineIndex] = currentLine.replace(`(${ref})`, `(${newRef})`);
      modified = true;
      applied.push({
        file: relFile,
        line: v.line,
        from: ref,
        to: newRef,
      });
    }

    if (modified && !dryRun) {
      writeFileSync(absPath, lines.join('\n'), 'utf8');
    }
  }

  return { dryRun, applied, skipped };
}
