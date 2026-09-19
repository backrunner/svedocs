import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSvedocsConfig } from '../src/config.js';

describe('browser integration navigation', () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('counts query changes as pageviews without repeating route conversions', async () => {
    const target = { location: { href: 'https://example.com/thanks' }, dataLayer: [] as IArguments[] };
    vi.stubGlobal('window', target);
    vi.stubGlobal('navigator', { doNotTrack: '0' });
    vi.stubGlobal('document', {
      referrer: '',
      createElement: () => ({ dataset: {}, setAttribute() {} }),
      head: { appendChild() {} }
    });
    const { trackIntegrationPage } = await import('../src/integrations/browser.js');
    const config = loadSvedocsConfig({ integrations: {
      googleAnalytics: { id: 'G-TEST123' },
      googleAds: { id: 'AW-123456', conversions: {
        signup: { label: 'signed-up', path: '/thanks' },
        localized: { label: 'localized', path: '/完成' }
      } }
    } }).integrations;
    const visit = (path: string) => {
      target.location.href = `https://example.com${path}`;
      trackIntegrationPage(config, 'Thanks');
    };
    visit('/thanks');
    visit('/thanks?campaign=test');
    visit('/thanks?campaign=test#details');
    visit('/thanks/?campaign=test');
    const events = () => target.dataLayer.map((entry) => Array.from(entry));
    expect(events().filter((entry) => entry[1] === 'page_view')).toHaveLength(3);
    expect(events().filter((entry) => entry[1] === 'conversion')).toHaveLength(1);
    visit('/docs');
    visit('/thanks');
    expect(events().filter((entry) => entry[1] === 'conversion')).toHaveLength(2);
    visit('/完成');
    expect(events().filter((entry) => entry[1] === 'conversion').at(-1)).toEqual([
      'event', 'conversion', { send_to: 'AW-123456/localized' }
    ]);
    visit('/%E5%AE%8C%E6%88%90/?campaign=test');
    expect(events().filter((entry) => entry[1] === 'conversion')).toHaveLength(3);
    expect(() => visit('/%invalid')).not.toThrow();
  });
});
