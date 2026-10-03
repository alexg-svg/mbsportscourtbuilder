import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, createRoot, extend, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import type { CourtConfig, CourtType } from '../../types/court';
import {
  FinishContext, SurfaceMaterial, LinePaintMaterial, ribbonGeometry,
  Lawn, BackyardFence, LeafyTree, Shrub, SceneLighting, ShadowGroup, FOG_COLOR,
} from './realism';
import type { TimeOfDay } from './realism';
import { trackEvent } from '../../utils/analytics';
import {
  SportNet, BasketballGoal, Goal, LightPole, PerimeterFence, PlayerBench, DasherBoards,
} from './equipment';

export const S = 0.1; // 1 foot = 0.1 THREE units
const LINE_W = 0.035; // painted line width (≈4 in)
const LINE_Y = 0.026; // top of the painted lines

// Court-feet → THREE world coords (length along Z, width along X)
const tx = (y: number, W: number) => (y - W / 2) * S;
const tz = (x: number, L: number) => (x - L / 2) * S;

function arcPts(
  cxFt: number, cyFt: number, r: number,
  a0: number, a1: number,
  L: number, W: number, n = 56,
): [number, number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (a1 - a0) * (i / n);
    return [tx(cyFt + r * Math.sin(a), W), LINE_Y, tz(cxFt + r * Math.cos(a), L)];
  });
}

// ─── Primitive building blocks ────────────────────────────────────────────────

// Roughness now comes from the surface finish (FinishContext); the prop is kept
// so existing call sites stay valid.
function Slab({ x, y, w, h, L, W, color, alpha = 1, yOff = 0.005 }: {
  x: number; y: number; w: number; h: number;
  L: number; W: number; color: string; alpha?: number; yOff?: number; roughness?: number;
}) {
  return (
    <mesh position={[tx(y + h / 2, W), yOff, tz(x + w / 2, L)]} receiveShadow>
      <boxGeometry args={[h * S, 0.01, w * S]} />
      <SurfaceMaterial color={color} wFt={w} hFt={h} alpha={alpha} />
    </mesh>
  );
}

function Seg({ x1, y1, x2, y2, L, W, color, lw = LINE_W }: {
  x1: number; y1: number; x2: number; y2: number;
  L: number; W: number; color: string; lw?: number;
}) {
  const dX3 = (y2 - y1) * S;
  const dZ3 = (x2 - x1) * S;
  const len = Math.sqrt(dX3 * dX3 + dZ3 * dZ3);
  if (len < 0.001) return null;
  return (
    <mesh
      position={[tx((y1 + y2) / 2, W), 0.022, tz((x1 + x2) / 2, L)]}
      rotation={[0, Math.atan2(dX3, dZ3), 0]}
    >
      <boxGeometry args={[lw, 0.008, len]} />
      <LinePaintMaterial color={color} />
    </mesh>
  );
}

function Border({ x, y, w, h, L, W, color, lw = LINE_W }: {
  x: number; y: number; w: number; h: number;
  L: number; W: number; color: string; lw?: number;
}) {
  return (
    <>
      <Seg x1={x}     y1={y}     x2={x + w} y2={y}     L={L} W={W} color={color} lw={lw} />
      <Seg x1={x + w} y1={y}     x2={x + w} y2={y + h} L={L} W={W} color={color} lw={lw} />
      <Seg x1={x + w} y1={y + h} x2={x}     y2={y + h} L={L} W={W} color={color} lw={lw} />
      <Seg x1={x}     y1={y + h} x2={x}     y2={y}     L={L} W={W} color={color} lw={lw} />
    </>
  );
}

// Arcs are flat painted ribbons with the same world width as straight lines
function ArcLine({ cxFt, cyFt, r, a0, a1, L, W, color, lw = LINE_W, n = 56 }: {
  cxFt: number; cyFt: number; r: number; a0: number; a1: number;
  L: number; W: number; color: string; lw?: number; n?: number;
}) {
  const geo = useMemo(
    () => ribbonGeometry(arcPts(cxFt, cyFt, r, a0, a1, L, W, n), lw),
    [cxFt, cyFt, r, a0, a1, L, W, n, lw],
  );
  return (
    <mesh geometry={geo} receiveShadow>
      <LinePaintMaterial color={color} />
    </mesh>
  );
}

// ─── Surroundings ─────────────────────────────────────────────────────────────
// Width of the colored out-of-bounds border each court draws around itself (ft)
export const BORDER_PAD: Partial<Record<CourtType, number>> = {
  'bocce-ball': 4, shuffleboard: 4, 'four-square': 4, badminton: 6,
};
const APRON_FT = 3; // concrete walkway around the finished court

function Apron({ L, W, pad }: { L: number; W: number; pad: number }) {
  const e = pad + APRON_FT;
  return (
    <mesh position={[0, 0.002, 0]} receiveShadow>
      <boxGeometry args={[(W + e * 2) * S, 0.01, (L + e * 2) * S]} />
      <meshStandardMaterial color="#b9b4aa" roughness={0.92} />
    </mesh>
  );
}

