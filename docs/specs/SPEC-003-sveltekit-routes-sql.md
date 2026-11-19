# SPEC-003 — Routes SvelteKit et migrations SQL

> Statut : DONE · Jalon : 3 (`v0.3.0`) · Référence : [BLUEPRINT.md](../BLUEPRINT.md)

## 1. Intent

- **Problème** : dans les projets SvelteKit + SQL, `DATABASE.md` et les specs d'API deviennent obsolètes dès qu'une route ou une colonne change.
- **Objectif** : analyser statiquement (sans exécution) les routes SvelteKit et les migrations SQL pour les confronter aux références documentées.

## 2. User Stories

- En tant que développeur SvelteKit, je veux détecter toute route API ou page documentée qui n'existe plus dans `src/routes/`.
- En tant que mainteneur, je veux vérifier que les tables et colonnes citées dans `docs/DATABASE.md` existent bien dans les migrations SQL.

## 3. Exigences

| ID | Exigence | Critère d'acceptation (DoD) |
| --- | --- | --- |
| `REQ-301` | Collecteur routes SvelteKit | Résout les segments dynamiques (`[id]`, `(group)`) et méthodes HTTP (`GET`, `POST`, etc.) de `+server.ts` |
| `REQ-302` | Règle `sveltekit/routes` | Signale les routes ou méthodes HTTP documentées absentes du code |
| `REQ-303` | Collecteur migrations SQL | Extrait `CREATE TABLE`, `ALTER TABLE ... ADD/DROP/RENAME` sans exécuter de script |
| `REQ-304` | Règle `sql/schema` | Compare tables et colonnes explicitement référencées dans la doc au schéma résultant |

## 4. Edge cases

- Groupes de layout SvelteKit `(app)` / `(auth)` : ne font pas partie de l'URL finale.
- Paramètres dynamiques documentés en `:id` ou `[id]` ou `{id}` : normalisation commune.
- Migrations SQL contenant des commentaires ou dialectes SQLite/libSQL : parsing tolérant sans faux crash.

## 5. Fichiers impactés

- `src/collectors/sveltekit.ts` & `src/collectors/sql.ts`.
- `src/rules/sveltekit-routes.ts` & `src/rules/sql-schema.ts`.
- `tests/fixtures/` — mini-projets SvelteKit + migrations SQL.
