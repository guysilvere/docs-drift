# BLUEPRINT — docs-drift-cli

> **English** | [Français](./fr/BLUEPRINT.md) · Status: VALIDATED · Stack: Strict TypeScript + Node CLI + GitHub Action · Silvere Meya

## 1. Context & Problem

- In AI-assisted repositories, living documentation (`AGENTS.md`, `BLUEPRINT.md`, `DATABASE.md`, `SPEC-*.md`, `README.md`) directly guides both humans and coding agents.
- Whenever a file is renamed, a SvelteKit route changes, an environment variable is removed, or a `package.json` script evolves, documentation drifts silently.
- Existing tools (such as `lychee`) only check external HTTP hyperlinks, not technical consistency between docs and real code.
- Target audience: solo developers, AI-native teams, SvelteKit/Node maintainers, and monorepo owners.

## 2. Value Proposition

- `docs-drift-cli` is an ultra-fast local and CI linter that catches stale technical references in Markdown and offers actionable fixes before a human or AI agent relies on them.

## 3. Tech Stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| CLI | Node.js + strict TypeScript | Instant execution via `npx docs-drift` |
| Markdown Parsing | `remark` / `mdast` | Accurate AST with exact line/column positions |
| Code Analysis | Static targeted parsers | Extract routes, exports, and SQL DDL without executing code |
| Git Integration | Native `git` read-only commands | Staleness detection (`--stale 90d`) and code/doc commit delta |
| Validation | Zod | Typed `.docs-drift.yml` config and JSON reports |
| Database | None | Deterministic analysis on local checkout |
| CI | Composite GitHub Action | PR gating with zero external infrastructure |
| Tests | Vitest + Git fixtures | Regression testing on synthetic repos |
| Distribution | npm + GitHub Action | Zero-friction adoption |

## 4. Architecture & Security

- **Modules**:
  - config loader (`.docs-drift.yml`);
  - repository fact collectors (files, Git, `package.json`, `.env.example`, SQL migrations, SvelteKit routes);
  - Markdown AST extractors (`mdast`);
  - comparison rule engine;
  - suppression/ignore engine (with reason and optional expiration);
  - prudent `--fix` engine (unambiguous path rewrites);
  - reporters (terminal, JSON, SARIF 2.1.0, Markdown PR comment);
  - composite GitHub Action (`action.yml`).
- **Explicit non-goal**: does not attempt to prove business-logic truthfulness of free-form natural language prose.
- **Security**:
  - never executes scripts from the target repository;
  - never sends code to an external API (100% local);
  - sanitizes/relativizes local paths in public reports;
  - GitHub Action examples recommend SHA pinning in production.

## 5. CLI Contract & Performance

- Commands: `check`, `check --stale 90d`, `check --format sarif|json|markdown`, `check --fix`, `init`, `explain <rule>`.
- Color-free readable output; immutable exit codes: `0` (clean), `1` (violations), `2` (config/tool error).
- Target runtime: `< 5 s` on a medium repository.

## 6. Author & License

- Developed by **Silvere Meya**, open-source under the MIT License.
