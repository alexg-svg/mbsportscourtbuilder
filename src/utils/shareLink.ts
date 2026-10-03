import type { CourtConfig, CourtLogo, CourtType, PropertyType, SurfaceFinish, AccessoryId } from '../types/court';
import { ACCESSORIES, DEFAULT_COLORS, DIM_LIMITS, SPACE_LIMITS, normalizeAccessories } from './courtData';

// Designs travel in two ways: a shareable link that carries the whole design
// in the URL hash (#d=…, no server needed), and an autosaved draft in this
// browser's localStorage. Both use the same compact payload and the same
// validation, so a tampered link or stale draft can never break the app.

const HEX = /^#[0-9A-Fa-f]{6}$/;
const FINISHES: SurfaceFinish[] = ['smooth', 'textured', 'cushioned'];
const PROPS: PropertyType[] = ['residential', 'commercial'];
const DRAFT_KEY = 'mb_design_draft';
const MAX_LOGO_CHARS = 700_000;

const toB64Url = (s: string) =>
  btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64Url = (s: string) =>
  decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

/** Compact payload. The logo is left out of share links (too long for a URL). */
function toPayload(c: CourtConfig) {
  return {
    t: c.type, p: c.propertyType, f: c.surfaceFinish,
    l: c.dimensions.length, w: c.dimensions.width, cd: c.customDimensions,
    c: c.colors, a: c.selectedAccessories,
    ...(c.space ? { s: [c.space.length, c.space.width] } : {}),
  };
}

/** Validates an untrusted payload; returns null if it isn't a usable design. */
function fromPayload(d: any): CourtConfig | null {
  if (!d || typeof d !== 'object') return null;
  const type = d.t as CourtType;
  if (typeof type !== 'string' || !(type in DEFAULT_COLORS)) return null;
  const num = (v: unknown, lo: number, hi: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v) : null;
  const length = num(d.l, DIM_LIMITS.length.min, DIM_LIMITS.length.max);
  const width = num(d.w, DIM_LIMITS.width.min, DIM_LIMITS.width.max);
  if (length === null || width === null) return null;

  const colors = { ...DEFAULT_COLORS[type] };
  for (const k of ['surface', 'lines', 'border', 'keyArea', 'serviceBox', 'kitchen'] as const) {
    const v = d.c?.[k];
    if (typeof v === 'string' && HEX.test(v)) colors[k] = v;
  }
  const known = new Set(ACCESSORIES.filter((a) => a.compatibleCourts.includes(type)).map((a) => a.id));
  const selectedAccessories = normalizeAccessories(Array.isArray(d.a)
    ? (d.a as unknown[]).filter((id): id is AccessoryId => typeof id === 'string' && known.has(id as AccessoryId))
    : []);

  const sl = Array.isArray(d.s) ? num(d.s[0], SPACE_LIMITS.min, SPACE_LIMITS.max) : null;
  const sw = Array.isArray(d.s) ? num(d.s[1], SPACE_LIMITS.min, SPACE_LIMITS.max) : null;

  return {
    ...(sl !== null && sw !== null ? { space: { length: sl, width: sw } } : {}),
    type,
    propertyType: PROPS.includes(d.p) ? d.p : 'residential',
    surfaceFinish: FINISHES.includes(d.f) ? d.f : 'smooth',
    dimensions: { length, width },
    customDimensions: !!d.cd,
    colors,
    selectedAccessories,
  };
}

function validLogo(v: any): CourtLogo | undefined {
  return v && typeof v.url === 'string' && v.url.startsWith('data:image/png;base64,') && v.url.length <= MAX_LOGO_CHARS
    && Number.isFinite(v.w) && Number.isFinite(v.h) && v.w > 0 && v.h > 0
    ? { url: v.url, w: v.w, h: v.h } : undefined;
}

export function designUrl(c: CourtConfig): string {
  return `${location.origin}${location.pathname}#d=${toB64Url(JSON.stringify(toPayload(c)))}`;
}

/** Reads a design from the current URL hash; returns null if absent or invalid. */
export function readSharedDesign(): CourtConfig | null {
  const m = location.hash.match(/[#&]d=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    return fromPayload(JSON.parse(fromB64Url(m[1])));
  } catch {
    return null;
  }
}

// ─── Autosaved draft ──────────────────────────────────────────────────────────
export interface Draft { config: CourtConfig; step: number; savedAt: number }

export function saveDraft(config: CourtConfig, step: number) {
  try {
    const logo = config.logo && config.logo.url.length <= MAX_LOGO_CHARS ? config.logo : undefined;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ d: toPayload(config), logo, step, savedAt: Date.now() }));
  } catch { /* storage full or blocked: autosave is best-effort */ }
}

/** The saved draft, if any and still valid (drafts expire after 60 days). */
export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    const config = fromPayload(v.d);
    if (!config || typeof v.step !== 'number' || v.step < 1 || v.step > 5) return null;
    if (typeof v.savedAt !== 'number' || Date.now() - v.savedAt > 60 * 86_400_000) return null;
    const logo = validLogo(v.logo);
    return { config: logo ? { ...config, logo } : config, step: Math.floor(v.step), savedAt: v.savedAt };
  } catch {
    return null;
  }
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}
