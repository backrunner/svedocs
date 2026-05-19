# svedocs 模块设计文档

更新时间：2026-05-17  
状态：规划基线

## 1. 架构概览

svedocs 采用“外部一体化、内部模块化”的 monorepo 架构：

- `packages/svedocs` 是唯一的 framework 包，内置配置解析、内容模型、MDX 编译、默认主题、Cloudflare 集成、搜索、Ask AI、SEO 和 OG。
- `packages/cli` 是唯一的 CLI 包，负责创建项目、选择构建模式、调用 SvelteKit、部署 Cloudflare、生成索引和检查项目。
- `apps/site` 作为官方站、文档、品牌首页和 live demo。
- 渲染能力不拆成独立可选包；GFM、KaTeX、Shiki、diff、默认主题、SEO/OG 都是 `svedocs` 的内置能力。
- Search/AI provider 通过 `svedocs` 内部 ports/adapters 扩展，首版不发布独立 provider 包。

核心依赖方向：

```txt
apps/site
  -> svedocs

@svedocs/cli
  -> svedocs
  -> templates

svedocs internal modules:
  core -> config, content model, route/page tree, contracts
  mdx -> Svelte-compatible MDX compiler
  theme -> default Svelte theme and render components
  cloudflare -> edge/static/spa build helpers and runtime bindings
  search -> built-in search contracts and providers
  ai -> built-in Ask AI contracts and providers
  og -> SEO and OG image generation
```

约束：

- `svedocs` 对用户表现为一个 framework 包，但源码内部必须保持清晰模块边界。
- internal core 不依赖 Svelte 组件库、不依赖默认主题、不依赖 Cloudflare runtime。
- 默认主题不扫描文件系统，只消费 internal core 生成的数据。
- Cloudflare 模块不影响 static/spa 构建。
- CLI 不包含内容编译业务逻辑，只组合 `svedocs` 公开 API。

## 2. Monorepo 拓扑

```txt
svedocs/
  apps/
    site/                    # 官方站、文档、live demo
  packages/
    svedocs/                 # 完整 framework 包
      src/
        core/                # 配置、内容模型、route/page tree、contracts
        mdx/                 # Svelte-compatible MDX 编译管线
        theme/               # 默认主题、布局和组件
        cloudflare/          # adapter preset、bindings、deploy helpers
        search/              # search contracts、local 和 Cloudflare provider
        ai/                  # Ask AI contracts、Cloudflare runtime adapter
        og/                  # SEO、OG image schema、模板和生成器
        testing/             # fixture、test utilities、mock providers
    cli/                     # svedocs 与 create-svedocs 两个 binary
      templates/
        minimal/
        docs/
        cloudflare/
    create-svedocs/          # npm/pnpm create 兼容入口，只转发 @svedocs/cli
  .agents/
    requirements.md
    module-design.md
    development-plan.md
    roadmap.md
```

命名和发布规则：

- framework package：`svedocs`。
- CLI package：`@svedocs/cli`。
- create compatibility package：`create-svedocs`，仅用于 `npm create svedocs` / `pnpm create svedocs` 的包名解析。
- official site package：`@svedocs/site`，private workspace package，不发布到 npm。
- CLI binary：`svedocs`。
- create binary：`create-svedocs`，由 `@svedocs/cli` 提供；`packages/create-svedocs` 只做发布入口转发，不维护独立实现。
- 内部虚拟模块前缀：`virtual:svedocs/*`。
- 用户不需要安装 `@svedocs/theme-*`、`@svedocs/mdx`、`@svedocs/cloudflare` 或 provider 包。

## 3. 配置接口

用户根目录提供 `svedocs.config.ts`：

```ts
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'svedocs',
    title: 'svedocs',
    description: 'SvelteKit-native documentation framework',
    url: 'https://svedocs.dev',
    editLink: {
      pattern: 'https://github.com/svedocs/svedocs/edit/main/apps/site/content/:path'
    }
  },
  content: {
    root: 'content',
    docs: 'content/docs',
    pages: 'content/pages',
    include: ['**/*.{md,mdx,svx}'],
    exclude: ['**/_*.{md,mdx,svx}']
  },
  theme: {
    defaultMode: 'system',
    palette: {
      accent: 'emerald',
      neutral: 'zinc'
    },
    code: {
      light: 'github-light',
      dark: 'github-dark'
    }
  },
  build: {
    mode: 'edge'
  },
  search: {
    provider: 'cloudflare-ai-search',
    enabled: true
  },
  ai: {
    provider: 'cloudflare-ai-search',
    enabled: true
  },
  seo: {
    sitemap: true,
    robots: true,
    ogImage: {
      template: 'default'
    }
  }
});
```

配置处理规则：

- 使用 Zod 或等价 schema 校验配置。
- `defineConfig` 只做类型辅助，真实默认值由 core 注入。
- 所有路径相对项目根目录解析。
- `build.mode` 可选值为 `edge`、`static`、`spa`。
- `spa` 必须在 CLI 输出“不推荐”提示。
- provider 配置必须允许 `false` 或 `{ enabled: false }` 关闭。
- 配置解析结果必须可序列化，供 CLI、Vite plugin、SvelteKit load 和测试共用。

