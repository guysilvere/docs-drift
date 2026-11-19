import {
  normalizeRoutePath,
  type HttpMethod,
  type SvelteKitRouteInfo,
} from '../collectors/sveltekit.js';
import type { RuleSeverity } from '../config/schema.js';
import type { ParsedMarkdown } from '../markdown/parser.js';
import type { Violation } from '../types.js';

const ROUTE_REF_RE = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/[a-zA-Z0-9_\-./:[\]{}]+)/g;
const PLACEHOLDER_ROUTE_RE = /<[^>]+>|\.\.\.|\*/;

/** Vérifie les routes API et méthodes HTTP documentées contre les routes SvelteKit détectées */
export function checkSvelteKitRoutesRule(
  parsed: ParsedMarkdown,
  routes: Map<string, SvelteKitRouteInfo> | null,
  severity: Exclude<RuleSeverity, 'off'>,
): Violation[] {
  if (routes === null) {
    return [];
  }

  const violations: Violation[] = [];
  const seen = new Set<string>();

  for (const snippet of parsed.codeSnippets) {
    const lines = snippet.value.split('\n');
    for (let idx = 0; idx < lines.length; idx += 1) {
      const lineText = lines[idx];
      if (!lineText) continue;

      const lineNumber = snippet.kind === 'block' ? snippet.line + 1 + idx : snippet.line;
      ROUTE_REF_RE.lastIndex = 0;
      let match = ROUTE_REF_RE.exec(lineText);

      while (match !== null) {
        const method = match[1] as HttpMethod | undefined;
        const rawPath = match[2];
        if (method && rawPath && !PLACEHOLDER_ROUTE_RE.test(rawPath)) {
          const normalized = normalizeRoutePath(rawPath);
          const dedupKey = `${lineNumber}:${method}:${normalized}`;
          if (!seen.has(dedupKey)) {
            seen.add(dedupKey);
            const routeInfo = routes.get(normalized);
            const col = snippet.kind === 'block' ? match.index + 1 : snippet.column;

            if (!routeInfo) {
              violations.push({
                ruleId: 'sveltekit/routes',
                severity,
                file: parsed.file,
                line: lineNumber,
                column: col,
                message: `Route SvelteKit introuvable : "${method} ${rawPath}"`,
                reference: `${method} ${rawPath}`,
              });
            } else if (
              !routeInfo.methods.has(method) &&
              !routeInfo.methods.has('FALLBACK') &&
              !(method === 'GET' && routeInfo.hasPage)
            ) {
              const available = [...routeInfo.methods].join(', ') || 'aucune méthode +server';
              violations.push({
                ruleId: 'sveltekit/routes',
                severity,
                file: parsed.file,
                line: lineNumber,
                column: col,
                message: `Méthode ${method} non exportée sur la route "${rawPath}" (disponible : ${available})`,
                reference: `${method} ${rawPath}`,
              });
            }
          }
        }
        match = ROUTE_REF_RE.exec(lineText);
      }
    }
  }

  return violations;
}
