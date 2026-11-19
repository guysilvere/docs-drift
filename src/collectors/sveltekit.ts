import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'FALLBACK';

export interface SvelteKitRouteInfo {
  /** Chemin canonique normalisé (ex. `/api/users/:param`) */
  normalizedPath: string;
  /** Chemin SvelteKit original (ex. `/api/users/[id]`) */
  rawPath: string;
  hasPage: boolean;
  methods: Set<HttpMethod>;
}

const HTTP_METHODS: readonly HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'FALLBACK',
];

const EXPORT_FUNC_OR_CONST_RE =
  /export\s+(?:async\s+)?(?:function|const|let|var)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|FALLBACK)\b/g;
const EXPORT_LIST_RE = /export\s*\{([^}]+)\}/g;

/** Normalise une route (supprime les groupes `(app)`, unifie `[id]`, `:id`, `{id}` en `:param`) */
export function normalizeRoutePath(routePath: string): string {
  const withoutQuery = routePath.split('?')[0] ?? routePath;
  const cleaned = withoutQuery.trim().replace(/\/+$/, '') || '/';
  const segments = cleaned
    .split('/')
    .filter((seg) => seg.length > 0)
    // Supprime les groupes de layout SvelteKit ex. (app), (auth)
    .filter((seg) => !/^\([^)]+\)$/.test(seg))
    // Retire les suffixes de layout ex. +page@root
    .map((seg) => {
      if (
        /^\[{1,2}\.{0,3}[^\]]+\]{1,2}$/.test(seg) ||
        /^:[a-zA-Z0-9_]+$/.test(seg) ||
        /^\{[a-zA-Z0-9_]+\}$/.test(seg)
      ) {
        return ':param';
      }
      return seg;
    });

  return `/${segments.join('/')}`;
}

/** Extrait statiquement les méthodes HTTP exportées d'un fichier `+server.ts` / `+server.js` */
export function extractServerMethods(content: string): Set<HttpMethod> {
  const methods = new Set<HttpMethod>();

  EXPORT_FUNC_OR_CONST_RE.lastIndex = 0;
  let match = EXPORT_FUNC_OR_CONST_RE.exec(content);
  while (match !== null) {
    const method = match[1] as HttpMethod | undefined;
    if (method) methods.add(method);
    match = EXPORT_FUNC_OR_CONST_RE.exec(content);
  }

  EXPORT_LIST_RE.lastIndex = 0;
  match = EXPORT_LIST_RE.exec(content);
  while (match !== null) {
    const body = match[1] ?? '';
    for (const part of body.split(',')) {
      const aliasParts = part.trim().split(/\s+as\s+/);
      const exportedName = (aliasParts[1] ?? aliasParts[0] ?? '').trim() as HttpMethod;
      if (HTTP_METHODS.includes(exportedName)) {
        methods.add(exportedName);
      }
    }
    match = EXPORT_LIST_RE.exec(content);
  }

  return methods;
}

/** Collecte les routes SvelteKit depuis `routesDir` (ou retourne `null` si le dossier n'existe pas) */
export function collectSvelteKitRoutes(
  rootDir: string,
  routesDir = 'src/routes',
): Map<string, SvelteKitRouteInfo> | null {
  const absRoutesDir = join(rootDir, routesDir);
  if (!existsSync(absRoutesDir)) {
    return null;
  }

  const routes = new Map<string, SvelteKitRouteInfo>();

  function getOrCreate(relDir: string): SvelteKitRouteInfo {
    const posixDir = relDir === '' ? '/' : `/${relDir.split(sep).join(posix.sep)}`;
    const normalizedPath = normalizeRoutePath(posixDir);
    let info = routes.get(normalizedPath);
    if (!info) {
      info = {
        normalizedPath,
        rawPath: posixDir,
        hasPage: false,
        methods: new Set<HttpMethod>(),
      };
      routes.set(normalizedPath, info);
    }
    return info;
  }

  function walk(currentDir: string): void {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    const relDir = relative(absRoutesDir, currentDir);

    for (const entry of entries) {
      const absPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absPath);
      } else if (entry.isFile()) {
        if (/^\+server\.(?:ts|js)$/.test(entry.name)) {
          const info = getOrCreate(relDir);
          const content = readFileSync(absPath, 'utf8');
          for (const method of extractServerMethods(content)) {
            info.methods.add(method);
          }
        } else if (/^\+page(?:@[^.]+)?\.(?:svelte|ts|js)$/.test(entry.name)) {
          const info = getOrCreate(relDir);
          info.hasPage = true;
        }
      }
    }
  }

  walk(absRoutesDir);
  return routes;
}
