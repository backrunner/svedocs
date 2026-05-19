# svedocs 能力缺口盘点

更新时间：2026-05-19

## 本轮已补齐的底座能力

- 工程结构：`packages/svedocs/src/core.ts` 已拆成 `src/core/*` 子模块，并通过 `AGENTS.md` 固化模块边界和验证规范。
- 内容 manifest 增强：页面现在包含 `navTitle`、`order`、`hidden`、`collapsed`、链接引用、代码块元数据、section 级搜索记录。
- 导航树增强：支持嵌套 sidebar、目录分组、frontmatter 排序、折叠默认值、基于树顺序的 prev/next。
- Markdown 代码块增强：记录 title、highlight lines、focus lines、diff 标记，并接入 Shiki 生成高亮 HTML。
- 内容检查器增强：`checkSvedocsContent` 支持重复 route/canonical、缺失 description、破损内部链接、破损 anchor、SPA 风险、空搜索记录。
- CLI 增强：`svedocs check` 输出 error/warning，`svedocs index` 支持 JSON/JSONL 和 `--out`，`svedocs og` 可生成每页 SVG OG 资产，`svedocs deploy cloudflare` 支持 dry-run 和 `--write`。
- SEO 基础：页面级 title/description/canonical、Open Graph、Twitter card、JSON-LD、`sitemap.xml`、`robots.txt`。
- 默认主题体验：搜索弹窗、Ask AI 面板、API 优先 Ask AI、本地引用降级、递归 sidebar、折叠导航、代码复制按钮、移动端布局基础。
- Cloudflare：wrangler 配置生成、bindings 类型生成、Cloudflare AI Search provider contract、Cloudflare 模板初版。
- 模板：`minimal`、`docs`、`cloudflare` 都已是完整 SvelteKit 项目骨架。
- Source metadata：页面支持 `lastUpdated` 和 `editUrl`，默认主题展示更新时间和编辑入口。
- OG pipeline：`svedocs og --format svg|png` 支持 SVG 和 PNG 输出，PNG 通过按需 Resvg 渲染，避免把 native renderer 打进站点包。
- Search provider：默认 MiniSearch 本地搜索，另有 Algolia、Typesense 和 Cloudflare AI Search provider；`svedocs index --provider cloudflare-ai-search` 支持 dry-run 和带 Cloudflare 凭据的 REST 上传路径，默认无凭据不发起真实请求。
- Ask AI runtime：`createAskResponse` 支持 JSON/SSE 响应、内存限流、429 错误结构，默认主题可读取 event-stream。
- Svelte-compatible authoring：`.svx/.mdx` 页面可通过 `virtual:svedocs/components` 编译为 Svelte 组件，官方站新增交互式 SVX 文档页。
- MDX/SVX component injection：`svedocs()` Vite plugin 支持 `components` 映射，内容文件可以直接使用注入的 Svelte 组件。
- 代码块显示：默认主题补充行号和 diff 加减行视觉标记。
- Diff metadata：内容编译现在输出 diff row AST、增加/删除计数和 `split` 模式标记，为后续 side-by-side renderer 留出稳定数据结构。
- Diff renderer：默认主题已支持 `diff split` 的 side-by-side 渲染、文件标题、增删统计、复制原始 diff。
- i18n/version 基础：配置支持 `i18n` 和 `versions`，内容加载会识别 locale/version scope，并写入 route、SEO canonical、search metadata 和 prev/next scope。
- MDX/SVX 渲染一致性：Svelte-compatible `.svx/.mdx` 页面现在走同一套代码块增强管线，支持标题、行高亮、Shiki 和 split diff。
- E2E：官方站 Playwright 测试已入仓，覆盖首页、SVX 交互、搜索、Ask AI、主题切换和移动端 sidebar。
- ToC E2E：新增桌面端 ToC active state 与滚动位置绑定测试。
- Cloudflare index sync：支持 append/replace 策略、显式 delete ids、existing ids dry-run 规划、真实 DELETE/POST 执行路径、批处理和重试参数。
- OG template：新增 Satori OG template API；CLI 支持 `--renderer satori --font <path>`。
- 发布校验：根脚本和 package 脚本新增 `pack:dry-run`。
- 工程结构：`mdx` 和 `search` 模块已拆成能力子目录，`packages/cli/src/index.ts` 也抽出了通用命令工具，继续控制单文件复杂度。
- 主题增强：默认主题已支持 command palette、locale/version scope switcher、代码块标题栏、复制按钮、ToC 滚动高亮和移动端导航。
- Layout API：`svedocs()` Vite plugin 已支持 `layouts` 注册，内容 frontmatter 可选择自定义单页布局。
- Cloudflare 绑定校准：AI Search 生成 `ai_search` / `ai_search_namespaces` wrangler 配置，运行时优先使用 `SVEDOCS_AI_SEARCH`，并保留旧 `AI.autorag()` fallback。
- CLI 配置加载：`check/index/og/deploy` 会加载项目 `svedocs.config.*`，再应用命令行覆盖；`check` 支持 `--external-links` 和 `--no-assets`。
- KaTeX 展示：默认主题引入 KaTeX 样式，数学公式不再只有未样式化 HTML。
- 官方站文档：新增 CLI、Theme、Cloudflare、Search/Ask AI、SEO/OG、Public API 文档页，官方站继续作为 live demo。
- 发布检查增强：`checkPackagePublication` 现在检查 `bin`、`exports` 和 `files` 目标。
- 模板 e2e：`SVEDOCS_TEMPLATE_E2E=1 pnpm --filter @svedocs/cli test` 已覆盖 `minimal/docs/cloudflare` create、install、check、build；模板补齐 `@types/node` 和 typed virtual modules。
- Cloudflare 模板本地构建：edge 模式不 prerender 内容/SEO/OG route，避免无账号环境触发 Wrangler remote proxy；static 模式仍 prerender。
- Scope-aware runtime：默认主题的 sidebar、Search、Command Palette 和 Ask AI fallback 已按当前 locale/version scope 工作，`search.scope`/`ai.scope` 可切换为全站搜索。
- i18n SEO：页面现在会为同一 scope、同一版本的本地化页面生成 `hreflang` 和 `x-default` alternate link。
- Local search：本地搜索已升级为 MiniSearch，支持 title/section/path/content/metadata 加权、prefix/fuzzy 查询和 `locale`、`version`、`kind` 过滤。
- Version lifecycle：`versions.items` 支持 `current`、`next`、`deprecated`、`archived` 状态和自定义 banner，默认主题会为废弃/归档版本展示提示。
- Translation governance：`checks.translations` 和 `svedocs check --translations` 可报告 locale/version scope 下缺失的翻译页面。
- CLI project workflow：`@svedocs/cli` 同时提供 `create-svedocs` 和 `svedocs create`，`create-svedocs` 兼容包支持 `npm create svedocs` / `pnpm create svedocs`，模板内置 `svedocs dev/build/ssg/check` 脚本，edge/static/spa 由 CLI 统一通过 `SVEDOCS_BUILD_MODE` 驱动。
- SPA/SSG mode：官方站和模板在 `spa` 模式显式关闭 SSR，在 `static` 模式为动态文档路由提供 prerender entries。
- Provider-aware search UI：默认主题的 SearchDialog 对 `local` 走本地 MiniSearch，对 `cloudflare-ai-search`、`algolia` 和其他非本地 provider 走 `/api/search`，失败时本地降级。
- Hosted search providers：已接入 Algolia Search API 和 Typesense Search API，二者都通过服务端 route 使用，避免在默认主题中嵌入私有 key。
- Ask AI providers：除 mock、Cloudflare AI Search、Workers AI 外，新增 OpenAI-compatible Chat Completions provider，用本地 search records 构造小型 RAG prompt。
- Cloudflare AI Search metadata：索引上传使用 compact metadata，`svedocs` JSON 字段保存展示信息，`locale/version/kind` 保留为过滤字段，避免超过 AI Search 自定义 metadata 字段限制。
- Cloudflare AI Search runtime：运行时使用当前 `ai_search` / `ai_search_namespaces` binding，搜索走 `search()`，Ask AI 优先 `chatCompletions()` 和原生 stream passthrough，旧 `AI.autorag()` 仅作兼容 fallback。
- 主题配置产品化：默认主题支持 `brand`、`social`、`footer`、`home` action/visual 配置，官方站已使用这些配置渲染品牌、社交链接、页脚和首页主操作。
- OG 配置闭环：metadata、动态 OG route、CLI `svedocs og` 和 `svedocs build` 自动 OG 生成都会尊重配置的 `format`、`outDir`、`renderer`；Satori build-time 生成支持用户自定义 template 函数。
- 构建包依赖图修正：默认主题不再从浏览器 bundle 经过 `svedocs/core` 和 `svedocs/search` barrel 拉入 Node-only 模块，客户端构建不再出现 Node API externalized 警告。
- 开源工程文档：新增 `CONTRIBUTING.md` 和 `SECURITY.md`，把贡献验证矩阵、Changesets、secret 处理和安全上报流程落到仓库根目录。
- 交互验证：官方站 Playwright 覆盖桌面/移动首页、SVX 交互、搜索、command palette、Ask AI、theme toggle、移动 sidebar、scope switcher 和 ToC active state。
- 发布准备闭环：publishable packages 已设置 `publishConfig.provenance: true` 和 `access: public`，`checkPackagePublication` 会校验 MIT/license、provenance、bin、exports 和 files；根脚本新增 `release:check`。
- CI 分层：新增 GitHub Actions `verify`、`site-e2e` 和手动 `template-e2e`，把常规 build/check/test/lint/pack、官方站交互测试、模板安装构建烟测分开执行。
- 模板验证产品化：根脚本新增 `test:templates`，已跑通 `minimal/docs/cloudflare` 三套模板 create、临时 tarball 安装、check 和 build。
- OG 文档同步：官方站 SEO/OG 文档中的动态 route 示例已改为 `createConfiguredOgImageFormat` / renderer / template helper，和当前配置闭环保持一致。

