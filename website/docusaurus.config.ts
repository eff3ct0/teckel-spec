import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Teckel Specification',
  tagline: 'Declarative YAML-based language for data transformation pipelines',
  favicon: 'img/r-favicon.png',

  future: {
    v4: true,
  },

  url: 'https://teckel.rafaelfernandez.dev',
  baseUrl: '/',

  organizationName: 'eff3ct0',
  projectName: 'teckel-spec',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  stylesheets: [
    {
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;600;700&display=swap',
      type: 'text/css',
    },
  ],

  markdown: {
    format: 'md',
  },

  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        docsRouteBasePath: '/docs',
        indexBlog: false,
        language: ['en'],
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/docs',
          sidebarPath: './sidebars.ts',
          lastVersion: '3.0',
          versions: {
            current: {
              label: 'Next',
              path: 'next',
            },
            '3.0': {
              label: '3.0',
              path: '',
            },
            '2.0': {
              label: '2.0',
              path: '2.0',
            },
          },
          editUrl:
            'https://github.com/eff3ct0/teckel-spec/edit/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/og-image.png',
    metadata: [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:site', content: '@raborfield' },
    ],
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Teckel',
      logo: {
        alt: 'Rafael Fernandez logo',
        src: 'img/r-logo.png',
        srcDark: 'img/r-logo-dark.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          to: '/playground',
          label: 'Playground',
          position: 'left',
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/eff3ct0/teckel-spec',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://github.com/eff3ct0/teckel',
          label: 'Reference Implementation',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Resources',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/eff3ct0/teckel-spec',
            },
            {
              label: 'Apache License 2.0',
              href: 'https://github.com/eff3ct0/teckel-spec/blob/main/LICENSE',
            },
          ],
        },
      ],
      copyright: `Copyright \u00A9 2024-2026 Rafael Fernandez. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['bash', 'yaml', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
