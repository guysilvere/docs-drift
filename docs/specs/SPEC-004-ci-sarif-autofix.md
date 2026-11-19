# SPEC-004 — CI GitHub Action, SARIF et mode `--fix`

> Statut : DONE · Jalon : 4 (`v0.4.0`) · Référence : [BLUEPRINT.md](../BLUEPRINT.md)

## 1. Intent

- **Problème** : un linter local seul n'empêche pas les régressions sur PR, et corriger manuellement des liens renommés est répétitif.
- **Objectif** : livrer les sorties CI (JSON, SARIF, Markdown), la GitHub Action composite et un mode `--fix` prudent prêt pour `v1.0.0`.

## 2. User Stories

- En tant qu'équipe, je veux bloquer une PR via GitHub Action si une référence critique est cassée.
- En tant que reviewer, je veux voir les violations annotées directement sur la PR via SARIF.
- En tant que développeur, je veux lancer `npx docs-drift check --fix` pour réparer automatiquement les chemins renommés sans ambiguïté.

## 3. Exigences

| ID | Exigence | Critère d'acceptation (DoD) |
| --- | --- | --- |
| `REQ-401` | Formateur JSON (`--format json`) | Schéma Zod documenté et stable |
| `REQ-402` | Formateur SARIF (`--format sarif`) | Conforme SARIF 2.1.0, compatible GitHub Code Scanning |
| `REQ-403` | Formateur Markdown (`--format markdown`) | Tableau synthétique exploitable en commentaire PR |
| `REQ-404` | GitHub Action composite (`action.yml`) | Exécution sans serveur, exemples épinglés par SHA |
| `REQ-405` | Mode `--fix` prudent | Corrige uniquement les renommages Git ou correspondances uniques de nom de fichier ; dry-run possible |
| `REQ-406` | Sécurité des sorties | Chemins absolus locaux normalisés en chemins relatifs au dépôt |

## 4. Edge cases

- Renommage ambigu (2 fichiers portant le même nom) : `--fix` ne modifie rien et signale l'ambiguïté.
- Fichier en lecture seule : erreur claire sans corruption partielle.

## 5. Fichiers impactés

- `src/reporters/json.ts`, `src/reporters/sarif.ts`, `src/reporters/markdown.ts`.
- `src/engine/fixer.ts`.
- `action.yml`.
- `tests/` — validation SARIF et tests `--fix`.
