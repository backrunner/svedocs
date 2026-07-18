# Theme contract

## Customization layers

| Layer | Use for |
| --- | --- |
| Config tokens | Brand colors, fonts, radius, mode, code, nav, footer, simple home |
| `DocsApp` slots | Background, home visual/features, entire landing, doc header |
| Component map | Replacing a visual or layout component |
| Headless controllers | Owning markup while reusing framework behavior |

CSS choices:

| Import | Result |
| --- | --- |
| `svedocs/theme/styles.css` | Full Tailwind CSS v4 theme |
| `svedocs/theme/base.css` | Reset, accessibility, prose, and code structure |
| None | Project owns all styling |

## Slots

`DocsApp` exposes:

- `background` across home, pages, and docs;
- `home-hero-visual` with page, pages, config, context;
- `home-features` with page, pages, config, generated cards, context;
- `landing` with page, pages, tree, search, config, content, context;
- `doc-header` with page and breadcrumbs.

Use slots before replacing large components.

## Component map

Register paths in `vite.config.ts`:

```ts
svedocs({
  config: svedocsConfig,
  theme: {
    components: {
      Navbar: '$lib/theme/Navbar.svelte',
      Article: '$lib/theme/Article.svelte'
    }
  }
});
```

The map supports:

- shells: `Root`, `Layout`, `Docs`, `DocsShell`, `Page`, `PageShell`, `Home`, `Error`;
- navigation: `Header`, `Navbar`, `Brand`, `TopNav`, `MobileNav`, `SocialNav`, `Sidebar`;
- content/tools: `Article`, `Toc`, `Search`, `AskAi`, `PageTools`, `RenderError`;
- footer/mode: `Footer`, `FooterLinks`, `ThemeToggle`.

Import stable prop types from `svedocs/theme/types`. Import default components from `svedocs/theme` when composing only part of the built-in UI.

## Required data flow

Large replacements must preserve:

- `config` for providers, mode, messages, and tokens;
- `page` and `pages` for content, alternates, and locale mapping;
- `tree` for navigation;
- `search` and `loadSearch` for search and Ask AI;
- `themeComponents` for nested overrides;
- compiled `content` with `page.html` fallback when the design retains authored body content.

`DocsApp` initializes page-level replacements. Do not render another `ThemeInit` directly inside a registered `Docs`, `Page`, `Home`, or `Error` replacement. A replacement that composes `RootLayout` may currently receive both framework-owned initializers; the generated script is idempotent, so do not add another. An application shell outside both `DocsApp` and `RootLayout` must render one initializer. Keep `createThemeContext` connected to the same data. Prefer lazy `loadSearch` for large sites.

## Headless behavior

`svedocs/theme/headless` exports helpers and controllers for:

- theme context, messages, localized text and hrefs;
- search and Ask AI;
- ToC tracking;
- theme mode;
- mobile navigation;
- page tools and code copy.

Custom buttons may open default panels through `svedocs:open-search` and `svedocs:open-ai` events.

## Styling and accessibility

- Markdown output retains stable `sd-*` structural classes.
- Keep `header`, `nav`, `main`, `article`, `aside`, and `footer` landmarks.
- Preserve the skip-link target `main#content`.
- Preserve heading IDs, anchor scroll offset, keyboard focus, dialog focus management, and reduced-motion behavior.
- Keep text inside controls at mobile widths and test long labels.
- Use `context.t` rather than hard-coded interface strings.
- Use `context.languageTag` and locale direction for custom roots.
- Set `theme.code.copyButton: false` when rendering a separate copy control.
- Replace `Error` for route failures and `RenderError` for local boundary failures.

## Form controls

The theme exports `FormField`, `Input`, `Textarea`, `Select`, `Checkbox`, and `Button`. Controls support `density: 'sm' | 'md' | 'lg'`. Buttons support `default`, `primary`, `ghost`, and `danger` variants. Prefer them in custom theme surfaces when the bundled styling remains active.
