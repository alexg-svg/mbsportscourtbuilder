import { describe, expect, it } from 'vitest';
import { normalizeAccessories, toggleAccessory } from '../../src/utils/courtData';
import type { AccessoryId } from '../../src/types/court';

const pick = (...ids: AccessoryId[]) => ids.reduce<AccessoryId[]>((sel, id) => toggleAccessory(sel, id), []);

describe('accessory rules', () => {
  it('allows only one lighting package, hoop setup, fence type and bench count', () => {
    expect(pick('lighting-2-pole', 'lighting-6-pole')).toEqual(['lighting-6-pole']);
    expect(pick('basketball-hoop-single', 'basketball-hoop-double')).toEqual(['basketball-hoop-double']);
    expect(pick('chain-link-fence', 'vinyl-fence')).toEqual(['vinyl-fence']);
    expect(pick('bench-2', 'bench-4')).toEqual(['bench-4']);
  });

  it('lets independent extras be combined', () => {
    expect(pick('water-fountain', 'scoreboards', 'bench-4', 'lighting-4-pole').sort())
      .toEqual(['bench-4', 'lighting-4-pole', 'scoreboards', 'water-fountain']);
  });

  it('adds chain link when windscreen is chosen', () => {
    expect(pick('windscreen').sort()).toEqual(['chain-link-fence', 'windscreen']);
    expect(pick('vinyl-fence', 'windscreen').sort()).toEqual(['chain-link-fence', 'windscreen']);
  });

  it('removes windscreen when its chain link goes away', () => {
    expect(pick('windscreen', 'chain-link-fence')).toEqual([]);
    expect(pick('windscreen', 'vinyl-fence')).toEqual(['vinyl-fence']);
  });

  it('a second click unselects', () => {
    expect(pick('bench-2', 'bench-2')).toEqual([]);
  });

  it('cleans up old saved selections: last choice wins, orphans dropped', () => {
    expect(normalizeAccessories(['chain-link-fence', 'vinyl-fence', 'windscreen', 'bench-2', 'bench-4', 'scoreboards']))
      .toEqual(['vinyl-fence', 'bench-4', 'scoreboards']);
  });
});
