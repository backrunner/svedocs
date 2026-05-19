# svedocs Roadmap

更新时间：2026-05-17  
状态：规划基线

## 1. 路线图原则

- 先把文档站最核心的阅读、构建、部署体验做好，再扩展 AI 和生态。
- 每个阶段都要让 `apps/site` 使用最新能力，官方站不能脱离框架本身。
- 不为了追求功能数量牺牲 SvelteKit 原生体验和可维护性。
- Cloudflare 是默认优先路径，但 provider 扩展通过 `svedocs` 包内部接口完成，不拆成用户必须安装的独立包。
- v1 前允许快速迭代，v1 后公开 API 遵循 semver。

## 2. M0：Foundation

目标：建立可维护的开源工程基础。

交付：

- pnpm + Turbo + Changesets monorepo。
- MIT License、README、CONTRIBUTING、SECURITY、`.dev.vars.example`。
- `svedocs` framework 包、`@svedocs/cli` CLI 包、`create-svedocs` create 兼容入口包、`apps/site` 官方站。
- TypeScript strict、Vitest、Playwright、基础 CI 脚本。
- `.agents` 规划文档保持为项目决策来源。

退出标准：

- 空实现可全量 build/test。
- 包边界清晰，无循环依赖。
- 发布 dry-run 不包含敏感文件。

## 3. M1：MVP Docs Engine

目标：用户可以创建和运行一个基础 svedocs 文档站。

交付：

- `create-svedocs` minimal/docs 模板。
- `svedocs dev` 和 `svedocs build --mode edge`。
- 配置 schema 和 `svedocs.config.ts`。
- `.md/.mdx/.svx` 内容发现、frontmatter、slug、route manifest。
- page tree、prev/next、heading anchors、ToC 数据。
- 默认主题基础布局：sidebar、topbar、content、ToC、移动菜单、亮暗色。
- GFM、KaTeX、Shiki 基础代码高亮。

退出标准：

- 新项目创建后 5 分钟内能看到文档站。
- 官方站开始使用 svedocs 渲染自身文档。
- 基础 fixture 测试覆盖内容编译。

## 4. M2：Build and Deploy Alpha

目标：完成 edge、static、spa 三种模式和 Cloudflare 优先部署体验。

交付：

- `svedocs build --mode edge|static|spa`。
- `svedocs preview`。
- `svedocs deploy cloudflare` dry-run 和推荐配置。
- Cloudflare Pages/Workers adapter preset。
- bindings 类型示例。
- SPA 模式风险提示。
- SEO 基础：title、description、canonical、sitemap、robots。

退出标准：

- 官方站可部署到 Cloudflare edge。
- static 模式可部署纯静态文档站。
- spa 模式可构建但有明确警告。
- Cloudflare 部署文档可复现。

## 5. M3：Theme and Content Beta

目标：默认主题达到公开可用质量，内容能力覆盖常见文档场景。

交付：

- 默认主题完整交互：sidebar 折叠、移动导航、搜索入口、ToC 实时高亮。
- 代码块增强：标题、复制、行号、行高亮、focus、diff block。
- diff 渲染 adapter 或可靠降级渲染。
- 单页默认模板：home、landing、custom page。
- theme palette、code theme、字体、圆角等配置。
- JSON-LD 和 OG metadata 合并。
- `svedocs check` 初版。

退出标准：

- Playwright 覆盖桌面、移动端、亮暗色、ToC 和菜单交互。
- 默认主题可以支撑真实开源项目文档。
- 官方站首页完成原创像素抽象模块化设计第一版。

## 6. M4：Search and Ask AI

目标：提供 Cloudflare 原生搜索和 Ask AI 能力。

交付：

- search provider contract。
- 本地 JSON search provider。
- Cloudflare AI Search adapter。
- `svedocs index`。
- Ask AI provider contract。
- Cloudflare Ask AI endpoint 和 UI。
- 引用来源、相关文档链接、错误/限流状态。
- provider 关闭和降级策略。

退出标准：

- 无 Cloudflare token 时本地开发可用。
- 有 Cloudflare 配置时官方站能使用 AI Search。
- Ask AI 返回答案和引用来源。
- search/AI 不影响普通文档构建。

## 7. M5：SEO, OG and Release Candidate

目标：补齐发布前的专业文档站能力。

交付：

- Satori + Resvg 默认 OG image。
- `svedocs og`。
- SEO 检查：缺失 metadata、重复 canonical、破损链接。
- package exports 和类型声明稳定。
- 用户文档完善：安装、配置、内容、主题、部署、搜索、AI、SEO、API、迁移。
- migration notes 和 examples。

退出标准：

- 官方站 `svedocs check` 通过。
- npm package dry-run 通过。
- 公开 API 列表冻结，准备 v1。
- 至少一个真实外部项目试用反馈完成修复。

## 8. M6：v1 Stable

目标：发布可作为 Svelte 生态基础设施使用的稳定版本。

交付：

- `svedocs` framework 包、`@svedocs/cli` CLI 包和 `create-svedocs` 兼容入口包 v1。
- `svedocs` 包内置内容编译、默认主题、Cloudflare、Search/AI、SEO/OG，并通过 subpath exports 暴露稳定 API。
- semver 和 migration policy。
- 官方站稳定部署。
- 示例项目：开源库文档、产品文档、API 文档、AI 搜索文档站。
- 稳定测试矩阵和 release checklist。

退出标准：

- v1 发布到 npm。
- 官方站展示完整 live demo。
- 文档覆盖主要 API 和扩展点。
- 用户可以在不阅读源码的情况下完成创建、部署、主题定制和搜索/AI 接入。

## 9. Post-v1：生态扩展

方向：

- i18n：多语言路由、locale-aware search、翻译状态。
- 版本化文档：多版本 docs、版本切换、旧版本归档。
- 插件系统：内容插件、主题插件、provider 插件。
- 更多搜索后端：Pagefind、Algolia、Meilisearch、Typesense。
- 自建 RAG：Vectorize + Workers AI + R2/D1。
- API 文档生成：TypeDoc、OpenAPI、GraphQL schema。
- 组件预览：Svelte component playground、live code examples。
- 企业能力：私有内容权限、审计、内部文档搜索。

## 10. 当前优先级

立即优先：

1. 仓库骨架。
2. core 配置和内容模型。
3. MDX 编译 fixture。
4. 默认主题基础布局。
5. Cloudflare edge build。

暂缓：

- 完整 i18n。
- 多版本文档。
- 企业权限。
- 非 Cloudflare 搜索后端。
- 动态 edge OG image。

## 11. 里程碑衡量

开发者体验：

- 从空目录到本地文档站：小于 5 分钟。
- 从内容修改到页面更新：HMR 级体验。
- 常见错误能显示明确修复建议。

站点质量：

- 默认主题桌面和移动端无布局溢出。
- 亮暗色都满足基础对比度。
- ToC 和 sidebar 状态准确。
- 搜索和 Ask AI 不阻塞首屏。

工程质量：

- `svedocs` 包内部 core/theme/mdx/cloudflare/search/ai/og 关键路径有测试覆盖。
- fixture 防止内容编译回归。
- 发布包体可控。
- 没有 secret 或不可开源资源。
