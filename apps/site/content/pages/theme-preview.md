---
title: Try your theme
description: Adjust a few CSS tokens in a custom Svelte page.
layout: page
---

This page renders a Svelte component registered through `pageComponents` in the Vite plugin. The component reads the current locale and site configuration with `useSvedocsTheme()`.

Color and radius controls update a local preview. Copy the resulting values into `theme.palette.accent` and `theme.radius` in your config.

See [theme customization](/docs/configuration/theme) for the registration code.
