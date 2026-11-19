# Installation Guide — docs-drift

> **English** | [Français](./fr/INSTALLATION.md) · Version: `v0.4.0` · Requirements: **Node.js >= 20** and **Git** (optional for `git/stale`).

---

## 1. Local Installation (CLI / Development)

### Option A — Clone and Build from GitHub

```bash
git clone https://github.com/guysilvere/docs-drift.git
cd docs-drift
npm ci
npm run build
```

Verify the installation:

```bash
node dist/cli.js --version
node dist/cli.js check
```

### Option B — Make `docs-drift` Globally Available

From the cloned directory:

```bash
npm link
```

You can then run `docs-drift` in **any project**:

```bash
cd /path/to/your-project
docs-drift init
docs-drift check
```

---

## 2. Initialize a Target Project

At the root of the repository you want to lint:

```bash
docs-drift init
```

This creates `.docs-drift.yml` with safe defaults:

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

### Adapting Configuration to Your Stack

- **Environment variables**: if your template file is not `.env.example`, set `envFile: ".env.template"`. Exclude custom variables with `ignoreEnv: ["CUSTOM_CI_VAR"]`.
- **SvelteKit**: routes are read from `src/routes` (override with `sveltekitRoutesDir`). If the directory does not exist, `sveltekit/routes` is skipped automatically.
- **SQL / Migrations**: `migrations/**/*.sql` and `drizzle/**/*.sql` are parsed statically (override with `sqlMigrations`).
- **Git drift (`git/stale`)**: map code globs to critical documentation files:

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

## 3. CI Integration — GitHub Actions

`docs-drift` ships a 100% local **composite GitHub Action** ([action.yml](../action.yml)) that never executes any script from your repository.

### Minimal Workflow (Fails PR on Error)

Create `.github/workflows/docs-drift.yml` (prefer pinning to a full **commit SHA** in production):

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
          fetch-depth: 0 # Only required when using --stale

      - uses: guysilvere/docs-drift@v0.4.0
        with:
          format: text
          stale: 90d
```

### Advanced Workflow — GitHub Code Scanning Annotations (SARIF)

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

## 4. Prudent Auto-Fix (`--fix`)

When files have been moved without renaming, preview and apply safe fixes:

```bash
# Preview without modifying files
docs-drift check --fix --dry-run

# Apply unambiguous fixes
docs-drift check --fix
```

> If multiple files share the same basename in the repository, `--fix` refuses to guess and reports the ambiguity.

---

## 5. Pre-Commit Git Hook (Optional)

To block local commits that introduce documentation drift, add `.git/hooks/pre-commit` (then `chmod +x .git/hooks/pre-commit`):

```bash
#!/usr/bin/env bash
set -e
docs-drift check
```

---

## 6. Troubleshooting

- **Exit code `2`**: invalid `.docs-drift.yml` or CLI flag (`--format`, `--stale`). Check `stderr` for exact details.
- **`shallow clone` warning**: set `fetch-depth: 0` on `actions/checkout@v4` when using `git/stale`.
- **One-off false positive**: add an expiring inline directive:
  ```markdown
  <!-- docs-drift: ignore-next-line paths/exists reason="Migration in progress" expires="2026-12-31" -->
  ```