## 4. 核心数据模型

```ts
export interface SvedocsPage {
  id: string;
  sourcePath: string;
  routePath: string;
  slug: string[];
  locale?: string;
  kind: 'doc' | 'page';
  title: string;
  description?: string;
  headings: SvedocsHeading[];
  frontmatter: Record<string, unknown>;
  seo: SvedocsSeo;
  search: SvedocsSearchRecord[];
  prev?: SvedocsLink;
  next?: SvedocsLink;
}

export interface SvedocsHeading {
  id: string;
  depth: 2 | 3 | 4;
  text: string;
}

export interface SvedocsTreeItem {
  id: string;
  title: string;
  path?: string;
  children?: SvedocsTreeItem[];
  collapsed?: boolean;
  order?: number;
}

export interface SvedocsSearchRecord {
  id: string;
  pageId: string;
  url: string;
  title: string;
  section?: string;
  content: string;
  metadata: Record<string, string | number | boolean | string[]>;
}
```

数据模型原则：

- `routePath` 是渲染路由唯一来源。
- `page tree` 和 `prev/next` 从同一个排序模型生成。
- `headings` 只包含 ToC 需要的层级，默认 `h2-h4`。
- `search records` 按 section 切片，避免把整篇文档作为单条记录。
- `locale` 先预留，首版不强制实现多语言路由。

## 5. 内容编译管线

编译阶段：

1. Discover：扫描 `content.include`，应用 ignore、draft、locale 和 kind 推断。
2. Parse：读取 frontmatter 和原始 Markdown/Svelte-compatible MDX。
3. Transform：执行 remark/rehype/mdsvex 插件，处理 GFM、KaTeX、heading slug、autolink、代码块和自定义组件。
4. Highlight：使用 Shiki 生成代码 HTML/token，并执行 line highlight、focus、diff notation 和 copy metadata。
5. Diff：对 `diff` fence 或带 diff metadata 的 code block 生成统一 diff AST；默认渲染器尝试接入 `@pierre/diffs`，不可用时降级为 Shiki diff 风格。
6. Extract：输出 headings、links、plain text、search records、structured data 和 edit path。
7. Manifest：生成 `virtual:svedocs/pages`、`virtual:svedocs/tree`、`virtual:svedocs/search`、`virtual:svedocs/config`。
8. Watch：开发模式下监听内容和配置变化，触发 Vite HMR。

SvelteKit 集成：

- `svedocs/vite` 暴露 `svedocs()` Vite plugin。
- plugin 在 dev/build 中生成虚拟模块，不向用户项目写入生成源码。
- `@svedocs/cli` 内置模板提供最小 SvelteKit route shell。
- 默认 route shell 使用 `svedocs/theme` 的 `DocRoute`、`PageRoute` 和 load helper。
- 高级用户可以跳过默认 route shell，直接消费虚拟模块和 `svedocs/core` API。

## 6. 默认主题

位置：`packages/svedocs/src/theme`  
导出：`svedocs/theme`

主题组件：

- `RootLayout`：html class/data-theme、全局 shell、skip link、theme script。
- `DocsLayout`：sidebar、topbar、content、ToC、mobile nav。
- `DocPage`：正文、title block、description、metadata、prev/next、edit link。
- `PageLayout`：单页模板，支持 hero、feature grid、CTA、custom slots。
- `HomePage`：默认首页模板，供用户快速创建站点首页。
- `CodeBlock`：Shiki 输出、复制按钮、标题、行号、diff 状态。
- `SearchDialog`：搜索入口、结果列表、键盘导航。
- `AskAiPanel`：Ask AI 输入、流式响应、引用来源。
- `ThemeToggle`：system/light/dark。

样式约束：

- 只使用 Tailwind CSS v4 和 CSS variables。
- token 以 `--sd-*` 命名，映射到 Tailwind `@theme`。
- 主题切换使用 `data-theme="light|dark"` 和 system preference。
- 动画使用 transform、opacity、height/grid-template-rows 等稳定属性。
- 所有可交互元素必须有 hover、focus-visible、active、disabled 状态。
- 组件内部不使用嵌套卡片结构；文档页布局以信息层级为主。

ToC 高亮：

- 客户端增强脚本读取页面 headings。
- 使用 IntersectionObserver 维护当前 heading id。
- hash 变化、滚动恢复和路由切换时同步 active state。
- 用户开启 reduced motion 时禁用平滑滚动和复杂动画。

## 7. 官方站设计

位置：`apps/site`

站点职责：

- svedocs 官方网站。
- svedocs 文档。
- svedocs live demo。
- 最新版本功能验证项目。

视觉方向：

- 原创像素风格抽象艺术。
- 模块化 UI 构成，参考“开发工具官网的精密感”，不复制 Cursor 的具体布局、图形或视觉资源。
- 首页首屏展示产品名、简短 value proposition、主要操作和真实 UI/文档预览。
- 避免堆砌指标、功能长段落和营销式大面积卡片。
- 文档区和官网区共享主题 token，但首页可以有更强品牌表达。

