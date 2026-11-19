import { z } from 'zod';

/** Niveaux de sévérité pris en charge pour chaque règle */
export const ruleSeveritySchema = z.enum(['off', 'warn', 'error']);

/** Schéma de configuration `.docs-drift.yml` */
export const docsDriftConfigSchema = z.object({
  include: z.array(z.string()).default(['**/*.md']),
  exclude: z
    .array(z.string())
    .default(['node_modules/**', '.git/**', 'dist/**', 'build/**', '.svelte-kit/**']),
  rules: z
    .object({
      'paths/exists': ruleSeveritySchema.default('error'),
      'anchors/exists': ruleSeveritySchema.default('error'),
      'scripts/exists': ruleSeveritySchema.default('error'),
    })
    .default({}),
});

export type RuleSeverity = z.infer<typeof ruleSeveritySchema>;
export type DocsDriftConfig = z.infer<typeof docsDriftConfigSchema>;

/** Retourne la configuration par défaut validée */
export function getDefaultConfig(): DocsDriftConfig {
  return docsDriftConfigSchema.parse({});
}
