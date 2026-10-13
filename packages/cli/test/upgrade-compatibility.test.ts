import { describe, expect, it } from 'vitest';
import { checkUpgradeCompatibility } from '../src/commands/upgrade-compatibility.js';

describe('SvelteKit 3 upgrade guidance', () => {
  it('explains the required manual migration when crossing 0.3', () => {
    const report = checkUpgradeCompatibility({ currentSpec: '0.2.4', targetSpec: '0.3.0', currentSpecSource: 'installed package' });
    expect(report.notices).toHaveLength(1);
    expect(report.notices[0]).toMatchObject({ code: 'sveltekit-3-migration', severity: 'warning' });
    expect(report.notices[0]?.message).toContain('updates only the svedocs packages');
    expect(report.notices[0]?.message).toContain('TypeScript 6.x');
  });

  it('does not warn for upgrades staying on either side of the migration', () => {
    for (const [currentSpec, targetSpec] of [['0.2.3', '0.2.4'], ['0.3.0', '0.3.1']] as const) {
      expect(checkUpgradeCompatibility({ currentSpec, targetSpec, currentSpecSource: 'installed package' }).notices).toEqual([]);
    }
  });

  it('keeps actionable migration guidance when a dist-tag cannot be resolved yet', () => {
    const report = checkUpgradeCompatibility({ currentSpec: '0.2.4', targetSpec: 'latest', currentSpecSource: 'installed package' });
    expect(report.notices[0]?.message).toContain('SvelteKit 3');
    expect(report.notices[0]?.code).toBe('upgrade-span-unknown');
  });
});
