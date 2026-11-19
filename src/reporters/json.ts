import { z } from 'zod';
import { ruleIdSchema } from '../config/schema.js';
import type { CheckSummary } from '../types.js';

export const jsonViolationSchema = z.object({
  ruleId: ruleIdSchema,
  severity: z.enum(['warn', 'error']),
  file: z.string(),
  line: z.number().int().positive(),
  column: z.number().int().positive(),
  message: z.string(),
  reference: z.string().optional(),
});

export const jsonReportSchema = z.object({
  tool: z.literal('docs-drift'),
  version: z.string(),
  status: z.enum(['ok', 'fail']),
  summary: z.object({
    filesChecked: z.number().int().nonnegative(),
    errors: z.number().int().nonnegative(),
    warnings: z.number().int().nonnegative(),
    suppressed: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
  }),
  violations: z.array(jsonViolationSchema),
});

export type JsonReport = z.infer<typeof jsonReportSchema>;

/** Normalise un chemin pour garantir qu'aucun chemin absolu local ne fuite */
export function sanitizePublicPath(filePath: string): string {
  return filePath.replaceAll('\\', '/').replace(/^\/+/, '');
}

/** Formate le résultat d'analyse en JSON validé par Zod */
export function formatJsonReport(summary: CheckSummary, version: string): string {
  const payload: JsonReport = jsonReportSchema.parse({
    tool: 'docs-drift',
    version,
    status: summary.errors > 0 ? 'fail' : 'ok',
    summary: {
      filesChecked: summary.filesChecked,
      errors: summary.errors,
      warnings: summary.warnings,
      suppressed: summary.suppressed,
      durationMs: summary.durationMs,
    },
    violations: summary.violations.map((v) => ({
      ruleId: v.ruleId,
      severity: v.severity,
      file: sanitizePublicPath(v.file),
      line: v.line,
      column: v.column,
      message: v.message,
      ...(v.reference !== undefined ? { reference: v.reference } : {}),
    })),
  });

  return `${JSON.stringify(payload, null, 2)}\n`;
}
