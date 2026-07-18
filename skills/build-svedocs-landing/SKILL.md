---
name: build-svedocs-landing
description: Create or refine a svedocs homepage and product landing experience. Use when configuring the built-in home hero, replacing home visual or feature regions, supplying the DocsApp landing slot, replacing the Home theme component, or making localized landing pages.
---

# Build a svedocs landing page

Build the actual product or documentation landing experience while preserving svedocs routing, metadata, global navigation, localization, and content discovery.

## Inspect routing first

Read the root page content, `src/routes/+page.svelte`, `src/routes/+page.ts`, the catch-all route, `svedocs.config.ts`, and `vite.config.*`. Determine whether localized home routes such as `/zh` are rendered by the catch-all route.

Read [landing-patterns.md](references/landing-patterns.md) for the current slot contracts and routing choices.

## Choose the customization level

1. Use `theme.home` for kicker, actions, and pixel or image visual changes.
2. Use `home-hero-visual` or `home-features` slots for one region.
3. Use the `landing` slot to replace all landing content while retaining the svedocs root shell, header, footer, and `main#content` wrapper. Share the same `DocsApp` wrapper from root and catch-all routes when every localized home needs that slot.
4. Replace `theme.components.Home` when root and localized catch-all routes do not share slot markup or when the design needs the full Home component contract.
5. Register a named layout only for standalone campaign pages selected through frontmatter; do not use it to bypass normal home routing accidentally.

## Implement the landing

- Keep the page title and description in `content/pages/index.md` so metadata, search, and translation groups remain content-driven.
- Use `context.t(...)` for interface copy and `resolveLocalizedHref` or `LocalizedLink` for internal destinations.
- Filter page-derived content with `context.localeCode`.
- Keep one `main` landmark. The `landing` slot already renders inside `main#content`.
- Use real product imagery or an inspectable product state when visuals carry meaning.
- Preserve theme mode initialization, keyboard navigation, visible focus, reduced motion, and mobile text containment.
- Avoid duplicating `DocsApp` data loading or virtual-module plumbing inside the landing component.

## Verify

Run checks and edge, static, and SPA builds when supported. Use browser smoke tests on desktop and mobile for the default home, each localized home, navigation targets, theme modes, and reduced motion. Confirm that metadata comes from the correct page and that untranslated destinations fall back according to svedocs locale rules.
