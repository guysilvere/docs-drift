import { z } from 'zod';

/** Niveaux de sévérité pris en charge pour chaque règle */
export const ruleSeveritySchema = z.enum(['off', 'warn', 'error']);

export const ruleIdSchema = z.enum([
  'paths/exists',
  'anchors/exists',
  'scripts/exists',
  'env/exists',
  'git/stale',
  'sveltekit/routes',
  'sql/schema',
]);

export const staleMappingSchema = z.object({
  doc: z.string().min(1),
  code: z.array(z.string().min(1)).min(1),
});

export const exceptionEntrySchema = z.object({
  file: z.string().min(1),
  rule: ruleIdSchema,
  reason: z.string().min(1),
  expires: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format attendu : YYYY-MM-DD')
    .optional(),
});

/** Schéma de configuration `.docs-drift.yml` */
export const docsDriftConfigSchema = z.object({
  include: z.array(z.string()).default(['**/*.md']),
  exclude: z
    .array(z.string())
    .default(['node_modules/**', '.git/**', 'dist/**', 'build/**', '.svelte-kit/**']),
  envFile: z.string().default('.env.example'),
  ignoreEnv: z.array(z.string()).default([]),
  sveltekitRoutesDir: z.string().default('src/routes'),
  sqlMigrations: z.array(z.string()).default(['migrations/**/*.sql', 'drizzle/**/*.sql']),
  stale: z
    .object({
      maxAge: z
        .string()
        .regex(/^\d+[hdw]$/, 'Durée attendue : ex. 90d, 12w, 48h')
        .optional(),
      criticalDocs: z.array(z.string()).default([]),
      mappings: z.array(staleMappingSchema).default([]),
    })
    .default({}),
  exceptions: z.array(exceptionEntrySchema).default([]),
  rules: z
    .object({
      'paths/exists': ruleSeveritySchema.default('error'),
      'anchors/exists': ruleSeveritySchema.default('error'),
      'scripts/exists': ruleSeveritySchema.default('error'),
      'env/exists': ruleSeveritySchema.default('error'),
      'git/stale': ruleSeveritySchema.default('warn'),
      'sveltekit/routes': ruleSeveritySchema.default('error'),
      'sql/schema': ruleSeveritySchema.default('error'),
    })
    .default({}),
});

export type RuleSeverity = z.infer<typeof ruleSeveritySchema>;
export type DocsDriftConfig = z.infer<typeof docsDriftConfigSchema>;
export type StaleMapping = z.infer<typeof staleMappingSchema>;
export type ExceptionEntry = z.infer<typeof exceptionEntrySchema>;

/** Retourne la configuration par défaut validée */
export function getDefaultConfig(): DocsDriftConfig {
  return docsDriftConfigSchema.parse({});
}
