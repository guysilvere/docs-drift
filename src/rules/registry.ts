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
  'env/exists': {
    id: 'env/exists',
    title: 'Cohérence des variables d’environnement (.env.example)',
    summary:
      'Vérifie que chaque variable d’environnement documentée (process.env.X, import.meta.env.X, $X, ou bloc env) existe bien dans .env.example.',
    examples: {
      invalid: 'process.env.LEGACY_STRIPE_KEY',
      valid: 'process.env.PAYMENT_API_KEY',
    },
  },
  'git/stale': {
    id: 'git/stale',
    title: 'Dérive temporelle et delta Git code/doc',
    summary:
      'Détecte les documents critiques non mis à jour au-delà de --stale <durée> ou en retard par rapport aux fichiers de code associés.',
    examples: {
      invalid: 'docs/DATABASE.md (dernier commit il y a 120j alors que migrations/ a changé)',
      valid: 'docs/DATABASE.md mis à jour dans le même lot que migrations/',
    },
  },
  'sveltekit/routes': {
    id: 'sveltekit/routes',
    title: 'Cohérence des routes SvelteKit (+server.ts / +page.svelte)',
    summary:
      'Vérifie que les routes API et méthodes HTTP documentées (ex. POST /api/orders) existent réellement dans src/routes/.',
    examples: {
      invalid: 'DELETE /api/v1/legacy-items/:id',
      valid: 'GET /api/users/[id]',
    },
  },
  'sql/schema': {
    id: 'sql/schema',
    title: 'Cohérence des tables et colonnes SQL (migrations)',
    summary:
      'Compare les tables et colonnes SQL documentées (blocs sql, DATABASE.md ou <!-- docs-drift: sql -->) au schéma reconstruit statiquement depuis les migrations.',
    examples: {
      invalid: 'SELECT old_col FROM deleted_table',
      valid: 'SELECT id, email FROM users',
    },
  },
};

export function isKnownRule(id: string): id is RuleId {
  return id in RULES_REGISTRY;
}
