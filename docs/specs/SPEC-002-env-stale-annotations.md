# SPEC-002 — Variables d'environnement, dérive Git et balises

> Statut : DONE · Jalon : 2 (`v0.2.0`) · Référence : [BLUEPRINT.md](../BLUEPRINT.md)

## 1. Intent

- **Problème** : les variables d'environnement documentées divergent vite de `.env.example`, et une doc critique peut vieillir sans mise à jour alors que le code associé évolue.
- **Objectif** : détecter les écarts `.env.example`, signaler la dérive temporelle/Git (`--stale`) et encadrer les faux positifs via balises et exceptions datées.

## 2. User Stories

- En tant que mainteneur, je veux vérifier que toute variable d'environnement documentée existe dans `.env.example`.
- En tant que mainteneur, je veux être alerté via `--stale 90d` si une doc critique n'a pas été modifiée depuis 90 jours ou est en retard sur le code lié.
- En tant que mainteneur, je veux ignorer ponctuellement une règle avec une raison et une date d'expiration.

## 3. Exigences

| ID | Exigence | Critère d'acceptation (DoD) |
| --- | --- | --- |
| `REQ-201` | Règle `env/exists` | Compare les variables documentées aux clés déclarées dans `.env.example` |
| `REQ-202` | Règle `git/stale` (`--stale <durée>`) | Lit l'historique Git pour détecter les docs critiques non touchées au-delà du seuil |
| `REQ-203` | Delta code/doc configurable | Associe des patterns de code à une doc (ex. `src/db/**` → `docs/DATABASE.md`) |
| `REQ-204` | Balises `<!-- docs-drift: ... -->` | Permet d'annoter explicitement les blocs ou commandes vérifiés / ignorés |
| `REQ-205` | Exceptions datées | Une exception expirée remonte automatiquement en avertissement ou erreur |

## 4. Edge cases

- Dépôt sans historique Git (ou shallow clone CI `fetch-depth: 1`) : avertissement explicite sans crash.
- Variables système standards (`PATH`, `HOME`, `NODE_ENV`, `CI`) : liste d'exclusion par défaut pour éviter le bruit.
- Absence de `.env.example` : règle `env/exists` désactivée proprement sauf si forcée en config.

## 5. Fichiers impactés

- `src/collectors/env.ts` & `src/collectors/git.ts`.
- `src/rules/env.ts` & `src/rules/stale.ts`.
- `src/engine/ignore.ts` — gestion des balises et exceptions datées.
- `tests/` — fixtures avec historique Git synthétique.
