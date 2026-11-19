# Guide d'installation — docs-drift

> Version : `v0.4.0` · Prérequis : **Node.js >= 20** et **Git** (optionnel pour `git/stale`).

---

## 1. Installation locale (développement ou usage CLI)

### Option A — Cloner et compiler depuis GitHub

```bash
git clone https://github.com/guysilvere/docs-drift.git
cd docs-drift
npm ci
npm run build
```

Vérifiez l'installation :

```bash
node dist/cli.js --version
node dist/cli.js check
```

### Option B — Rendre la commande `docs-drift` globale sur votre machine

Depuis le dossier cloné :

```bash
npm link
```

Vous pouvez ensuite exécuter `docs-drift` dans **n'importe quel projet** :

```bash
cd /chemin/vers/mon-projet
docs-drift init
docs-drift check
```

---

## 2. Initialiser un projet cible

À la racine du projet que vous souhaitez contrôler :

```bash
docs-drift init
```

Cette commande crée `.docs-drift.yml` avec des valeurs sûres par défaut :

```yaml
include:
  - "**/*.md"

exclude:
  - "node_modules/**"
  - ".git/**"
  - "dist/**"
  - "build/**"
  - ".svelte-kit/**"

rules:
  paths/exists: error
  anchors/exists: error
  scripts/exists: error
  env/exists: error
  git/stale: warn
  sveltekit/routes: error
  sql/schema: error
```

### Adapter la configuration à votre stack

- **Variables d'environnement** : si votre template n'est pas `.env.example`, précisez `envFile: ".env.template"`. Pour exclure des variables spécifiques, utilisez `ignoreEnv: ["CUSTOM_CI_VAR"]`.
- **SvelteKit** : les routes sont lues dans `src/routes` (modifiable via `sveltekitRoutesDir`). Si le dossier n'existe pas, la règle `sveltekit/routes` se désactive automatiquement.
- **SQL / Migrations** : les fichiers `migrations/**/*.sql` et `drizzle/**/*.sql` sont analysés statiquement (modifiable via `sqlMigrations`).
- **Dérive Git (`git/stale`)** : associez vos dossiers de code à leurs documents critiques :

```yaml
stale:
  maxAge: "90d"
  criticalDocs:
    - "README.md"
    - "AGENTS.md"
    - "docs/DATABASE.md"
  mappings:
    - doc: "docs/DATABASE.md"
      code: ["migrations/**", "src/lib/server/db/**"]
```

---

## 3. Intégration CI — GitHub Actions

`docs-drift` fournit une **GitHub Action composite** ([action.yml](../action.yml)) 100 % locale qui n'exécute jamais de script de votre dépôt.

### Exemple minimal (bloque la PR sur erreur)

Créez `.github/workflows/docs-drift.yml` dans votre projet (épinglez de préférence par **commit SHA** en production) :

```yaml
name: Docs Drift

on:
  pull_request:
  push:
    branches: [main, testing]

jobs:
  docs-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Requis uniquement si vous utilisez --stale

      - uses: guysilvere/docs-drift@v0.4.0
        with:
          format: text
          stale: 90d
```

### Exemple avancé — Annotations GitHub Code Scanning (SARIF)

```yaml
name: Docs Drift (SARIF)

on:
  pull_request:

permissions:
  contents: read
  security-events: write

jobs:
  docs-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: guysilvere/docs-drift@v0.4.0
        continue-on-error: true
        with:
          format: sarif
          output-file: docs-drift.sarif

      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: docs-drift.sarif
```

---

## 4. Correction automatique prudente (`--fix`)

Lorsque vous déplacez un fichier sans le renommer, prévisualisez puis appliquez les corrections :

```bash
# Prévisualisation sans modifier vos fichiers
docs-drift check --fix --dry-run

# Application des corrections non ambiguës
docs-drift check --fix
```

> Si plusieurs fichiers portent le même nom dans le dépôt, `--fix` refuse de deviner et vous signale l'ambiguïté.

---

## 5. Hook Git pré-commit (optionnel)

Pour bloquer localement un commit qui casse la documentation, ajoutez dans `.git/hooks/pre-commit` (puis `chmod +x .git/hooks/pre-commit`) :

```bash
#!/usr/bin/env bash
set -e
docs-drift check
```

---

## 6. Dépannage

- **Code de sortie `2`** : votre `.docs-drift.yml` ou une option CLI (`--format`, `--stale`) est invalide. Lisez le message sur `stderr`.
- **Avertissement `shallow clone`** : ajoutez `fetch-depth: 0` dans `actions/checkout@v4` si vous activez `git/stale`.
- **Faux positif ponctuel** : utilisez une directive inline datée :
  ```markdown
  <!-- docs-drift: ignore-next-line paths/exists reason="Migration en cours" expires="2026-12-31" -->
  ```
