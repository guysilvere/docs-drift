/**
 * Génère un slug d'ancre Markdown compatible avec GitHub (github-slugger).
 * Conserve les lettres Unicode (accents français inclus), chiffres, espaces -> `-`, tirets et underscores.
 */
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/** Crée un générateur de slugs qui gère les titres dupliqués (`section`, `section-1`, `section-2`) */
export function createSlugger(): (text: string) => string {
  const seen = new Map<string, number>();

  return (text: string): string => {
    const base = slugifyHeading(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}
