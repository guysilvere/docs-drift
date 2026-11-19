# ROADMAP — docs-drift

> **English** | [Français](./fr/ROADMAP.md) · Status: ACTIVE · Reference: [BLUEPRINT.md](./BLUEPRINT.md)

## Milestone Overview

| Version | Milestone | Core Scope | Specs | Status |
| --- | --- | --- | --- | --- |
| `v0.1.0` | Milestone 1 — Core MVP | CLI, `.docs-drift.yml` config, local paths/media, Markdown anchors, `package.json` scripts | [SPEC-001](./specs/SPEC-001-cli-paths-anchors-scripts.md) | `DONE` |
| `v0.2.0` | Milestone 2 — Env & Freshness | `.env.example` vars, Git drift (`--stale`), `<!-- docs-drift: ... -->` directives, expiring exceptions | [SPEC-002](./specs/SPEC-002-env-stale-annotations.md) | `DONE` |
| `v0.3.0` | Milestone 3 — Code & Schemas | SvelteKit routes (`+server.ts`, `+page.svelte`), SQL migrations (tables & columns) | [SPEC-003](./specs/SPEC-003-sveltekit-routes-sql.md) | `DONE` |
| `v0.4.0` | Milestone 4 — CI, SARIF & `--fix` | JSON/SARIF/Markdown reporters, composite GitHub Action, prudent `--fix`, installation guide | [SPEC-004](./specs/SPEC-004-ci-sarif-autofix.md) | `DONE` |
| `v1.0.0` | Stabilization & npm | Official npm release (`npx docs-drift`), public API stability, `< 5 s` benchmarks | — | `PLANNED` |
| `v2.0.0` | Broader Ecosystem | Drizzle, Prisma, Rails, Django extractors; bidirectional code <-> docs checks | — | `BACKLOG` |
| `v3.0.0` | Real-Time & Governance | `--watch` mode for AI agents, editor plugin, organization rulesets | — | `BACKLOG` |

## Milestone Details

### Milestone 1 — Core MVP (`v0.1.0`)

- CLI entrypoint (`check`, `init`, `explain`), immutable exit codes `0`/`1`/`2`.
- Zod-validated `.docs-drift.yml` loader.
- Markdown parsing via `remark` / `mdast` with exact line and column positions.
- Rules: `paths/exists`, `anchors/exists`, `scripts/exists`.
- Vitest test suite with synthetic repository fixtures.

### Milestone 2 — Env & Freshness (`v0.2.0`)

- `env/exists` rule against `.env.example`.
- `git/stale` rule (`--stale <duration>`) and configurable code/doc commit delta mappings.
- Explicit inline directives `<!-- docs-drift: ... -->` and expiring exceptions.

### Milestone 3 — Code & Schemas (`v0.3.0`)

- Static SvelteKit route extractor (`src/routes/**/+server.ts`, `+page.svelte`) and HTTP methods.
- Static SQL migration parser (`CREATE`, `ALTER ADD/DROP/RENAME`, `DROP`).
- `sveltekit/routes` and `sql/schema` rules.

### Milestone 4 — CI, SARIF & `--fix` (`v0.4.0`)

- `text`, `json`, `sarif` (2.1.0), and `markdown` reporters.
- Composite GitHub Action ([action.yml](../action.yml)) pinnable by SHA.
- Prudent `--fix` mode (unique filename match + `--dry-run`).
- Path sanitization in public reports.
- Detailed bilingual documentation ([INSTALLATION.md](./INSTALLATION.md), [FR](./fr/INSTALLATION.md)).

### Stabilization & npm (`v1.0.0`)

- Official npm publication (`npx docs-drift`).
- Stability guarantee for JSON/SARIF schemas and exit codes.

## `v1.0.0` Release Criteria

- Runtime `< 5 s` on a medium-sized repository (excluding install).
- Zero execution of target repository scripts, 100% local analysis.
- Unit + integration test coverage (including Git fixtures) across all active rules.
- Dogfooding: `docs-drift check` passes with exit code `0` on its own repository.
