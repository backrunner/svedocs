---
title: Theme
description: Customize the Tailwind CSS v4 default theme, color tokens, dark mode, navigation, and homepage layout.
order: 2
---

# Theme

The default theme ships inside the `svedocs` package. It uses Tailwind CSS v4 and framework CSS variables, so there is no separate theme package to install.

## Styles

Import the theme stylesheet from the SvelteKit root layout:

```svelte title="src/routes/+layout.svelte"
<script>
  import 'svedocs/theme/styles.css';
</script>

<slot />
```

The stylesheet defines `--sd-*` tokens and uses `data-theme` for light and dark mode.

## Form controls

The theme also exports basic form components for custom layouts, embedded tools, and interactive docs pages. They keep native Svelte ergonomics such as `bind:value`, forwarded DOM events, and standard form attributes.

```svelte
<script lang="ts">
  import { Button, Checkbox, FormField, Input, Select, Textarea } from 'svedocs/theme';

  let email = '';
  let role = 'reader';
  let note = '';
  let updates = true;
</script>

<FormField label="Email" for="email" description="Used only for workspace notifications.">
  <Input id="email" type="email" bind:value={email} placeholder="you@example.com" />
</FormField>

<FormField label="Role" for="role">
  <Select id="role" bind:value={role}>
    <option value="reader">Reader</option>
    <option value="editor">Editor</option>
  </Select>
</FormField>

<FormField label="Notes" for="note">
  <Textarea id="note" bind:value={note} rows="4" />
</FormField>

<Checkbox bind:checked={updates} label="Send release updates" />

<Button variant="primary" type="submit">Save preferences</Button>
```

Available controls are `FormField`, `Input`, `Textarea`, `Select`, `Checkbox`, and `Button`. `Input`, `Textarea`, `Select`, `Checkbox`, and `Button` accept `density="sm" | "md" | "lg"`. `Button` accepts `variant="default" | "primary" | "ghost" | "danger"`.

## Palette

For a quick brand color swap, set only `theme.palette.accent`:

```ts title="svedocs.config.ts"
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  theme: {
    palette: {
      accent: 'sky'
    }
  }
});
```

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
      light: 'light-plus',
      dark: 'dark-plus'
    },
    brand: {
      label: 'svedocs',
      href: '/',
      mark: 'pixel'
    },
    nav: [
      { label: 'Docs', href: '/docs' },
      { label: 'Configuration', href: '/docs/configuration' },
      { label: 'API', href: '/docs/reference/api' }
    ],
    social: [
      { label: 'GitHub', href: 'https://github.com/svedocs/svedocs', external: true }
    ],
    footer: {
      text: 'MIT licensed.',
      links: [{ label: 'Cloudflare', href: '/docs/integrations/cloudflare' }]
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

`palette.accent` accepts a built-in token such as `emerald`, `teal`, `sky`, `indigo`, `rose`, or `amber`. It also accepts any CSS color value, such as `#0ea5e9`, `hsl(221 83% 53%)`, or `oklch(62% 0.18 250)`. The default theme keeps the palette restrained and documentation-focused.

`home.visual` can stay as the built-in pixel module or point at a project image with `{ type: 'image', src: '/hero.png', alt: 'Preview' }`.

## Theme slots

`DocsApp` exposes named slots for replacing the default visual layers while keeping the built-in routing shell, metadata, header, footer, search, Ask AI, and docs navigation.

```svelte title="src/routes/+page.svelte"
<script lang="ts">
  import { DocsApp } from 'svedocs/theme';
  import components from 'virtual:svedocs/components';
  import layouts from 'virtual:svedocs/layouts';
  import loadSearch from 'virtual:svedocs/search-loader';

  export let data;
</script>

<DocsApp
  page={data.page}
  pages={data.pages}
  tree={data.tree}
  search={data.search}
  config={data.config}
  {components}
  {layouts}
  {loadSearch}
>
  <div slot="background" class="brand-background"></div>
</DocsApp>
```

The `background` slot replaces the built-in grid layer on the homepage, single pages, and documentation articles. It is rendered as an `aria-hidden` decorative layer with pointer events disabled.

Homepage-specific slots let you replace smaller regions:

```svelte title="src/routes/+page.svelte"
<DocsApp
  page={data.page}
  pages={data.pages}
  tree={data.tree}
  search={data.search}
  config={data.config}
  {components}
  {layouts}
  {loadSearch}
>
  <div slot="home-hero-visual" class="product-orbit" aria-hidden="true"></div>

  <section slot="home-features" let:cards class="feature-strip">
    {#each cards as card}
      <a href={card.href}>{card.title}</a>
    {/each}
  </section>
</DocsApp>
```

Use `home-hero-visual` to replace the pixel hero effect or configured hero image. Use `home-features` to replace the default feature blocks. The slot receives the generated `cards` array so custom blocks can reuse the same documentation links.

To replace the entire landing content while preserving the svedocs header and footer, use `landing`:

```svelte title="src/routes/+page.svelte"
<DocsApp
  page={data.page}
  pages={data.pages}
  tree={data.tree}
  search={data.search}
  config={data.config}
  {components}
  {layouts}
  {loadSearch}
>
  <section slot="landing" let:page class="custom-landing">
    <h1>{page.title}</h1>
    <p>{page.description}</p>
  </section>
</DocsApp>
```

The theme still provides the `main#content` wrapper for the `landing` slot, so the skip link and page semantics remain intact.

Documentation articles also expose `doc-header` when you only need to replace the title and breadcrumb area:

```svelte
<DocsApp
  page={data.page}
  pages={data.pages}
  tree={data.tree}
  search={data.search}
  config={data.config}
  {components}
  {layouts}
  {loadSearch}
>
  <header slot="doc-header" let:page let:breadcrumbs class="article-hero">
    <nav>
      {#each breadcrumbs as item}
        <a href={item.path}>{item.label}</a>
      {/each}
    </nav>
    <h1>{page.title}</h1>
  </header>
</DocsApp>
```

## Interaction

Built-in theme behavior includes:

- Search dialog with keyboard focus management.
- Ask AI panel with JSON and event-stream responses.
- Command palette for docs, search, and Ask AI entry points.
- Recursive sidebar with collapsed groups and locale-scoped trees.
- Mobile menu state with transition.
- ToC highlighting based on the active heading.
- Code block toolbar with copy support.
- `prefers-reduced-motion` compatible transitions.

## Single pages

Content under `content/pages` renders through the built-in single-page template by default. Use `layout: home` for the homepage, `layout: page` for the built-in page template, or a registered custom layout name for project-specific pages.

```md
---
title: Changelog
description: Product updates rendered with the single-page template.
---

# Changelog
```

## Custom layouts

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
