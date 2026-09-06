import type { SvedocsResolvedConfig } from '../../core/types.js';
const accentPalette: Record<string, string> = {
  emerald: '#007f68',
  teal: '#087f8c',
  sky: '#0969da',
  indigo: '#4f46e5',
  rose: '#c83e4d',
  amber: '#b36b00'
};

export function createThemeStyle(config: SvedocsResolvedConfig): string {
  const accent = resolveColor(config.theme.palette.accent, '#007f68');
  const modeTokens = config.theme.defaultMode === 'dark'
    ? [
        '--sd-bg:#11130f',
        '--sd-ink:#f4f1e8',
        '--sd-muted:#aaa698',
        '--sd-line:#2f332d',
        '--sd-grid-line:color-mix(in srgb, var(--sd-line) 45%, transparent)',
        '--sd-panel:#181b16',
        '--sd-accent:#50d6b3',
        '--sd-accent-2:#ff8a66',
        '--sd-scrollbar-thumb:color-mix(in srgb, var(--sd-ink) 34%, transparent)',
        '--sd-scrollbar-thumb-hover:color-mix(in srgb, var(--sd-accent) 70%, var(--sd-ink))'
      ]
    : config.theme.defaultMode === 'light'
      ? [
          '--sd-bg:#f8f7f2',
          '--sd-ink:#161612',
          '--sd-muted:#68675f',
          '--sd-line:#dedbd0',
          '--sd-grid-line:color-mix(in srgb, var(--sd-line) 42%, transparent)',
          '--sd-panel:#fffdf7',
          '--sd-accent:#007f68',
          '--sd-accent-2:#d64735',
          '--sd-scrollbar-thumb:color-mix(in srgb, var(--sd-ink) 30%, transparent)',
          '--sd-scrollbar-thumb-hover:color-mix(in srgb, var(--sd-accent) 62%, var(--sd-ink))'
        ]
      : [];
  return [
    ...modeTokens,
    `--font-sans:${config.theme.fonts.sans}`,
    `--font-mono:${config.theme.fonts.mono}`,
    `--sd-font-display:${config.theme.fonts.display}`,
    `--sd-radius:${config.theme.radius}`,
    `--sd-accent:${accent}`
  ].join(';');
}

export function createThemeInitScript(defaultMode: 'light' | 'dark' | 'system', languageTag = 'en', dir: 'ltr' | 'rtl' = 'ltr'): string {
  if (defaultMode !== 'system') return '';
  return `<script>(function(){try{var d=${serializeInlineScriptValue(defaultMode)};var l=${serializeInlineScriptValue(languageTag)};var r=${serializeInlineScriptValue(dir)};var s;try{s=localStorage.getItem('svedocs-theme')}catch(e){}var p=s==='dark'||s==='light'||s==='system'?s:d;var m=typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme: dark)').matches;var t=p==='system'?(m?'dark':'light'):p;var h=document.documentElement;h.dataset.theme=t;h.style.colorScheme=t;h.lang=l;h.dir=r;}catch(e){}})();<\/script>`;
}

function serializeInlineScriptValue(value: string): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function resolveColor(value: string, fallback: string): string {
  if (/^(#|rgb|hsl|oklch|color-mix)/.test(value)) return value;
  return accentPalette[value] ?? fallback;
}
