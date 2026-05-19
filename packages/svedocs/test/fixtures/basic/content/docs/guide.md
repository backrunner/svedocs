---
title: Guide
description: Learn the svedocs content workflow.
navTitle: Start
order: 1
---

# Guide

## Install

Use svedocs with SvelteKit. Continue to [Nested routing](./advanced/routing.md).

```ts title="svedocs.config.ts" {1} focus=2
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: { name: 'Fixture' }
});
```

## Diff blocks

```diff
- old docs
+ new docs
```
