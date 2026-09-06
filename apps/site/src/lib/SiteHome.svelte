<script lang="ts">
  import { RootLayout } from 'svedocs/theme';
  import { resolveLocalizedHref } from 'svedocs/theme/headless';
  import type { SvedocsCustomLayoutProps } from 'svedocs/theme/types';

  let { page, config, context, pages = [], tree = [], search = [], loadSearch, themeComponents = {} }: SvedocsCustomLayoutProps = $props();
  const zh = $derived(context.localeCode === 'zh');
  const href = (path: string) => resolveLocalizedHref(path, context);
  const sections = $derived(zh ? [
    ['写文档', 'Markdown 负责正文，Svelte 组件负责交互。目录、侧栏和上一页/下一页从内容生成。', '/docs/writing'],
    ['改成你的样子', '调整颜色和字体，替换导航或文章组件，也可以用自己的 Svelte 页面布局。', '/docs/configuration/theme'],
    ['部署站点', '默认使用 Cloudflare SSR，也能输出静态文件。搜索可以先使用本地索引。', '/docs/integrations/cloudflare']
  ] : [
    ['Write your docs', 'Markdown for articles, Svelte components for interactive examples. Navigation and the table of contents come from your content.', '/docs/writing'],
    ['Make it yours', 'Set colors and fonts, replace a navigation or article component, or bring your own Svelte page layout.', '/docs/configuration/theme'],
    ['Ship the site', 'Use Cloudflare SSR or build static files for your host. Start with the built-in local search index.', '/docs/integrations/cloudflare']
  ]);
</script>

<RootLayout {config} {page} {pages} {tree} {search} {loadSearch} {themeComponents}>
  <main id="content" class="site-home">
    <section class="intro">
      <div>
        <p class="eyebrow">svedocs · SvelteKit</p>
        <h1>{zh ? '用 Svelte 写你的文档站。' : 'Your docs, built with Svelte.'}</h1>
        <p class="description">{page.description}</p>
        <div class="links">
          <a class="start" href={href('/docs')}>{context.t('home.primaryAction')} <span aria-hidden="true">→</span></a>
          <a href="https://github.com/backrunner/svedocs">GitHub</a>
        </div>
        <p class="note">{zh ? '开源 · MIT 许可 · 当前处于 beta 阶段' : 'Open source · MIT licensed · Currently in beta'}</p>
      </div>
      <aside aria-label={zh ? '创建项目' : 'Create a project'}>
        <div class="file-label">{zh ? '从一个项目开始' : 'Start with a project'}</div>
        <pre><code>pnpm create svedocs my-docs
cd my-docs
pnpm install
pnpm dev</code></pre>
        <div class="file-label">content/docs/index.md</div>
        <pre class="example"><code>{`---\ntitle: ${zh ? '快速开始' : 'Quick start'}\n---\n\n## ${zh ? '安装' : 'Install'}\n\npnpm add your-package`}</code></pre>
      </aside>
    </section>

    <section class="reading" aria-label={context.t('home.features')}>
      <h2>{zh ? '接下来做什么' : 'Where to go next'}</h2>
      {#each sections as [title, description, path]}
        <a class="reading-row" href={href(path!)}>
          <h3>{title}</h3>
          <p>{description}</p>
          <span aria-hidden="true">↗</span>
        </a>
      {/each}
    </section>

    <section class="examples">
      <h2>{zh ? '这个站点也是一个示例' : 'This site is an example, too'}</h2>
      <p>{zh ? '主站直接使用仓库中的 svedocs。可以查看组件示例，也可以从源码复制这页的布局。' : 'The site runs on the workspace version of svedocs. Try a component example or use this page’s layout as a starting point.'}</p>
      <div class="links">
        <a href={href('/docs/writing/components')}>{zh ? '交互组件示例' : 'Component examples'} →</a>
        <a href={href('/theme-preview')}>{zh ? '主题预览' : 'Theme preview'} →</a>
        <a href="https://github.com/backrunner/svedocs/tree/main/apps/site">{zh ? '主站源码' : 'Site source'} ↗</a>
      </div>
    </section>
  </main>
</RootLayout>

<style>
  .site-home { max-width: 1120px; margin: 0 auto; padding: 72px 32px 88px; }
  .intro { display: grid; grid-template-columns: 1.2fr 1fr; gap: 72px; align-items: start; }
  .eyebrow, .file-label, .note { font-family: var(--font-mono); font-size: 12px; color: var(--sd-muted); }
  .eyebrow { margin: 0 0 24px; }
  h1 { max-width: 650px; font-size: clamp(36px, 4.8vw, 62px); font-weight: 600; line-height: 1.1; letter-spacing: -.045em; margin: 0; text-wrap: balance; }
  .description { margin: 24px 0; color: var(--sd-muted); font-size: 18px; line-height: 1.7; max-width: 38ch; }
  .links { display: flex; flex-wrap: wrap; gap: 20px; align-items: center; }
  a { text-decoration: none; }
  a:hover { color: var(--sd-accent); }
  a:focus-visible { outline: 2px solid var(--sd-accent); outline-offset: 5px; }
  .start { background: var(--sd-accent); color: white; padding: 10px 16px; border-radius: var(--sd-radius); }
  .start:hover { color: white; text-decoration: underline; }
  .note { margin-top: 28px; line-height: 1.8; }
  aside { border: 1px solid var(--sd-line); background: var(--sd-panel); min-width: 0; }
  .file-label { padding: 12px 20px; border-bottom: 1px solid var(--sd-line); }
  pre { padding: 18px 20px; margin: 0; overflow: auto; font: 13px/1.8 var(--font-mono); }
  pre + .file-label { border-top: 1px solid var(--sd-line); }
  .example { color: var(--sd-muted); }
  .reading { margin-top: 80px; }
  h2 { font-size: 20px; font-weight: 600; margin: 0 0 24px; }
  .reading-row { display: grid; grid-template-columns: 190px 1fr 24px; gap: 24px; align-items: baseline; padding: 24px 0; border-top: 1px solid var(--sd-line); }
  .reading-row:last-child { border-bottom: 1px solid var(--sd-line); }
  h3 { font-size: 16px; font-weight: 500; margin: 0; }
  .reading-row p, .examples p { color: var(--sd-muted); line-height: 1.7; margin: 0; }
  .examples { margin-top: 56px; max-width: 760px; }
  .examples .links { margin-top: 20px; }
  @media (max-width: 720px) {
    .site-home { padding: 40px 24px 56px; }
    .intro { grid-template-columns: 1fr; gap: 32px; }
    .reading { margin-top: 48px; }
    .reading-row { grid-template-columns: 1fr 24px; gap: 12px; }
    .reading-row p { grid-column: 1; grid-row: 2; }
    .reading-row > span { grid-column: 2; grid-row: 1; }
  }
</style>
