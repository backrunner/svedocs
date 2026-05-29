---
title: 安装
description: 在新项目里安装 svedocs，或把它接入已有的 SvelteKit 应用。
order: 2
---

# 安装

## 新项目

```sh
pnpm create svedocs my-docs
cd my-docs
pnpm install
pnpm dev
```

这条路径会一次性生成应用、文档主题、CLI 入口和默认内容结构。

## 现有项目

```sh
pnpm add svedocs
pnpm add -D svedocs-cli
```

然后把它接到 `vite.config.ts`、`svelte.config.js` 和根布局里：

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

## 第一次运行

1. 创建 `svedocs.config.ts`。
2. 把内容放到 `content/docs` 下。
3. 启动开发服务器并打开 `/docs`。
4. 等内容树稳定后，再接搜索和 Ask AI。
