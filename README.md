# docs-drift-cli

> **English** | [Français](./README.fr.md)
>
> **Local and CI linter that keeps your Markdown documentation strictly aligned with your real codebase.**

[![npm version](https://img.shields.io/npm/v/docs-drift-cli.svg)](https://www.npmjs.com/package/docs-drift-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](https://www.typescriptlang.org)

---

## Why `docs-drift-cli`?

In modern repositories — especially AI-assisted projects relying on `AGENTS.md`, `BLUEPRINT.md`, `DATABASE.md`, `SPEC-*.md`, and `README.md` — documentation acts as a **technical contract** for both humans and coding agents.

Yet after every refactor:
- a file is moved or renamed -> relative links and screenshots break silently;
- a Markdown heading changes -> internal `#anchor` links rot;
- a `package.json` script is renamed -> the `README.md` recommends a command that no longer exists;
- an environment variable, SvelteKit API route, or SQL column changes -> humans and AI agents work off stale information.

Traditional link checkers only test external HTTP URLs. **`docs-drift-cli`** verifies **documentation-to-code consistency** locally and in CI in under 5 seconds.

### Design Principles

- **100% local and static**: never sends code to external APIs, never executes scripts from the target repository.
- **Low noise**: ignores external URLs (`http://`, `mailto:`), placeholder tokens (`<project>`, `${VAR}`), and shell comments.
- **Fast and deterministic**: Markdown AST (`remark`/`mdast`) with exact line and column numbers.
- **CI-ready**: clean color-free output, JSON/SARIF/Markdown reporters, and immutable exit codes (`0`, `1`, `2`).

---

## Quick Start

### Quick Installation (npm)

> See the [Detailed Installation Guide](./docs/INSTALLATION.md) for full setup instructions (composite GitHub Action, SARIF Code Scanning upload, pre-commit hook, building from source).

```bash
# Run immediately with npx
npx docs-drift-cli check

# Or install as a dev dependency
npm install -D docs-drift-cli
npx docs-drift-cli init
npx docs-drift-cli check
```

### CLI Commands

| Command | Description |
| --- | --- |
| `docs-drift check` | Lint all Markdown files in the repository (default command) |
| `docs-drift check --cwd <dir>` | Target a specific repository directory |
| `docs-drift check --stale <duration>` | Flag docs older than `<duration>` in Git history (e.g. `90d`, `12w`, `48h`) |
| `docs-drift check --format <fmt>` | Output format: `text` (default), `json`, `sarif`, `markdown` |
| `docs-drift check --fix` | Prudently rewrite unambiguously moved file paths |
| `docs-drift check --fix --dry-run` | Preview `--fix` changes without modifying files |
| `docs-drift init` | Generate a starter `.docs-drift.yml` file |
| `docs-drift init --force` | Overwrite an existing `.docs-drift.yml` |
| `docs-drift explain <rule>` | Print detailed documentation and examples for a rule |
| `docs-drift --help` | Display help |
| `docs-drift --version` | Print CLI version |

### Example Output

```text
README.md:14:12 ERROR [paths/exists] Chemin introuvable : "./docs/OLD_GUIDE.md"
README.md:27:8  ERROR [anchors/exists] Ancre locale introuvable : "#ancienne-section"
README.md:41:1  ERROR [scripts/exists] Script "deploy:old" introuvable dans package.json

docs-drift FAIL — 8 fichier(s) analysé(s), 3 erreur(s), 0 avertissement(s) (19 ms)
```

### Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | No errors found (warnings may still be reported) |
| `1` | One or more `error`-level violations detected |
| `2` | Configuration (`.docs-drift.yml`) or runtime error |

---

## Available Rules (`v0.4.0`)

| Rule | Default Severity | What It Checks |
| --- | --- | --- |
| `paths/exists` | `error` | Every relative link, directory, local image, or `file://` reference exists on disk. |
| `anchors/exists` | `error` | Every `#section` anchor (same file or cross-file `.md`) matches an existing heading (GitHub-compatible slug). |
| `scripts/exists` | `error` | Every documented `npm run <cmd>`, `pnpm run <cmd>`, or `yarn run <cmd>` exists in `package.json`. |
| `env/exists` | `error` | Every documented environment variable (`process.env.X`, `import.meta.env.X`, `$X`, `env` blocks) exists in `.env.example`. |
| `git/stale` | `warn` | Flags docs not updated within `--stale <duration>` or lagging behind mapped code files. |
| `sveltekit/routes` | `error` | Verifies documented API routes and HTTP methods (`GET /api/users/:id`) against `src/routes/**/+server.ts` and `+page.svelte`. |
| `sql/schema` | `error` | Statically reconstructs SQL schema from `migrations/**/*.sql` and validates documented tables/columns (`DATABASE.md`, `sql` blocks, `sql:table.col`). |

### Inline Directives & Expiring Exceptions

Suppress specific violations with a justification and an optional expiration date (expired exceptions automatically surface as warnings):

```markdown
<!-- docs-drift: ignore-next-line paths/exists reason="Migration in progress" expires="2026-12-31" -->
See [legacy guide](./docs/legacy.md).

<!-- docs-drift: disable scripts/exists -->
...
<!-- docs-drift: enable scripts/exists -->
```

### Next Milestone (see [ROADMAP](./docs/ROADMAP.md))

- **Stabilization & npm (`v1.0.0`)**: official npm release (`npx docs-drift`) and public schema stability guarantee.

---

## Configuration (`.docs-drift.yml`)

Create with `docs-drift init` or manually at the repository root:

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
    reason: "Link being migrated"
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

When `.docs-drift.yml` is absent, `docs-drift-cli` uses these safe defaults automatically.

---

## CI Integration (GitHub Actions)

Use the composite GitHub Action ([action.yml](./action.yml)) directly in your workflow (see the [Installation Guide](./docs/INSTALLATION.md) for SARIF / Code Scanning):

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

## Development & Contributing

### Scripts

```bash
npm run dev        # Run CLI directly via tsx
npm run typecheck  # Strict TypeScript check (tsc --noEmit)
npm test           # Vitest in watch mode
npm run test:run   # Full Vitest suite (CI)
npm run build      # Compile TypeScript to dist/
```

### Project Structure

```text
docs-drift-cli/
├── src/
│   ├── cli.ts                  # CLI entrypoint (check, init, explain)
│   ├── index.ts                # Programmatic exports
│   ├── types.ts                # Strict types (Violation, CheckSummary, RuleId)
│   ├── config/                 # Zod schema & .docs-drift.yml loader
│   ├── collectors/             # File, env, Git, SvelteKit, and SQL collectors
│   ├── markdown/               # remark/mdast parser & GitHub slugger
│   ├── rules/                  # Rule implementations + registry
│   ├── engine/                 # Runner, ignore engine, and prudent --fix
│   └── reporters/              # text, json, sarif, and markdown reporters
├── tests/                      # Vitest unit & integration fixtures
├── action.yml                  # Composite GitHub Action
└── docs/                       # Living documentation (EN + FR)
```

### Reference Documentation

- [Installation Guide](./docs/INSTALLATION.md) ([FR](./docs/fr/INSTALLATION.md)) — npm, local setup, GitHub Action, SARIF, and Git hooks
- [CHANGELOG](./CHANGELOG.md) — version history (`v0.1.0` -> `v0.5.0`)
- [BLUEPRINT](./docs/BLUEPRINT.md) ([FR](./docs/fr/BLUEPRINT.md)) — architecture, scope, security, and stack choices
- [ROADMAP](./docs/ROADMAP.md) ([FR](./docs/fr/ROADMAP.md)) — detailed milestones (`v0.1.0` -> `v3.0.0`)
- [Specifications](./docs/specs/SPEC-001-cli-paths-anchors-scripts.md) — per-milestone specs (`SPEC-001` to `SPEC-004`)
- [ADR](./docs/adr/README.md) — architecture decision records

---

## Author & License

Developed by **Silvere Meya**. Released under the [MIT License](./LICENSE).
