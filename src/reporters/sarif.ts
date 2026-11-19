import { RULES_REGISTRY } from '../rules/registry.js';
import type { CheckSummary } from '../types.js';
import { sanitizePublicPath } from './json.js';

const SARIF_SCHEMA_URI =
  'https://json.schemastore.org/sarif-2.1.0.json';

export interface SarifReport {
  $schema: string;
  version: '2.1.0';
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: Array<{
          id: string;
          name: string;
          shortDescription: { text: string };
          fullDescription: { text: string };
        }>;
      };
    };
    results: Array<{
      ruleId: string;
      level: 'error' | 'warning';
      message: { text: string };
      locations: Array<{
        physicalLocation: {
          artifactLocation: { uri: string };
          region: {
            startLine: number;
            startColumn: number;
          };
        };
      }>;
    }>;
  }>;
}

/** Génère un rapport conforme SARIF 2.1.0 compatible GitHub Code Scanning */
export function formatSarifReport(summary: CheckSummary, version: string): string {
  const rules = Object.values(RULES_REGISTRY).map((meta) => ({
    id: meta.id,
    name: meta.title,
    shortDescription: { text: meta.title },
    fullDescription: { text: meta.summary },
  }));

  const results = summary.violations.map((v) => ({
    ruleId: v.ruleId,
    level: v.severity === 'error' ? ('error' as const) : ('warning' as const),
    message: { text: v.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: sanitizePublicPath(v.file) },
          region: {
            startLine: v.line,
            startColumn: v.column,
          },
        },
      },
    ],
  }));

  const sarif: SarifReport = {
    $schema: SARIF_SCHEMA_URI,
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'docs-drift',
            version,
            informationUri: 'https://github.com/guysilvere/docs-drift',
            rules,
          },
        },
        results,
      },
    ],
  };

  return `${JSON.stringify(sarif, null, 2)}\n`;
}