// Fence and trees sit a fixed real-world distance from the court so they read
// at true scale (6 ft fence, 25–35 ft trees) whatever the court size.
function Surroundings({ L, W, pad, residential }: {
  L: number; W: number; pad: number; residential: boolean;
}) {
  const hx = ((W / 2) + pad + APRON_FT) * S;
  const hz = ((L / 2) + pad + APRON_FT) * S;
  const fx = hx + 2.2, fz = hz + 2.2; // fence ≈ 22 ft past the apron
  // Tall trees stay on the far sides (−X, −Z) so they frame the court without
  // blocking the corner and courtside cameras, which sit on the +X / +Z side.
  const trees: [number, number, number, number][] = [
    [-fx - 1.4, -fz * 0.6, 3.2, 1], [-fx - 2.4, 0, 2.6, 2], [-fx - 1.2, fz * 0.65, 3.0, 3],
    [-fx * 0.55, -fz - 1.8, 3.1, 7], [fx * 0.05, -fz - 2.4, 2.8, 4], [fx * 0.6, -fz - 1.3, 2.7, 8],
    [-fx - 1.5, -fz - 1.6, 3.4, 5], [fx + 1.6, -fz - 1.2, 2.9, 9], [-fx - 1.3, fz + 1.5, 2.5, 6],
  ];
  const shrubs: [number, number, number][] = [
    [-fx + 0.5, -fz + 0.5, 11], [fx - 0.5, -fz + 0.6, 12],
    [-fx + 0.6,  fz - 0.5, 13], [fx - 0.5,  fz - 0.6, 14],
    [-fx + 0.45, 0, 15], [fx - 0.45, fz * 0.3, 16], [fx * 0.3, fz - 0.45, 17],
  ];
  return (
    <group>
      {residential && <BackyardFence hx={fx} hz={fz} />}
      {trees.map(([x, z, h, seed]) => (
        <LeafyTree key={seed} position={[x, 0, z]} height={h} seed={seed} />
      ))}
      {shrubs.map(([x, z, seed]) => (
        <Shrub key={seed} position={[x, 0, z]} size={0.45} seed={seed} />
      ))}
    </group>
  );
}

// ─── Accessory building blocks ────────────────────────────────────────────────

function Scoreboard3D({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.56, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.70, 0]}>
        <boxGeometry args={[0.46, 0.27, 0.08]} />
        <meshStandardMaterial color="#1E293B" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.70, 0.042]}>
        <boxGeometry args={[0.38, 0.19, 0.01]} />
        <meshStandardMaterial color="#0F172A" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.75, 0.048]}>
        <boxGeometry args={[0.28, 0.038, 0.005]} />
        <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={0.85} />
      </mesh>
      <mesh position={[0, 0.665, 0.048]}>
        <boxGeometry args={[0.28, 0.038, 0.005]} />
        <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={0.85} />
      </mesh>
    </group>
  );
}

function WaterFountain3D({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.13, 0.4, 0.13]} />
        <meshStandardMaterial color="#64748B" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.43, 0]}>
        <boxGeometry args={[0.19, 0.05, 0.15]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.46, 0]}>
        <boxGeometry args={[0.15, 0.018, 0.11]} />
        <meshStandardMaterial color="#60A5FA" transparent opacity={0.75} roughness={0.1} />
      </mesh>
    </group>
  );
}

function CourtAccessories3D({ config, night }: { config: CourtConfig; night: boolean }) {
  const { dimensions: { length: L, width: W }, selectedAccessories: acc } = config;
  const halfW = (W * S) / 2;
  const halfL = (L * S) / 2;
  const edgeX = halfW + 0.9;  // just outside the 8ft border pad
  const edgeL = halfL + 0.9;

  const nodes: React.ReactNode[] = [];

  // ── Lighting: poles on both sidelines, each aimed across the court ──
  const poleZ = acc.includes('lighting-2-pole') ? [0]
    : acc.includes('lighting-4-pole') ? [-0.5, 0.5]
    : acc.includes('lighting-6-pole') ? [-0.65, 0, 0.65]
    : [];
  poleZ.forEach((f, i) => {
    const z = halfL * f;
    nodes.push(
      <LightPole key={`lpa${i}`} x={-edgeX} z={z} aim={[halfW * 0.5, z]} night={night} />,
      <LightPole key={`lpb${i}`} x={edgeX} z={z} aim={[-halfW * 0.5, z]} night={night} />,
    );
  });

  // ── Fencing ──
  if (acc.includes('chain-link-fence') || acc.includes('vinyl-fence')) {
    nodes.push(
      <PerimeterFence key="fence" hx={edgeX} hz={edgeL}
        kind={acc.includes('vinyl-fence') ? 'vinyl' : 'chain'}
        windscreen={acc.includes('windscreen')} />,
    );
  }

  // ── Benches along the +X sideline, facing the court ──
  if (acc.includes('bench-2') || acc.includes('bench-4')) {
    const fracs = acc.includes('bench-4') ? [-0.55, -0.18, 0.18, 0.55] : [-0.28, 0.28];
    fracs.forEach((f, i) => {
      nodes.push(<PlayerBench key={`bench-${i}`} position={[edgeX - 0.3, 0, halfL * f]} rotationY={-Math.PI / 2} />);
    });
  }

  // ── Scoreboards ──
  if (acc.includes('scoreboards')) {
    nodes.push(
      <Scoreboard3D key="sb1" x={-(edgeX + 0.1)} z={0} />,
      <Scoreboard3D key="sb2" x={ edgeX + 0.1}   z={0} />,
    );
  }

  // ── Water fountain ──
  if (acc.includes('water-fountain')) {
    nodes.push(<WaterFountain3D key="wf" x={edgeX - 0.1} z={halfL * 0.65} />);
  }

  return <>{nodes}</>;
}

