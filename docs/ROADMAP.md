# ROADMAP — docs-drift

> Statut : ACTIVE · Référence : [BLUEPRINT.md](./BLUEPRINT.md)

## Vue d'ensemble des jalons

| Version | Jalon | Objectif principal | Specs | Statut |
| --- | --- | --- | --- | --- |
| `v0.1.0` | Jalon 1 — Socle MVP | CLI, config `.docs-drift.yml`, chemins, médias, ancres locales, scripts `package.json` | [SPEC-001](./specs/SPEC-001-cli-paths-anchors-scripts.md) | `DONE` |
| `v0.2.0` | Jalon 2 — Env & fraîcheur | Variables `.env.example`, dérive Git (`--stale`), balises `<!-- docs-drift: ... -->`, exceptions datées | [SPEC-002](./specs/SPEC-002-env-stale-annotations.md) | `PLANNED` |
| `v0.3.0` | Jalon 3 — Code & schémas | Routes SvelteKit (`+server.ts`, `+page.svelte`), migrations SQL (tables & colonnes) | [SPEC-003](./specs/SPEC-003-sveltekit-routes-sql.md) | `PLANNED` |
| `v1.0.0` | Jalon 4 — CI & finition | Sorties JSON/SARIF/Markdown, GitHub Action composite, `--fix` prudent, publication npm | [SPEC-004](./specs/SPEC-004-ci-sarif-autofix.md) | `PLANNED` |
| `v2.0.0` | Écosystème élargi | Extracteurs Drizzle, Prisma, Rails, Django ; vérification bidirectionnelle code ↔ docs | — | `BACKLOG` |
| `v3.0.0` | Temps réel & gouvernance | Mode `--watch` pour agents IA, plugin éditeur, règles d'organisation | — | `BACKLOG` |

## Détail des jalons

### Jalon 1 — Socle MVP (`v0.1.0`)

- Initialisation CLI (`check`, `init`, `explain`), codes de sortie `0`/`1`/`2`.
- Chargement et validation Zod de `.docs-drift.yml`.
- Parsing Markdown via `remark` / `mdast` avec positions de lignes exactes.
- Règles :
  - `paths/exists` : fichiers, dossiers et médias/screenshots locaux ;
  - `anchors/exists` : ancres `#section` locales (slugify compatible GitHub) ;
  - `scripts/exists` : commandes `npm run <cmd>` / `pnpm <cmd>` citées vs `package.json`.
- Suite Vitest sur fixtures de dépôts synthétiques.

### Jalon 2 — Env & fraîcheur (`v0.2.0`)

- Règle `env/exists` : variables d'environnement citées vs `.env.example`.
- Règle `git/stale` : option `--stale <délai>` (ex. `90d`) + delta commit code/doc.
- Balises explicites `<!-- docs-drift: ... -->` pour commandes et blocs contrôlés sans faux positifs.
- Moteur d'exceptions avec justification et date d'expiration facultative.

### Jalon 3 — Code & schémas (`v0.3.0`)

- Extracteur routes SvelteKit (`src/routes/**/+server.ts`, `+page.svelte`) et méthodes HTTP exportées.
- Extracteur migrations SQL (tables et colonnes déclarées dans `migrations/*.sql`).
- Règles `sveltekit/routes` et `sql/schema`.

### Jalon 4 — CI, SARIF & `--fix` (`v1.0.0`)

- Formateurs `text`, `json`, `sarif` (annotations PR GitHub), `markdown` (commentaire PR).
- GitHub Action composite épinglable par SHA.
- Mode `--fix` prudent (renommages Git / correspondance unique de fichier).
- Masquage des chemins sensibles dans les sorties publiques.
- Publication npm (`npx docs-drift`) + documentation complète.

## Critères de passage à `v1.0.0`

- Temps d'exécution `< 5 s` sur un dépôt moyen (hors installation).
- Zéro exécution de script du dépôt analysé, 100 % local.
- Couverture de tests unitaires + intégration (fixtures Git) sur toutes les règles actives.
- Auto-validation : `docs-drift check` passe avec code `0` sur son propre dépôt.
