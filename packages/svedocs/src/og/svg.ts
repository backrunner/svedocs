import type { OgImageInput } from './types.js';

export function createOgSvg(input: OgImageInput): string {
  const title = wrapText(input.title, 12.5, 3);
  const description = wrapText(input.description ?? input.siteName ?? 'svedocs', 28, 3);
  const titleStart = 280 - (title.length - 1) * 40;
  const descriptionStart = titleStart + (title.length - 1) * 72 + 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#11130f"/>
  <path d="M0 84h1200M0 168h1200M0 252h1200M0 336h1200M0 420h1200M0 504h1200M120 0v630M240 0v630M360 0v630M480 0v630M600 0v630M720 0v630M840 0v630M960 0v630M1080 0v630" stroke="#2f332d" stroke-width="2"/>
  <rect x="84" y="84" width="96" height="96" fill="#50d6b3"/>
  <rect x="180" y="180" width="96" height="96" fill="#ff8a66"/>
  <rect x="84" y="276" width="96" height="96" fill="#f4f1e8"/>
  ${title.map((line, index) => `<text x="300" y="${titleStart + index * 72}" fill="#f4f1e8" font-family="Arial, sans-serif" font-size="60" font-weight="800">${escapeHtml(line)}</text>`).join('\n  ')}
  ${description.map((line, index) => `<text x="306" y="${descriptionStart + index * 36}" fill="#aaa698" font-family="Arial, sans-serif" font-size="27">${escapeHtml(line)}</text>`).join('\n  ')}
</svg>`;
}

/** Conservative em estimates support CJK and long unbroken tokens without a font dependency. */
function wrapText(value: string, maxWidth: number, maxLines: number): string[] {
  let remaining = Array.from(value.replace(/\s+/g, ' ').trim());
  const lines: string[] = [];
  while (remaining.length && lines.length < maxLines) {
    let width = 0;
    let end = 0;
    let space = -1;
    for (; end < remaining.length; end++) {
      const char = remaining[end]!;
      const size = /[ilI.,' :;]/.test(char) ? 0.35 : /[MW@]/.test(char) ? 1 : /[\x00-\x7f]/.test(char) ? 0.65 : 1;
      if (width + size > maxWidth) break;
      width += size;
      if (char === ' ') space = end;
    }
    if (end < remaining.length && space > end / 2) end = space;
    const line = remaining.slice(0, Math.max(1, end)).join('').trim();
    remaining = remaining.slice(Math.max(1, end));
    while (remaining[0] === ' ') remaining.shift();
    lines.push(remaining.length && lines.length === maxLines - 1 ? `${Array.from(line).slice(0, -1).join('')}…` : line);
  }
  return lines;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
