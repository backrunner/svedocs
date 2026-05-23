import type { SvedocsCodeBlock, SvedocsDiffRow, SvedocsDiffSplitRow } from '../core/types.js';
import { escapeAttribute, escapeHtml } from './utils.js';

export function createDiffRows(raw: string): SvedocsDiffRow[] {
  let oldLine = 0;
  let newLine = 0;
  return raw.replace(/\r?\n$/, '').split(/\r?\n/).map((line) => {
    const hunk = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/.exec(line);
    if (hunk) {
      oldLine = Number(hunk[1]) - 1;
      newLine = Number(hunk[2]) - 1;
      return {
        kind: 'meta',
        content: line
      };
    }
    if (line.startsWith('+++') || line.startsWith('---')) {
      return {
        kind: 'meta',
        content: line
      };
    }
    if (line.startsWith('+')) {
      newLine += 1;
      return {
        kind: 'add',
        newLine,
        content: line.slice(1)
      };
    }
    if (line.startsWith('-')) {
      oldLine += 1;
      return {
        kind: 'remove',
        oldLine,
        content: line.slice(1)
      };
    }
    oldLine += 1;
    newLine += 1;
    return {
      kind: 'context',
      oldLine,
      newLine,
      content: line.startsWith(' ') ? line.slice(1) : line
    };
  });
}

export function createDiffSplitRows(rows: SvedocsDiffRow[]): SvedocsDiffSplitRow[] {
  const splitRows: SvedocsDiffSplitRow[] = [];
  let index = 0;

  while (index < rows.length) {
    const row = rows[index];
    if (!row) break;

    if (row.kind === 'meta') {
      splitRows.push({ kind: 'meta', content: row.content });
      index += 1;
      continue;
    }

    if (row.kind === 'context') {
      splitRows.push({ kind: 'context', old: row, new: row });
      index += 1;
      continue;
    }

    if (row.kind === 'remove') {
      const oldRows: SvedocsDiffRow[] = [];
      const newRows: SvedocsDiffRow[] = [];
      while (rows[index]?.kind === 'remove') {
        oldRows.push(rows[index] as SvedocsDiffRow);
        index += 1;
      }
      while (rows[index]?.kind === 'add') {
        newRows.push(rows[index] as SvedocsDiffRow);
        index += 1;
      }
      pushPairedChangeRows(splitRows, oldRows, newRows);
      continue;
    }

    const newRows: SvedocsDiffRow[] = [];
    while (rows[index]?.kind === 'add') {
      newRows.push(rows[index] as SvedocsDiffRow);
      index += 1;
    }
    pushPairedChangeRows(splitRows, [], newRows);
  }

  return splitRows;
}

export function renderSplitDiffHtml(block: SvedocsCodeBlock): string {
  const title = block.title ?? 'Diff';
  const rows = block.splitRows.length > 0 ? block.splitRows : createDiffSplitRows(block.diffRows);
  const body = rows.map(renderSplitRow).join('');
  const counts = [
    block.addedLines > 0 ? `+${block.addedLines}` : '',
    block.removedLines > 0 ? `-${block.removedLines}` : ''
  ].filter(Boolean).join(' ');

  return `<div class="sd-diff sd-diff-split sd-code" data-language="${escapeAttribute(block.language)}"${block.title ? ` data-title="${escapeAttribute(block.title)}"` : ''} data-diff="true" data-diff-mode="split"${block.addedLines > 0 ? ` data-added-lines="${block.addedLines}"` : ''}${block.removedLines > 0 ? ` data-removed-lines="${block.removedLines}"` : ''} data-copy="${escapeAttribute(block.raw)}">
  <div class="sd-diff-header">
    <span>${escapeHtml(title)}</span>
    <small>${escapeHtml(counts || block.language)}</small>
  </div>
  <div class="sd-diff-grid" role="table" aria-label="${escapeAttribute(title)} diff">
    <div class="sd-diff-row sd-diff-column-row" role="row">
      <div class="sd-diff-column-label" role="columnheader" data-side="old">Before</div>
      <div class="sd-diff-column-label" role="columnheader" data-side="new">After</div>
    </div>
    ${body}
  </div>
</div>`;
}

function pushPairedChangeRows(
  target: SvedocsDiffSplitRow[],
  oldRows: SvedocsDiffRow[],
  newRows: SvedocsDiffRow[]
): void {
  const length = Math.max(oldRows.length, newRows.length);
  for (let index = 0; index < length; index += 1) {
    target.push({
      kind: 'change',
      ...(oldRows[index] ? { old: oldRows[index] } : {}),
      ...(newRows[index] ? { new: newRows[index] } : {})
    });
  }
}

function renderSplitRow(row: SvedocsDiffSplitRow): string {
  if (row.kind === 'meta') {
    return `<div class="sd-diff-row sd-diff-meta" role="row">
      <div class="sd-diff-cell sd-diff-meta-cell" role="cell">${escapeHtml(row.content ?? '')}</div>
    </div>`;
  }

  return `<div class="sd-diff-row ${row.kind === 'change' ? 'sd-diff-change' : 'sd-diff-context'}" role="row">
    ${renderSideCell(row.old, 'old')}
    ${renderSideCell(row.new, 'new')}
  </div>`;
}

function renderSideCell(row: SvedocsDiffRow | undefined, side: 'old' | 'new'): string {
  if (!row) {
    return `<div class="sd-diff-cell sd-diff-empty" role="cell" data-side="${side}" aria-hidden="true"></div>`;
  }
  const line = side === 'old' ? row.oldLine : row.newLine;
  const kind = row.kind === 'remove' ? 'remove' : row.kind === 'add' ? 'add' : 'context';
  return `<div class="sd-diff-cell sd-diff-${kind}" role="cell" data-side="${side}" data-line="${line ?? ''}">
    <span class="sd-diff-line-no">${line ?? ''}</span>
    <code>${escapeHtml(row.content)}</code>
  </div>`;
}
