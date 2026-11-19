import type { RuleSeverity } from './config/schema.js';

export type RuleId = 'paths/exists' | 'anchors/exists' | 'scripts/exists';

export interface Violation {
  ruleId: RuleId;
  severity: Exclude<RuleSeverity, 'off'>;
  file: string;
  line: number;
  column: number;
  message: string;
  reference?: string;
}

export interface RuleMetadata {
  id: RuleId;
  title: string;
  summary: string;
  examples: {
    invalid: string;
    valid: string;
  };
}

export interface CheckSummary {
  filesChecked: number;
  errors: number;
  warnings: number;
  durationMs: number;
  violations: Violation[];
}
