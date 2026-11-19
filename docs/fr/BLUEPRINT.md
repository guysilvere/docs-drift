# BLUEPRINT — docs-drift

> [English](../BLUEPRINT.md) | **Français** · Statut : VALIDATED · Stack : TypeScript strict + Node CLI + GitHub Action · Silvere Meya

## 1. Contexte & problème

- Dans les projets assistés par IA, la documentation vivante (`AGENTS.md`, `BLUEPRINT.md`, `DATABASE.md`, `SPEC-*.md`, `README.md`) guide directement humains et agents de code.
- Dès qu'un fichier est renommé, qu'une route SvelteKit change, qu'une variable d'environnement disparaît ou qu'un script `package.json` évolue, la documentation dérive silencieusement.
- Les outils existants (ex. `lychee`) ne vérifient que les liens HTTP externes, pas la cohérence entre documentation et code réel.
- Cibles : solo-devs, équipes IA, mainteneurs de projets SvelteKit/Node et monorepos.

## 2. Proposition de valeur

- `docs-drift` est un linter local et CI ultra-rapide qui détecte les références techniques périmées dans le Markdown et propose des corrections actionnables avant qu'un humain ou un agent ne s'appuie dessus.

## 3. Stack technique

| Couche | Choix | Justification |
| --- | --- | --- |
| CLI | Node.js + TypeScript strict | Exécution instantanée via `npx docs-drift` |
| Parsing Markdown | `remark` / `mdast` | AST précis avec positions de lignes exactes |
| Parsing code | TypeScript compiler API + analyseurs ciblés | Détection de routes et exports sans exécuter le code |
| Intégration Git | `simple-git` ou commandes git natives | Détection d'obsolescence (`--stale 90d`) et delta code/doc |
| Validation | Zod | Configuration `.docs-drift.yml` et rapports typés |
| Base | Aucune | Analyse déterministe sur le checkout local |
| CI | GitHub Action composite | Blocage de PR sans serveur externe |
| Tests | Vitest + fixtures Git | Tests de régression sur dépôts synthétiques |
| Distribution | npm + GitHub Action | Adoption immédiate |

## 4. Architecture & sécurité

- **Modules** :
  - chargeur de configuration (`.docs-drift.yml`) ;
  - collecteur de faits du dépôt (fichiers, git, `package.json`, `.env.example`, SQL, routes) ;
  - extracteurs Markdown (`mdast`) ;
  - moteur de règles de comparaison ;
  - moteur d'exceptions/ignorance (avec justification et expiration facultative) ;
  - moteur `--fix` prudent (renommages évidents via Git / correspondance unique) ;
  - formateurs de sortie (terminal, JSON, SARIF, commentaire Markdown) ;
  - GitHub Action composite.
- **Faits vérifiés** :
  - chemins de fichiers, dossiers et médias/screenshots locaux ;
  - ancres Markdown locales (`#section`) ;
  - scripts déclarés dans `package.json` (`npm run <cmd>`) ;
  - variables d'environnement dans `.env.example` ;
  - dérive temporelle (`--stale <délai>`) et delta commit code/doc ;
  - migrations SQL : tables et colonnes ;
  - routes SvelteKit (`+server.ts`, `+page.svelte`) ;
  - commandes explicitement balisées (`<!-- docs-drift: ... -->`).
- **Limites assumées** : ne tente pas de valider la vérité métier d'une phrase en langage naturel.
- **Sécurité** :
  - aucune exécution de scripts du dépôt par défaut ;
  - aucun envoi de code vers une API externe (100 % local) ;
  - masquage des chemins sensibles dans les annotations publiques ;
  - GitHub Action épinglée par SHA dans la doc de production.

## 5. User stories (MoSCoW)

### Epic 1 — Références & fraîcheur (socle MVP)

- **Must** — En tant que mainteneur, je veux détecter les chemins, médias et ancres absents afin d'éviter les liens morts → `SPEC-001`.
- **Must** — En tant que mainteneur, je veux vérifier les scripts `package.json` et variables `.env.example` cités dans la doc.
- **Must** — En tant que mainteneur, je veux être alerté (`--stale`) si une doc critique n'a pas évolué alors que le code associé a changé.
- **Should** — En tant que mainteneur, je veux un mode `--fix` prudent pour réparer les chemins renommés évidents.
- **Won't** — Interpréter automatiquement toute phrase libre en langage naturel dans le MVP.

### Epic 2 — Code, routes & schémas

- **Must** — En tant que développeur SvelteKit, je veux signaler une route documentée qui n'existe plus.
- **Should** — En tant que mainteneur, je veux comparer les tables/colonnes documentées aux migrations SQL.
- **Could** — Importer un schéma OpenAPI ou vérifier méthodes HTTP / paramètres déclarés.

### Epic 3 — CI & gouvernance

- **Must** — En tant qu'équipe, je veux bloquer une PR sur une violation critique via GitHub Action.
- **Must** — En tant que reviewer, je veux un rapport SARIF pointant fichier et ligne exacts.
- **Should** — En tant que mainteneur, je veux ignorer une règle avec justification et date d'expiration.

## 6. Interface CLI & performances

- Commandes :
  - `npx docs-drift check` (défaut)
  - `npx docs-drift check --stale 90d`
  - `npx docs-drift check --format sarif|json|markdown`
  - `npx docs-drift check --fix`
  - `npx docs-drift init`
  - `npx docs-drift explain <rule>`
- Sortie lisible sans couleur ; codes de sortie stables : `0` (propre), `1` (violations), `2` (erreur de config/outil).
- Pas de PWA ni de serveur.
- Performance cible : `< 5 s` sur un dépôt moyen (hors installation).

## 7. Plan de développement

- **Jalon 1 (MVP socle)** : config `.docs-drift.yml`, chemins/médias, ancres locales, scripts `package.json`.
- **Jalon 2 (Env & fraîcheur)** : variables `.env.example`, dérive Git (`--stale`), blocs balisés `<!-- docs-drift: ... -->`, exceptions datées.
- **Jalon 3 (Code & schémas)** : routes SvelteKit (`+server.ts` / `+page.svelte`) et migrations SQL (tables/colonnes).
- **Jalon 4 (CI & finition)** : sortie SARIF/JSON/Markdown, GitHub Action composite, `--fix` prudent, documentation complète.

## 8. Perspectives & distribution

- **v2** : extracteurs Drizzle, Prisma, Rails, Django ; vérification bidirectionnelle code ↔ docs.
- **v3** : mode watch pour feedback immédiat d'agent IA, plugin éditeur.
- **Licence & modèle** : CLI et GitHub Action open-source (MIT), sponsoring ; offre privée facultative (règles d'organisation, support, conformité).
- **Hébergement** : npm, GitHub Actions, docs sur GitHub Pages (aucun serveur ni domaine applicatif requis).

## 9. Questions ouvertes

- [ ] Syntaxe exacte des balises `<!-- docs-drift: ... -->` pour le meilleur ratio précision/simplicité ?
- [ ] Lecture du schéma SQL : parsing statique des fichiers de migration ou base SQLite éphémère ?
- [ ] Jeu de règles activées par défaut vs opt-in pour éviter le bruit dès `npx docs-drift` ?