// ─── Basketball ───────────────────────────────────────────────────────────────
function BasketballCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, selectedAccessories: acc, surfaceFinish } = config;
  const keyW = 16, keyLen = 19, bX = 5.25;
  const r3 = 23.75, c22 = 22;
  const arcBX = bX + Math.sqrt(r3 * r3 - c22 * c22);
  const ftY = W / 2;
  const lc = colors.lines;
  const kc = colors.keyArea ?? colors.border;
  const arcA = Math.atan2(c22, arcBX - bX);
  const half = L < 60;
  const roughness = surfaceFinish === 'smooth' ? 0.25 : surfaceFinish === 'textured' ? 0.92 : 0.6;
  const pad = 8;

  return (
    <group>
      <Slab x={-pad} y={-pad} w={L + pad * 2} h={W + pad * 2} L={L} W={W} color={colors.border} alpha={1} yOff={0.005} />
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} roughness={roughness} />
      <Slab x={0}        y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={kc} alpha={0.55} yOff={0.012} />
      {!half && <Slab x={L - keyLen} y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={kc} alpha={0.55} yOff={0.012} />}
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={lc} />
      {!half && (
        <>
          <Seg x1={L / 2} y1={0} x2={L / 2} y2={W} L={L} W={W} color={lc} />
          <ArcLine cxFt={L / 2} cyFt={ftY} r={6} a0={0} a1={Math.PI * 2} L={L} W={W} color={lc} />
        </>
      )}
      <Border x={0}        y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={lc} />
      {!half && <Border x={L - keyLen} y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={lc} />}
      <ArcLine cxFt={keyLen} cyFt={ftY} r={6} a0={0} a1={Math.PI * 2} L={L} W={W} color={lc} />
      {!half && <ArcLine cxFt={L - keyLen} cyFt={ftY} r={6} a0={0} a1={Math.PI * 2} L={L} W={W} color={lc} />}
      <Seg x1={0}   y1={(W - c22 * 2) / 2} x2={arcBX}     y2={(W - c22 * 2) / 2} L={L} W={W} color={lc} />
      <Seg x1={0}   y1={(W + c22 * 2) / 2} x2={arcBX}     y2={(W + c22 * 2) / 2} L={L} W={W} color={lc} />
      <ArcLine cxFt={bX} cyFt={ftY} r={r3} a0={-arcA} a1={arcA} L={L} W={W} color={lc} />
      {!half && (
        <>
          <Seg x1={L} y1={(W - c22 * 2) / 2} x2={L - arcBX} y2={(W - c22 * 2) / 2} L={L} W={W} color={lc} />
          <Seg x1={L} y1={(W + c22 * 2) / 2} x2={L - arcBX} y2={(W + c22 * 2) / 2} L={L} W={W} color={lc} />
          <ArcLine cxFt={L - bX} cyFt={ftY} r={r3} a0={Math.PI + arcA} a1={Math.PI - arcA} L={L} W={W} color={lc} />
        </>
      )}
      <ArcLine cxFt={bX} cyFt={ftY} r={4} a0={-Math.PI / 2} a1={Math.PI / 2} L={L} W={W} color={lc} />
      {!half && <ArcLine cxFt={L - bX} cyFt={ftY} r={4} a0={Math.PI / 2} a1={Math.PI * 3 / 2} L={L} W={W} color={lc} />}
      {(acc.includes('basketball-hoop-single') || acc.includes('basketball-hoop-double')) && (
        <BasketballGoal position={[tx(ftY, W), 0, tz(bX - 1.25, L)]} />
      )}
      {acc.includes('basketball-hoop-double') && !half && (
        <BasketballGoal position={[tx(ftY, W), 0, tz(L - bX + 1.25, L)]} rotationY={Math.PI} />
      )}
    </group>
  );
}

// ─── Tennis ───────────────────────────────────────────────────────────────────
function TennisCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, selectedAccessories: acc, surfaceFinish } = config;
  const singW = 27, sOff = (W - singW) / 2;
  const svcLen = (L - 42) / 2;
  const lc = colors.lines;
  const sbc = colors.serviceBox ?? colors.surface;
  const roughness = surfaceFinish === 'smooth' ? 0.25 : surfaceFinish === 'textured' ? 0.92 : 0.6;
  const pad = 8;

  return (
    <group>
      <Slab x={-pad} y={-pad} w={L + pad * 2} h={W + pad * 2} L={L} W={W} color={colors.border} alpha={1} yOff={0.005} />
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} roughness={roughness} />
      {/* Service box tints */}
      <Slab x={0}          y={sOff}             w={svcLen} h={singW / 2} L={L} W={W} color={sbc} alpha={0.8}  yOff={0.012} />
      <Slab x={0}          y={sOff + singW / 2} w={svcLen} h={singW / 2} L={L} W={W} color={sbc} alpha={0.65} yOff={0.012} />
      <Slab x={L - svcLen} y={sOff}             w={svcLen} h={singW / 2} L={L} W={W} color={sbc} alpha={0.65} yOff={0.012} />
      <Slab x={L - svcLen} y={sOff + singW / 2} w={svcLen} h={singW / 2} L={L} W={W} color={sbc} alpha={0.8}  yOff={0.012} />
      {/* Lines */}
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={lc} />
      <Seg x1={0}        y1={sOff}         x2={L}        y2={sOff}         L={L} W={W} color={lc} />
      <Seg x1={0}        y1={sOff + singW} x2={L}        y2={sOff + singW} L={L} W={W} color={lc} />
      <Seg x1={svcLen}   y1={sOff}         x2={svcLen}   y2={sOff + singW} L={L} W={W} color={lc} />
      <Seg x1={L - svcLen} y1={sOff}       x2={L - svcLen} y2={sOff + singW} L={L} W={W} color={lc} />
      <Seg x1={svcLen}   y1={W / 2}        x2={L - svcLen} y2={W / 2}       L={L} W={W} color={lc} />
      {/* Net: 3.5 ft at the posts (3 ft outside the doubles lines), 3 ft at center */}
      <SportNet position={[0, 0, tz(L / 2, L)]} width={(W + 6) * S} postH={0.35} centerH={0.3} centerStrap />
    </group>
  );
}

// ─── Pickleball ───────────────────────────────────────────────────────────────
function PickleballCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, selectedAccessories: acc, surfaceFinish } = config;
  const playW = Math.min(W, 20), playL = Math.min(L, 44);
  const offX = (L - playL) / 2, offY = (W - playW) / 2;
  const nvz = 7;
  const lc = colors.lines;
  const kc = colors.kitchen ?? '#60A5FA';
  const roughness = surfaceFinish === 'smooth' ? 0.25 : surfaceFinish === 'textured' ? 0.92 : 0.6;
  const pad = 8;

  return (
    <group>
      <Slab x={-pad} y={-pad} w={L + pad * 2} h={W + pad * 2} L={L} W={W} color={colors.border} alpha={1} yOff={0.005} />
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} roughness={roughness} />
      {/* NVZ kitchen zones */}
      <Slab x={offX}               y={offY} w={nvz} h={playW} L={L} W={W} color={kc} alpha={0.5} yOff={0.012} />
      <Slab x={offX + playL - nvz} y={offY} w={nvz} h={playW} L={L} W={W} color={kc} alpha={0.5} yOff={0.012} />
      {/* Lines */}
      <Border x={offX} y={offY} w={playL} h={playW} L={L} W={W} color={lc} />
      <Seg x1={offX}             y1={offY + playW / 2} x2={offX + playL}     y2={offY + playW / 2} L={L} W={W} color={lc} />
      <Seg x1={offX + nvz}       y1={offY}             x2={offX + nvz}       y2={offY + playW}     L={L} W={W} color={lc} />
      <Seg x1={offX + playL - nvz} y1={offY}           x2={offX + playL - nvz} y2={offY + playW}   L={L} W={W} color={lc} />
      {/* Net: 36 in at the posts, 34 in at center */}
      <SportNet position={[tx(offY + playW / 2, W), 0, tz(offX + playL / 2, L)]} width={(playW + 2) * S}
        postH={0.3} centerH={0.283} postR={0.01} />
    </group>
  );
}

