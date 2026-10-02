import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Environment, Lightformer, Sky } from '@react-three/drei';
import type { SurfaceFinish } from '../../types/court';

// Procedural textures and scenery for the 3D preview. Everything is generated
// in-browser from canvases, so there are no image assets to download.

// ─── Seeded random ────────────────────────────────────────────────────────────
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!] as const;
}

// Soft blotches drawn with wrap-around so the texture tiles seamlessly
function blotches(ctx: CanvasRenderingContext2D, size: number, count: number, alpha: number, rand: () => number) {
  for (let i = 0; i < count; i++) {
    const x = rand() * size, y = rand() * size;
    const r = size * (0.06 + rand() * 0.22);
    const light = rand() > 0.5;
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, light ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
}

function grain(ctx: CanvasRenderingContext2D, size: number, amount: number, rand: () => number) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// Light and dark sand specks embedded in a slip-resistant coating
function sand(ctx: CanvasRenderingContext2D, size: number, rand: () => number) {
  for (let i = 0; i < 14000; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
}

export function toTexture(c: HTMLCanvasElement, srgb: boolean) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ─── Acrylic court surface ────────────────────────────────────────────────────
// Real acrylic coatings are satin, never glossy; finishes differ in grain.
const FINISH: Record<SurfaceFinish, { grain: number; blotch: number; roughness: number; bump: number }> = {
  smooth:    { grain: 8,  blotch: 0.010, roughness: 0.38, bump: 0.3 },
  textured:  { grain: 34, blotch: 0.012, roughness: 0.92, bump: 2.2 },
  cushioned: { grain: 18, blotch: 0.016, roughness: 0.70, bump: 1.0 },
};

const surfaceCache = new Map<SurfaceFinish, { map: THREE.Texture; bump: THREE.Texture }>();

function surfaceTextures(finish: SurfaceFinish) {
  let hit = surfaceCache.get(finish);
  if (hit) return hit;
  const f = FINISH[finish];
  const size = 512;

  const [mc, m] = canvas(size);
  m.fillStyle = 'rgb(236,236,236)';
  m.fillRect(0, 0, size, size);
  blotches(m, size, 40, f.blotch, rng(11));
  if (finish === 'textured') sand(m, size, rng(14));
  grain(m, size, f.grain, rng(12));

  const [bc, b] = canvas(size);
  b.fillStyle = 'rgb(128,128,128)';
  b.fillRect(0, 0, size, size);
  grain(b, size, 120, rng(13));

  hit = { map: toTexture(mc, true), bump: toTexture(bc, false) };
  surfaceCache.set(finish, hit);
  return hit;
}

export const FinishContext = createContext<SurfaceFinish>('smooth');

const TILE_FT = 20; // one texture tile covers 20 × 20 ft

// Clone a shared texture with its own repeat; clones share the GPU image.
export function useRepeated(base: THREE.Texture, rx: number, ry: number) {
  const tex = useMemo(() => {
    const t = base.clone();
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    return t;
  }, [base, rx, ry]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** Satin acrylic material for a court slab measuring wFt × hFt. */
export function SurfaceMaterial({ color, wFt, hFt, alpha = 1 }: {
  color: string; wFt: number; hFt: number; alpha?: number;
}) {
  const finish = useContext(FinishContext);
  const { map, bump } = surfaceTextures(finish);
  // Box top face: u runs along the box's X (court width), v along Z (length)
  const map2 = useRepeated(map, hFt / TILE_FT, wFt / TILE_FT);
  const bump2 = useRepeated(bump, hFt / TILE_FT, wFt / TILE_FT);
  const f = FINISH[finish];
  return (
    <meshStandardMaterial
      color={color}
      map={map2}
      bumpMap={bump2}
      bumpScale={f.bump}
      roughness={f.roughness}
      transparent={alpha < 1}
      opacity={alpha}
    />
  );
}

// ─── Painted line ribbons ─────────────────────────────────────────────────────
/** Flat strip of constant world width following a polyline in the XZ plane. */
export function ribbonGeometry(pts: [number, number, number][], width: number) {
  const n = pts.length;
  const pos = new Float32Array(n * 6);
  const nrm = new Float32Array(n * 6);
  const idx: number[] = [];
  const closed = n > 2 &&
    Math.hypot(pts[0][0] - pts[n - 1][0], pts[0][2] - pts[n - 1][2]) < 1e-6;

  for (let i = 0; i < n; i++) {
    const prev = pts[i > 0 ? i - 1 : closed ? n - 2 : 0];
    const next = pts[i < n - 1 ? i + 1 : closed ? 1 : n - 1];
    let dx = next[0] - prev[0], dz = next[2] - prev[2];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const ox = -dz * width / 2, oz = dx * width / 2;
    const [x, y, z] = pts[i];
    pos.set([x + ox, y, z + oz, x - ox, y, z - oz], i * 6);
    nrm.set([0, 1, 0, 0, 1, 0], i * 6);
    if (i < n - 1) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setIndex(idx);
  return g;
}

export function LinePaintMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.6} side={THREE.DoubleSide} />;
}

// ─── Lawn, apron, fence ──────────────────────────────────────────────────────
let grassTex: THREE.Texture | null = null;
function grassTexture() {
  if (grassTex) return grassTex;
  const size = 512;
  const [c, ctx] = canvas(size);
  ctx.fillStyle = '#4f7d3a';
  ctx.fillRect(0, 0, size, size);
  const rand = rng(21);
  blotches(ctx, size, 50, 0.045, rand);
  const greens = ['#3f6b2c', '#5a8c40', '#6a9a4a', '#46752f', '#7aa65a'];
  for (let i = 0; i < 9000; i++) {
    const x = rand() * size, y = rand() * size;
    ctx.strokeStyle = greens[Math.floor(rand() * greens.length)];
    ctx.globalAlpha = 0.5 + rand() * 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 3, y - 2 - rand() * 5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  grain(ctx, size, 14, rand);
  grassTex = toTexture(c, true);
  return grassTex;
}

export function Lawn({ size }: { size: number }) {
  const tex = useRepeated(grassTexture(), size / 1.6, size / 1.6);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#ffffff" map={tex} roughness={0.95} />
    </mesh>
  );
}

let plankTex: THREE.Texture | null = null;
function plankTexture() {
  if (plankTex) return plankTex;
  const size = 256;
  const [c, ctx] = canvas(size);
  const rand = rng(31);
  const boards = 8, bw = size / boards;
  for (let i = 0; i < boards; i++) {
    const v = 200 + Math.floor(rand() * 40);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(i * bw, 0, bw, size);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(i * bw, 0, 2, size);
    // vertical wood streaks
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = `rgba(0,0,0,${0.04 + rand() * 0.06})`;
      ctx.fillRect(i * bw + 3 + rand() * (bw - 6), 0, 1 + rand() * 2, size);
    }
  }
  grain(ctx, size, 16, rand);
  plankTex = toTexture(c, true);
  return plankTex;
}

const BOARDS_PER_UNIT = 0.5; // 8 boards (≈7.5 in each) per 0.5 units = 5 ft

function FenceRun({ position, length, alongZ }: {
  position: [number, number, number]; length: number; alongZ: boolean;
}) {
  const tex = useRepeated(plankTexture(), length / BOARDS_PER_UNIT, 1);
  const h = 0.6, t = 0.03;
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={alongZ ? [t, h, length] : [length, h, t]} />
      <meshStandardMaterial color="#9a6a46" map={tex} roughness={0.85} />
    </mesh>
  );
}

/** 6 ft cedar privacy fence around a rectangle of half-extents hx × hz. */
export function BackyardFence({ hx, hz }: { hx: number; hz: number }) {
  const y = 0.3;
  return (
    <group>
      <FenceRun position={[0, y, -hz]} length={hx * 2} alongZ={false} />
      <FenceRun position={[0, y, hz]} length={hx * 2} alongZ={false} />
      <FenceRun position={[-hx, y, 0]} length={hz * 2} alongZ />
      <FenceRun position={[hx, y, 0]} length={hz * 2} alongZ />
    </group>
  );
}

// ─── Trees and shrubs ────────────────────────────────────────────────────────
const LEAF = ['#3d6b2e', '#4a7d36', '#56893f', '#2f5a25', '#5f9445'];

export function LeafyTree({ position, height, seed }: {
  position: [number, number, number]; height: number; seed: number;
}) {
  const rand = rng(seed);
  const trunkH = height * 0.42;
  const crown = height * 0.32;
  const blobs = Array.from({ length: 5 }, () => ({
    p: [(rand() - 0.5) * crown, trunkH + crown * (0.55 + rand() * 0.7), (rand() - 0.5) * crown] as [number, number, number],
    r: crown * (0.55 + rand() * 0.35),
    c: LEAF[Math.floor(rand() * LEAF.length)],
  }));
  return (
    <group position={position} rotation={[0, rand() * Math.PI * 2, 0]}>
      <mesh position={[0, trunkH / 2 + 0.2, 0]} castShadow>
        <cylinderGeometry args={[height * 0.025, height * 0.04, trunkH + 0.4, 7]} />
        <meshStandardMaterial color="#5a4030" roughness={0.95} />
      </mesh>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.p} castShadow>
          <icosahedronGeometry args={[b.r, 1]} />
          <meshStandardMaterial color={b.c} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

export function Shrub({ position, size, seed }: {
  position: [number, number, number]; size: number; seed: number;
}) {
  const rand = rng(seed);
  return (
    <group position={position}>
      {Array.from({ length: 3 }, (_, i) => (
        <mesh key={i} position={[(rand() - 0.5) * size, size * 0.35, (rand() - 0.5) * size]} castShadow>
          <icosahedronGeometry args={[size * (0.4 + rand() * 0.25), 1]} />
          <meshStandardMaterial color={LEAF[Math.floor(rand() * LEAF.length)]} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// ─── Lighting ─────────────────────────────────────────────────────────────────
export type TimeOfDay = 'day' | 'sunset' | 'night';

const SUN: Record<TimeOfDay, [number, number, number]> = {
  day:    [100, 40, 60],
  sunset: [100, 3, 60],
  night:  [-60, 30, 40], // moon
};

export const FOG_COLOR: Record<TimeOfDay, string> = {
  day: '#d6e2ea', sunset: '#e8c9ab', night: '#0b1222',
};

/** Image-based lighting from a sky dome plus a sun (or moon) and ground bounce. */
export function SceneLighting({ span, mapSize, time, background = true }: {
  span: number; mapSize: number; time: TimeOfDay; background?: boolean;
}) {
  const r = span * 1.6 + 6;
  const sun = SUN[time];
  const len = Math.hypot(...sun);
  const dist = span * 3 + 4;
  const sunPos: [number, number, number] = [sun[0] / len * dist, sun[1] / len * dist, sun[2] / len * dist];
  const sky = <Sky sunPosition={sun} turbidity={time === 'sunset' ? 8 : 5} rayleigh={time === 'sunset' ? 2.5 : 0.6} mieCoefficient={0.004} />;
  const sunLight = {
    day:    { intensity: 2.4,  color: '#fff6e8' },
    sunset: { intensity: 2.6,  color: '#ff9a52' },
    night:  { intensity: 0.22, color: '#a9bcff' },
  }[time];
  return (
    <>
      {background && (time === 'night' ? <color attach="background" args={[FOG_COLOR.night]} /> : sky)}
      <Environment key={time} frames={1} resolution={128} environmentIntensity={{ day: 1, sunset: 0.5, night: 0.2 }[time]}>
        {time === 'night'
          ? <Lightformer form="rect" color="#2a3a66" intensity={1} position={[0, 40, 0]} rotation-x={Math.PI / 2} scale={[300, 300, 1]} />
          : sky}
        {time !== 'night' && (
          <Lightformer form="circle" color={time === 'sunset' ? '#ffb070' : '#fff4e0'} intensity={6}
            position={[sunPos[0] * 10, Math.max(sunPos[1] * 10, 8), sunPos[2] * 10]} scale={18} />
        )}
        <Lightformer form="rect" color="#56803f" intensity={time === 'night' ? 0.05 : 0.5} position={[0, -30, 0]}
          rotation-x={-Math.PI / 2} scale={[300, 300, 1]} />
      </Environment>
      <hemisphereLight args={[time === 'sunset' ? '#ffd9b8' : '#cfe3ff', '#4a6b35', { day: 0.25, sunset: 0.1, night: 0.06 }[time]]} />
      <directionalLight
        position={sunPos}
        intensity={sunLight.intensity}
        color={sunLight.color}
        castShadow={time !== 'night'}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={span * 10 + 20}
        shadow-camera-left={-r}
        shadow-camera-right={r}
        shadow-camera-top={r}
        shadow-camera-bottom={-r}
      />
    </>
  );
}

/** Marks every mesh inside as casting and receiving shadows. */
export function ShadowGroup({ children, deps }: { children: React.ReactNode; deps: unknown }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
  }, [deps]);
  return <group ref={ref}>{children}</group>;
}
