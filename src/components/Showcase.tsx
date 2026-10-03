import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { SHOWCASE } from '../utils/showcase';
import type { ShowcaseItem } from '../utils/showcase';

/**
 * Rotating sample designs for the first step, rendered ahead of time by
 * scripts/render-showcase.mjs. "Start with this design" loads it into the
 * builder.
 */
export const Showcase: React.FC<{ onUse: (item: ShowcaseItem) => void; compact?: boolean }> = ({ onUse, compact }) => {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % SHOWCASE.length), 5000);
    return () => clearInterval(t);
  }, [paused]);

  const item = SHOWCASE[i];
  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-theme-border shadow-lg bg-black ${compact ? 'h-40' : 'aspect-[16/10]'}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SHOWCASE.map((s, k) => (
        <img
          key={s.id}
          src={`/showcase/${s.id}.jpg`}
          srcSet={`/showcase/${s.id}.jpg 960w, /showcase/${s.id}-1600.jpg 1600w`}
          sizes={compact ? '100vw' : 'min(80vw, 1600px)'}
          alt={`${s.title}: ${s.caption}`}
          loading={k === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${k === i ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
        {!compact && <p className="text-[11px] uppercase tracking-widest text-pink-300 font-semibold">Get inspired</p>}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className={`${compact ? 'text-sm' : 'text-lg'} font-bold leading-tight truncate`}>{item.title}</p>
            <p className="text-xs text-white/75 truncate">{item.caption}</p>
          </div>
          <button
            onClick={() => onUse(item)}
            className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-xs font-semibold"
          >
            {compact ? 'Use this' : 'Start with this design'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-1.5 mt-2">
          {SHOWCASE.map((s, k) => (
            <button
              key={s.id}
              onClick={() => setI(k)}
              aria-label={`Show ${s.title}`}
              className={`h-1.5 rounded-full transition-all ${k === i ? 'w-5 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
