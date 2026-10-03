import { describe, expect, it } from 'vitest';
import {
  ACCESSORIES, COURT_LABELS, COURT_PRESETS, DEFAULT_COLORS, DIM_LIMITS, logoPlacement, logoBox,
} from '../../src/utils/courtData';
import type { CourtType } from '../../src/types/court';

const types = Object.keys(COURT_LABELS) as CourtType[];

describe('court catalog', () => {
  it('has colors and at least one preset for every sport', () => {
    for (const t of types) {
      expect(DEFAULT_COLORS[t], t).toBeDefined();
      expect(COURT_PRESETS.some((p) => p.type === t), t).toBe(true);
    }
  });

  it('keeps every preset inside the allowed size range', () => {
    for (const p of COURT_PRESETS) {
      expect(p.dimensions.length, p.id).toBeGreaterThanOrEqual(DIM_LIMITS.length.min);
      expect(p.dimensions.length, p.id).toBeLessThanOrEqual(DIM_LIMITS.length.max);
      expect(p.dimensions.width, p.id).toBeGreaterThanOrEqual(DIM_LIMITS.width.min);
      expect(p.dimensions.width, p.id).toBeLessThanOrEqual(DIM_LIMITS.width.max);
    }
  });

  it('only lists real sports as accessory-compatible', () => {
    for (const a of ACCESSORIES) for (const t of a.compatibleCourts) expect(types, a.id).toContain(t);
  });

  it('places the logo fully inside the court for every preset', () => {
    for (const p of COURT_PRESETS) {
      const { length: L, width: W } = p.dimensions;
      const at = logoPlacement(p.type, L, W);
      for (const shape of [{ w: 400, h: 200 }, { w: 200, h: 400 }]) {
        const box = logoBox(shape, at.size);
        expect(at.x - box.w / 2, p.id).toBeGreaterThanOrEqual(0);
        expect(at.x + box.w / 2, p.id).toBeLessThanOrEqual(L);
        expect(at.y - box.h / 2, p.id).toBeGreaterThanOrEqual(0);
        expect(at.y + box.h / 2, p.id).toBeLessThanOrEqual(W);
      }
    }
  });
});
