import type { SvedocsResolvedConfig } from '../core/types.js';

/** Files are emitted to the client asset root in edge, static, and SPA builds. */
export function createIntegrationAssets(config: SvedocsResolvedConfig): Record<string, string> {
  const assets: Record<string, string> = {};
  const { indexNow, googleAdsense } = config.integrations;
  if (indexNow) assets[`${indexNow.key}.txt`] = indexNow.key;
  if (googleAdsense && googleAdsense.adsTxt) {
    assets['ads.txt'] = `google.com, ${googleAdsense.client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`;
  }
  return assets;
}
