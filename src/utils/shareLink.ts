import type { CourtConfig, CourtType, PropertyType, SurfaceFinish, AccessoryId } from '../types/court';
import { ACCESSORIES, DEFAULT_COLORS } from './courtData';

// A shareable link carries the whole design in the URL hash (#d=…), so it
// works without a server and the design never leaves the link itself.

const HEX = /^#[0-9A-Fa-f]{6}$/;
const FINISHES: SurfaceFinish[] = ['smooth', 'textured', 'cushioned'];
const PROPS: PropertyType[] = ['residential', 'commercial'];

const toB64Url = (s: string) =>
  btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64Url = (s: string) =>
  decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

export function designUrl(c: CourtConfig): string {
  const payload = {
    t: c.type, p: c.propertyType, f: c.surfaceFinish,
    l: c.dimensions.length, w: c.dimensions.width, cd: c.customDimensions,
    c: c.colors, a: c.selectedAccessories,
  };
  return `${location.origin}${location.pathname}#d=${toB64Url(JSON.stringify(payload))}`;
}

/** Reads a design from the current URL hash; returns null if absent or invalid. */
export function readSharedDesign(): CourtConfig | null {
  const m = location.hash.match(/[#&]d=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const d = JSON.parse(fromB64Url(m[1]));
    const type = d.t as CourtType;
    if (!(type in DEFAULT_COLORS)) return null;
    const num = (v: unknown, lo: number, hi: number) =>
      typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v) : null;
    const length = num(d.l, 10, 300), width = num(d.w, 4, 150);
    if (length === null || width === null) return null;

    const defaults = DEFAULT_COLORS[type];
    const colors = { ...defaults };
    for (const k of ['surface', 'lines', 'border', 'keyArea', 'serviceBox', 'kitchen'] as const) {
      const v = d.c?.[k];
      if (typeof v === 'string' && HEX.test(v)) colors[k] = v;
    }
    const known = new Set(ACCESSORIES.filter((a) => a.compatibleCourts.includes(type)).map((a) => a.id));
    const selectedAccessories = Array.isArray(d.a)
      ? (d.a as unknown[]).filter((id): id is AccessoryId => typeof id === 'string' && known.has(id as AccessoryId))
      : [];

    return {
      type,
      propertyType: PROPS.includes(d.p) ? d.p : 'residential',
      surfaceFinish: FINISHES.includes(d.f) ? d.f : 'smooth',
      dimensions: { length, width },
      customDimensions: !!d.cd,
      colors,
      selectedAccessories,
    };
  } catch {
    return null;
  }
}
