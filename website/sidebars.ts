import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/first-pipeline',
        'getting-started/document-structure',
        'getting-started/naming',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'core-concepts/inputs',
        'core-concepts/outputs',
        'core-concepts/dag',
      ],
    },
    {
      type: 'category',
      label: 'Transformations',
      items: [
        'transformations/overview',
        'transformations/filtering',
        'transformations/aggregation',
        'transformations/joins',
        'transformations/set-operations',
        'transformations/column-operations',
        'transformations/window',
        'transformations/reshaping',
        'transformations/advanced',
      ],
    },
    {
      type: 'category',
      label: 'Expression Language',
      items: [
        'expressions/syntax',
        'expressions/operators',
        'expressions/functions',
      ],
    },
    {
      type: 'category',
      label: 'Data Quality',
      items: [
        'quality/suites',
        'quality/check-types',
        'quality/severity',
      ],
    },
    {
      type: 'category',
      label: 'Metadata & Governance',
      items: [
        'metadata/pipeline',
        'metadata/assets',
        'metadata/tags',
        'metadata/exposures',
        'metadata/lineage',
      ],
    },
    {
      type: 'category',
      label: 'Advanced Topics',
      items: [
        'advanced/types-and-nulls',
        'advanced/variables-and-secrets',
        'advanced/streaming',
        'advanced/configuration',
        'advanced/hooks',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/errors',
        'reference/conformance',
        'reference/security',
        'reference/grammar',
        'reference/json-schema',
        'reference/examples',
      ],
    },
  ],
};

export default sidebars;
