import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { X, ImagePlus, RotateCw, Undo2, Download, Sun, Lock } from 'lucide-react';
import type { CourtConfig } from '../../types/court';
import { SceneContents, BORDER_PAD, S } from '../Court/Court3D';
import { solveCamera, cameraWorldMatrix, fovFromFocal } from './yardMath';
import type { Pt, YardCamera } from './yardMath';
import { trackEvent } from '../../utils/analytics';

// "See it in your yard": the customer uploads a photo, taps the four corners
// where the court should go, and we render the 3D court into the photo from
// the camera position recovered from those taps. The photo never leaves the
// device.

const MAX_PHOTO = 1600; // longest side after downscaling, in pixels

interface Photo { url: string; w: number; h: number }

function loadPhoto(file: File): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, MAX_PHOTO / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(src);
      resolve({ url: c.toDataURL('image/jpeg', 0.9), w, h });
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('Could not read that image')); };
    img.src = src;
  });
}

/** Points the R3F camera at the solved pose. */
function PhotoCamera({ matrix, fov }: { matrix: number[]; fov: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.fov = fov;
    camera.near = 0.01;
    camera.far = 1000;
    camera.updateProjectionMatrix();
    new THREE.Matrix4().fromArray(matrix).decompose(camera.position, camera.quaternion, camera.scale);
    camera.updateMatrixWorld();
  }, [camera, matrix, fov]);
  return null;
}

const CORNER_HINTS = ['first corner', 'next corner along the long side', 'third corner', 'last corner'];

