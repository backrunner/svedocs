// Regenerate the committed homepage share cards: node scripts/generate-site-og.mjs
// Requires Playwright Chromium and system sans-serif fonts (including CJK for Chinese).
// PNGs are committed so production builds need neither a browser nor runtime fonts.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const site = path.resolve(import.meta.dirname, '../apps/site');
const logo = `data:image/png;base64,${(await readFile(path.join(site, 'static/favicon-256x256.png'))).toString('base64')}`;
const copy = {
  en: {
    title: 'Your docs.<br><em>Your design.</em>',
    description: 'A documentation framework built with SvelteKit.<br>Make it yours, from the first page to the last.',
    badge: 'Made for your project',
    kicker: 'DOCUMENTATION',
    article: 'Start building.',
    body: 'One project. A place for everything you know.',
    navigation: ['Overview', 'Quick start', 'Configuration', 'Reference'],
    footer: 'Custom themes. Agent Skills. Ready to ship.'
  },
  zh: {
    title: '你的文档，<br><em>你的设计。</em>',
    description: '基于 SvelteKit 的文档框架。<br>从首页到每篇文档，都契合你的项目。',
    badge: '为你的项目而设计',
    kicker: '项目文档',
    article: '从这里开始。',
    body: '一个项目，容纳你想分享的所有知识。',
    navigation: ['项目介绍', '快速开始', '配置', '参考'],
    footer: '定制主题 · Agent Skills · 开箱即用'
  }
};

function document(locale) {
  const text = copy[locale];
  return `<!doctype html><html lang="${locale}"><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #0c110f; color: #f1f4ed; font-family: Arial, 'PingFang SC', 'Noto Sans CJK SC', sans-serif; -webkit-font-smoothing: antialiased; }
    header { position: absolute; top: 44px; left: 56px; right: 56px; display: flex; align-items: center; gap: 16px; }
    header img { width: 60px; height: 60px; }
    .name { font-size: 32px; letter-spacing: -1px; font-weight: 600; }
    .framework { margin-left: auto; color: #a2afa7; font: 15px monospace; letter-spacing: 1px; }
    .copy { position: absolute; top: 172px; left: 64px; }
    h1 { font-size: ${locale === 'zh' ? '76' : '80'}px; font-weight: 600; line-height: 1.08; letter-spacing: -4px; margin: 0; }
    em { font-style: normal; color: #6ee7b7; }
    .description { font-size: 21px; color: #b1beb5; line-height: 1.65; margin: 27px 0 0; }
    .badge { display: inline-flex; gap: 9px; align-items: center; margin-top: 24px; font-size: 14px; color: #d4ded6; }
    .badge i { width: 7px; height: 7px; background: #d98175; }
    .back { position: absolute; left: 701px; top: 164px; width: 414px; height: 322px; border: 1px solid #447362; background: #16392d; }
    .window { position: absolute; left: 673px; top: 144px; width: 414px; height: 322px; border: 1px solid #506157; background: #131c17; box-shadow: 0 18px 54px #0005; }
    .bar { height: 45px; padding: 0 15px; border-bottom: 1px solid #34473b; display: flex; align-items: center; gap: 6px; font: 11px monospace; color: #a3b4a9; }
    .bar i { width: 5px; height: 5px; background: #65776b; }
    .bar span { margin-left: 12px; }
    .layout { display: grid; grid-template-columns: 107px 1fr; height: 276px; }
    nav { border-right: 1px solid #34473b; padding: 22px 10px; font-size: 10px; }
    nav div { padding: 8px 6px; color: #a6b4a9; margin-bottom: 6px; }
    nav div:nth-child(2) { color: #96e6bd; background: #243e30; border-left: 2px solid #6ee7b7; }
    article { padding: 26px 20px; }
    .kicker { font: 9px monospace; color: #9db3a4; letter-spacing: 1.2px; }
    h2 { font-size: 26px; font-weight: 500; letter-spacing: -.8px; margin: 12px 0 10px; }
    article p { color: #9eb0a2; font-size: 10px; line-height: 1.7; margin: 0; }
    pre { padding: 12px 10px; border: 1px solid #364a3d; background: #0d1510; margin: 20px 0; font: 10px/1.8 monospace; color: #b0c6b7; }
    pre b { color: #7dd3a9; font-weight: 400; }
    .line { width: 92%; height: 4px; background: #34483b; margin: 10px 0; }
    .line.short { width: 68%; }
    footer { position: absolute; bottom: 38px; left: 64px; right: 64px; border-top: 1px solid #344239; padding-top: 23px; display: flex; justify-content: space-between; align-items: center; color: #b7c3b9; font-size: 15px; }
    footer span:last-child { font: 14px monospace; color: #d7e3d9; }
  </style><body>
    <header><img src="${logo}" alt=""><span class="name">svedocs</span><span class="framework">SVELTEKIT / OPEN SOURCE</span></header>
    <div class="copy"><h1>${text.title}</h1><p class="description">${text.description}</p><div class="badge"><i></i>${text.badge}</div></div>
    <div class="back"></div><div class="window"><div class="bar"><i></i><i></i><i></i><span>your-project / docs</span></div>
      <div class="layout"><nav>${text.navigation.map((label) => `<div>${label}</div>`).join('')}</nav><article>
        <div class="kicker">${text.kicker}</div><h2>${text.article}</h2><p>${text.body}</p>
        <pre><b>$</b> pnpm create svedocs my-docs<br><b>→</b> SvelteKit + Markdown + you</pre><div class="line"></div><div class="line short"></div>
      </article></div>
    </div>
    <footer><span>${text.footer}</span><span>svedocs.pwp.sh</span></footer>
  </body></html>`;
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const locale of Object.keys(copy)) {
    await page.setContent(document(locale));
    await page.evaluate(() => document.fonts.ready);
    const output = path.join(site, `static/brand/og-home-${locale}.png`);
    await page.screenshot({ path: output });
    console.log(output);
  }
} finally {
  await browser.close();
}
