import type { SvedocsSearchRecord } from '../core/types.js';
import type { SearchScope } from './types.js';

export function filterSearchRecords(
  records: SvedocsSearchRecord[],
  scope: SearchScope = {}
): SvedocsSearchRecord[] {
  return records.filter((record) => matchesSearchScope(record, scope));
}

export function matchesSearchScope(record: SvedocsSearchRecord, scope: SearchScope = {}): boolean {
  return matchesMetadata(record.metadata.locale, scope.locale)
    && matchesMetadata(record.metadata.kind, scope.kind);
}

function matchesMetadata(value: unknown, expected: string | undefined): boolean {
  if (!expected) return true;
  if (Array.isArray(value)) return value.some((item) => String(item) === expected);
  return value === expected;
}