## 已产品化但仍需真实环境验证的能力

- Cloudflare：已有 adapter preset、build mode、wrangler/types 生成、Cloudflare 模板、AI Search provider sync 和真实集成测试开关；真实 Pages deploy、binding 创建和远程索引上传仍需要 Cloudflare 项目凭据。
- npm 发布准备：`release:check`、`pack:dry-run`、package export/files/bin/license/provenance 校验、Changesets 配置、贡献文档、安全文档和 CI 分层已具备；真实 npm trusted publishing / token 发布演练仍需在发布前完成。
- Provider streaming：Cloudflare AI Search 已有 provider passthrough stream；后续可继续把所有 provider 的 delta/citation event schema 统一成更严格的协议。
- OG pipeline：已有 SVG/PNG/Satori 生成和动态 SVG route；多模板 DSL 属于后续体验增强，不再阻塞 MVP 可用性。
- i18n/version：已有内容模型、路由、SEO/search metadata、默认主题 switcher、scope-aware sidebar/search/Ask AI、翻译缺失检查和版本归档提示；后续可继续增强翻译工作流和版本迁移报告。

## 当前剩余风险

- Cloudflare 真实部署流水线：需要真实账号验证 Pages project 创建、binding 创建、index upload、preview/deploy 全链路。
- Algolia：provider 使用标准 Search API 查询路径；真实 DocSearch crawler 字段映射需在具体项目中按索引结构配置 filters/hierarchy。
- Cloudflare AI Search：Cloudflare 平台 API 仍在演进，需要在发布节奏中持续跟踪 `ai_search` / `ai_search_namespaces` 和 items REST API 变化。

## 下一批建议

1. 使用真实 Cloudflare 账号跑一遍 `wrangler pages dev`、AI Search binding、`svedocs index` 和 Pages deploy。
2. 在真实发布环境配置 npm trusted publishing，跑一次 canary / dry-run 发布演练。
3. 继续打磨官方站内容，补充更多生产迁移示例和 provider recipes。
