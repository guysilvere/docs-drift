# AGENTS.md — docs-drift

Point d'entrée unique pour les agents IA sur `docs-drift`. Ne charger que le fichier utile.

## Projet

- **Nom** : `docs-drift` — linter CLI & GitHub Action de cohérence documentation Markdown ↔ code réel.
- **Stack** : Node.js >= 20, TypeScript strict (ESM), `remark`/`mdast`, Zod, Vitest.
- **Nature** : CLI pure sans serveur ni base de données (100 % local, aucune exécution de script tiers).

## Documentation de référence

- Architecture & périmètre : [docs/BLUEPRINT.md](./docs/BLUEPRINT.md)
- Feuille de route : [docs/ROADMAP.md](./docs/ROADMAP.md)
- Spécifications : [docs/specs/](./docs/specs/)
- Décisions d'architecture : [docs/adr/](./docs/adr/README.md)

## Commandes

- `npm run dev` — exécuter la CLI en développement (`tsx`)
- `npm run build` — compiler TypeScript vers `dist/`
- `npm run typecheck` — vérification TypeScript stricte (`tsc --noEmit`)
- `npm test` — lancer Vitest en mode watch
- `npm run test:run` — exécuter toute la suite de tests (CI)

## Règles projet

- TypeScript strict sans `any`. Validation Zod pour toute configuration et sortie structurée.
- Codes de sortie CLI immuables : `0` (propre), `1` (violations), `2` (erreur config/outil).
- Sécurité : ne jamais exécuter de scripts du dépôt analysé par défaut ; ne jamais envoyer de code vers une API externe ; toujours relativiser les chemins dans les sorties publiques.
- Branche de travail unique : `testing` (jamais de modification directe sur `main`).
- Living Documentation : toute évolution de règle, CLI ou config met à jour `docs/BLUEPRINT.md`, `docs/ROADMAP.md`, la `SPEC-XXX` concernée et `README.md` dans le même lot.

## Compatibilité Antigravity

- `AGENTS.md` n'étant pas chargé automatiquement par Antigravity, les règles projet sont reflétées dans `.agents/rules/project.md`.
