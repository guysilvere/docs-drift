# ADR-0001 — Stack CLI TypeScript et analyse 100 % locale

- **Date** : 2026-11-19
- **Statut** : ACCEPTED

## Contexte

- `docs-drift-cli` doit s'exécuter instantanément en local (`npx docs-drift`) et en CI (GitHub Action) sur des dépôts JS/TS/SvelteKit sans infrastructure serveur ni clé API.

## Décision

- Stack : **Node.js + TypeScript strict (ESM)**, parsing Markdown via `remark`/`mdast`, validation **Zod**, tests **Vitest**.
- **Analyse 100 % locale et statique** : aucune exécution de script du dépôt analysé, aucun envoi de code vers une API externe, aucune base de données.

## Conséquences

- **Positives** : démarrage rapide (`< 5 s`), adoption zéro-friction via `npx`, confidentialité totale sur dépôts privés, déterminisme complet en CI.
- **Négatives** : pas de validation sémantique par LLM des phrases en langage naturel dans le cœur du linter (limitation assumée dans [BLUEPRINT.md](../BLUEPRINT.md)).
