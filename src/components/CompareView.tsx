import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Trash2, ArrowRight, Columns2 } from 'lucide-react';
import type { CourtConfig } from '../types/court';
import { CourtSVG } from './Court/CourtSVG';
import { ACCESSORIES, COURT_LABELS, FINISH_LABELS } from '../utils/courtData';
import { MAX_COMPARE, loadCompare, removeFromCompare, saveForCompare, type SavedDesign } from '../utils/compare';
import { toPayload } from '../utils/shareLink';
import { trackEvent } from '../utils/analytics';

// Side-by-side comparison of up to three saved designs. Rows that differ
// between the designs are highlighted.

const sameDesign = (a: CourtConfig, b: CourtConfig) => JSON.stringify(toPayload(a)) === JSON.stringify(toPayload(b));

const rowsFor = (c: CourtConfig) => ({
  Sport: `${COURT_LABELS[c.type]} · ${c.propertyType === 'commercial' ? 'Commercial' : 'Residential'}`,
  Size: `${c.dimensions.length} × ${c.dimensions.width} ft (${(c.dimensions.length * c.dimensions.width).toLocaleString('en-US')} sq ft)`,
  Surface: FINISH_LABELS[c.surfaceFinish],
  Colors: [c.colors.surface, c.colors.lines, c.colors.border].join(' '),
  Extras: ACCESSORIES.filter((a) => c.selectedAccessories.includes(a.id)).map((a) => a.name).join(', ') || 'None',
});
type Row = keyof ReturnType<typeof rowsFor>;
const ROWS: Row[] = ['Sport', 'Size', 'Surface', 'Colors', 'Extras'];

export default function CompareView({ current, onClose, onUse }: {
  current: CourtConfig; onClose: () => void; onUse: (config: CourtConfig) => void;
}) {
  const [list, setList] = useState<SavedDesign[]>(() => loadCompare());
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const alreadySaved = list.some((s) => sameDesign(s.config, current));
  const full = list.length >= MAX_COMPARE;

  // Rows whose value isn't the same across all saved designs
  const differs = useMemo(() => {
    const out = new Set<Row>();
    if (list.length < 2) return out;
    for (const r of ROWS) if (new Set(list.map((s) => rowsFor(s.config)[r])).size > 1) out.add(r);
    return out;
  }, [list]);

  const save = () => {
    setList(saveForCompare(current));
    trackEvent('design_saved_for_compare', { court_type: current.type });
  };

  return (
    <div className="fixed inset-0 z-50 bg-theme-base flex flex-col" role="dialog" aria-modal="true" aria-labelledby="compare-title">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-theme-border bg-theme-panel">
        <div className="flex items-center gap-2">
          <Columns2 className="w-5 h-5 text-pink-700 dark:text-pink-300" />
          <h2 id="compare-title" className="text-base font-bold text-theme-primary">Compare designs</h2>
        </div>
        <button ref={closeRef} onClick={onClose} className="p-2 rounded-lg hover:bg-theme-raised text-theme-muted" aria-label="Close comparison">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={save}
            disabled={alreadySaved || full}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-pink-700 hover:bg-pink-800 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> Save current design
          </button>
          <p className="text-xs text-theme-muted">
            {alreadySaved ? 'Your current design is already saved. Change something, then save it again to compare.'
              : full ? `You can compare up to ${MAX_COMPARE} designs. Remove one to save another.`
              : list.length === 0 ? 'Save your current design, change the colors, size or extras, then save again to see them side by side.'
              : 'Saved designs stay on this device.'}
          </p>
        </div>

        {list.length > 0 && (
          <div className={`grid gap-4 ${list.length === 1 ? 'max-w-xl' : list.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
            {list.map((s) => {
              const rows = rowsFor(s.config);
              return (
                <article key={s.id} className="rounded-xl border border-theme-border bg-theme-panel overflow-hidden flex flex-col" aria-label={s.label}>
                  <div className="px-4 py-2.5 flex items-center justify-between border-b border-theme-border">
                    <h3 className="text-sm font-bold text-theme-primary">{s.label}</h3>
                    {sameDesign(s.config, current) && <span className="text-[11px] font-semibold text-pink-700 dark:text-pink-300">Current</span>}
                  </div>
                  <div className="aspect-[900/560] bg-theme-canvas">
                    <CourtSVG config={s.config} width={900} height={560} hideHotspots />
                  </div>
                  <dl className="px-4 py-3 space-y-1.5 text-xs flex-1">
                    {ROWS.map((r) => (
                      <div key={r} className={`flex gap-3 rounded-md px-2 py-1 ${differs.has(r) ? 'bg-pink-600/10' : ''}`}>
                        <dt className="w-16 flex-shrink-0 text-theme-muted">{r}</dt>
                        <dd className={`text-theme-primary ${differs.has(r) ? 'font-semibold' : ''}`}>
                          {r === 'Colors' ? (
                            <span className="inline-flex gap-1 align-middle">
                              {[s.config.colors.surface, s.config.colors.lines, s.config.colors.border].map((c, i) => (
                                <span key={i} className="w-4 h-4 rounded border border-black/15" style={{ backgroundColor: c }} />
                              ))}
                            </span>
                          ) : rows[r]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="px-4 pb-4 flex gap-2">
                    <button
                      onClick={() => { onUse(s.config); trackEvent('compare_design_chosen', { court_type: s.config.type }); }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-pink-700 hover:bg-pink-800 text-white text-xs font-semibold"
                    >
                      Continue with this design <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setList(removeFromCompare(s.id))}
                      className="px-3 py-2 rounded-lg border border-theme-mid text-theme-muted hover:text-theme-primary"
                      aria-label={`Remove ${s.label}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
