# svedocs 需求文档

更新时间：2026-05-17  
状态：规划基线

## 1. 产品定位

svedocs 是一款基于 SvelteKit 的文档站应用框架，目标是在 Svelte 生态中提供类似 Vocs、Fumadocs、VitePress、Docusaurus 的一站式文档体验。它不是一个单纯的主题，也不是一个只负责 Markdown 编译的插件，而是围绕内容编写、主题渲染、搜索、AI 问答、SEO、部署和官方示例站构建的完整框架。

核心方向：

- Svelte-native：默认使用 Svelte 5、SvelteKit 2 和 Svelte 组件模型，不引入 React MDX runtime。
- Edge-first：默认面向 Cloudflare Pages/Workers 的边缘 SSR 部署，SSG 作为一等能力，SPA 作为显式低优先级模式。
- Content-first：让 Markdown/MDX/Svelte 内容、导航树、ToC、搜索索引和 SEO 元信息共享同一套内容模型。
- Integrated by default：用户安装一个 `svedocs` framework 包即可获得内容编译、默认主题、渲染、SEO、OG、Cloudflare、搜索和 Ask AI 能力；这些能力可配置、可禁用或可通过高级接口扩展，但不拆成用户必须自行拼装的可选渲染包。
- Open and safe：项目以 MIT 许可证开源，不包含私有 token、账号信息、商业密钥或不可再分发资源。

## 2. 目标用户

- Svelte 库作者：需要快速发布 API 文档、指南、示例和版本说明。
- 开源项目维护者：需要低维护成本的文档站、好看的默认主题、良好的 SEO 和部署路径。
- 产品/平台团队：需要把文档部署到 Cloudflare，并接入搜索和 Ask AI。
- 高级 SvelteKit 用户：希望在普通 SvelteKit 应用中嵌入文档、单页、营销首页或自定义工具页。
- svedocs 自身维护者：官方站既是文档，也是最新功能的 live demo 和设计展示。

## 3. 产品原则

- 文档站首先要快：首屏加载、路由切换、导航交互、代码高亮和搜索结果都要保持低延迟。
- 默认设计要克制：页面不能堆满描述文本、badge 或指标；官方首页应现代、简约、有辨识度。
- 用户有逃逸空间：框架应提供默认能力，但不把用户锁死在默认主题、搜索引擎、部署后端或 OG 模板中；逃逸空间通过配置、hooks 和自定义组件提供，而不是要求用户安装一组碎片化包。
- 架构必须可分层：`svedocs` 包内部按内容编译、主题、Cloudflare、搜索、AI、OG 分层实现，外部保持一个 framework 包的使用体验。
- 参考但不复制：可以研究 Fumadocs、VitePress、Docusaurus、Vocs 的架构经验，不搬运代码和视觉样式。

## 4. 功能需求

### 4.1 Monorepo 与包管理

- R-001：项目必须使用 monorepo 管理，默认技术栈为 pnpm workspace、Turbo 和 Changesets。
- R-002：仓库必须保持简洁包结构：`packages/svedocs` 为完整 framework 包，`packages/cli` 为 CLI/创建器包，`packages/create-svedocs` 为 create 命令兼容转发包，`apps/site` 为官方站和 live demo 的私有 workspace package。
- R-003：`svedocs` 和 CLI 两个可发布包必须拥有清晰的 `exports`、类型声明、MIT license metadata 和最小化发布文件列表。
- R-004：官方站 `apps/site` 必须始终使用 workspace 内最新 svedocs 包，作为 live demo。

### 4.2 CLI

- R-010：`packages/cli` 必须提供 `create-svedocs` binary 用于创建新项目；`packages/create-svedocs` 仅可作为 `npm create svedocs` / `pnpm create svedocs` 的兼容转发包，不得复制实现。
- R-011：必须提供 `svedocs dev` 启动 SvelteKit 开发环境并加载 svedocs 内容系统。
- R-012：必须提供 `svedocs build --mode edge|static|spa`，其中 `edge` 为默认推荐模式。
- R-013：必须提供 `svedocs preview`，用于预览构建产物。
- R-014：必须提供 `svedocs deploy cloudflare`，封装 Cloudflare Pages/Workers 推荐部署流程。
- R-015：必须提供 `svedocs index`，生成或同步搜索和 AI 所需的索引数据。
- R-016：必须提供 `svedocs og`，批量生成或验证 OG image。
- R-017：必须提供 `svedocs check`，检查配置、内容、链接、SEO、可访问性基础规则和部署前风险。

### 4.3 样式和主题