// ─── Multi-Sport ──────────────────────────────────────────────────────────────
function MultiSportCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, selectedAccessories: acc, surfaceFinish } = config;
  const keyW = 16, keyLen = 19, bX = 5.25;
  const midY = W / 2;
  const r3 = 23.75, c22 = 22;
  const arcBX = bX + Math.sqrt(r3 * r3 - c22 * c22);
  const arcA = Math.atan2(c22, arcBX - bX);
  const pklW = 20, pklLen = 44, pklY = (W - pklW) / 2;
  // Position pickleball courts symmetrically, each centered in their half
  const pklX1 = Math.max(2, (L / 2 - pklLen) / 2);
  const pklX2 = L - pklLen - pklX1;
  const lc = colors.lines;
  const kc = colors.keyArea ?? '#1A3A6B';
  const pkl = '#FCD34D';
  const roughness = surfaceFinish === 'smooth' ? 0.25 : surfaceFinish === 'textured' ? 0.92 : 0.6;
  const pad = 8;

  return (
    <group>
      <Slab x={-pad} y={-pad} w={L + pad * 2} h={W + pad * 2} L={L} W={W} color={colors.border} alpha={1} yOff={0.005} />
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} roughness={roughness} />
      {/* Paint zones */}
      <Slab x={0}          y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={kc} alpha={0.5} yOff={0.012} />
      <Slab x={L - keyLen} y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={kc} alpha={0.5} yOff={0.012} />
      {/* Basketball lines */}
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={lc} />
      <Seg x1={L / 2} y1={0} x2={L / 2} y2={W} L={L} W={W} color={lc} />
      <ArcLine cxFt={L / 2} cyFt={midY} r={6} a0={0} a1={Math.PI * 2} L={L} W={W} color={lc} />
      <Border x={0}          y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={lc} />
      <Border x={L - keyLen} y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={lc} />
      {/* Free-throw circles */}
      <ArcLine cxFt={keyLen}     cyFt={midY} r={6} a0={0} a1={Math.PI * 2} L={L} W={W} color={lc} />
      <ArcLine cxFt={L - keyLen} cyFt={midY} r={6} a0={0} a1={Math.PI * 2} L={L} W={W} color={lc} />
      {/* Three-point lines */}
      <Seg x1={0} y1={(W - c22 * 2) / 2} x2={arcBX}     y2={(W - c22 * 2) / 2} L={L} W={W} color={lc} />
      <Seg x1={0} y1={(W + c22 * 2) / 2} x2={arcBX}     y2={(W + c22 * 2) / 2} L={L} W={W} color={lc} />
      <Seg x1={L} y1={(W - c22 * 2) / 2} x2={L - arcBX} y2={(W - c22 * 2) / 2} L={L} W={W} color={lc} />
      <Seg x1={L} y1={(W + c22 * 2) / 2} x2={L - arcBX} y2={(W + c22 * 2) / 2} L={L} W={W} color={lc} />
      <ArcLine cxFt={bX}     cyFt={midY} r={r3} a0={-arcA}          a1={arcA}            L={L} W={W} color={lc} />
      <ArcLine cxFt={L - bX} cyFt={midY} r={r3} a0={Math.PI + arcA} a1={Math.PI - arcA}  L={L} W={W} color={lc} />
      {/* Restricted area arcs */}
      <ArcLine cxFt={bX}     cyFt={midY} r={4} a0={-Math.PI / 2} a1={Math.PI / 2}     L={L} W={W} color={lc} />
      <ArcLine cxFt={L - bX} cyFt={midY} r={4} a0={Math.PI / 2}  a1={Math.PI * 3 / 2} L={L} W={W} color={lc} />
      {/* Pickleball overlays */}
      {[pklX1, pklX2].map((bx, i) => (
        <group key={i}>
          <Border x={bx}           y={pklY} w={pklLen} h={pklW} L={L} W={W} color={pkl} lw={0.04} />
          <Seg x1={bx}             y1={pklY + pklW / 2} x2={bx + pklLen}     y2={pklY + pklW / 2} L={L} W={W} color={pkl} lw={0.04} />
          <Seg x1={bx + 7}         y1={pklY}            x2={bx + 7}          y2={pklY + pklW}     L={L} W={W} color={pkl} lw={0.04} />
          <Seg x1={bx + pklLen - 7} y1={pklY}           x2={bx + pklLen - 7} y2={pklY + pklW}     L={L} W={W} color={pkl} lw={0.04} />
          <Seg x1={bx + pklLen / 2} y1={pklY}           x2={bx + pklLen / 2} y2={pklY + pklW}     L={L} W={W} color={pkl} lw={0.03} />
        </group>
      ))}
      {/* Hoops */}
      {(acc.includes('basketball-hoop-single') || acc.includes('basketball-hoop-double')) && (
        <BasketballGoal position={[tx(midY, W), 0, tz(bX - 1.25, L)]} />
      )}
      {acc.includes('basketball-hoop-double') && (
        <BasketballGoal position={[tx(midY, W), 0, tz(L - bX + 1.25, L)]} rotationY={Math.PI} />
      )}
      {/* Pickleball nets */}
      {acc.includes('pickleball-net') && [pklX1, pklX2].map((bx, i) => (
        <SportNet key={`pkl-net-${i}`} position={[tx(pklY + pklW / 2, W), 0, tz(bx + pklLen / 2, L)]}
          width={(pklW + 2) * S} postH={0.3} centerH={0.283} postR={0.01} />
      ))}
      {/* Tennis net at center */}
      {acc.includes('tennis-net') && (
        <SportNet position={[0, 0, tz(L / 2, L)]} width={(W + 6) * S} postH={0.35} centerH={0.3} centerStrap />
      )}
    </group>
  );
}

