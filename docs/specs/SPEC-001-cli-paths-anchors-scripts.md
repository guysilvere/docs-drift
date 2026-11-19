# SPEC-001 — Socle CLI, chemins, ancres et scripts

> Statut : DONE · Jalon : 1 (`v0.1.0`) · Référence : [BLUEPRINT.md](../BLUEPRINT.md)

## 1. Intent

- **Problème** : les liens vers des fichiers locaux, images, ancres Markdown ou scripts `package.json` cassent silencieusement lors des refactorings.
- **Objectif** : fournir une CLI `docs-drift-cli` rapide, déterministe et sans fausse alerte couvrant ces 3 familles de références dès le premier jalon.

## 2. User Stories

- En tant que mainteneur, je veux exécuter `npx docs-drift-cli check` pour lister les chemins, médias et ancres invalides avec fichier et ligne exacts.
- En tant que mainteneur, je veux vérifier que chaque commande `npm run <script>` citée dans la doc existe dans `package.json`.
- En tant que mainteneur, je veux générer une configuration initiale via `npx docs-drift-cli init`.

## 3. Exigences

| ID | Exigence | Critère d'acceptation (DoD) |
| --- | --- | --- |
| `REQ-101` | CLI avec sous-commandes `check` (défaut), `init`, `explain <rule>` | Codes de sortie : `0` (propre), `1` (violations), `2` (erreur outil/config) |
| `REQ-102` | Config `.docs-drift.yml` validée par Zod | Défauts sûrs si absente ; erreur claire (code `2`) si invalide |
| `REQ-103` | Règle `paths/exists` | Détecte liens Markdown relatifs, images locales et références `file://` cassées |
| `REQ-104` | Règle `anchors/exists` | Vérifie les ancres `#section` dans le même fichier et inter-fichiers (slug GitHub) |
| `REQ-105` | Règle `scripts/exists` | Extrait `npm run <cmd>` / `pnpm run <cmd>` / `yarn <cmd>` et valide contre `package.json` |
| `REQ-106` | Sortie terminal lisible sans couleur | Affiche `fichier:ligne:colonne [rule-id] message` + résumé final |

## 4. Edge cases

- Liens HTTP/HTTPS externes, `mailto:`, `tel:` : ignorés par `paths/exists`.
- Liens avec query string ou ancre (`./guide.md#install`) : séparer chemin et ancre avant validation.
- Blocs de code exemple non exécutables ou chemins contenant des placeholders (`<projet>`, `...`, `${VAR}`) : ignorés pour éviter les faux positifs.
- Projet sans `package.json` : la règle `scripts/exists` est sautée proprement sans erreur.
- Fichiers ignorés par défaut : `node_modules/`, `.git/`, `dist/`, `build/`, `.svelte-kit/`.

## 5. Fichiers impactés

- `src/cli.ts` — point d'entrée CLI et parsing d'arguments.
- `src/config/schema.ts` & `src/config/loader.ts` — schéma Zod et chargement `.docs-drift.yml`.
- `src/markdown/parser.ts` — parsing `remark`/`mdast` + extraction liens/ancres/code.
- `src/rules/paths.ts`, `src/rules/anchors.ts`, `src/rules/scripts.ts`.
- `src/reporters/text.ts` — formatage terminal.
- `tests/` — tests unitaires + fixtures synthétiques.

## 6. Tâches

- [x] Configurer le chargeur `.docs-drift.yml` avec Zod.
- [x] Implémenter le collecteur de fichiers Markdown (respect des exclusions).
- [x] Implémenter `paths/exists` (fichiers, dossiers, images, `file://`).
- [x] Implémenter `anchors/exists` (slugification GitHub, intra et inter-fichiers).
- [x] Implémenter `scripts/exists` (analyse `package.json`).
- [x] Implémenter `init` et `explain <rule>`.
- [x] Écrire les tests Vitest sur fixtures et valider `docs-drift check` sur ce dépôt.