- R-020：项目内框架样式必须使用 Tailwind CSS v4，优先使用 `@tailwindcss/vite`。
- R-021：默认主题必须使用 CSS-first token，基于 `@theme`、CSS variables 和 `data-theme` 管理亮暗色。
- R-022：默认主题必须允许用户通过配置快速调整 palette、字体、圆角、代码主题和主页视觉资产。
- R-023：所有主题组件必须在亮色和暗色模式下正常显示，满足基本对比度要求。
- R-024：菜单展开收起、移动端导航、搜索弹窗、ToC 状态变化必须有流畅 transition，并尊重 `prefers-reduced-motion`。
- R-025：UI 不能高度依赖单一色相，不使用大量无意义装饰，不抄袭 Fumadocs 或 Cursor 官网。

### 4.4 构建模式和部署

- R-030：默认构建模式为 Cloudflare edge SSR，使用 `@sveltejs/adapter-cloudflare`。
- R-031：必须支持 SSG，使用 `@sveltejs/adapter-static` 和 SvelteKit prerender 能力。
- R-032：必须支持 SPA 打包，但 CLI 和文档必须明确标注“不推荐”，并提示 SEO、首屏、边缘能力损失。
- R-033：必须原生支持部署到 Cloudflare Pages/Workers，并提供 wrangler 配置、bindings 类型和部署检查。
- R-034：Cloudflare 绑定必须通过 SvelteKit `event.platform` 访问，不要求用户在内容层直接接触运行时细节。

### 4.5 内容系统

- R-040：必须原生支持 `.md`、`.mdx`、`.svx` 内容。
- R-041：MDX 定义为 Svelte-compatible MDX authoring，允许 Markdown 中使用 Svelte 组件，不使用 React runtime。
- R-042：必须内置支持 frontmatter、GFM、KaTeX、代码高亮、代码标题、行高亮、focus、copy button 和 diff code block；这些属于 svedocs 基础渲染能力，不作为独立可选包发布。
- R-043：代码高亮默认使用 Shiki，并提供主题与 transformer 扩展点。
- R-044：diff 渲染优先参考 diffs.com 的 `@pierre/diffs` 能力；若无法直接用于 Svelte，必须通过 adapter 或降级渲染保持 API 稳定。
- R-045：内容编译必须输出 page tree、route manifest、ToC、heading anchors、search records、structured data 和链接关系。
- R-046：内容系统必须支持用户自定义页面组件、布局、局部组件映射和 remark/rehype 插件扩展。

### 4.6 文档页、单页和首页

- R-050：必须支持标准文档页渲染，包括 sidebar、breadcrumb、正文、ToC、前后页导航和编辑链接。
- R-051：必须支持用户自定义单页，例如 landing page、changelog、showcase、pricing、terms。
- R-052：必须像 VitePress 一样提供默认单页模板和默认风格，但内容密度要克制，设计必须现代简约。
- R-053：官方站必须和文档站在同一个 monorepo 内，使用 svedocs 最新功能构建。
- R-054：官方站首页必须采用原创像素风格、模块化 UI 和抽象艺术模式，用于表达 svedocs 的品牌辨识度。

### 4.7 导航和 ToC

- R-060：sidebar 必须支持多层级目录、分组、折叠状态、活动项高亮和键盘可访问性。
- R-061：ToC 高亮必须与滚动位置实时绑定，基于 IntersectionObserver 或等价机制实现。
- R-062：导航树必须来自内容模型和用户配置，不允许主题自行扫描文件系统。
- R-063：路由切换时必须保持合理滚动恢复、hash anchor 定位和活动状态同步。

### 4.8 搜索和 Ask AI

- R-070：必须在 `svedocs` 包内置搜索引擎集成接口，默认启用本地搜索，并优先提供 Cloudflare AI Search 生产集成。
- R-071：必须在 `svedocs` 包内置 Ask AI 能力；Cloudflare AI Search、Workers AI 和 Cloudflare 运行时能力是首选生产路径，但不能在默认项目中强制启用。
- R-072：搜索索引必须来自编译后的结构化内容，包含标题、正文摘要、section anchor、metadata 和权限扩展字段。
- R-073：搜索与 AI 必须可关闭，关闭后不能影响普通文档站构建。
- R-074：搜索/AI provider 必须在 `svedocs` 包内部通过稳定接口扩展；首版内置本地搜索、Algolia、Typesense、Cloudflare AI Search、Workers AI 和 OpenAI-compatible provider，并为未来接入 Vectorize、自建 RAG、Pagefind、Meilisearch、Trieve 或 Orama Cloud 保留能力；首版不拆独立 provider 包。

### 4.9 SEO 和 OG image

- R-080：必须支持全局站点 metadata、页面 frontmatter metadata 和运行时/构建时合并策略。
- R-081：必须生成 canonical、Open Graph、Twitter card、JSON-LD、sitemap 和 robots 相关输出。
- R-082：必须支持自定义 OG image 模板，默认优先构建期批量生成。
- R-083：必须允许用户针对页面覆盖标题、描述、图片、类型、作者、发布时间和更新时间。
- R-084：必须在 `svedocs check` 中检查缺失 title、重复 canonical、破损内部链接和空描述。

### 4.10 开源安全