// ─── Bocce Ball ───────────────────────────────────────────────────────────────
function BocceBallCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, surfaceFinish } = config;
  const lc = colors.lines;
  const roughness = surfaceFinish === 'smooth' ? 0.25 : surfaceFinish === 'textured' ? 0.92 : 0.6;
  const pad = 4;

  return (
    <group>
      <Slab x={-pad} y={-pad} w={L + pad * 2} h={W + pad * 2} L={L} W={W} color={colors.border} alpha={1} yOff={0.005} />
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} roughness={roughness} />
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={lc} />
      <Seg x1={L / 2} y1={0} x2={L / 2} y2={W} L={L} W={W} color={lc} />
      <Seg x1={L * 0.25} y1={0} x2={L * 0.25} y2={W} L={L} W={W} color={lc} lw={0.03} />
      <Seg x1={L * 0.75} y1={0} x2={L * 0.75} y2={W} L={L} W={W} color={lc} lw={0.03} />
    </group>
  );
}

// ─── Badminton ────────────────────────────────────────────────────────────────
function BadmintonCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, selectedAccessories: acc, surfaceFinish } = config;
  const isSingles = W <= 17;
  const singW = 17;
  const sOff  = isSingles ? 0 : (W - singW) / 2;
  const svcLen = (L - 13) / 2;
  const lc = colors.lines;
  const roughness = surfaceFinish === 'smooth' ? 0.25 : surfaceFinish === 'textured' ? 0.92 : 0.6;
  const pad = 6;

  return (
    <group>
      <Slab x={-pad} y={-pad} w={L + pad * 2} h={W + pad * 2} L={L} W={W} color={colors.border} alpha={1} yOff={0.005} />
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} roughness={roughness} />
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={lc} />
      {/* Singles sidelines for doubles court */}
      {!isSingles && (
        <>
          <Seg x1={0} y1={sOff} x2={L} y2={sOff} L={L} W={W} color={lc} />
          <Seg x1={0} y1={sOff + singW} x2={L} y2={sOff + singW} L={L} W={W} color={lc} />
        </>
      )}
      <Seg x1={svcLen} y1={isSingles ? 0 : sOff} x2={svcLen} y2={isSingles ? W : sOff + singW} L={L} W={W} color={lc} />
      <Seg x1={L - svcLen} y1={isSingles ? 0 : sOff} x2={L - svcLen} y2={isSingles ? W : sOff + singW} L={L} W={W} color={lc} />
      <Seg x1={svcLen} y1={W / 2} x2={L - svcLen} y2={W / 2} L={L} W={W} color={lc} />
      {/* Net: 5 ft 1 in at the posts, 5 ft at center, 2.5 ft deep */}
      <SportNet position={[0, 0, tz(L / 2, L)]} width={W * S} postH={0.51} centerH={0.5} bottom={0.25} postR={0.01} />
    </group>
  );
}

// ─── Futsal ───────────────────────────────────────────────────────────────────
function FutsalCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, selectedAccessories: acc, surfaceFinish } = config;
  const midY = W / 2;
  const penW = 20, penLen = 13;
  const goalW = 10, goalLen = 2;
  const lc = colors.lines;
  const roughness = surfaceFinish === 'smooth' ? 0.25 : surfaceFinish === 'textured' ? 0.92 : 0.6;
  const pad = 8;

  return (
    <group>
      <Slab x={-pad} y={-pad} w={L + pad * 2} h={W + pad * 2} L={L} W={W} color={colors.border} alpha={1} yOff={0.005} />
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} roughness={roughness} />
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={lc} />
      <Seg x1={L / 2} y1={0} x2={L / 2} y2={W} L={L} W={W} color={lc} />
      <ArcLine cxFt={L / 2} cyFt={midY} r={6} a0={0} a1={Math.PI * 2} L={L} W={W} color={lc} />
      <Border x={0} y={(W - penW) / 2} w={penLen} h={penW} L={L} W={W} color={lc} />
      <Border x={L - penLen} y={(W - penW) / 2} w={penLen} h={penW} L={L} W={W} color={lc} />
      <Border x={0} y={(W - goalW) / 2} w={goalLen} h={goalW} L={L} W={W} color={lc} lw={0.04} />
      <Border x={L - goalLen} y={(W - goalW) / 2} w={goalLen} h={goalW} L={L} W={W} color={lc} lw={0.04} />
      {/* Futsal goals: 3 × 2 m on each goal line */}
      {acc.includes('futsal-goals') && (
        <>
          <Goal position={[tx(midY, W), 0, tz(0, L)]} width={1.0} height={0.656} depth={0.3} />
          <Goal position={[tx(midY, W), 0, tz(L, L)]} rotationY={Math.PI} width={1.0} height={0.656} depth={0.3} />
        </>
      )}
    </group>
  );
}

