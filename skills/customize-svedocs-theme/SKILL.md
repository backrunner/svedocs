---
name: customize-svedocs-theme
description: Customize svedocs visual styling and theme composition. Use when changing colors, fonts, dark mode, navigation, CSS tokens, theme slots, default Svelte components, headless controllers, form controls, error UI, or building a reusable svedocs theme package.
---

# Customize the svedocs theme

Choose the smallest customization layer that can satisfy the design. Keep svedocs navigation, search, Ask AI, localization, metadata, and accessibility contracts connected.

## Select a layer

1. Use `theme` config for palette, fonts, radius, color mode, code presentation, brand, nav, social links, footer, and simple home settings.
2. Use `DocsApp` slots for background, home visual, home features, full landing content, or document header changes.
3. Replace a component through the Vite plugin for structural markup changes.
4. Compose with `svedocs/theme/headless` only when the project must own markup and CSS.

Read [theme-contract.md](references/theme-contract.md) before replacing components or removing bundled CSS.

## Implement

- Import `svedocs/theme/styles.css` once for the full theme, `svedocs/theme/base.css` for minimal structure, or neither when the project owns every style.
- Register component paths in `svedocs({ theme: { components } })`, not `svedocs.config.ts`.
- Type replacement props from `svedocs/theme/types`.
- Prefer `Layout`, `DocsShell`, or `PageShell` for geometry changes before replacing `Root`, `Docs`, `Page`, `Home`, or `Error`.
- Pass `pages`, `tree`, `search`, `config`, `loadSearch`, and `themeComponents` through composed defaults.
- Render compiled `content` when present and fall back to `page.html`.
- Use `context.t(...)`, `context.localeCode`, `context.languageTag`, `LocalizedLink`, or `resolveLocalizedHref` in custom UI.
- Preserve semantic landmarks, keyboard focus, visible focus, reduced motion, fixed-header anchor offsets, and responsive layout.
- Do not add `ThemeInit` inside a replacement selected by `DocsApp`; `DocsApp` initializes custom page-level replacements. Render it once only in an application shell that bypasses both `DocsApp` and `RootLayout`.

## Verify visually

Run type checks and builds, then test light, dark, and system modes as applicable. Use a real browser at desktop and mobile widths. Check search, Ask AI, sidebar, ToC, mobile navigation, code copy, errors, localized routes, and long content. Confirm no overflow, overlap, layout shift, broken focus order, or inaccessible motion.
