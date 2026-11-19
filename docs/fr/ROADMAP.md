# ROADMAP — docs-drift

> [English](../ROADMAP.md) | **Français** · Statut : ACTIVE · Référence : [BLUEPRINT.md](./BLUEPRINT.md)

## Vue d'ensemble des jalons

| Version | Jalon | Objectif principal | Specs | Statut |
| --- | --- | --- | --- | --- |
| `v0.1.0` | Jalon 1 — Socle MVP | CLI, config `.docs-drift.yml`, chemins, médias, ancres locales, scripts `package.json` | [SPEC-001](../specs/SPEC-001-cli-paths-anchors-scripts.md) | `DONE` |
| `v0.2.0` | Jalon 2 — Env & fraîcheur | Variables `.env.example`, dérive Git (`--stale`), balises `<!-- docs-drift: ... -->`, exceptions datées | [SPEC-002](../specs/SPEC-002-env-stale-annotations.md) | `DONE` |
| `v0.3.0` | Jalon 3 — Code & schémas | Routes SvelteKit (`+server.ts`, `+page.svelte`), migrations SQL (tables & colonnes) | [SPEC-003](../specs/SPEC-003-sveltekit-routes-sql.md) | `DONE` |
| `v0.4.0` | Jalon 4 — CI, SARIF & `--fix` | Sorties JSON/SARIF/Markdown, GitHub Action composite, `--fix` prudent, guide d'installation | [SPEC-004](../specs/SPEC-004-ci-sarif-autofix.md) | `DONE` |
| `v0.5.0` | Jalon 5 — Distribution npm | Paquet npm `docs-drift-cli`, workflow provenance, docs bilingues EN/FR, `CHANGELOG.md` | — | `DONE` |
| `v1.0.0` | Stabilisation & GA | Gel API/schémas publics, tests terrain, benchmarks `< 5 s` | — | `PLANNED` |
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

### Jalon 4 — CI, SARIF & `--fix` (`v0.4.0`)

- Formateurs `text`, `json`, `sarif` (annotations PR GitHub), `markdown` (commentaire PR).
- GitHub Action composite ([action.yml](../../action.yml)) épinglable par SHA.
- Mode `--fix` prudent (correspondance unique de fichier + `--dry-run`).
- Masquage des chemins sensibles dans les sorties publiques.
- Guide d'installation détaillé ([INSTALLATION.md](./INSTALLATION.md)).

### Stabilisation & publication npm (`v1.0.0`)

- Publication officielle sur npm (`npx docs-drift`).
- Garantie de stabilité des schémas JSON/SARIF et des codes de sortie.

## Critères de passage à `v1.0.0`

- Temps d'exécution `< 5 s` sur un dépôt moyen (hors installation).
- Zéro exécution de script du dépôt analysé, 100 % local.
- Couverture de tests unitaires + intégration (fixtures Git) sur toutes les règles actives.
- Auto-validation : `docs-drift check` passe avec code `0` sur son propre dépôt.
