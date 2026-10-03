import { beforeEach, describe, expect, it } from 'vitest';
import type { CourtConfig } from '../../src/types/court';

const store = new Map<string, string>();
Object.assign(globalThis, {
  location: { origin: 'https://builder.test', pathname: '/', search: '', hash: '' },
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
});
const { loadCompare, saveForCompare, removeFromCompare, MAX_COMPARE } = await import('../../src/utils/compare');

const design = (surface: string): CourtConfig => ({
  type: 'pickleball', propertyType: 'residential', surfaceFinish: 'smooth',
  dimensions: { length: 44, width: 20 }, customDimensions: false,
  colors: { surface, lines: '#FFFFFF', border: '#1E40AF', kitchen: '#60A5FA' }, selectedAccessories: ['pickleball-net'],
});

describe('compare list', () => {
  beforeEach(() => store.clear());

  it('labels saved designs A, B, C and stops at three', () => {
    saveForCompare(design('#3B82F6'));
    saveForCompare(design('#2D7D3A'));
    saveForCompare(design('#C8440C'));
    const list = saveForCompare(design('#111827'));
    expect(list).toHaveLength(MAX_COMPARE);
    expect(list.map((s) => s.label)).toEqual(['Design A', 'Design B', 'Design C']);
    expect(list[1].config.colors.surface).toBe('#2D7D3A');
  });

  it('reuses a freed label after removing one', () => {
    const [a] = saveForCompare(design('#3B82F6'));
    saveForCompare(design('#2D7D3A'));
    removeFromCompare(a.id);
    expect(saveForCompare(design('#C8440C')).map((s) => s.label).sort()).toEqual(['Design A', 'Design B']);
  });

  it('ignores corrupted storage', () => {
    store.set('mb_compare', '{"not":"a list"}');
    expect(loadCompare()).toEqual([]);
    store.set('mb_compare', JSON.stringify([{ id: 'x', label: 'Design A', d: { t: 'quidditch' } }]));
    expect(loadCompare()).toEqual([]);
  });
});