// ─── Inline Hockey ────────────────────────────────────────────────────────────
function InlineHockeyCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, selectedAccessories: acc, surfaceFinish } = config;
  const midY = W / 2;
  const goalLineX = 11;
  const goalW = 6, goalDepth = 4;
  const lc = colors.lines;
  const roughness = surfaceFinish === 'smooth' ? 0.25 : surfaceFinish === 'textured' ? 0.92 : 0.6;
  const pad = 8;

  return (
    <group>
      <Slab x={-pad} y={-pad} w={L + pad * 2} h={W + pad * 2} L={L} W={W} color={colors.border} alpha={1} yOff={0.005} />
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} roughness={roughness} />
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={lc} />
      {/* Center line */}
      <Seg x1={L / 2} y1={0} x2={L / 2} y2={W} L={L} W={W} color={lc} lw={0.08} />
      {/* Blue lines */}
      <Seg x1={L * 0.3} y1={0} x2={L * 0.3} y2={W} L={L} W={W} color="#1E40AF" lw={0.08} />
      <Seg x1={L * 0.7} y1={0} x2={L * 0.7} y2={W} L={L} W={W} color="#1E40AF" lw={0.08} />
      {/* Goal lines */}
      <Seg x1={goalLineX} y1={0} x2={goalLineX} y2={W} L={L} W={W} color="#EF4444" lw={0.05} />
      <Seg x1={L - goalLineX} y1={0} x2={L - goalLineX} y2={W} L={L} W={W} color="#EF4444" lw={0.05} />
      {/* Center circle */}
      <ArcLine cxFt={L / 2} cyFt={midY} r={8} a0={0} a1={Math.PI * 2} L={L} W={W} color={lc} />
      {/* Hockey goals: 6 × 4 ft on the goal lines */}
      {acc.includes('hockey-goals') && (
        <>
          <Goal position={[tx(midY, W), 0, tz(goalLineX, L)]} width={goalW * S} height={0.4} depth={goalDepth * S * 0.8}
            frameColor="#dc2626" frameR={0.009} />
          <Goal position={[tx(midY, W), 0, tz(L - goalLineX, L)]} rotationY={Math.PI} width={goalW * S} height={0.4}
            depth={goalDepth * S * 0.8} frameColor="#dc2626" frameR={0.009} />
        </>
      )}
      {acc.includes('dasher-boards') && <DasherBoards hx={(W * S) / 2 + 0.01} hz={(L * S) / 2 + 0.01} />}
    </group>
  );
}

// ─── Handball ─────────────────────────────────────────────────────────────────
function HandballCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, selectedAccessories: acc, surfaceFinish } = config;
  const midY = W / 2;
  const goalW = 10, goalLen = 2;
  const lc = colors.lines;
  const roughness = surfaceFinish === 'smooth' ? 0.25 : surfaceFinish === 'textured' ? 0.92 : 0.6;
  const pad = 8;

  return (
    <group>
      <Slab x={-pad} y={-pad} w={L + pad * 2} h={W + pad * 2} L={L} W={W} color={colors.border} alpha={1} yOff={0.005} />
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} roughness={roughness} />
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={lc} />
      <Seg x1={L / 2} y1={0} x2={L / 2} y2={W} L={L} W={W} color={lc} />
      <ArcLine cxFt={L / 2} cyFt={midY} r={9.84} a0={0} a1={Math.PI * 2} L={L} W={W} color={lc} />
      {/* Goal area arcs */}
      <ArcLine cxFt={0} cyFt={midY} r={19.7} a0={-Math.PI / 6} a1={Math.PI / 6} L={L} W={W} color={lc} />
      <ArcLine cxFt={L} cyFt={midY} r={19.7} a0={Math.PI - Math.PI / 6} a1={Math.PI + Math.PI / 6} L={L} W={W} color={lc} />
      {/* Goals on court */}
      <Border x={0} y={(W - goalW) / 2} w={goalLen} h={goalW} L={L} W={W} color={lc} lw={0.06} />
      <Border x={L - goalLen} y={(W - goalW) / 2} w={goalLen} h={goalW} L={L} W={W} color={lc} lw={0.06} />
      {/* Handball goals: 3 × 2 m with painted stripes */}
      {acc.includes('handball-goals') && (
        <>
          <Goal position={[tx(midY, W), 0, tz(0, L)]} width={1.0} height={0.656} depth={0.3} stripes="#dc2626" />
          <Goal position={[tx(midY, W), 0, tz(L, L)]} rotationY={Math.PI} width={1.0} height={0.656} depth={0.3} stripes="#dc2626" />
        </>
      )}
    </group>
  );
}

// ─── Volleyball ───────────────────────────────────────────────────────────────
function VolleyballCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, selectedAccessories: acc, surfaceFinish } = config;
  const attackLine = 10;
  const lc = colors.lines;
  const roughness = surfaceFinish === 'smooth' ? 0.25 : surfaceFinish === 'textured' ? 0.92 : 0.6;
  const pad = 8;

  return (
    <group>
      <Slab x={-pad} y={-pad} w={L + pad * 2} h={W + pad * 2} L={L} W={W} color={colors.border} alpha={1} yOff={0.005} />
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} roughness={roughness} />
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={lc} />
      {/* Center/net line */}
      <Seg x1={L / 2} y1={0} x2={L / 2} y2={W} L={L} W={W} color={lc} lw={0.08} />
      {/* Attack lines */}
      <Seg x1={L / 2 - attackLine} y1={0} x2={L / 2 - attackLine} y2={W} L={L} W={W} color={lc} />
      <Seg x1={L / 2 + attackLine} y1={0} x2={L / 2 + attackLine} y2={W} L={L} W={W} color={lc} />
      {/* Net: top at 7 ft 11 in, 3.3 ft deep, posts 3 ft outside the sidelines */}
      <SportNet position={[0, 0, tz(L / 2, L)]} width={(W + 6) * S} postH={0.8} centerH={0.795} bottom={0.47} postR={0.02} />
    </group>
  );
}

// ─── Shuffleboard ─────────────────────────────────────────────────────────────
function ShuffleboardCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, surfaceFinish } = config;
  const lc = colors.lines;
  const roughness = surfaceFinish === 'smooth' ? 0.25 : surfaceFinish === 'textured' ? 0.92 : 0.6;
  const pad = 4;

  return (
    <group>
      <Slab x={-pad} y={-pad} w={L + pad * 2} h={W + pad * 2} L={L} W={W} color={colors.border} alpha={1} yOff={0.005} />
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} roughness={roughness} />
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={lc} />
      <Seg x1={5} y1={0} x2={5} y2={W} L={L} W={W} color={lc} />
      <Seg x1={8} y1={0} x2={8} y2={W} L={L} W={W} color={lc} />
      <Seg x1={12} y1={0} x2={12} y2={W} L={L} W={W} color={lc} />
      <Seg x1={L - 5} y1={0} x2={L - 5} y2={W} L={L} W={W} color={lc} />
      <Seg x1={L - 8} y1={0} x2={L - 8} y2={W} L={L} W={W} color={lc} />
      <Seg x1={L - 12} y1={0} x2={L - 12} y2={W} L={L} W={W} color={lc} />
      {/* Dead zone */}
      <Slab x={L / 2 - 5} y={0} w={10} h={W} L={L} W={W} color={lc} alpha={0.12} yOff={0.012} />
    </group>
  );
}