## 8. Cloudflare 集成

位置：`packages/svedocs/src/cloudflare`  
导出：`svedocs/cloudflare`

职责：

- 根据 `build.mode=edge` 生成或校验 `@sveltejs/adapter-cloudflare` 配置。
- 提供 `wrangler.toml` 模板、可选 `wrangler.jsonc` 输出和 bindings 类型示例。
- 封装 Cloudflare Pages/Workers 预览与部署命令。
- 提供 `event.platform.env` 的类型辅助。
- 为 AI Search、Workers AI、R2、D1、KV、Vectorize 预留 binding contract。

模式处理：

- `edge`：默认推荐，使用 Cloudflare adapter，输出 `.svelte-kit/cloudflare`。
- `static`：使用 adapter-static，输出静态目录，要求 prerender 能覆盖所有文档路由。
- `spa`：使用 adapter-static fallback，关闭 SSR，CLI 输出警告，文档标注仅适合嵌入式或离线场景。

## 9. 搜索和 Ask AI

抽象接口：

```ts
export interface SearchProvider {
  name: string;
  index(records: SvedocsSearchRecord[], context: SearchIndexContext): Promise<void>;
  search(query: SearchQuery, context: SearchRuntimeContext): Promise<SearchResult[]>;
}

export interface AiProvider {
  name: string;
  ask(input: AskInput, context: AiRuntimeContext): Promise<AskResult | ReadableStream<AskChunk>>;
}
```

Cloudflare AI Search 优先策略：

- `svedocs index` 将编译后的 search records 输出为 AI Search 可消费的数据。
- `svedocs/search/cloudflare` 提供 Workers runtime adapter，用于查询 AI Search。
- `svedocs/ai/cloudflare` 提供 Ask AI adapter，返回答案、引用来源和相关文档链接。
- 本地开发默认使用 mock provider 或离线 JSON provider，避免要求真实 Cloudflare token。
- provider contract 保留 metadata filter、多租户、版本、locale 和权限字段。

已内置 provider：

- Search：MiniSearch 本地 provider、Algolia Search API provider、Typesense Search API provider、Cloudflare AI Search provider。
- Ask AI：mock provider、Cloudflare AI Search provider、Workers AI provider、OpenAI-compatible Chat Completions provider。

未来扩展：

- Vectorize + Workers AI 自建 RAG。
- Pagefind 或本地静态索引。
- Meilisearch、Trieve、Orama Cloud、Mixedbread。
- 企业私有搜索 provider。

## 10. SEO 和 OG

位置：`packages/svedocs/src/og`  
导出：`svedocs/og`

SEO 合并顺序：

1. core 默认值。
2. `svedocs.config.ts` 全局 `seo`。
3. section/layout metadata。
4. 页面 frontmatter。
5. 用户自定义 load 返回值。

输出：

- `<title>`、description、canonical。
- Open Graph 和 Twitter card。
- JSON-LD：`WebSite`、`BreadcrumbList`、`TechArticle` 或 `Article`。
- `sitemap.xml`。
- `robots.txt`。
- OG image 文件和 metadata 引用。

OG 生成器：

- 默认使用 Satori + Resvg 生成 PNG。
- 模板输入为页面 metadata、站点信息、主题 token 和 optional image。
- 用户可以注册自定义模板或完全接管 image URL。
- 构建期生成优先；edge 动态生成作为后续增强。

## 11. CLI 设计

命令：

```txt
create-svedocs [dir]
svedocs dev
svedocs build --mode edge|static|spa
svedocs preview
svedocs deploy cloudflare
svedocs index --provider cloudflare-ai-search
svedocs og
svedocs check
```

CLI 规则：

- 优先使用用户项目已安装的 SvelteKit 和 svedocs 包。
- 对 `build --mode spa` 输出明确警告。
- 对 Cloudflare deploy 提供 dry-run 检查。
- `check` 不需要真实 Cloudflare token；集成检查可以标记为 skipped。
- 所有命令使用结构化日志和非零 exit code 表达失败。

## 12. 公共 API 边界

稳定 API：

- `svedocs/config`：`defineConfig`、配置类型和 schema 类型。
- `svedocs/vite`：`svedocs()` Vite plugin。
- `svedocs/core`：`loadSvedocsConfig`、`createPageTree`、`createSearchRecords` 等数据 API。
- `svedocs/theme`：默认主题组件和 props。
- `svedocs/cloudflare`：Cloudflare adapter helpers、binding 类型和部署辅助 API。
- `svedocs/search`、`svedocs/ai`：内置 provider interfaces 和默认 provider。
- `svedocs/og`：OG image schema、模板和生成 API。
- `@svedocs/cli`：`svedocs` 与 `create-svedocs` 命令。

内部 API：

- 具体 AST 中间格式。
- Vite virtual module 文件名之外的内部实现。
- 主题私有 class 名。
- Cloudflare deploy 内部命令拼接。

版本策略：

- v0.x 允许小幅 API 调整，但必须写 migration notes。
- v1.0 后稳定 API 遵循 semver。
- provider contract 变更必须提供兼容层或 major version，但仍在 `svedocs` 包内发布。
