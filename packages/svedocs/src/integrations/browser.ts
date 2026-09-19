import type { SvedocsResolvedIntegrations } from '../config.js';

type Gtag = (...args: unknown[]) => void;
type IntegrationWindow = Window & {
  dataLayer?: unknown[];
  gtag?: Gtag;
  umami?: { track: (payload: (properties: Record<string, unknown>) => Record<string, unknown>) => unknown };
  adsbygoogle?: { push: (value: Record<string, unknown>) => unknown };
};

const scripts = new Map<string, Promise<void>>();
const configuredTags = new Set<string>();
const lastViews = new Map<string, string>();

export function canLoadIntegrations(config: SvedocsResolvedIntegrations, development: boolean): boolean {
  return typeof window !== 'undefined'
    && (!development || config.development)
    && (!config.respectDoNotTrack || navigator.doNotTrack !== '1');
}

/** Use DOM properties, never interpolated inline script, for user-supplied settings. */
function loadScript(key: string, src: string, attributes: Record<string, string> = {}): Promise<void> {
  const existing = scripts.get(key);
  if (existing) return existing;
  const pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    script.dataset.svedocsIntegration = key;
    for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
    script.onload = () => resolve();
    script.onerror = () => { script.remove(); reject(new Error(`Unable to load ${key}.`)); };
    document.head.appendChild(script);
  });
  scripts.set(key, pending);
  void pending.catch(() => scripts.delete(key));
  return pending;
}

function googleTag(config: SvedocsResolvedIntegrations): Gtag | undefined {
  const target = window as IntegrationWindow;
  const ids = [config.googleAnalytics && config.googleAnalytics.id, config.googleAds && config.googleAds.id].filter((id): id is string => Boolean(id));
  if (!ids.length) return undefined;
  target.dataLayer ??= [];
  target.gtag ??= function () { target.dataLayer!.push(arguments); };
  if (!configuredTags.size) target.gtag('js', new Date());
  for (const id of ids) {
    if (configuredTags.has(id)) continue;
    target.gtag('config', id, { send_page_view: false });
    configuredTags.add(id);
  }
  void loadScript('google-tag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids[0]!)}`).catch(() => {});
  return target.gtag;
}

function newView(key: string, url: string): boolean {
  if (lastViews.get(key) === url) return false;
  lastViews.set(key, url);
  return true;
}

export function trackIntegrationPage(config: SvedocsResolvedIntegrations, title: string, development = false): void {
  if (!canLoadIntegrations(config, development)) return;
  const url = new URL(window.location.href);
  url.hash = '';
  const href = url.href;
  const tag = googleTag(config);
  const previousUrl = config.googleAnalytics && lastViews.get(config.googleAnalytics.id);
  if (config.googleAnalytics && newView(config.googleAnalytics.id, href)) {
    tag?.('event', 'page_view', {
      send_to: config.googleAnalytics.id,
      page_location: href,
      page_referrer: previousUrl || document.referrer,
      page_title: title
    });
  }
  // Route conversions describe entering a page, not changes to its query/hash.
  if (config.googleAds && newView(config.googleAds.id, normalizePath(url.pathname))) {
    for (const [name, conversion] of Object.entries(config.googleAds.conversions)) {
      if (conversion.path && normalizePath(conversion.path) === normalizePath(url.pathname)) {
        trackGoogleAdsConversion(config, name, development);
      }
    }
  }
  const umami = config.umami;
  if (umami && (!umami.domains.length || umami.domains.includes(url.hostname)) && newView(`umami:${umami.websiteId}`, href)) {
    const referrer = lastViews.get('umami:referrer') ?? document.referrer;
    lastViews.set('umami:referrer', href);
    void loadScript('umami', umami.src, {
      'data-website-id': umami.websiteId,
      'data-auto-track': 'false',
      ...(umami.domains.length ? { 'data-domains': umami.domains.join(',') } : {})
    }).then(() => {
      return (window as IntegrationWindow).umami?.track((properties) => ({
        ...properties, url: url.pathname + url.search, title, referrer
      }));
    }).catch(() => {});
  }
  if (config.googleAdsense && config.googleAdsense.autoAds) void loadGoogleAdsense(config, development).catch(() => {});
}

export function trackGoogleAdsConversion(config: SvedocsResolvedIntegrations, name: string, development = false, transactionId?: string): void {
  if (!canLoadIntegrations(config, development) || !config.googleAds) return;
  if (!Object.hasOwn(config.googleAds.conversions, name)) return;
  const conversion = config.googleAds.conversions[name];
  if (!conversion) return;
  googleTag(config)?.('event', 'conversion', {
    send_to: `${config.googleAds.id}/${conversion.label}`,
    ...(conversion.value !== undefined ? { value: conversion.value } : {}),
    ...(conversion.currency ? { currency: conversion.currency } : {}),
    ...(transactionId ? { transaction_id: transactionId } : {})
  });
}

export async function loadGoogleAdsense(config: SvedocsResolvedIntegrations, development = false): Promise<boolean> {
  if (!canLoadIntegrations(config, development) || !config.googleAdsense) return false;
  await loadScript('google-adsense', `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.googleAdsense.client)}`, { crossorigin: 'anonymous' });
  return true;
}

export function requestGoogleAd(element: HTMLElement): void {
  if (!element.isConnected || element.dataset.adsbygoogleStatus || element.dataset.svedocsAdRequested) return;
  const target = window as IntegrationWindow;
  const queue = target.adsbygoogle ??= [] as Record<string, unknown>[];
  try {
    queue.push({});
    element.dataset.svedocsAdRequested = 'true';
  } catch {
    // Ad blockers and unavailable inventory must not break documentation rendering.
  }
}

function normalizePath(path: string): string {
  // Browsers encode non-ASCII paths, while config commonly uses readable text.
  // decodeURI preserves encoded separators such as %2F.
  try { path = decodeURI(path); } catch { /* Keep malformed escapes literal. */ }
  return path.replace(/\/+$/, '') || '/';
}