// ─── Four-Square ──────────────────────────────────────────────────────────────
function FourSquareCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, surfaceFinish } = config;
  const lc = colors.lines;
  const roughness = surfaceFinish === 'smooth' ? 0.25 : surfaceFinish === 'textured' ? 0.92 : 0.6;
  const pad = 4;

  return (
    <group>
      <Slab x={-pad} y={-pad} w={L + pad * 2} h={W + pad * 2} L={L} W={W} color={colors.border} alpha={1} yOff={0.005} />
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} roughness={roughness} />
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={lc} />
      <Seg x1={L / 2} y1={0} x2={L / 2} y2={W} L={L} W={W} color={lc} />
      <Seg x1={0} y1={W / 2} x2={L} y2={W / 2} L={L} W={W} color={lc} />
    </group>
  );
}

// ─── Sport-Specific Accessories 3D ───────────────────────────────────────────
function SportSpecificAccessories3D({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, selectedAccessories: acc } = config;
  const nodes: React.ReactNode[] = [];

  // Bocce side rails
  if (config.type === 'bocce-ball' && acc.includes('bocce-side-rails')) {
    nodes.push(
      <mesh key="bocce-rail-n" position={[tx(1, W), 0.015, 0]}>
        <boxGeometry args={[0.15, 0.03, L * S]} />
        <meshStandardMaterial color="#92400E" roughness={0.85} />
      </mesh>,
      <mesh key="bocce-rail-s" position={[tx(W - 1, W), 0.015, 0]}>
        <boxGeometry args={[0.15, 0.03, L * S]} />
        <meshStandardMaterial color="#92400E" roughness={0.85} />
      </mesh>,
    );
  }

  return <>{nodes}</>;
}

// ─── Scene switcher ───────────────────────────────────────────────────────────
function CourtScene({ config }: { config: CourtConfig }) {
  switch (config.type) {
    case 'basketball':    return <BasketballCourt config={config} />;
    case 'tennis':        return <TennisCourt config={config} />;
    case 'pickleball':    return <PickleballCourt config={config} />;
    case 'multi-sport':   return <MultiSportCourt config={config} />;
    case 'bocce-ball':    return <BocceBallCourt config={config} />;
    case 'badminton':     return <BadmintonCourt config={config} />;
    case 'futsal':        return <FutsalCourt config={config} />;
    case 'inline-hockey': return <InlineHockeyCourt config={config} />;
    case 'handball':      return <HandballCourt config={config} />;
    case 'volleyball':    return <VolleyballCourt config={config} />;
    case 'shuffleboard':  return <ShuffleboardCourt config={config} />;
    case 'four-square':   return <FourSquareCourt config={config} />;
  }
}

// ─── Camera ───────────────────────────────────────────────────────────────────
type View = 'corner' | 'top' | 'side';

const VIEW_DIR: Record<View, [number, number, number]> = {
  corner: [0.56, 0.6, 0.56],
  top:    [0.12, 1, 0.0001], // long axis runs across the screen
  side:   [1, 0.42, 0.25],   // low courtside angle
};

/** Distance at which the court rectangle (half-extents hx × hz) fills the view. */
function fitDistance(dir: THREE.Vector3, hx: number, hz: number, fov: number, aspect: number) {
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.01, 1000);
  const corners = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const fits = (d: number) => {
    cam.position.copy(dir).multiplyScalar(d);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    return corners.every((c) => {
      const p = c.clone().project(cam);
      return Math.abs(p.x) <= 0.92 && Math.abs(p.y) <= 0.88 && p.z < 1;
    });
  };
  let lo = 0.1, hi = 500;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  return hi;
}

/** Glides the camera to the chosen view, refitting when the canvas resizes. */
function CameraRig({ view, hx, hz }: { view: View; hx: number; hz: number }) {
  const { camera, size, controls } = useThree();
  const goal = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const dir = new THREE.Vector3(...VIEW_DIR[view]).normalize();
    goal.current = dir.multiplyScalar(fitDistance(dir, hx, hz, cam.fov, size.width / size.height));
  }, [camera, view, hx, hz, size.width, size.height]);

  // Hand control back to the user as soon as they start dragging
  useEffect(() => {
    const ctl = controls as unknown as THREE.EventDispatcher<{ start: object }> | null;
    if (!ctl) return;
    const stop = () => { goal.current = null; };
    ctl.addEventListener('start', stop);
    return () => ctl.removeEventListener('start', stop);
  }, [controls]);

  useFrame((_, dt) => {
    if (!goal.current) return;
    camera.position.lerp(goal.current, 1 - Math.exp(-dt * 6));
    const ctl = controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    if (ctl) { ctl.target.set(0, 0, 0); ctl.update(); } else camera.lookAt(0, 0, 0);
    if (camera.position.distanceTo(goal.current) < 0.005) goal.current = null;
  });
  return null;
}

