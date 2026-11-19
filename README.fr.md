# docs-drift-cli

> [English](./README.md) | **Français**
>
> **Linter local et CI qui garantit que votre documentation Markdown reste toujours alignée avec votre vrai code.**

[![npm version](https://img.shields.io/npm/v/docs-drift-cli.svg)](https://www.npmjs.com/package/docs-drift-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](https://www.typescriptlang.org)

---

## Pourquoi `docs-drift-cli` ?

Dans un projet moderne — et encore plus dans un projet assisté par des agents IA (`AGENTS.md`, `BLUEPRINT.md`, `DATABASE.md`, `SPEC-*.md`, `README.md`) — la documentation sert de **source de vérité technique**.

Pourtant, à chaque refactoring :
- un fichier est renommé ou déplacé → les liens relatifs et captures d'écran cassent ;
- une section Markdown change de titre → les ancres `#section` deviennent mortes ;
- un script `package.json` est renommé → le `README.md` recommande une commande qui n'existe plus ;
- une variable d'environnement, une route API ou une table SQL évolue → humains et agents IA travaillent sur des informations périmées.

Les vérificateurs de liens classiques ne testent que les URLs HTTP externes. **`docs-drift-cli`** contrôle directement la **cohérence entre votre Markdown et votre dépôt**, en local comme en CI, en moins de 5 secondes.

### Principes de conception

- **100 % local et statique** : aucun code envoyé vers une API externe, aucune exécution de script du dépôt analysé.
- **Zéro faux positif inutile** : ignore les URLs externes (`http://`, `mailto:`), les placeholders d'exemples (`<projet>`, `${VAR}`) et les commentaires shell.
- **Déterministe et rapide** : AST Markdown (`remark`/`mdast`) avec numéros de ligne et colonne exacts.
- **CI-ready** : sortie lisible sans couleur et codes de sortie immuables (`0`, `1`, `2`).

---

## Démarrage rapide

### Installation rapide (npm)

> Consultez le [Guide d'installation détaillé](./docs/fr/INSTALLATION.md) pour la configuration complète (GitHub Action composite, upload SARIF Code Scanning, hook pré-commit, compilation depuis les sources).

```bash
# Exécuter immédiatement via npx
npx docs-drift-cli check

# Ou installer en dépendance de développement
npm install -D docs-drift-cli
npx docs-drift-cli init
npx docs-drift-cli check
```

### Commandes CLI

| Commande | Description |
| --- | --- |
| `docs-drift check` | Vérifie tous les fichiers Markdown du dépôt (commande par défaut) |
| `docs-drift check --cwd <dir>` | Cible un autre dossier de dépôt |
| `docs-drift check --stale <durée>` | Détecte la documentation plus ancienne que `<durée>` (ex. `90d`, `12w`, `48h`) |
| `docs-drift check --format <fmt>` | Format de sortie : `text` (défaut), `json`, `sarif`, `markdown` |
| `docs-drift check --fix` | Corrige prudemment les chemins déplacés sans ambiguïté |
| `docs-drift check --fix --dry-run` | Prévisualise les corrections `--fix` sans modifier les fichiers |
| `docs-drift init` | Génère un fichier `.docs-drift.yml` prêt à l'emploi |
| `docs-drift init --force` | Écrase un fichier `.docs-drift.yml` existant |
| `docs-drift explain <rule>` | Affiche la documentation et des exemples pour une règle |
| `docs-drift --help` | Affiche l'aide complète |
| `docs-drift --version` | Affiche la version de la CLI |

### Exemple de sortie

```text
README.md:14:12 ERROR [paths/exists] Chemin introuvable : "./docs/OLD_GUIDE.md"
README.md:27:8  ERROR [anchors/exists] Ancre locale introuvable : "#ancienne-section"
README.md:41:1  ERROR [scripts/exists] Script "deploy:old" introuvable dans package.json

docs-drift FAIL — 8 fichier(s) analysé(s), 3 erreur(s), 0 avertissement(s) (19 ms)
```

### Codes de sortie

| Code | Signification |
| --- | --- |
| `0` | Aucune erreur détectée (des avertissements `warn` peuvent être présents) |
| `1` | Au moins une violation de sévérité `error` détectée |
| `2` | Erreur de configuration (`.docs-drift.yml` invalide) ou d'exécution |

---

## Règles disponibles (`v0.4.0`)

| Règle | Sévérité par défaut | Ce qu'elle vérifie |
| --- | --- | --- |
| `paths/exists` | `error` | Chaque lien relatif, dossier, image locale ou référence `file://` existe bien sur disque. |
| `anchors/exists` | `error` | Chaque ancre `#section` (dans le même fichier ou vers un autre `.md`) correspond à un titre existant (slug compatible GitHub). |
| `scripts/exists` | `error` | Chaque commande `npm run <cmd>`, `pnpm run <cmd>` ou `yarn run <cmd>` citée existe dans `package.json`. |
| `env/exists` | `error` | Chaque variable d'environnement documentée (`process.env.X`, `import.meta.env.X`, `$X`, blocs `env`) existe dans `.env.example`. |
| `git/stale` | `warn` | Détecte les docs non mises à jour depuis `--stale <durée>` ou en retard sur les fichiers de code mappés. |
| `sveltekit/routes` | `error` | Vérifie les routes API et méthodes HTTP documentées (`GET /api/users/:id`) contre `src/routes/**/+server.ts` et `+page.svelte`. |
| `sql/schema` | `error` | Reconstruit statiquement le schéma SQL depuis `migrations/**/*.sql` et vérifie les tables/colonnes documentées (`DATABASE.md`, blocs `sql`, `sql:table.col`). |

### Balises inline & exceptions datées

Vous pouvez ignorer ponctuellement une règle avec justification et date d'expiration (une exception expirée remonte automatiquement en avertissement) :

```markdown
<!-- docs-drift: ignore-next-line paths/exists reason="Migration en cours" expires="2026-12-31" -->
Voir [ancien guide](./docs/legacy.md).

<!-- docs-drift: disable scripts/exists -->
...
<!-- docs-drift: enable scripts/exists -->
```

### Prochain jalon (voir [ROADMAP](./docs/fr/ROADMAP.md))

- **Stabilisation & npm (`v1.0.0`)** : publication officielle sur npm (`npx docs-drift`) et stabilisation des schémas publics.

---

## Configuration (`.docs-drift.yml`)

Créez le fichier avec `docs-drift init` ou manuellement à la racine du dépôt :

```yaml
include:
  - "**/*.md"

exclude:
  - "node_modules/**"
  - ".git/**"
  - "dist/**"
  - "build/**"
  - ".svelte-kit/**"

envFile: ".env.example"
ignoreEnv: []
sveltekitRoutesDir: "src/routes"
sqlMigrations:
  - "migrations/**/*.sql"
  - "drizzle/**/*.sql"

stale:
  maxAge: "90d"
  mappings:
    - doc: "docs/DATABASE.md"
      code: ["migrations/**", "src/lib/server/db/**"]

exceptions:
  - file: "README.md"
    rule: "paths/exists"
    reason: "Lien en cours de migration"
    expires: "2026-12-31"

rules:
  paths/exists: error      # error | warn | off
  anchors/exists: error    # error | warn | off
  scripts/exists: error    # error | warn | off
  env/exists: error        # error | warn | off
  git/stale: warn          # error | warn | off
  sveltekit/routes: error  # error | warn | off
  sql/schema: error        # error | warn | off
```

Si aucun `.docs-drift.yml` n'est présent, `docs-drift-cli` applique automatiquement ces valeurs par défaut.

---

## Intégration CI (GitHub Actions)

Utilisez directement la GitHub Action composite ([action.yml](./action.yml)) dans votre workflow (voir le [Guide d'installation](./docs/fr/INSTALLATION.md) pour SARIF / Code Scanning) :

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0

- uses: guysilvere/docs-drift-cli@v0.5.0
  with:
    format: text
    stale: 90d
```

---

## Développement & contribution

### Commandes utiles

```bash
npm run dev        # Exécuter la CLI directement via tsx
npm run typecheck  # Vérification TypeScript stricte (tsc --noEmit)
npm test           # Tests Vitest en mode watch
npm run test:run   # Suite complète Vitest (CI)
npm run build      # Compilation TypeScript vers dist/
```

### Architecture du projet

```text
docs-drift-cli/
├── src/
│   ├── cli.ts                  # Point d'entrée CLI (check, init, explain)
│   ├── index.ts                # Exports programmatiques
│   ├── types.ts                # Types stricts (Violation, CheckSummary, RuleId)
│   ├── config/                 # Schéma Zod & chargeur .docs-drift.yml
│   ├── collectors/             # Collecte de fichiers (globs include/exclude)
│   ├── markdown/               # Parser remark/mdast & slugger GitHub
│   ├── rules/                  # Règles paths, anchors, scripts + registre
│   ├── engine/                 # Orchestrateur d'exécution
│   └── reporters/              # Formateur terminal
├── tests/                      # Tests unitaires et fixtures Vitest
└── docs/                       # Documentation vivante (BLUEPRINT, ROADMAP, specs, ADR)
```

### Documentation de référence

- [Guide d'installation](./docs/fr/INSTALLATION.md) — npm, installation locale, GitHub Action, SARIF et hooks Git
- [CHANGELOG](./CHANGELOG.md) — historique des versions (`v0.1.0` → `v0.5.0`)
- [BLUEPRINT](./docs/fr/BLUEPRINT.md) — architecture, périmètre, sécurité et choix techniques
- [ROADMAP](./docs/fr/ROADMAP.md) — feuille de route détaillée (`v0.1.0` → `v3.0.0`)
- [Spécifications](./docs/specs/SPEC-001-cli-paths-anchors-scripts.md) — specs par jalon (`SPEC-001` à `SPEC-004`)
- [ADR](./docs/adr/README.md) — décisions d'architecture

---

## Auteur & Licence

Développé par **Silvere Meya**. Distribué sous licence [MIT](./LICENSE).
