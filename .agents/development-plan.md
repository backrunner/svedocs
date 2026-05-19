# svedocs 研发方案

更新时间：2026-05-17  
状态：规划基线

## 1. 技术基线

包管理和工程：

- pnpm workspace。
- Turbo 管理任务图和缓存。
- Changesets 管理版本、变更记录和发布。
- TypeScript strict mode。
- MIT License。

核心依赖快照，来自 2026-05-17 npm registry：

| 依赖 | 版本 |
| --- | --- |
| `svelte` | `5.55.7` |
| `@sveltejs/kit` | `2.60.1` |
| `@sveltejs/adapter-cloudflare` | `7.2.8` |
| `@sveltejs/adapter-static` | `3.0.10` |
| `vite` | `8.0.13` |
| `tailwindcss` | `4.3.0` |
| `@tailwindcss/vite` | `4.3.0` |
| `mdsvex` | `0.12.7` |
| `shiki` | `4.0.2` |
| `@shikijs/transformers` | `4.0.2` |
| `@pierre/diffs` | `1.1.22` |
| `wrangler` | `4.92.0` |
| `@cloudflare/workers-types` | `4.20260517.1` |
| `typescript` | `6.0.3` |
| `vitest` | `4.1.6` |
| `@playwright/test` | `1.60.0` |
| `turbo` | `2.9.14` |
| `@changesets/cli` | `2.31.0` |

实施时规则：

- 开始编码前重新查询 npm `latest`，避免版本快照过期。
- 只固定必要 peer dependency 范围，减少用户项目冲突。
- 对 Cloudflare beta/preview 功能使用 adapter 层隔离。
- 不在开源代码中提交 token、账号、私有 URL 或真实 AI Search credentials。

## 2. 工程规范

代码设计：

- 使用 ports/adapters 分层：`svedocs` 包内部 core 定义接口，内置 provider 模块实现接口。
- 使用 composition over inheritance：主题组件通过 props、slots、context 组合。
- 使用 schema-first config：配置先校验再进入构建和运行时。
- 使用 fixture-driven development：内容编译能力通过 fixture 固化行为。
- 使用 progressive enhancement：文档基本阅读不依赖搜索、AI 或复杂客户端脚本。

包边界：

- `packages/svedocs` 是完整 framework 包，对外提供 `svedocs/config`、`svedocs/vite`、`svedocs/theme`、`svedocs/cloudflare`、`svedocs/search`、`svedocs/ai`、`svedocs/og` 等 subpath exports。
- `packages/svedocs/src/core` 只处理数据和 contracts。
- `packages/svedocs/src/mdx` 只处理内容编译和 AST/HTML 输出。
- `packages/svedocs/src/theme` 只消费 core 数据和渲染 Svelte 组件。
- `packages/svedocs/src/cloudflare` 只处理 Cloudflare runtime/deploy。
- `packages/svedocs/src/search`、`src/ai`、`src/og` 是内置能力模块，不发布成独立可选包。
- `packages/cli` 调用 `svedocs` 公开 API，不复制实现，并同时提供 `svedocs` 与 `create-svedocs` binary；`packages/create-svedocs` 仅作为 npm/pnpm create 包名兼容转发层。
- `apps/site` 是官方站私有 workspace package，包名为 `@svedocs/site`，始终依赖 workspace 内的 `svedocs` 最新实现。

文档和注释：

- 公开 API 必须有 TSDoc。
- 用户可见错误必须给出修复建议。
- `.agents` 维护产品和研发规划，`docs` 维护用户文档。
- 复杂实现需要短注释解释设计原因，避免无意义注释。

## 3. 初始仓库搭建

第一批文件：

- `package.json`：private workspace、packageManager、scripts、license。
- `pnpm-workspace.yaml`：包含 `apps/*`、`packages/*`。
- `turbo.json`：`build`、`test`、`lint`、`check`、`dev`。
- `.changeset/config.json`。
- `tsconfig.base.json`。
- `.gitignore`。
- `LICENSE`。
- `README.md`。
- `.dev.vars.example`。

基础 scripts：

