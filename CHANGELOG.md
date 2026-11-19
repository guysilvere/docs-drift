# Changelog

All notable changes to `docs-drift-cli` are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [0.5.0] - 2026-11-19

### Added
- npm package metadata and distribution setup under `docs-drift-cli` (`bin`: `docs-drift-cli` & `docs-drift-cli`, ESM `exports`, `prepublishOnly` guard).
- Automated npm publication workflow with provenance ([publish-npm.yml](./.github/workflows/publish-npm.yml)).
- Bilingual EN/FR documentation (`README.md`, `README.fr.md`, `docs/`, `docs/fr/`).
- `CHANGELOG.md`.

### Changed
- License and package author updated to **Silvere Meya**.

## [0.4.0] - 2026-11-19

### Added
- Output reporters: `--format json` (Zod-validated), `--format sarif` (SARIF 2.1.0 for GitHub Code Scanning), and `--format markdown` (PR comments).
- Prudent `--fix` mode (unambiguous moved file path rewrites preserving `#anchors`) + `--dry-run`.
- Composite GitHub Action ([action.yml](./action.yml)).
- Detailed installation guide ([docs/INSTALLATION.md](./docs/INSTALLATION.md)).

## [0.3.0] - 2026-11-19

### Added
- `sveltekit/routes` rule: static analysis of `src/routes/**/+server.ts` and `+page.svelte` (layout groups, dynamic segments, HTTP methods).
- `sql/schema` rule: static SQL migration parser (`CREATE`, `ALTER ADD/DROP/RENAME`, `DROP`) and table/column verification.

## [0.2.0] - 2026-11-19

### Added
- `env/exists` rule against `.env.example` with default OS/CI exclusions.
- `git/stale` rule (`--stale <duration>`) and code-to-doc commit delta mappings.
- Inline directives (`<!-- docs-drift: ignore-next-line | ignore-file | disable | enable -->`) and expiring exceptions.

## [0.1.0] - 2026-11-19

### Added
- Initial CLI (`check`, `init`, `explain`), immutable exit codes (`0`/`1`/`2`), Zod-validated `.docs-drift.yml`.
- Core rules: `paths/exists`, `anchors/exists`, `scripts/exists`.
