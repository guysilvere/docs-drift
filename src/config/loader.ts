import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { docsDriftConfigSchema, getDefaultConfig, type DocsDriftConfig } from './schema.js';

export const CONFIG_FILENAME = '.docs-drift.yml';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export const DEFAULT_CONFIG_TEMPLATE = `# Configuration docs-drift
# Documentation : https://github.com/agencebulles/docs-drift

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
`;

/** Charge et valide `.docs-drift.yml` depuis `rootDir`, ou retourne les défauts */
export function loadConfig(rootDir: string): DocsDriftConfig {
  const configPath = join(rootDir, CONFIG_FILENAME);
  if (!existsSync(configPath)) {
    return getDefaultConfig();
  }

  let rawContent: string;
  try {
    rawContent = readFileSync(configPath, 'utf8');
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ConfigError(`Impossible de lire ${CONFIG_FILENAME} : ${detail}`);
  }

  let parsedYaml: unknown;
  try {
    parsedYaml = parseYaml(rawContent);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ConfigError(`Syntaxe YAML invalide dans ${CONFIG_FILENAME} : ${detail}`);
  }

  const input = parsedYaml === null || parsedYaml === undefined ? {} : parsedYaml;
  const validated = docsDriftConfigSchema.safeParse(input);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(racine)'} : ${issue.message}`)
      .join('\n');
    throw new ConfigError(`Configuration ${CONFIG_FILENAME} invalide :\n${issues}`);
  }

  return validated.data;
}

/** Crée un fichier `.docs-drift.yml` minimal dans `rootDir` */
export function writeDefaultConfig(rootDir: string, force = false): string {
  const configPath = join(rootDir, CONFIG_FILENAME);
  if (existsSync(configPath) && !force) {
    throw new ConfigError(`${CONFIG_FILENAME} existe déjà (utilisez --force pour l'écraser).`);
  }
  writeFileSync(configPath, DEFAULT_CONFIG_TEMPLATE, 'utf8');
  return configPath;
}
