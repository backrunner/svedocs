import type { SvedocsConfig, SvedocsResolvedIntegrations } from '../config.js';

export function resolveIntegrations(input: SvedocsConfig['integrations']): SvedocsResolvedIntegrations {
  const config = input || {};
  return {
    development: config.development ?? false,
    respectDoNotTrack: config.respectDoNotTrack ?? true,
    umami: config.umami ? {
      websiteId: config.umami.websiteId,
      src: config.umami.src ?? 'https://cloud.umami.is/script.js',
      domains: config.umami.domains ?? []
    } : false,
    googleAnalytics: config.googleAnalytics || false,
    googleAds: config.googleAds ? { id: config.googleAds.id, conversions: config.googleAds.conversions ?? {} } : false,
    googleAdsense: config.googleAdsense ? {
      client: config.googleAdsense.client,
      autoAds: config.googleAdsense.autoAds ?? false,
      adsTxt: config.googleAdsense.adsTxt ?? true,
      slots: config.googleAdsense.slots ?? {},
      placements: config.googleAdsense.placements ?? {}
    } : false,
    indexNow: config.indexNow ? {
      key: config.indexNow.key,
      endpoint: config.indexNow.endpoint ?? 'https://api.indexnow.org/indexnow'
    } : false
  };
}
