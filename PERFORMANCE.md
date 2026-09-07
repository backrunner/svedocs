# 性能优化验证

2026-09-07，基于 `498e180` 对比工作区实现。环境为 Apple M4、macOS arm64、Node 26.5.0、pnpm 11.11.0、Chromium 148.0.7778.96；浏览器使用本地 static 生产预览。

## 结果

官网正常页和 404 页在打开搜索前均不请求搜索记录、MiniSearch 或搜索 Worker。搜索记录约 **491.2 KiB（gzip 86.6 KiB）**，现在延后到实际需要本地搜索时加载；MiniSearch 主线程回退模块约 19.9 KiB（gzip 6.7 KiB），正常 Worker 路径无需下载它。

官网真实界面首次搜索未观察到超过 50 ms 的主线程长任务。下表使用相同记录和查询对比旧版同步实现与新 Worker；时间单位为 ms。

| 记录数 | 旧版首次结果 | Worker 首次结果 | 旧版后续中位数 / p95 | Worker 后续中位数 / p95 | 旧版最长主线程任务 | Worker 主线程长任务数 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 328 | 104.6 | 106.8 | 0.75 / 1.3 | 0.7 / 1.6 | 104 | 0 |
| 5,000 | 1,454.2 | 1,477.3 | 3.15 / 4.3 | 2.7 / 4.3 | 1,454 | 0 |
| 20,000 | 6,308.8 | 6,536.8 | 11.0 / 16.2 | 11.05 / 16.8 | 6,309 | 0 |

Worker 的主要收益是让输入和页面保持响应。运行时首次建索引仍需等待，20,000 条记录约需 6.54 秒；后续查询速度基本相当。Worker 内连续建索引，主线程故障回退才按约 8 ms 时间片让出执行。移除 Worker 内多余让步后，20,000 条记录的首次等待从本轮试验的约 10.53 秒降至 6.54 秒。

| 内容加载，44 页 / 328 条搜索记录 | 三次测量中位数 |
| --- | ---: |
| 旧版全量加载 | 1,382.9 ms |
| 新版全量加载 | 752.1 ms |
| 新版普通单页编辑 | 9.0 ms |

三次单页编辑均只重新编译 **1 页**。新旧全量 manifest 深比较一致，每次增量结果也与独立全量加载一致，比较包含 HTML、标题、目录、搜索记录、链接行号、导航和问题列表。33 组英文、中文、混合文本、重音字符及语言范围的搜索结果比较全部一致，包括顺序、分数和摘要。

内容测量关闭图片优化和外链检查，并预热后交替执行三次旧版/新版加载；9 ms 只包含内容加载及全站组装，不包含文件事件合并和浏览器重新加载。共享开发机存在调度波动：本会话其他测量的旧版/新版全量中位数约为 674/502 ms、758/528 ms。不要把单次比例当作稳定的线上收益。

规模测试以官网记录重复生成唯一 ID，属于合成数据；每档测一次首次结果和 20 次后续查询。Worker 首次时间包含启动、分批传输记录和建索引，记录已在内存中，Worker 脚本可能命中浏览器缓存；不包含真实网络下搜索数据的下载耗时。浏览器未做 CPU 限速。完整原始值由脚本写入 `artifacts/performance.json`。

## 实现边界

- 官网和三个模板的根错误页使用现有搜索加载器；远程搜索成功时不加载本地记录或执行本地排名。
- 默认主题通过内部异步适配器使用 Worker，同一记录数组共享索引。初始化期间合并输入，查询序号和数据源生命周期隔离过期结果；关闭、切换数据源、卸载时释放引用，最后一个引用退出后终止 Worker。启动失败、超时或运行错误会回退到懒加载的主线程实现。
- 公开 `searchRecords()` 和 headless 搜索控制器保持同步语义；控制器只新增可选 `destroy()`。公开页面字段和配置不变。
- 原始 Markdown AST 复用于标题和链接，正文 AST 复用于目录、纯文本和分节；渲染插件使用独立树。默认单页流水线最多三次解析。
- Vite 插件实例持有独立页面与组件缓存。正文编辑复用其他页面，全站导航、搜索和检查仍重新组装。路由或配置变化保守失效；自定义 Markdown/Shiki 插件保持全量刷新。追踪本地图片以及尚不存在的候选路径。
- 连续文件事件合并并串行处理，只使生成代码实际变化的虚拟模块失效。**内容更新后浏览器整页刷新**，确保正文、目录、页面数据与 markdown twin 切换到同一版本；这不保留当前页面的交互状态。缓存编译收益仍然保留。

## 验证与复现

已通过框架检查、构建及 185 项测试（1 项条件跳过），CLI 检查/测试/构建，官网 edge/static/spa 构建，`pnpm release:check`，以及三个生成模板的安装、检查和构建冒烟测试（34 项）。生产浏览器套件通过 15 项，开发内容刷新另行验证新增、编辑、连续保存、重命名和删除，并检查服务端 HTML 与 markdown twin。

专项测试还覆盖跨页锚点、缓存导航隔离、slug 和配置变化、自定义插件、图片出现/替换/删除、组件缓存、刷新失败重试、初始化期间切换数据源、Worker 超时/不可用/运行失败、远程搜索回退、Ask AI 取消及语言过滤。

