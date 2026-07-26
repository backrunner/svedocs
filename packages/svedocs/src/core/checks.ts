import { access, readFile } from 'node:fs/promises';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import path from 'node:path';
import { checkLink, createLinkCheckContext } from './links.js';
import type { SvedocsContentIssue, SvedocsContentManifest, SvedocsLinkReference, SvedocsPage } from './types.js';
import { findDuplicates, normalizePath } from './utils.js';

export async function checkSvedocsContent(
  manifest: SvedocsContentManifest,
  projectRoot = process.cwd()
): Promise<SvedocsContentIssue[]> {
  const issues: SvedocsContentIssue[] = [];
  const externalChecks = new Map<string, Promise<ExternalLinkStatus>>();
  const runExternalCheck = createConcurrencyGate(8);
  const pendingExternalIssues: Array<Promise<SvedocsContentIssue | undefined>> = [];
  const routeDuplicates = findDuplicates(manifest.pages.map((page) => page.routePath));
  const canonicalDuplicates = findDuplicates(
    manifest.pages
      .map((page) => page.seo.canonical)
      .filter((canonical): canonical is string => Boolean(canonical))
  );

  if (manifest.config.build.mode === 'spa') {
    issues.push({
      code: 'spa-risk',
      severity: 'warning',
      message: 'SPA mode prerenders known pages, but server-only routes and provider bindings are unavailable on static hosts.'
    });
  }

  if ((manifest.config.seo.rss || manifest.config.seo.sitemap) && !manifest.config.site.url) {
    issues.push({
      code: 'missing-site-url',
      severity: 'warning',
      message: 'site.url is required for absolute sitemap and RSS URLs; relative discovery URLs are omitted.'
    });
  }

  const sitemapPageCount = manifest.pages.filter((page) => (
    !page.hidden && !/(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i.test(page.seo.robots ?? '')
  )).length;
  if (manifest.config.seo.sitemap && sitemapPageCount > 50_000) {
    issues.push({
      code: 'sitemap-url-limit',
      severity: 'error',
      message: `Sitemap contains ${sitemapPageCount} URLs; split it into sitemap index files before exceeding 50,000 URLs.`
    });
  }

  for (const route of routeDuplicates) {
    issues.push({
      code: 'duplicate-route',
      severity: 'error',
      message: `Duplicate route path detected: ${route}`
    });
  }

  for (const canonical of canonicalDuplicates) {
    issues.push({
      code: 'duplicate-canonical',
      severity: 'error',
      message: `Duplicate canonical URL detected: ${canonical}`
    });
  }

  if (manifest.config.checks.translations) {
    issues.push(...createMissingTranslationIssues(manifest));
  }

  const linkContext = createLinkCheckContext(manifest);
  for (const page of manifest.pages) {
    if (!page.description) {
      issues.push({
        code: 'missing-description',
        severity: 'warning',
        message: `${page.routePath} is missing a description for SEO and search excerpts.`,
        pageId: page.id,
        sourcePath: page.sourcePath
      });
    }
    if (page.plainText && page.search.length === 0) {
      issues.push({
        code: 'empty-search',
        severity: 'warning',
        message: `${page.routePath} has content but produced no search records.`,
        pageId: page.id,
        sourcePath: page.sourcePath
      });
    }
    for (const link of page.links) {
      const linkIssue = checkLink(page, link, linkContext);
      if (linkIssue) {
        issues.push(linkIssue);
        continue;
      }
      const assetIssue = await checkAssetLink(projectRoot, page.sourcePath, link, manifest.config.checks.assets);
      if (assetIssue) {
        issues.push(assetIssue);
        continue;
      }
      pendingExternalIssues.push(checkExternalLink(
        link,
        manifest.config.checks.externalLinks,
        page.id,
        page.sourcePath,
        externalChecks,
        runExternalCheck
      ));
    }
  }

  issues.push(...(await Promise.all(pendingExternalIssues)).filter((issue): issue is SvedocsContentIssue => Boolean(issue)));

  return issues;
}

function createMissingTranslationIssues(manifest: SvedocsContentManifest): SvedocsContentIssue[] {
  const locales = manifest.config.i18n.locales.map((locale) => locale.code);
  if (locales.length <= 1) return [];
  const groups = new Map<string, SvedocsPage[]>();
  for (const page of manifest.pages) {
    if (page.hidden) continue;
    const key = `${page.kind}:${page.scopePath}`;
    const group = groups.get(key) ?? [];
    group.push(page);
    groups.set(key, group);
  }
  const issues: SvedocsContentIssue[] = [];
  for (const pages of groups.values()) {
    const present = new Set(pages.map((page) => page.locale).filter((locale): locale is string => Boolean(locale)));
    const reference = pages[0];
    if (!reference) continue;
    for (const locale of locales) {
      if (present.has(locale)) continue;
      issues.push({
        code: 'missing-translation',
        severity: 'warning',
        message: `${reference.scopePath} is missing locale ${locale}.`,
        pageId: reference.id,
        sourcePath: reference.sourcePath
      });
    }
  }
  return issues;
}

export async function checkPackagePublication(packageRoot: string): Promise<SvedocsContentIssue[]> {
  const issues: SvedocsContentIssue[] = [];
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
    bin?: string | Record<string, string>;
    exports?: Record<string, unknown>;
    files?: string[];
    license?: string;
    private?: boolean;
    publishConfig?: {
      access?: string;
      provenance?: boolean;
    };
  };

  if (!pkg.private && pkg.license !== 'MIT') {
    issues.push({
      code: 'package-license-missing',
      severity: 'error',
      message: 'package.json license must be MIT for public svedocs packages.'
    });
  }

  if (!pkg.private && pkg.publishConfig?.access !== 'public') {
    issues.push({
      code: 'package-publish-access-missing',
      severity: 'warning',
      message: 'package.json publishConfig.access should be public before publishing.'
    });
  }

  if (!pkg.private && pkg.publishConfig?.provenance !== true) {
    issues.push({
      code: 'package-provenance-missing',
      severity: 'warning',
      message: 'package.json publishConfig.provenance should be true for npm provenance.'
    });
  }

  for (const target of extractBinTargets(pkg.bin)) {
    if (!await fileExists(path.join(packageRoot, target))) {
      issues.push({
        code: 'package-bin-missing',
        severity: 'error',
        message: `package.json bin target is missing: ${target}.`
      });
    }
  }

  for (const [exportName, value] of Object.entries(pkg.exports ?? {})) {
    const targets = extractExportTargets(value);
    for (const target of targets) {
      if (!await fileExists(path.join(packageRoot, target))) {
        issues.push({
          code: 'package-export-missing',
          severity: 'error',
          message: `${exportName} points to missing package export target ${target}.`
        });
      }
    }
  }

  for (const file of pkg.files ?? []) {
    if (!await fileExists(path.join(packageRoot, file))) {
      issues.push({
        code: 'package-file-missing',
        severity: 'error',
        message: `package.json files entry is missing: ${file}.`
      });
    }
  }

  return issues;
}