```json
{
  "dev": "turbo dev",
  "build": "turbo build",
  "test": "turbo test",
  "check": "turbo check",
  "lint": "turbo lint",
  "changeset": "changeset",
  "version": "changeset version",
  "release": "turbo build && changeset publish"
}
```

## 4. 实现阶段

### Phase 0：仓库和发布骨架

目标：

- 建立 pnpm + Turbo + Changesets monorepo。
- 创建 `packages/svedocs`、`packages/cli`、`apps/site` 和最小 build/test/check scripts。
- 设置 MIT License、README、贡献约定和安全示例文件。

完成标准：

- `pnpm install` 成功。
- `pnpm build` 对空实现或最小实现成功。
- Changesets 配置可运行。
- 没有 secret 或本地路径泄漏。

### Phase 1：核心配置和内容模型

目标：

- 实现 `defineConfig`、配置 schema、默认值合并。
- 实现内容发现、slug、routePath、frontmatter、page tree、prev/next。
- 生成虚拟模块 contract。

完成标准：

- fixture 可生成稳定 manifest。
- 单元测试覆盖 slug、排序、导航树、配置校验。
- internal core 不依赖 Svelte 组件、Cloudflare 或默认主题。

### Phase 2：MDX/Markdown 编译

目标：

- 接入 mdsvex 风格编译，支持 `.md/.mdx/.svx`。
- 支持 GFM、KaTeX、heading slug、autolink headings。
- 接入 Shiki 和 transformer。
- 定义 diff block AST 和默认降级渲染。

完成标准：

- fixture 覆盖 GFM 表格、任务列表、KaTeX、Svelte 组件、代码标题、行高亮、diff。
- 编译输出 headings、plain text、links、search records 和 SEO data。
- 编译错误包含源文件路径、行列和修复建议。

### Phase 3：SvelteKit 集成和默认主题

目标：

- 实现 `svedocs()` Vite plugin 和 SvelteKit route helper。
- 实现默认 docs layout、sidebar、topbar、ToC、code block、search dialog shell。
- 实现 Tailwind CSS v4 token 和亮暗色。
- 实现移动菜单、sidebar 折叠、ToC 实时高亮和 reduced motion。

完成标准：

- minimal template 可运行 `svedocs dev`。
- 默认主题在桌面和移动端无明显布局溢出。
- Playwright 验证亮暗色、导航、ToC 高亮和键盘路径。

### Phase 4：构建模式和 Cloudflare

目标：

- 实现 `build --mode edge|static|spa`。
- 默认 edge 使用 `@sveltejs/adapter-cloudflare`。
- static 使用 `@sveltejs/adapter-static`。
- spa 显式 opt-in 并输出警告。
- 添加 wrangler 模板、bindings 类型、deploy dry-run。

完成标准：

- edge build 输出 `.svelte-kit/cloudflare`。
- static build 输出静态目录。
- spa build 有 fallback 并输出警告。
- `wrangler pages dev` 或等价本地预览路径可验证。

### Phase 5：搜索和 Ask AI

目标：

- 在 `svedocs` 包内定义 search provider 和 AI provider contract。
- 在 `svedocs` 包内实现离线 JSON search provider，用于本地开发和测试。
- 在 `svedocs` 包内实现 Cloudflare AI Search adapter。
- 在 `svedocs` 包内实现 Ask AI runtime endpoint、引用来源和基础 UI。

完成标准：

- `svedocs index` 可从 fixture 输出 JSONL 或 provider payload。
- 无 Cloudflare token 时测试走 mock provider。
- Cloudflare adapter 有集成测试开关和清晰跳过提示。
- UI 搜索和 Ask AI 可关闭。

### Phase 6：SEO、OG 和检查器

目标：

- 实现 metadata 合并、sitemap、robots、JSON-LD。
- 实现 Satori + Resvg 默认 OG image 生成。
- 实现 `svedocs check`。

完成标准：

- fixture 覆盖 title、description、canonical、OG、JSON-LD。
- `svedocs og` 能批量生成默认 PNG。
- `svedocs check` 能发现缺失 metadata、破损链接、重复 slug、SPA 风险。

### Phase 7：官方站

