---
name: localize-svedocs
description: Add and maintain multilingual svedocs sites. Use when configuring locales, organizing translated docs or pages, translating theme messages, localizing links or custom components, scoping search and Ask AI by language, generating hreflang metadata, or checking translation coverage.
---

# Localize svedocs

Treat each page locale as part of routing, navigation, search, Ask AI, metadata, and document language, not as a UI-only translation toggle.

## Inspect before moving content

1. Read `svedocs.config.*` and record `defaultLocale`, locale `code`, `path`, `hreflang`, `dir`, and `prefixDefaultLocale`.
2. Inventory matching files below both configured docs and pages roots.
3. Inspect root and catch-all route renderers, custom theme components, custom landing slots, search/AI endpoints, and `site.url`.
4. Preserve stable relative paths across locales.

Read [i18n-reference.md](references/i18n-reference.md) for route mapping, message behavior, link fallback, SEO, and validation rules.

## Implement

- Use locale `path` as the first directory under both content roots.
- Use either root-level files or a locale directory for the default locale, never both for the same page.
- Translate frontmatter, body content, navigation labels, alt text, and project-specific interface messages.
- Keep plain labels as fallbacks and add `labelKey`, `kickerKey`, or `altKey` where supported.
- Use `context.localeCode` for data filtering and `context.languageTag` plus `dir` for document semantics.
- Use `LocalizedLink` or `resolveLocalizedHref` in custom components.
- Keep search and Ask AI `scope: 'current'` unless cross-language results are intentional.
- Set `site.url` so canonical and alternate URLs are absolute.
- Ensure custom Home components or shared route wrappers render every localized homepage, including routes handled by the catch-all page.
- Preserve `resolveSvedocsPageRoute` and `createSvedocsRouteEntries` in the catch-all loader so edge redirects and finite static fallback documents keep working.
- Do not advertise or link a translation that does not exist.

## Validate

Enable `checks.translations` or run:

```sh
svedocs check --translations --strict
```

Also run the project type check and each supported build mode. Browser-test one route per locale, locale switching on a translated and missing page, localized internal links with query/hash preservation, an RTL locale when configured, localized search/AI scope, a missing localized route, and canonical/hreflang output.

Translation checks measure complete coverage. During an intentional partial-locale rollout, non-strict warnings can coexist with runtime fallback; `--translations --strict` passes only when every public translation is present.