function extractBinTargets(bin: string | Record<string, string> | undefined): string[] {
  if (!bin) return [];
  if (typeof bin === 'string') return [normalizePackageTarget(bin)];
  return Object.values(bin).map(normalizePackageTarget);
}

async function checkAssetLink(
  projectRoot: string,
  sourcePath: string,
  link: SvedocsLinkReference,
  enabled: boolean
): Promise<SvedocsContentIssue | undefined> {
  if (!enabled || link.kind !== 'asset') return undefined;
  const pathname = splitHrefPath(link.href);
  const candidates = pathname.startsWith('/')
    ? [
        path.join(projectRoot, 'static', pathname),
        path.join(projectRoot, pathname)
      ]
    : [
        path.join(projectRoot, path.posix.dirname(normalizePath(sourcePath)), pathname),
        path.join(projectRoot, 'static', pathname)
      ];
  if (await anyFileExists(candidates)) return undefined;
  return {
    code: 'broken-asset',
    severity: 'error',
    message: `${sourcePath}:${link.line} references missing asset ${link.href}.`,
    pageId: sourcePath,
    sourcePath,
    href: link.href
  };
}

async function checkExternalLink(
  link: SvedocsLinkReference,
  enabled: boolean,
  pageId: string,
  sourcePath: string,
  cache: Map<string, Promise<ExternalLinkStatus>>,
  run: <T>(task: () => Promise<T>) => Promise<T>
): Promise<SvedocsContentIssue | undefined> {
  if (!enabled || link.kind !== 'external' || !/^https?:\/\//.test(link.href)) return undefined;
  let pending = cache.get(link.href);
  if (!pending) {
    pending = run(() => checkExternalLinkStatus(link.href));
    cache.set(link.href, pending);
  }
  const result = await pending;
  if (result.ok) return undefined;
  return {
    code: 'external-link-unchecked',
    severity: 'warning',
    message: result.status
      ? `${sourcePath}:${link.line} external link returned ${result.status}: ${link.href}.`
      : `${sourcePath}:${link.line} external link could not be verified: ${link.href}.`,
    pageId,
    sourcePath,
    href: link.href
  };
}

function createConcurrencyGate(limit: number): <T>(task: () => Promise<T>) => Promise<T> {
  let active = 0;
  const queue: Array<() => void> = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= limit) await new Promise<void>((resolve) => queue.push(resolve));
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      queue.shift()?.();
    }
  };
}

interface ExternalLinkStatus {
  ok: boolean;
  status?: number;
}

async function checkExternalLinkStatus(href: string): Promise<ExternalLinkStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetchPublicExternalLink(href, controller.signal);
    return response.ok || response.status === 405 ? { ok: true } : { ok: false, status: response.status };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPublicExternalLink(input: string, signal: AbortSignal): Promise<Response> {
  let current = new URL(input);
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    await assertPublicUrl(current);
    const response = await fetch(current, { method: 'HEAD', redirect: 'manual', signal });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get('location');
    if (!location) return response;
    current = new URL(location, current);
  }
  throw new Error('External link exceeded the redirect limit.');
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Unsupported external link protocol.');
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) throw new Error('Local external link target is blocked.');
  const addresses = isIP(hostname)
    ? [hostname]
    : (await lookup(hostname, { all: true, verbatim: true })).map((entry) => entry.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error('Private external link target is blocked.');
  }
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd')
    || /^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith('::ffff:')) return isPrivateAddress(normalized.slice(7));
  if (isIP(normalized) !== 4) return false;
  const parts = normalized.split('.').map(Number);
  const [a = 0, b = 0] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19));
}

function extractExportTargets(value: unknown): string[] {
  if (typeof value === 'string') return [normalizePackageTarget(value)];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value as Record<string, unknown>).flatMap(extractExportTargets);
}

function normalizePackageTarget(target: string): string {
  return target.replace(/^\.\//, '');
}

function splitHrefPath(href: string): string {
  const [withoutHash = ''] = href.trim().split('#');
  const [pathname = ''] = withoutHash.split('?');
  return pathname;
}

async function anyFileExists(paths: string[]): Promise<boolean> {
  for (const candidate of paths) {
    if (await fileExists(candidate)) return true;
  }
  return false;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
