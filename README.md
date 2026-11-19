# docs-drift

> **Linter local et CI qui garantit que votre documentation Markdown reste toujours alignée avec votre vrai code.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](https://www.typescriptlang.org)

---

## Pourquoi `docs-drift` ?

Dans un projet moderne — et encore plus dans un projet assisté par des agents IA (`AGENTS.md`, `BLUEPRINT.md`, `DATABASE.md`, `SPEC-*.md`, `README.md`) — la documentation sert de **source de vérité technique**.

Pourtant, à chaque refactoring :
- un fichier est renommé ou déplacé → les liens relatifs et captures d'écran cassent ;
- une section Markdown change de titre → les ancres `#section` deviennent mortes ;
- un script `package.json` est renommé → le `README.md` recommande une commande qui n'existe plus ;
- une variable d'environnement, une route API ou une table SQL évolue → humains et agents IA travaillent sur des informations périmées.

Les vérificateurs de liens classiques ne testent que les URLs HTTP externes. **`docs-drift`** contrôle directement la **cohérence entre votre Markdown et votre dépôt**, en local comme en CI, en moins de 5 secondes.

### Principes de conception

- **100 % local et statique** : aucun code envoyé vers une API externe, aucune exécution de script du dépôt analysé.
- **Zéro faux positif inutile** : ignore les URLs externes (`http://`, `mailto:`), les placeholders d'exemples (`<projet>`, `${VAR}`) et les commentaires shell.
- **Déterministe et rapide** : AST Markdown (`remark`/`mdast`) avec numéros de ligne et colonne exacts.
- **CI-ready** : sortie lisible sans couleur et codes de sortie immuables (`0`, `1`, `2`).

---

## Démarrage rapide

### Installation & exécution locale

```bash
# Cloner le dépôt
git clone https://github.com/guysilvere/docs-drift.git
cd docs-drift

# Installer et compiler
npm install
npm run build

# Lancer la vérification sur le dépôt courant
node dist/cli.js check
```

### Commandes CLI

| Commande | Description |
| --- | --- |
| `docs-drift check` | Vérifie tous les fichiers Markdown du dépôt (commande par défaut) |
| `docs-drift check --cwd <dir>` | Cible un autre dossier de dépôt |
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

## Règles disponibles

### Jalon 1 (`v0.1.0` — disponible)

| Règle | Sévérité par défaut | Ce qu'elle vérifie |
| --- | --- | --- |
| `paths/exists` | `error` | Chaque lien relatif, dossier, image locale ou référence `file://` existe bien sur disque. |
| `anchors/exists` | `error` | Chaque ancre `#section` (dans le même fichier ou vers un autre `.md`) correspond à un titre existant (slug compatible GitHub). |
| `scripts/exists` | `error` | Chaque commande `npm run <cmd>`, `pnpm run <cmd>` ou `yarn run <cmd>` citée existe dans `package.json`. |

### Prochains jalons (voir [ROADMAP](./docs/ROADMAP.md))

- **Jalon 2 (`v0.2.0`)** : `env/exists` (`.env.example`), `git/stale` (`--stale 90d` et delta code/doc), balises `<!-- docs-drift: ... -->`, exceptions datées.
- **Jalon 3 (`v0.3.0`)** : routes SvelteKit (`+server.ts`, `+page.svelte`) et migrations SQL (tables & colonnes).
- **Jalon 4 (`v1.0.0`)** : sorties JSON / SARIF 2.1.0 / Markdown PR, GitHub Action composite, mode `--fix` prudent.

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

rules:
  paths/exists: error      # error | warn | off
  anchors/exists: error    # error | warn | off
  scripts/exists: error    # error | warn | off
```

Si aucun `.docs-drift.yml` n'est présent, `docs-drift` applique automatiquement ces valeurs par défaut.

---

## Intégration CI (GitHub Actions)

Exemple de job CI bloquant sur Pull Request (voir [.github/workflows/ci.yml](./.github/workflows/ci.yml)) :

```yaml
- name: Vérifier la cohérence de la documentation
  run: |
    npm run build
    node dist/cli.js check
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
docs-drift/
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

- [BLUEPRINT](./docs/BLUEPRINT.md) — architecture, périmètre, sécurité et choix techniques
- [ROADMAP](./docs/ROADMAP.md) — feuille de route détaillée (`v0.1.0` → `v3.0.0`)
- [Spécifications](./docs/specs/SPEC-001-cli-paths-anchors-scripts.md) — specs par jalon (`SPEC-001` à `SPEC-004`)
- [ADR](./docs/adr/README.md) — décisions d'architecture

---

## Licence

Distribué sous licence [MIT](./LICENSE).