function Toggle<T extends string>({ value, options, onChange }: {
  value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-black/45 backdrop-blur-sm p-0.5 shadow-sm">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
            value === v ? 'bg-white text-gray-900' : 'text-white/85 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
/**
 * Everything in the 3D world except camera and controls. `bare` drops the
 * sky, lawn and scenery so the court can be composited over a photo; a
 * transparent shadow catcher keeps equipment shadows on the real ground.
 */
export function SceneContents({ config, time, mapSize, bare = false }: {
  config: CourtConfig; time: TimeOfDay; mapSize: number; bare?: boolean;
}) {
  const { length: L, width: W } = config.dimensions;
  const span = Math.max(L, W) * S;
  const pad = BORDER_PAD[config.type] ?? 8;
  return (
    <>
      <SceneLighting span={span} mapSize={mapSize} time={time} background={!bare} />
      {bare ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0005, 0]} receiveShadow>
          <planeGeometry args={[(W + pad * 2) * S + 6, (L + pad * 2) * S + 6]} />
          <shadowMaterial transparent opacity={0.32} />
        </mesh>
      ) : (
        <>
          <fog attach="fog" color={FOG_COLOR[time]} near={span * 2 + 8} far={span * 6 + 40} />
          <Lawn size={span * 6 + 60} />
          <Surroundings L={L} W={W} pad={pad} residential={config.propertyType === 'residential'} />
          <Apron L={L} W={W} pad={pad} />
        </>
      )}
      <FinishContext.Provider value={config.surfaceFinish}>
        <CourtScene config={config} />
      </FinishContext.Provider>
      <ShadowGroup deps={config}>
        <CourtAccessories3D config={config} night={time === 'night'} />
        <SportSpecificAccessories3D config={config} />
      </ShadowGroup>
    </>
  );
}

// ─── Snapshot for the quote email ─────────────────────────────────────────────
/** Waits a few frames for lighting and shadows to settle, then reports. */
function FrameCounter({ frames, onDone }: { frames: number; onDone: () => void }) {
  const n = useRef(0);
  useFrame(() => { n.current += 1; if (n.current === frames) onDone(); });
  return null;
}

/**
 * Renders the court off-screen from the corner view and returns a JPEG as
 * base64 (no data: prefix), watermarked like the live preview.
 */
export function renderCourtSnapshot(config: CourtConfig, width = 1200, height = 750): Promise<string | undefined> {
  return new Promise((resolve) => {
    const { length: L, width: W } = config.dimensions;
    const pad = BORDER_PAD[config.type] ?? 8;
    const fov = 40;
    const dir = new THREE.Vector3(...VIEW_DIR.corner).normalize();
    const camPos = dir.multiplyScalar(fitDistance(dir, (W / 2 + pad) * S, (L / 2 + pad) * S, fov, width / height));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    // <Canvas> registers three.js objects itself; a bare root has to do it here
    extend(THREE as unknown as Parameters<typeof extend>[0]);
    const root = createRoot(canvas);
    let settled = false;
    const finish = (b64?: string) => {
      if (settled) return;
      settled = true;
      resolve(b64);
      setTimeout(() => root.unmount(), 0);
    };
    const capture = () => {
      try {
        const out = document.createElement('canvas');
        out.width = width;
        out.height = height;
        const ctx = out.getContext('2d')!;
        ctx.drawImage(canvas, 0, 0);
        const g = ctx.createRadialGradient(width / 2, height / 2, height * 0.45, width / 2, height / 2, width * 0.62);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
        ctx.font = '600 18px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText('mbsportsbuilders.com', width - 18, height - 16);
        finish(out.toDataURL('image/jpeg', 0.86).split(',')[1]);
      } catch {
        finish(undefined);
      }
    };

    root.configure({
      size: { width, height, top: 0, left: 0 },
      dpr: 1,
      shadows: 'soft',
      gl: { antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.NeutralToneMapping },
      camera: { fov, near: 0.01, far: 500, position: camPos.toArray() as [number, number, number] },
      onCreated: ({ camera }) => camera.lookAt(0, 0, 0),
    });
    root.render(
      <>
        <SceneContents config={config} time="day" mapSize={2048} />
        <FrameCounter frames={12} onDone={capture} />
      </>,
    );
    setTimeout(() => finish(undefined), 15000);
  });
}

// ─── Exported component ───────────────────────────────────────────────────────
const coarsePointer = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

export function Court3D({ config }: { config: CourtConfig }) {
  const { length: L, width: W } = config.dimensions;
  const span = Math.max(L, W) * S;
  const camX = span * 0.85;
  const camY = span * 0.90;
  const camZ = span * 0.85;
  const pad = BORDER_PAD[config.type] ?? 8;
  // Start lighter on phones; drop resolution further if frame rate struggles
  const [dpr, setDpr] = useState(coarsePointer ? 1.25 : 2);
  const [view, setView] = useState<View>('corner');
  const [time, setTime] = useState<TimeOfDay>('day');
  const hasLights = config.selectedAccessories.some((a) => a.startsWith('lighting-'));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    {/* Soft lens vignette */}
    <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
      background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 100%)' }} />
    <div style={{ position: 'absolute', bottom: 10, right: 12, zIndex: 10,
      fontSize: 11, fontFamily: 'system-ui, sans-serif', fontWeight: 600,
      color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em',
      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
      pointerEvents: 'none', userSelect: 'none' }}>
      mbsportsbuilders.com
    </div>
    <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
      <Toggle value={view} options={[['corner', 'Corner'], ['top', 'Top'], ['side', 'Courtside']]}
        onChange={(v) => { setView(v); trackEvent('camera_view_selected', { view: v, court_type: config.type }); }} />
      <Toggle value={time} options={[['day', 'Day'], ['sunset', 'Sunset'], ['night', 'Night']]}
        onChange={(t) => { setTime(t); trackEvent('time_of_day_selected', { time: t, court_type: config.type, has_lighting: hasLights }); }} />
    </div>
    {time === 'night' && !hasLights && (
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs whitespace-nowrap">
        Add a lighting package to see your court lit at night
      </div>
    )}
    <Canvas
      shadows="soft"
      dpr={dpr}
      camera={{ position: [camX, camY, camZ], fov: 45, near: 0.01, far: 500 }}
      // Neutral tone mapping keeps the customer's chosen colors close to true
      gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.0 }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <SceneContents config={config} time={time} mapSize={coarsePointer ? 1024 : 2048} />
      <CameraRig view={view} hx={(W / 2 + pad) * S} hz={(L / 2 + pad) * S} />
      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        minDistance={span * 0.3}
        maxDistance={span * 4 + 10}
        minPolarAngle={0.02}
        maxPolarAngle={Math.PI / 2.05}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
    </div>
  );
}