```sh
pnpm --filter svedocs build
SVEDOCS_BUILD_MODE=static pnpm --filter @svedocs/site build
# 在另一个终端启动并保持预览运行：
cd apps/site
SVEDOCS_BUILD_MODE=static pnpm exec vite preview --host ::1 --port 4187
```

从仓库根目录运行测量：

```sh
SVEDOCS_BENCH_REF=498e180 node scripts/benchmark-performance.mjs --url 'http://[::1]:4187'
```

不传 `--url` 时只运行内容及搜索结果一致性比较。脚本从指定 Git 提交生成临时参考实现，不修改工作区源码；执行完成后清理临时文件。测量时应避免同时运行构建或测试。

```sh
# 生产懒加载、Worker 和完整交互套件
SVEDOCS_BUILD_MODE=static SVEDOCS_E2E_PREVIEW=1 SVEDOCS_E2E_HOST=::1 pnpm --filter @svedocs/site test:e2e
# 文件更新测试会临时写入官网内容，须单独运行
SVEDOCS_BUILD_MODE=static SVEDOCS_E2E_HMR=1 SVEDOCS_E2E_HOST=::1 pnpm --filter @svedocs/site exec playwright test e2e/hmr.spec.ts --workers=1
```

本地 Cloudflare 模板构建曾因回环端口耗尽报 `EADDRNOTAVAIL`，单独重试后 34 项全部通过。浏览器测量使用 IPv6 回环避免该环境干扰，没有执行真实 Cloudflare 部署。

## SSR 与 SSG 补充验证

普通 Markdown 已在 Vite 阶段编译为 HTML，生产 SSR 直接输出 `page.html`；MDX/SVX 使用构建后的 Svelte 组件。生产请求不存在重复的 Markdown 解析。SSR CPU 采样中，整页响应的 ETag 哈希占用了较多时间。

新增 `svedocs/cloudflare` 的 `createSvedocsHtmlCacheHandle`，官网只对默认布局的纯 Markdown 文档显式启用。它在当前 handle/isolate 内复用公开页面 HTML，默认有效期 60 秒、128 项、8 MiB 正文总量、单页 512 KiB。新部署从空缓存开始，开发、预渲染、static 和 SPA 路径不复用此缓存。Cookie、认证、查询参数等请求以及私有、带 Cookie、Vary、nonce CSP 等响应绕过缓存；超大正文和未及时结束的流也不缓存。完整接入示例和限制见官网中英文 Cloudflare 文档。

本地生产 SvelteKit Server，对 `/docs/configuration` 预热后交替测量 200 次绕过缓存和 200 次命中缓存：

| 热请求 | 中位数 | p95 |
| --- | ---: | ---: |
| 绕过 HTML 缓存 | 0.521 ms | 0.725 ms |
| 命中 HTML 缓存 | 0.091 ms | 0.141 ms |

此处约为 5.7 倍的本地热请求加速，不包含网络、Cloudflare isolate 冷启动或缓存未命中的首次请求。逐次比较完整 HTML 相同，并检查 Agent Markdown 与浏览器 HTML 隔离、HEAD 和 ETag 304。原始值位于 `artifacts/ssr-verification.json`。

同时修复了一个构建模式不一致问题：`virtual:svedocs/server-config` 从项目文件重新加载配置时，现在明确应用本次构建的有效 mode，避免 CLI 的 static/SPA 覆盖在服务端配置中丢失，同时保留配置中的运行时函数。

SSG 使用独立文件服务器验证，关闭 JavaScript，没有 SvelteKit SSR 回退：检查全部 44 页 HTML、44 份 Markdown twin、章节锚点、canonical 和 JS/CSS 文件引用，以及 sitemap、robots、llms、RSS 和未知地址的 404。详细计数位于 `artifacts/static-verification.json`。模板冒烟进一步执行真正的 `svedocs ssg`，覆盖重复标题、数学和代码块；第二次构建修改首页并删除文档，断言新内容生效且旧页面文件消失。缺失翻译的静态重定向也在 docs/cloudflare 模板中验证。

SSR 浏览器测试直接运行生产 SvelteKit Server，不注入 Cloudflare 远程绑定；这样“无绑定回退”测试不会误用本地代理暴露的不可用 AI Search 绑定。缓存单元测试还覆盖并发、条目过期、容量淘汰、响应隔离、Cookie 在渲染期间设置、流读取超时和失败重试。该轮框架测试 195 项通过，1 项条件跳过。

```sh
pnpm --filter svedocs build
SVEDOCS_BUILD_MODE=edge pnpm --filter @svedocs/site build
node scripts/verify-rendering.mjs --ssr
SVEDOCS_BUILD_MODE=edge SVEDOCS_E2E_PREVIEW=1 SVEDOCS_E2E_HOST=::1 pnpm --filter @svedocs/site test:e2e
SVEDOCS_BUILD_MODE=static pnpm --filter @svedocs/site build
node scripts/verify-rendering.mjs --static
pnpm test:templates
```