export default function YardView({ config, onClose }: { config: CourtConfig; onClose: () => void }) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [pts, setPts] = useState<Pt[]>([]);
  const [turn, setTurn] = useState(0);
  const [exposure, setExposure] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const glWrap = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragging = useRef<number | null>(null);
  const placedOnce = useRef(false);

  useEffect(() => { trackEvent('yard_preview_opened', { court_type: config.type }); }, [config.type]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Track the available stage size so the photo can be fitted inside it
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [photo]);

  const fit = photo && box.w > 0
    ? (() => {
        const k = Math.min(box.w / photo.w, box.h / photo.h);
        return { k, w: photo.w * k, h: photo.h * k, x: (box.w - photo.w * k) / 2, y: (box.h - photo.h * k) / 2 };
      })()
    : null;

  const { length: L, width: W } = config.dimensions;
  const pad = BORDER_PAD[config.type] ?? 8;
  const hx = (W / 2 + pad) * S, hz = (L / 2 + pad) * S;

  const solution = useMemo<YardCamera | null>(() => {
    if (!photo || pts.length < 4) return null;
    const ordered = [0, 1, 2, 3].map((i) => pts[(i + turn) % 4]);
    return solveCamera(ordered, hz * 2, hx * 2, photo.w, photo.h);
  }, [photo, pts, turn, hx, hz]);

  useEffect(() => {
    if (pts.length === 4 && !solution) setError("Those corners don't make a court shape. Try placing them again.");
    else setError(null);
    if (solution && !placedOnce.current) {
      placedOnce.current = true;
      trackEvent('yard_court_placed', { court_type: config.type });
    }
  }, [pts.length, solution, config.type]);

  const camMatrix = useMemo(() => (solution ? cameraWorldMatrix(solution, hx, hz) : null), [solution, hx, hz]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhoto(await loadPhoto(file));
      setPts([]); setTurn(0); setExposure(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that image');
    }
  };

  const toPhoto = (e: React.PointerEvent): Pt => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const k = fit!.k;
    return [
      Math.min(Math.max((e.clientX - r.left) / k, 0), photo!.w),
      Math.min(Math.max((e.clientY - r.top) / k, 0), photo!.h),
    ];
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!fit) return;
    const p = toPhoto(e);
    // Grab the nearest handle if close enough, otherwise add a corner
    const reach = 28 / fit.k;
    let best = -1, bestD = Infinity;
    pts.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bestD) { bestD = d; best = i; } });
    if (best >= 0 && bestD < reach) {
      dragging.current = best;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } else if (pts.length < 4) {
      setPts([...pts, p]);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current === null || !fit) return;
    const p = toPhoto(e);
    const i = dragging.current;
    setPts((prev) => prev.map((q, j) => (j === i ? p : q)));
  };
  const onPointerUp = () => { dragging.current = null; };

  const download = useCallback(() => {
    if (!photo) return;
    const glCanvas = glWrap.current?.querySelector('canvas');
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = photo.w; c.height = photo.h;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, photo.w, photo.h);
      if (glCanvas) ctx.drawImage(glCanvas, 0, 0, photo.w, photo.h);
      const fs = Math.max(14, Math.round(photo.w / 60));
      ctx.font = `600 ${fs}px system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText('mbsportsbuilders.com', photo.w - fs, photo.h - fs);
      const a = document.createElement('a');
      a.href = c.toDataURL('image/jpeg', 0.9);
      a.download = 'my-court-in-my-yard.jpg';
      a.click();
      trackEvent('yard_preview_downloaded', { court_type: config.type });
    };
    img.src = photo.url;
  }, [photo, config.type]);

  const instruction = !photo
    ? null
    : pts.length < 4
      ? `Tap the ${CORNER_HINTS[pts.length]} of where your court will go (${pts.length + 1} of 4)`
      : 'Drag the corners to fine-tune. Use Rotate if the court is facing the wrong way.';

  const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors';

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col text-white" role="dialog" aria-modal="true" aria-label="See it in your yard">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-sm font-bold">See it in your yard</h2>
          <p className="text-[11px] text-white/60 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Your photo stays on your device
          </p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {/* Stage */}
      <div ref={stage} className="relative flex-1 min-h-0 m-3">
        {!photo ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-6">
            <ImagePlus className="w-12 h-12 text-pink-400" />
            <div>
              <p className="text-lg font-bold">Upload a photo of your yard</p>
              <p className="text-sm text-white/60 mt-1 max-w-md">
                Stand at a corner of the area, or take it from an upstairs window, so the whole
                space where the court will go is in the picture.
              </p>
            </div>
            <button onClick={() => fileInput.current?.click()} className={`${btn} bg-pink-600 hover:bg-pink-500 text-sm px-5 py-3`}>
              <ImagePlus className="w-4 h-4" /> Choose photo
            </button>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        ) : fit && (
          <div className="absolute" style={{ left: fit.x, top: fit.y, width: fit.w, height: fit.h }}>
            <img src={photo.url} alt="Your yard" className="absolute inset-0 w-full h-full select-none" draggable={false} />

            {camMatrix && solution && (
              <div ref={glWrap} className="absolute inset-0 pointer-events-none">
                <Canvas
                  shadows="soft"
                  dpr={[1, 2]}
                  gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true,
                    toneMapping: THREE.NeutralToneMapping, toneMappingExposure: exposure }}
                  camera={{ fov: fovFromFocal(solution.f, photo.h) }}
                >
                  <PhotoCamera matrix={camMatrix} fov={fovFromFocal(solution.f, photo.h)} />
                  <SceneContents config={config} time="day" mapSize={2048} bare />
                </Canvas>
              </div>
            )}

            {/* Corner taps and handles */}
            <svg
              className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {pts.length > 1 && (
                <polygon
                  points={pts.map(([x, y]) => `${x * fit.k},${y * fit.k}`).join(' ')}
                  fill={pts.length === 4 ? 'none' : 'rgba(236,72,153,0.12)'}
                  stroke="white" strokeOpacity={solution ? 0.35 : 0.9} strokeWidth={1.5} strokeDasharray="6 4"
                />
              )}
              {pts.map(([x, y], i) => (
                <g key={i} transform={`translate(${x * fit.k},${y * fit.k})`}>
                  <circle r={solution ? 9 : 12} fill="rgba(219,39,119,0.85)" stroke="white" strokeWidth={2} />
                  <text textAnchor="middle" dy="4" fontSize="11" fontWeight="700" fill="white">{i + 1}</text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* Instructions and controls */}
      {photo && (
        <div className="px-4 pb-4 space-y-3">
          <p className={`text-xs text-center ${error ? 'text-red-400' : 'text-white/80'}`}>{error ?? instruction}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button onClick={() => fileInput.current?.click()} className={`${btn} bg-white/10 hover:bg-white/20`}>
              <ImagePlus className="w-3.5 h-3.5" /> New photo
            </button>
            <button onClick={() => { setPts([]); setTurn(0); }} disabled={!pts.length}
              className={`${btn} bg-white/10 hover:bg-white/20 disabled:opacity-40`}>
              <Undo2 className="w-3.5 h-3.5" /> Reset corners
            </button>
            <button onClick={() => setTurn((t) => (t + 1) % 4)} disabled={!solution}
              className={`${btn} bg-white/10 hover:bg-white/20 disabled:opacity-40`}>
              <RotateCw className="w-3.5 h-3.5" /> Rotate court
            </button>
            {solution && (
              <label className={`${btn} bg-white/10`}>
                <Sun className="w-3.5 h-3.5" /> Brightness
                <input type="range" min={0.5} max={1.5} step={0.05} value={exposure}
                  onChange={(e) => setExposure(Number(e.target.value))} className="w-24 accent-pink-500" />
              </label>
            )}
            <button onClick={download} disabled={!solution}
              className={`${btn} bg-pink-600 hover:bg-pink-500 disabled:opacity-40`}>
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
