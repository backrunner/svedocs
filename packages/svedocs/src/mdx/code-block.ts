import type { SvedocsCodeBlock } from '../core/types.js';
import { createDiffRows, createDiffSplitRows } from './diff.js';
import { parseLineSet } from './utils.js';

export function createCodeBlock(index: number, language: string, meta: string, value: string): SvedocsCodeBlock {
  const lines = value.split('\n').length;
  const raw = value ? value + '\n' : '';
  // Consume quoted values as a unit so words in a title cannot enable flags.
  const settings = new Map<string, string>();
  let highlight: string | undefined;
  for (const match of meta.matchAll(/(?:^|\s+)(?:\{([^}]*)\}|([^\s=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s]+)))?)(?=\s|$)/g)) {
    const [, range, key, doubleQuoted, singleQuoted, bare] = match;
    if (range !== undefined) highlight ??= range;
    else if (key) settings.set(key.toLowerCase(), doubleQuoted ?? singleQuoted ?? bare ?? '');
  }
  const title = settings.get('title') ?? settings.get('filename');
  const highlightLines = parseLineSet(highlight, lines);
  const focusLines = parseLineSet(settings.get('focus'), lines);
  const diff = language === 'diff' || settings.has('diff');
  const diffMode = diff && settings.has('split') ? 'split' : diff ? 'unified' : undefined;
  const noLineNumbers = [...settings.keys()].some((key) => /^no-?line-?numbers$/.test(key))
    || /^(false|0|no)$/i.test(settings.get('showlinenumbers') ?? settings.get('linenumbers') ?? '');
  const wrapValue = settings.get('wrap');
  const wrap = settings.has('no-wrap') || settings.has('nowrap') || /^(false|0|no)$/i.test(wrapValue ?? '')
    ? false : wrapValue !== undefined && /^(true|1|yes)?$/i.test(wrapValue) ? true : undefined;
  const diffRows = diff ? createDiffRows(raw) : [];
  return {
    id: `code-${index + 1}`,
    raw,
    language,
    meta,
    highlightLines,
    focusLines,
    ...(title ? { title } : {}),
    diff,
    ...(diffMode ? { diffMode } : {}),
    diffRows,
    splitRows: diffMode === 'split' ? createDiffSplitRows(diffRows) : [],
    addedLines: diffRows.filter((row) => row.kind === 'add').length,
    removedLines: diffRows.filter((row) => row.kind === 'remove').length,
    ...(noLineNumbers ? { noLineNumbers: true } : {}),
    ...(typeof wrap === 'boolean' ? { wrap } : {})
  };
}
