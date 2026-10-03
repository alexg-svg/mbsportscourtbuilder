import type { CourtConfig } from '../types/court';
import { fromPayload, toPayload } from './shareLink';

// Designs saved for side-by-side comparison, kept in this browser only.
// Stored in the same validated format as share links (logos are left out).

const KEY = 'mb_compare';
export const MAX_COMPARE = 3;

export interface SavedDesign { id: string; label: string; savedAt: number; config: CourtConfig }

export function loadCompare(): SavedDesign[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((r: any) => {
      const config = fromPayload(r?.d);
      return config && typeof r.id === 'string' && typeof r.label === 'string'
        ? [{ id: r.id, label: r.label.slice(0, 40), savedAt: Number(r.savedAt) || 0, config }]
        : [];
    }).slice(0, MAX_COMPARE);
  } catch {
    return [];
  }
}

function store(list: SavedDesign[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.map((s) => ({ id: s.id, label: s.label, savedAt: s.savedAt, d: toPayload(s.config) }))));
  } catch { /* storage blocked: comparison just won't persist */ }
}

/** Saves a design; returns the new list (unchanged if already full). */
export function saveForCompare(config: CourtConfig): SavedDesign[] {
  const list = loadCompare();
  if (list.length >= MAX_COMPARE) return list;
  const used = new Set(list.map((s) => s.label));
  const label = ['Design A', 'Design B', 'Design C'].find((l) => !used.has(l)) ?? `Design ${list.length + 1}`;
  const next = [...list, { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, label, savedAt: Date.now(), config }];
  store(next);
  return next;
}

export function removeFromCompare(id: string): SavedDesign[] {
  const next = loadCompare().filter((s) => s.id !== id);
  store(next);
  return next;
}
