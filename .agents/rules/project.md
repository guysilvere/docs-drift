---
trigger: always_on
---

# Règles projet — docs-drift

- **Type** : CLI Node.js + TypeScript strict (ESM) + GitHub Action. Pas de serveur, pas de base de données, pas de PWA.
- **Source de vérité** : [AGENTS.md](../../AGENTS.md), [docs/BLUEPRINT.md](../../docs/BLUEPRINT.md), [docs/ROADMAP.md](../../docs/ROADMAP.md) et [docs/specs/](../../docs/specs/).
- **Qualité** : TypeScript strict sans `any`, validation Zod, tests Vitest obligatoires avant livraison (`npm run typecheck && npm run test:run && npm run build`).
- **Sécurité** : analyse 100 % locale et statique (zéro exécution de script du dépôt cible, zéro appel API externe).
- **Codes de sortie CLI** : `0` propre, `1` violations, `2` erreur config/outil.
- **Git** : travailler sur `testing`, jamais directement sur `main`.
- **Living Documentation** : mettre à jour `README.md`, `docs/ROADMAP.md` et les `SPEC-XXX` à chaque changement de comportement.