- R-090：项目必须使用 MIT License。
- R-091：仓库必须提供 `.dev.vars.example` 或等价示例文件，但不能提交真实 token、账号、密钥或私有 endpoint。
- R-092：自动生成文件必须避免包含本地绝对路径、机器名、用户账号和内部环境变量。
- R-093：所有第三方依赖必须检查 license 兼容性，不引入不可开源再分发资源。

## 5. 非功能需求

- 性能：文档页面应尽量减少客户端 JS，主题交互按需增强；搜索和 Ask AI 不应阻塞文档首屏。
- 可访问性：导航、搜索、移动菜单、代码块按钮、主题切换必须可键盘操作并具备清晰 focus 状态。
- 兼容性：优先支持现代浏览器和 Cloudflare Workers runtime；Node 版本以当前活跃 LTS 及以上为基线。
- 可测试性：核心内容处理必须可通过 fixture 测试，不依赖真实 Cloudflare 账号。
- 可维护性：`svedocs` 包内部模块必须保持低耦合；Cloudflare 集成不能污染本地 SSG/SPA 构建；CLI 仅编排，不承载业务逻辑。
- 国际化预留：首版可以不实现完整 i18n，但 slug、metadata、导航和搜索记录模型必须预留 locale 字段。

## 6. 明确不做

- v1 前不提供托管 SaaS 后台。
- v1 前不实现完整 CMS。
- 不提供 React MDX runtime。
- 不把 SPA 作为推荐部署方式。
- 不复制 Fumadocs、Cursor、VitePress 或 Docusaurus 的视觉设计和源码实现。
- 不默认收集用户 analytics；如未来提供集成，必须显式启用。

## 7. 原始需求覆盖矩阵

| 原始需求 | 覆盖位置 |
| --- | --- |
| 1. monorepo、framework 包、CLI | R-001 到 R-004，模块设计第 2 节 |
| 2. CLI 创建、编译 | R-010 到 R-017，模块设计第 11 节 |
| 3. TailwindCSS v4 | R-020 到 R-025，模块设计第 6 节 |
| 4. Cloudflare Pages | R-030、R-033、R-034，模块设计第 8 节 |
| 5. SSG、SSR、SPA | R-030 到 R-032，研发方案 Phase 4 |
| 6. MDX、KaTeX、GFM | R-040 到 R-046，研发方案 Phase 2 |
| 7. 代码高亮和 diff | R-042 到 R-044，模块设计第 5 节 |
| 8. 主题和主页定制 | R-020 到 R-025、R-050 到 R-054 |
| 9. 搜索和 RAG/Ask AI | R-070 到 R-074，模块设计第 9 节 |
| 10. SEO 和 OG image | R-080 到 R-084，模块设计第 10 节 |
| 11. 单页和默认模板 | R-050 到 R-054 |
| 12. 动画和 ToC 高亮 | R-024、R-060 到 R-063 |
| 13. 亮暗色 | R-021、R-023 |
| 14. MIT 和开源安全 | R-090 到 R-093 |
| 15. 最新依赖 | 研发方案第 1 节依赖快照和实施时规则 |

## 8. 成功标准

### MVP 成功标准

- 能通过 `create-svedocs` 创建项目，并在本地运行一个带默认主题的文档站。
- 能编写 `.md/.mdx/.svx` 页面，渲染 GFM、KaTeX、Shiki 代码高亮和基础 diff block。
- 能在 Cloudflare edge SSR 与 SSG 两种模式下成功构建。
- 默认主题具备 sidebar、移动菜单、ToC 高亮、亮暗色、搜索入口和基础 SEO。
- 官方站 `apps/site` 能用 workspace 包构建，展示原创首页和核心文档。

### v1 成功标准

- CLI、核心内容系统、默认主题、Cloudflare 部署、搜索/Ask AI、SEO/OG 都有稳定公开 API。
- 文档站在真实 Cloudflare Pages/Workers 环境中完成端到端验证。
- 官方站成为最新功能 live demo，且能作为用户学习 svedocs 的主要入口。
- `svedocs` framework 包具备单元测试、fixture 编译测试、CLI e2e 和 Playwright UI 测试。
- 发布流程可复现，包体、license、exports、类型声明和安全检查通过。

## 9. 参考资料

- SvelteKit Cloudflare adapter：https://svelte.dev/docs/kit/adapter-cloudflare
- SvelteKit SPA/SSG：https://svelte.dev/docs/kit/single-page-apps
- Cloudflare SvelteKit guide：https://developers.cloudflare.com/workers/framework-guides/web-apps/sveltekit/
- Cloudflare AI Search：https://developers.cloudflare.com/ai-search/
- Tailwind CSS v4 Vite plugin：https://tailwindcss.com/docs/installation/using-vite
- MDsveX：https://mdsvex.com/
- Shiki transformers：https://shiki.style/packages/transformers
- Diffs：https://diffs.com/docs
- Fumadocs：https://fumadocs.dev/
- VitePress：https://vitepress.dev/
