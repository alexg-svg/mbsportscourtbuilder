import { beforeEach, describe, expect, it } from 'vitest';
import type { CourtConfig } from '../../src/types/court';

// Minimal browser globals for the link/draft helpers
const store = new Map<string, string>();
Object.assign(globalThis, {
  location: { origin: 'https://builder.test', pathname: '/', search: '', hash: '' },
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
});
const { designUrl, readSharedDesign, saveDraft, loadDraft, clearDraft } = await import('../../src/utils/shareLink');

const design: CourtConfig = {
  type: 'tennis', propertyType: 'commercial', surfaceFinish: 'textured',
  dimensions: { length: 78, width: 36 }, customDimensions: false,
  colors: { surface: '#2D7D3A', lines: '#FFFFFF', border: '#14532D', serviceBox: '#0F766E' },
  selectedAccessories: ['tennis-net', 'lighting-4-pole'],
};
const openLink = (url: string) => { (globalThis as any).location.hash = new URL(url).hash; };
const tamper = (obj: unknown) =>
  `#d=${Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;

describe('share links', () => {
  it('round-trips a design', () => {
    openLink(designUrl(design));
    expect(readSharedDesign()).toEqual(design);
  });

  it('never puts the logo in a link', () => {
    const url = designUrl({ ...design, logo: { url: 'data:image/png;base64,AAAA', w: 10, h: 10 } });
    expect(url).not.toContain('AAAA');
  });

  it('rejects garbage and unknown court types', () => {
    (globalThis as any).location.hash = '#d=not-valid';
    expect(readSharedDesign()).toBeNull();
    (globalThis as any).location.hash = tamper({ t: 'quidditch', l: 50, w: 30 });
    expect(readSharedDesign()).toBeNull();
  });

  it('rejects sizes outside the allowed range', () => {
    (globalThis as any).location.hash = tamper({ t: 'tennis', l: 999, w: 36 });
    expect(readSharedDesign()).toBeNull();
  });

  it('drops unknown accessories and invalid colors', () => {
    (globalThis as any).location.hash = tamper({ t: 'tennis', l: 78, w: 36, a: ['tennis-net', 'jetpack', 'futsal-goals'],
      c: { surface: 'red; drop table', lines: '#000000' } });
    const d = readSharedDesign()!;
    expect(d.selectedAccessories).toEqual(['tennis-net']);
    expect(d.colors.surface).toBe('#2D7D3A'); // tennis default
    expect(d.colors.lines).toBe('#000000');
  });
});

describe('drafts', () => {
  beforeEach(() => { store.clear(); });

  it('saves and restores the design, step and logo', () => {
    const logo = { url: 'data:image/png;base64,iVBORw0KGgo=', w: 200, h: 100 };
    saveDraft({ ...design, logo }, 4);
    const d = loadDraft()!;
    expect(d.step).toBe(4);
    expect(d.config).toEqual({ ...design, logo });
  });

  it('ignores drafts older than 60 days', () => {
    saveDraft(design, 3);
    const raw = JSON.parse(store.get('mb_design_draft')!);
    store.set('mb_design_draft', JSON.stringify({ ...raw, savedAt: Date.now() - 61 * 86_400_000 }));
    expect(loadDraft()).toBeNull();
  });

  it('drops a logo that is not a PNG data URL', () => {
    saveDraft(design, 2);
    const raw = JSON.parse(store.get('mb_design_draft')!);
    store.set('mb_design_draft', JSON.stringify({ ...raw, logo: { url: 'javascript:alert(1)', w: 1, h: 1 } }));
    expect(loadDraft()!.config.logo).toBeUndefined();
  });

  it('clears', () => {
    saveDraft(design, 2);
    clearDraft();
    expect(loadDraft()).toBeNull();
  });
});
