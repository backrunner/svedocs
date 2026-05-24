---
title: Installation
description: Install svedocs in a new project or add it to an existing SvelteKit app.
order: 2
---

# Installation

## New project

```sh
pnpm create svedocs my-docs
cd my-docs
pnpm install
pnpm dev
```

This path scaffolds the app, the docs theme, the CLI entry points, and the default content structure in one step.

## Existing project

```sh
pnpm add svedocs
pnpm add -D @svedocs/cli
```

Then wire the package into `vite.config.ts`, `svelte.config.js`, and your root layout:

```ts title="vite.config.ts"
import { svedocs } from 'svedocs/vite';
import svedocsConfig from './svedocs.config';

export default {
  plugins: [
    svedocs({ config: svedocsConfig })
  ]
};
```

```svelte title="src/routes/+layout.svelte"
<script>
  import 'svedocs/theme/styles.css';
</script>

<slot />
```

## First run

1. Create `svedocs.config.ts`.
2. Add your content under `content/docs`.
3. Start the dev server and open `/docs`.
4. Add search and Ask AI once the content tree is in place.

