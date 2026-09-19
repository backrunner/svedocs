import type { SvedocsPage, SvedocsResolvedConfig } from '../core/types.js';
import { isDiscoverablePage } from '../core/seo.js';
import { formatRoutePathForBuildMode } from '../core/utils.js';

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

export interface IndexNowResult {
  submitted: number;
  batches: number;
  statuses: number[];
}

/** Only same-origin, discoverable canonical URLs are sent; locales remain separate. */
export function createIndexNowPayloads(config: SvedocsResolvedConfig, pages: SvedocsPage[]): IndexNowPayload[] {
  const options = config.integrations.indexNow;
  if (!options) throw new Error('Enable integrations.indexNow before submitting URLs.');
  if (!config.site.url || !/^https?:\/\//.test(config.site.url)) throw new Error('IndexNow requires an HTTP(S) site.url.');
  const site = new URL(config.site.url);
  const urls = new Set<string>();
  for (const page of pages) {
    if (!isDiscoverablePage(page, config)) continue;
    const url = new URL(page.seo.canonical || formatRoutePathForBuildMode(page.routePath, config.build.mode), site);
    if (url.origin !== site.origin) continue;
    url.hash = '';
    urls.add(url.href);
  }
  const list = [...urls];
  const payloads: IndexNowPayload[] = [];
  for (let index = 0; index < list.length; index += 10_000) {
    payloads.push({
      host: site.host,
      key: options.key,
      keyLocation: new URL(`/${options.key}.txt`, site).href,
      urlList: list.slice(index, index + 10_000)
    });
  }
  return payloads;
}

/** Invoke after deployment; building or browsing a site never submits URLs. */
export async function submitIndexNow(
  config: SvedocsResolvedConfig,
  pages: SvedocsPage[],
  options: { fetch?: typeof fetch; verifyKey?: boolean } = {}
): Promise<IndexNowResult> {
  const payloads = createIndexNowPayloads(config, pages);
  const integration = config.integrations.indexNow;
  if (!integration) throw new Error('IndexNow is disabled.');
  const request = options.fetch ?? globalThis.fetch;
  if (options.verifyKey !== false && payloads[0]) {
    const response = await request(payloads[0].keyLocation, { signal: AbortSignal.timeout(15_000), redirect: 'error' });
    if (!response.ok || (await response.text()).trim() !== integration.key) {
      throw new Error(`IndexNow verification file is not available at ${payloads[0].keyLocation}. Deploy the build before submitting.`);
    }
  }
  const result: IndexNowResult = { submitted: 0, batches: 0, statuses: [] };
  for (const payload of payloads) {
    const response = await request(integration.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
      redirect: 'error'
    });
    if (response.status !== 200 && response.status !== 202) {
      throw new Error(`IndexNow returned HTTP ${response.status} after ${result.submitted} URLs were accepted. Retry the submission after resolving the provider error.`);
    }
    result.submitted += payload.urlList.length;
    result.batches += 1;
    result.statuses.push(response.status);
  }
  return result;
}
