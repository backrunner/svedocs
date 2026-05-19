---
title: Theme
description: Customize the Tailwind CSS v4 default theme, color tokens, dark mode, navigation, ToC, and homepage layout.
order: 6
---

# Theme

The default theme is part of the `svedocs` package. It uses Tailwind CSS v4 and framework CSS variables; there is no separate theme package to install.

## Styles

Import the theme stylesheet from the SvelteKit root layout:

```svelte title="src/routes/+layout.svelte"
<script>
  import 'svedocs/theme/styles.css';
</script>

<slot />
```

The stylesheet defines `--sd-*` tokens and uses `data-theme` for light and dark mode.

## Palette

```ts title="svedocs.config.ts"
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  theme: {
    defaultMode: 'system',
    palette: {
      accent: 'emerald',
      neutral: 'zinc'
    },
    fonts: {
      sans: '"IBM Plex Sans", "Avenir Next", sans-serif',
      mono: '"JetBrains Mono", "SFMono-Regular", monospace',
      display: '"IBM Plex Sans", "Avenir Next", sans-serif'
    },
    radius: '2px',
    codeTheme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    brand: {
      label: 'svedocs',
      href: '/',
      mark: 'pixel'
    },
    nav: [
      { label: 'Docs', href: '/docs' },
      { label: 'API', href: '/docs/api' }
    ],
    social: [
      { label: 'GitHub', href: 'https://github.com/svedocs/svedocs', external: true }
    ],
    footer: {
      text: 'MIT licensed.',
      links: [{ label: 'Cloudflare', href: '/docs/cloudflare' }]
    },
    home: {
      kicker: 'Edge-first Svelte docs',
      primaryAction: { label: 'Read docs', href: '/docs' },
      secondaryAction: { label: 'Configure', href: '/docs/configuration' },
      visual: { type: 'pixel' }
    }
  }
});
```

`palette.accent` accepts a built-in token such as `emerald`, `sky`, `indigo`, `rose`, or a CSS color value. The default theme keeps the palette restrained and documentation-focused.

`home.visual` can stay as the built-in pixel module or point at a project image with `{ type: 'image', src: '/hero.png', alt: 'Preview' }`.

## Interaction

Built-in theme behavior includes:

- Search dialog with keyboard focus management.
- Ask AI panel with JSON and event-stream responses.
- Command palette for docs, search, and Ask AI entry points.
- Recursive sidebar with collapsed groups and locale/version scoped trees.
- Version lifecycle banners for deprecated and archived docs.
- Mobile menu state with transition.
- ToC highlighting based on the active heading.
- Code block toolbar with copy support.
- `prefers-reduced-motion` compatible transitions.

## Single Pages

Content under `content/pages` renders through the built-in single-page template by default. Use `layout: home` for the homepage, `layout: page` for the built-in page template, or a registered custom layout name for project-specific pages.

```md
---
title: Changelog
description: Product updates rendered with the single-page template.
---

# Changelog
```

## Custom Layouts

Register named layouts in the Vite plugin:

```ts title="vite.config.ts"
svedocs({
  layouts: {
    feature: '$lib/FeatureLayout.svelte'
  }
});
```

Then select a layout in frontmatter:

```md
---
title: Feature Page
layout: feature
---
```

Layouts receive the same page data as default pages, so custom single pages can still use the manifest, search records, SEO metadata, and framework shell.
