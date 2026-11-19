import type { RuleId, RuleMetadata } from '../types.js';

export const RULES_REGISTRY: Record<RuleId, RuleMetadata> = {
  'paths/exists': {
    id: 'paths/exists',
    title: 'Existence des chemins et médias locaux',
    summary:
      'Vérifie que chaque lien relatif, image locale ou référence file:// cité dans un fichier Markdown pointe vers un fichier ou dossier existant.',
    examples: {
      invalid: '[Architecture](./docs/OLD_ARCH.md)',
      valid: '[Architecture](./docs/BLUEPRINT.md)',
    },
  },
  'anchors/exists': {
    id: 'anchors/exists',
    title: 'Validité des ancres Markdown locales',
    summary:
      'Vérifie que chaque ancre #section (dans le même fichier ou vers un autre .md) correspond bien à un titre existant (slug compatible GitHub).',
    examples: {
      invalid: '[Installation](#install-inexistante)',
      valid: '[Installation](#installation)',
    },
  },
  'scripts/exists': {
    id: 'scripts/exists',
    title: 'Existence des scripts package.json',
    summary:
      'Vérifie que chaque commande npm/pnpm/yarn run <script> documentée correspond à un script réellement défini dans package.json.',
    examples: {
      invalid: 'npm run deploy:legacy',
      valid: 'npm run build',
    },
  },
};

export function isKnownRule(id: string): id is RuleId {
  return id in RULES_REGISTRY;
}
