---
title: 统计、广告与 IndexNow
description: 通过配置启用 Umami、GA4、Google Ads、AdSense 和 IndexNow。
order: 5
---

# 统计、广告与 IndexNow

这些集成默认全部关闭。使用 `DocsApp` 的站点（包括所有生成模板）只需修改 `svedocs.config.ts`，无需编写脚本标签、页面事件、API 路由或安装额外依赖。

## 配置集成

```ts title="svedocs.config.ts"
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: { url: 'https://docs.example.com' },
  integrations: {
    umami: {
      websiteId: 'your-website-id',
      // 不设置 src 时使用 Umami Cloud；自托管时填入自己的脚本地址。
      src: 'https://analytics.example.com/script.js'
    },
    googleAnalytics: { id: 'G-XXXXXXXXXX' },
    googleAds: {
      id: 'AW-123456789',
      conversions: {
        signup: { label: 'YOUR_CONVERSION_LABEL', path: '/thanks' }
      }
    },
    googleAdsense: {
      client: 'ca-pub-1234567890123456',
      slots: {
        article: { slot: '1234567890', format: 'auto', minHeight: 120 }
      },
      placements: { articleBottom: 'article' }
    },
    indexNow: { key: 'replace-with-your-indexnow-key' }
  }
});
```

仅保留需要的服务，并替换示例 ID。把任意服务或整个 `integrations` 设置为 `false` 即可关闭。这些 ID 与 IndexNow 验证 key 是公开值，不是服务账户的 API 密钥。

| 设置 | 默认值 | 行为 |
| --- | --- | --- |
| `development` | `false` | 设为 `true` 才会在开发服务器加载第三方脚本。 |
| `respectDoNotTrack` | `true` | 浏览器启用 Do Not Track 时，停止统计、转化与广告。 |
| `umami.src` | Umami Cloud 脚本 | 可改为自托管的 HTTP(S) 脚本地址。 |
| `umami.domains` | `[]` | 可选的跟踪域名列表；空列表允许全部域名。 |
| `googleAdsense.autoAds` | `false` | 没有广告位的页面也加载 AdSense；还需在 AdSense 后台启用自动广告。 |
| `googleAdsense.adsTxt` | `true` | 自动生成 `ads.txt` 卖方记录。已有的 `static/ads.txt` 优先。 |
| `indexNow.endpoint` | `https://api.indexnow.org/indexnow` | HTTPS 提交地址。 |

生产预览按生产环境运行，本地验证应使用测试 ID。需要征求同意的站点，应在启用统计或广告前配置服务商的同意管理平台；Do Not Track 不等于同意弹窗。

## 页面统计与转化

Umami 和 GA4 自动统计首次加载与 SvelteKit 客户端导航，包括前进和后退。每份页面文档只加载一份服务脚本。仅 hash 变化不会重复统计，查询参数变化会产生新的浏览记录。统计使用浏览器当前 URL 和页面标题。

请在 GA4 网页数据流的「增强型衡量 → 网页浏览 → 高级设置」中关闭**基于浏览器历史记录事件的网页更改**。svedocs 使用 `send_page_view: false` 并自行发送浏览记录；保留 GA4 的历史记录自动统计可能造成重复。GA4 和 Google Ads 共用一份 Google tag 脚本。

Google Ads（`AW-…`）用于转化追踪。配置了 `path` 的转化会在进入对应页面时触发，忽略末尾斜杠。仅改变查询参数或 hash 不会重复转化；离开该页面再返回，或重新加载页面，会视为新的访问。路径是精确匹配，不支持通配符；多语言页面应写入语言前缀。可选的数值 `value` 必须同时提供三位币种代码 `currency`，例如 `USD`。购买转化应在确认成功的组件中携带交易 ID，不应把普通页面访问当作购买成功。

AdSense（`ca-pub-…`）用于展示广告。先在 AdSense 中创建广告单元并完成站点审批。`articleTop` 和 `articleBottom` 会把命名广告位插入默认文章正文的上方或下方。广告位支持 `format`、`responsive`（默认 `true`）和以像素表示的 `minHeight`。实际展示与广告填充由 Google 决定。只要加载了 AdSense 脚本，后台的自动广告设置就会生效，包括使用手动广告位的页面。

## 主题组件

自定义主题可从 `svedocs/theme` 导入组件：

```svelte
<script lang="ts">
  import { GoogleAd, GoogleAdsConversion, useSvedocsTheme } from 'svedocs/theme';
  const theme = useSvedocsTheme();
</script>

<GoogleAd
  config={$theme.config}
  name="article"
  routeKey={$theme.page?.routePath ?? ''}
  label="广告"
/>
```

`name` 对应配置中的广告位名，`routeKey` 在导航后创建新的广告元素。仅在目标动作确认成功时挂载转化组件：

```svelte
<GoogleAdsConversion
  config={$theme.config}
  name="signup"
  transactionId="unique-confirmed-transaction-id"
/>
```

该组件每次挂载触发一次。使用组件时，应省略对应转化的 `path`，避免路由自动转化重复触发。事件处理函数可使用 `svedocs/integrations` 导出的 `trackGoogleAdsConversion(config.integrations, name, development, transactionId)`；`development` 传入 SvelteKit 的 `dev`。

不使用 `DocsApp` 的主题可以在布局里挂载一次 `<Integrations {config} />`。使用 `DocsApp` 的主题已经自动接入，包括自定义首页和页面布局。所有组件在 SSR 期间都不会请求第三方服务。

## 部署后通知 IndexNow

选择由 8–128 位字母、数字或连字符组成的 key，并把 `site.url` 设置为部署后的公开站点源地址。Vite 插件会在开发环境提供 `/<key>.txt`，并在 **edge、static 和 SPA 构建**中把它输出为客户端静态资源。配置 AdSense 时也会生成 `ads.txt`，无需自己创建文件或路由。

`static/` 中已有的验证文件必须包含配置中的 key，否则构建会报冲突错误。已有的 `static/ads.txt` 会原样保留；如果自行维护该文件，应把自己的 AdSense 卖方记录加入其中。

部署完成后运行：

```sh
pnpm exec svedocs indexnow --dry-run
pnpm exec svedocs indexnow
```

命令读取项目配置，先验证线上 key 文件，再提交当前内容清单中可发现、同源的 canonical URL。隐藏页面、`noindex` 页面、指向外站的 canonical 和重复 URL 不会提交。每批最多 10,000 个 URL。HTTP 200 或 202 表示已接受，不保证最终收录；请求失败时命令以非零状态退出。

如果部署时覆盖了配置中的构建模式，提交时使用相同模式，让 URL 末尾斜杠保持一致：

```sh
pnpm exec svedocs indexnow --config svedocs.config.ts --mode static
```

可把命令放在 CI 的生产部署步骤之后。构建、预览和浏览页面不会自行发起提交。基础命令提交当前内容清单，不追踪已删除页面或增量部署历史。自定义部署工具可调用 `svedocs/integrations` 中的 `createIndexNowPayloads` 或 `submitIndexNow`。
