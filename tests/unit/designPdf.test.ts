import { describe, expect, it } from 'vitest';
import { buildDesignPdf } from '../../src/utils/designPdf';
import type { CourtConfig } from '../../src/types/court';

const config: CourtConfig = {
  type: 'basketball', propertyType: 'residential', surfaceFinish: 'smooth',
  dimensions: { length: 47, width: 50 }, customDimensions: false,
  colors: { surface: '#C8440C', lines: '#FFFFFF', border: '#1A3A6B', keyArea: '#1A3A6B' },
  selectedAccessories: ['basketball-hoop-single', 'lighting-2-pole'],
};
// Smallest valid-looking JPEG header; the writer passes JPEG bytes through untouched
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]).toString('base64');

describe('buildDesignPdf', () => {
  it('writes a structurally valid two-page PDF', async () => {
    const pdf = Buffer.from(await buildDesignPdf(config, { b64: jpeg, w: 1200, h: 750 }, { b64: jpeg, w: 900, h: 560 }).arrayBuffer());
    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/Count 2');

    // Every xref offset must point at the start of its object
    const xrefAt = Number(text.match(/startxref\n(\d+)/)![1]);
    const xref = text.slice(xrefAt).split('\n');
    const count = Number(xref[1].split(' ')[1]);
    for (let id = 1; id < count; id++) {
      const offset = Number(xref[2 + id].slice(0, 10));
      expect(text.slice(offset, offset + 12)).toMatch(new RegExp(`^${id} 0 obj`));
    }
  });

  it('includes the design details', async () => {
    const text = Buffer.from(await buildDesignPdf(config).arrayBuffer()).toString('latin1');
    expect(text).toContain('Basketball Court');
    expect(text).toContain('Half Court');
    expect(text).toContain('Court Red');
    expect(text).toContain('Lighting \x96 2 Poles'); // en dash in WinAnsi
  });
});
