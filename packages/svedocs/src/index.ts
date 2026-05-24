export { defineConfig } from './config.js';
export type { SvedocsConfig, SvedocsResolvedConfig } from './config.js';
export {
  createPageTree,
  createSearchRecords,
  loadSvedocsContent,
  resolveSvedocsConfig,
  svedocsPackage
} from './core.js';
export type {
  SvedocsContentManifest,
  SvedocsContentIssue,
  SvedocsCodeBlock,
  SvedocsDiffRow,
  SvedocsDiffSplitRow,
  SvedocsHeading,
  SvedocsLink,
  SvedocsLinkReference,
  SvedocsLocale,
  SvedocsPage,
  SvedocsSearchRecord,
  SvedocsSeo,
  SvedocsTreeItem
} from './core.js';

export const version = '0.0.0';