目标：

- 在 `apps/site` 构建官方站和文档。
- 首页采用原创像素抽象模块化 UI。
- 文档覆盖安装、配置、内容、主题、部署、搜索、AI、SEO、迁移和 API。
- 官方站始终使用 workspace 最新包。

完成标准：

- 官方站能 edge 和 static 构建。
- 首页视觉有辨识度，不卡片堆砌，不抄袭参考站。
- 文档示例真实可运行。
- 官方站同时作为端到端测试目标。

## 5. 测试矩阵

单元测试：

- 配置 schema 和默认值。
- slug、routePath、locale 预留字段。
- page tree 排序、分组、折叠、prev/next。
- frontmatter 解析和 metadata 合并。
- search provider contract。
- theme token 生成。

编译 fixture：

- GFM 表格。
- GFM task list。
- KaTeX inline/block。
- Svelte 组件嵌入。
- Shiki 代码高亮。
- 代码标题、行号、行高亮、focus。
- diff block。
- heading anchor 和 ToC。
- 内部链接和破损链接。
- structured data。

CLI e2e：

- `create-svedocs` minimal。
- `create-svedocs` docs template。
- `svedocs dev`。
- `svedocs build --mode edge`。
- `svedocs build --mode static`。
- `svedocs build --mode spa`。
- `svedocs preview`。
- `svedocs check`。

UI/交互：

- 桌面和移动端布局。
- 亮色、暗色、system。
- sidebar 展开收起。
- 移动菜单。
- 搜索弹窗打开、输入、键盘导航、关闭。
- ToC 高亮随滚动变化。
- hash anchor 定位。
- reduced motion。

Cloudflare：

- adapter-cloudflare build。
- wrangler 本地预览。
- bindings 类型。
- AI Search mock harness 和可选真实集成测试。
- 可选真实集成测试，依赖环境变量，默认跳过。

安全/开源：

- license 检查。
- package exports 检查。
- 发布文件列表检查。
- secret scan。
- `.dev.vars.example` 存在且不含真实值。

## 6. 质量门禁

合并前：

- `pnpm check`。
- `pnpm test`。
- 相关 fixture 更新。
- 若触及 UI，则运行 Playwright 截图检查。
- 若触及 Cloudflare，则运行 edge build。
- 若新增依赖，则检查 license 和包体影响。

发布前：

- Changeset 必须存在。
- `pnpm build` 全量通过。
- 官方站构建通过。
- `svedocs check` 对官方站通过。
- npm package dry-run 输出符合预期。
- README 和 docs 更新。

## 7. 主要风险和缓解

- MDX 语义风险：Svelte-compatible MDX 与 React MDX 不完全等价。通过明确命名、文档示例和编译测试降低误解。
- Cloudflare AI Search 变化风险：AI Search 仍在快速演进。通过 provider contract、mock harness 和可选真实集成测试降低锁定风险。
- diff renderer 适配风险：`@pierre/diffs` 当前文档偏 React。先定义 svedocs diff AST 和降级渲染，再实现最佳 adapter。
- Tailwind v4 monorepo 扫描风险：通过官方 `@tailwindcss/vite`、`@source` 和 fixture app 固化行为。
- 主题膨胀风险：默认主题只覆盖文档核心体验，高级营销页由用户自定义或官方站独立实现。
- SPA 误用风险：CLI、文档和 `check` 同时提示 edge/static 优先。

## 8. 研发顺序

推荐顺序：

1. 仓库骨架和包边界。
2. core 配置和内容模型。
3. MDX 编译和 fixture。
4. SvelteKit route helper。
5. 默认主题基础布局。
6. CLI create/dev/build。
7. Cloudflare edge/static/spa。
8. SEO/OG。
9. 搜索和 Ask AI。
10. 官方站完整文档和首页。

原因：

- 内容模型是主题、搜索、SEO、AI 的共同基础。
- 默认主题必须尽早出现，才能验证内容模型是否足够。
- Cloudflare 和搜索/AI 需要稳定 route/search records 后再接入。
- 官方站应该贯穿开发，但完整设计在基础能力稳定后打磨。
