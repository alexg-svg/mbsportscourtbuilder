import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Sky } from '@react-three/drei';
import type { CourtConfig } from '../../types/court';

const S = 0.1; // 1 foot = 0.1 THREE units

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
    return [tx(cyFt + r * Math.sin(a), W), 0.022, tz(cxFt + r * Math.cos(a), L)];
  });
}

// ─── Primitive building blocks ────────────────────────────────────────────────

function Slab({ x, y, w, h, L, W, color, alpha = 1, yOff = 0.005 }: {
  x: number; y: number; w: number; h: number;
  L: number; W: number; color: string; alpha?: number; yOff?: number;
}) {
  return (
    <mesh position={[tx(y + h / 2, W), yOff, tz(x + w / 2, L)]} receiveShadow>
      <boxGeometry args={[h * S, 0.01, w * S]} />
      <meshStandardMaterial color={color} transparent={alpha < 1} opacity={alpha} roughness={0.8} />
    </mesh>
  );
}

function Seg({ x1, y1, x2, y2, L, W, color, lw = 0.05 }: {
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
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Border({ x, y, w, h, L, W, color, lw = 0.05 }: {
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

function ArcLine({ cxFt, cyFt, r, a0, a1, L, W, color, lw = 1.5, n = 56 }: {
  cxFt: number; cyFt: number; r: number; a0: number; a1: number;
  L: number; W: number; color: string; lw?: number; n?: number;
}) {
  const pts = arcPts(cxFt, cyFt, r, a0, a1, L, W, n);
  return <Line points={pts} color={color} lineWidth={lw} />;
}

// ─── Ground (grass) ───────────────────────────────────────────────────────────
function Ground({ L, W }: { L: number; W: number }) {
  const size = Math.max(L, W) * S * 6;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#4a7c3f" roughness={0.95} />
    </mesh>
  );
}

// ─── Tree ─────────────────────────────────────────────────────────────────────
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const h = scale;
  return (
    <group position={position}>
      <mesh position={[0, h * 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.045 * scale, 0.07 * scale, h * 0.3, 6]} />
        <meshStandardMaterial color="#5c3d1e" roughness={0.9} />
      </mesh>
      <mesh position={[0, h * 0.52, 0]} castShadow>
        <coneGeometry args={[0.34 * scale, h * 0.55, 7]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.85} />
      </mesh>
      <mesh position={[0, h * 0.76, 0]} castShadow>
        <coneGeometry args={[0.24 * scale, h * 0.42, 7]} />
        <meshStandardMaterial color="#3a7a32" roughness={0.85} />
      </mesh>
      <mesh position={[0, h * 0.96, 0]} castShadow>
        <coneGeometry args={[0.14 * scale, h * 0.30, 7]} />
        <meshStandardMaterial color="#4d9445" roughness={0.85} />
      </mesh>
    </group>
  );
}

// ─── Trees scattered around the court ─────────────────────────────────────────
function Trees({ L, W }: { L: number; W: number }) {
  const hw = (W * S) / 2;
  const hl = (L * S) / 2;
  const m  = Math.max(hw, hl) * 0.28;
  const ts = Math.max(hw, hl) * 0.20;

  const pts: [number, number, number][] = [
    // far end (−Z)
    [-hw - m * 0.5, -hl - m * 1.1, ts * 1.10],
    [0,              -hl - m * 1.5, ts * 0.90],
    [ hw + m * 0.3, -hl - m * 1.0, ts * 1.20],
    // near end (+Z)
    [-hw - m * 0.4,  hl + m * 1.2,  ts * 1.00],
    [0,               hl + m * 1.6,  ts * 1.15],
    [ hw + m * 0.5,  hl + m * 1.0,  ts * 0.85],
    // left side (−X)
    [-hw - m * 1.2, -hl * 0.55, ts * 1.30],
    [-hw - m * 1.5,  0.1,         ts * 0.95],
    [-hw - m * 1.1,  hl * 0.50,  ts * 1.10],
    // right side (+X)
    [ hw + m * 1.3, -hl * 0.45, ts * 1.00],
    [ hw + m * 1.6,  0.2,         ts * 1.20],
    [ hw + m * 1.2,  hl * 0.55,  ts * 0.90],
  ];

  return (
    <>
      {pts.map(([x, z, scale], i) => (
        <Tree key={i} position={[x, 0, z]} scale={scale} />
      ))}
    </>
  );
}

// ─── Basketball ───────────────────────────────────────────────────────────────
function BasketballCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, selectedAccessories: acc } = config;
  const keyW = 16, keyLen = 19, bX = 5.25;
  const r3 = 23.75, c22 = 22;
  const arcBX = bX + Math.sqrt(r3 * r3 - c22 * c22);
  const ftY = W / 2;
  const lc = colors.lines;
  const kc = colors.keyArea ?? colors.border;
  const arcA = Math.atan2(c22, arcBX - bX);

  return (
    <group>
      {/* Surface */}
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} />
      {/* Key / paint zones */}
      <Slab x={0}        y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={kc} alpha={0.55} />
      <Slab x={L - keyLen} y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={kc} alpha={0.55} />
      {/* Boundary */}
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={lc} />
      {/* Center line */}
      <Seg x1={L / 2} y1={0} x2={L / 2} y2={W} L={L} W={W} color={lc} />
      {/* Center circle */}
      <ArcLine cxFt={L / 2} cyFt={ftY} r={6} a0={0} a1={Math.PI * 2} L={L} W={W} color={lc} />
      {/* Key outlines */}
      <Border x={0}        y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={lc} />
      <Border x={L - keyLen} y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={lc} />
      {/* Free throw circles */}
      <ArcLine cxFt={keyLen}     cyFt={ftY} r={6} a0={0} a1={Math.PI * 2} L={L} W={W} color={lc} />
      <ArcLine cxFt={L - keyLen} cyFt={ftY} r={6} a0={0} a1={Math.PI * 2} L={L} W={W} color={lc} />
      {/* Corner 3pt straight lines */}
      <Seg x1={0}        y1={(W - c22 * 2) / 2} x2={arcBX}    y2={(W - c22 * 2) / 2} L={L} W={W} color={lc} />
      <Seg x1={0}        y1={(W + c22 * 2) / 2} x2={arcBX}    y2={(W + c22 * 2) / 2} L={L} W={W} color={lc} />
      <Seg x1={L}        y1={(W - c22 * 2) / 2} x2={L - arcBX} y2={(W - c22 * 2) / 2} L={L} W={W} color={lc} />
      <Seg x1={L}        y1={(W + c22 * 2) / 2} x2={L - arcBX} y2={(W + c22 * 2) / 2} L={L} W={W} color={lc} />
      {/* Three-point arcs (left faces right through 0°, right faces left through π) */}
      <ArcLine cxFt={bX}     cyFt={ftY} r={r3} a0={-arcA}            a1={arcA}              L={L} W={W} color={lc} />
      <ArcLine cxFt={L - bX} cyFt={ftY} r={r3} a0={Math.PI + arcA}   a1={Math.PI - arcA}    L={L} W={W} color={lc} />
      {/* Restricted area arcs */}
      <ArcLine cxFt={bX}     cyFt={ftY} r={4} a0={-Math.PI / 2}  a1={Math.PI / 2}     L={L} W={W} color={lc} />
      <ArcLine cxFt={L - bX} cyFt={ftY} r={4} a0={Math.PI / 2}   a1={Math.PI * 3 / 2} L={L} W={W} color={lc} />
      {/* Hoops */}
      {(acc.includes('basketball-hoop-single') || acc.includes('basketball-hoop-double')) && (
        <ArcLine cxFt={bX}     cyFt={ftY} r={0.75} a0={0} a1={Math.PI * 2} L={L} W={W} color="#F97316" lw={3} />
      )}
      {acc.includes('basketball-hoop-double') && (
        <ArcLine cxFt={L - bX} cyFt={ftY} r={0.75} a0={0} a1={Math.PI * 2} L={L} W={W} color="#F97316" lw={3} />
      )}
    </group>
  );
}

// ─── Tennis ───────────────────────────────────────────────────────────────────
function TennisCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, selectedAccessories: acc } = config;
  const singW = 27, sOff = (W - singW) / 2;
  const svcLen = (L - 42) / 2;
  const lc = colors.lines;
  const sbc = colors.serviceBox ?? colors.surface;

  return (
    <group>
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} />
      {/* Service box tints */}
      <Slab x={0}          y={sOff}           w={svcLen} h={singW / 2} L={L} W={W} color={sbc} alpha={0.8} />
      <Slab x={0}          y={sOff + singW / 2} w={svcLen} h={singW / 2} L={L} W={W} color={sbc} alpha={0.65} />
      <Slab x={L - svcLen} y={sOff}           w={svcLen} h={singW / 2} L={L} W={W} color={sbc} alpha={0.65} />
      <Slab x={L - svcLen} y={sOff + singW / 2} w={svcLen} h={singW / 2} L={L} W={W} color={sbc} alpha={0.8} />
      {/* Lines */}
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={lc} />
      <Seg x1={0}        y1={sOff}         x2={L}        y2={sOff}         L={L} W={W} color={lc} />
      <Seg x1={0}        y1={sOff + singW} x2={L}        y2={sOff + singW} L={L} W={W} color={lc} />
      <Seg x1={svcLen}   y1={sOff}         x2={svcLen}   y2={sOff + singW} L={L} W={W} color={lc} />
      <Seg x1={L - svcLen} y1={sOff}       x2={L - svcLen} y2={sOff + singW} L={L} W={W} color={lc} />
      <Seg x1={svcLen}   y1={W / 2}        x2={L - svcLen} y2={W / 2}       L={L} W={W} color={lc} />
      {/* Net */}
      <mesh position={[0, 0.08, tz(L / 2, L)]}>
        <boxGeometry args={[(W + 0.6) * S, 0.16, 0.025]} />
        <meshStandardMaterial color="white" transparent opacity={0.7} />
      </mesh>
      {/* Net posts */}
      {acc.includes('tennis-net') && (
        <>
          <mesh position={[tx(0, W) - 0.04, 0.12, tz(L / 2, L)]}>
            <cylinderGeometry args={[0.03, 0.03, 0.24, 8]} />
            <meshStandardMaterial color="#6B7280" />
          </mesh>
          <mesh position={[tx(W, W) + 0.04, 0.12, tz(L / 2, L)]}>
            <cylinderGeometry args={[0.03, 0.03, 0.24, 8]} />
            <meshStandardMaterial color="#6B7280" />
          </mesh>
        </>
      )}
    </group>
  );
}

// ─── Pickleball ───────────────────────────────────────────────────────────────
function PickleballCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, selectedAccessories: acc } = config;
  const playW = Math.min(W, 20), playL = Math.min(L, 44);
  const offX = (L - playL) / 2, offY = (W - playW) / 2;
  const nvz = 7;
  const lc = colors.lines;
  const kc = colors.kitchen ?? '#60A5FA';

  return (
    <group>
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} />
      {/* NVZ kitchen zones */}
      <Slab x={offX}             y={offY} w={nvz}  h={playW} L={L} W={W} color={kc} alpha={0.5} />
      <Slab x={offX + playL - nvz} y={offY} w={nvz} h={playW} L={L} W={W} color={kc} alpha={0.5} />
      {/* Lines */}
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={colors.border} lw={0.03} />
      <Border x={offX} y={offY} w={playL} h={playW} L={L} W={W} color={lc} />
      <Seg x1={offX}             y1={offY + playW / 2} x2={offX + playL}     y2={offY + playW / 2} L={L} W={W} color={lc} />
      <Seg x1={offX + nvz}       y1={offY}             x2={offX + nvz}       y2={offY + playW}     L={L} W={W} color={lc} />
      <Seg x1={offX + playL - nvz} y1={offY}           x2={offX + playL - nvz} y2={offY + playW}   L={L} W={W} color={lc} />
      {/* Net */}
      <mesh position={[tx(offY + playW / 2, W), 0.06, tz(offX + playL / 2, L)]}>
        <boxGeometry args={[(playW + 0.3) * S, 0.12, 0.02]} />
        <meshStandardMaterial color="white" transparent opacity={0.7} />
      </mesh>
      {acc.includes('pickleball-net') && (
        <>
          <mesh position={[tx(offY, W) - 0.03, 0.08, tz(offX + playL / 2, L)]}>
            <cylinderGeometry args={[0.025, 0.025, 0.16, 8]} />
            <meshStandardMaterial color="#6B7280" />
          </mesh>
          <mesh position={[tx(offY + playW, W) + 0.03, 0.08, tz(offX + playL / 2, L)]}>
            <cylinderGeometry args={[0.025, 0.025, 0.16, 8]} />
            <meshStandardMaterial color="#6B7280" />
          </mesh>
        </>
      )}
    </group>
  );
}

// ─── Multi-Sport ──────────────────────────────────────────────────────────────
function MultiSportCourt({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, colors, selectedAccessories: acc } = config;
  const keyW = 16, keyLen = 19, bX = 5.25;
  const midY = W / 2;
  const pklW = 20, pklLen = 44, pklY = (W - pklW) / 2;
  const pklX1 = L * 0.08, pklX2 = L * 0.52;
  const lc = colors.lines;
  const kc = colors.keyArea ?? '#1A3A6B';
  const pkl = '#FCD34D';

  return (
    <group>
      <Slab x={0} y={0} w={L} h={W} L={L} W={W} color={colors.surface} alpha={1} yOff={0.01} />
      {/* Paint zones */}
      <Slab x={0}          y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={kc} alpha={0.5} />
      <Slab x={L - keyLen} y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={kc} alpha={0.5} />
      {/* Basketball lines */}
      <Border x={0} y={0} w={L} h={W} L={L} W={W} color={lc} />
      <Seg x1={L / 2} y1={0} x2={L / 2} y2={W} L={L} W={W} color={lc} />
      <ArcLine cxFt={L / 2} cyFt={midY} r={6} a0={0} a1={Math.PI * 2} L={L} W={W} color={lc} />
      <Border x={0}          y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={lc} />
      <Border x={L - keyLen} y={(W - keyW) / 2} w={keyLen} h={keyW} L={L} W={W} color={lc} />
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
        <ArcLine cxFt={bX}     cyFt={midY} r={0.75} a0={0} a1={Math.PI * 2} L={L} W={W} color="#F97316" lw={3} />
      )}
      {acc.includes('basketball-hoop-double') && (
        <ArcLine cxFt={L - bX} cyFt={midY} r={0.75} a0={0} a1={Math.PI * 2} L={L} W={W} color="#F97316" lw={3} />
      )}
    </group>
  );
}

// ─── Scene switcher ───────────────────────────────────────────────────────────
function CourtScene({ config }: { config: CourtConfig }) {
  switch (config.type) {
    case 'basketball':  return <BasketballCourt config={config} />;
    case 'tennis':      return <TennisCourt config={config} />;
    case 'pickleball':  return <PickleballCourt config={config} />;
    case 'multi-sport': return <MultiSportCourt config={config} />;
  }
}

// ─── Exported component ───────────────────────────────────────────────────────
export function Court3D({ config }: { config: CourtConfig }) {
  const { length: L, width: W } = config.dimensions;
  const span = Math.max(L, W) * S;
  const camX = span * 0.85;
  const camY = span * 0.90;
  const camZ = span * 0.85;
  const shadowRange = span * 2.2;

  return (
    <Canvas
      shadows
      camera={{ position: [camX, camY, camZ], fov: 45, near: 0.01, far: 500 }}
      gl={{ antialias: true }}
    >
      <fog attach="fog" color="#c8dfc8" near={span * 3} far={span * 9} />
      <Sky sunPosition={[100, 30, 60]} turbidity={6} rayleigh={0.5} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#87ceeb', '#4a7c3f', 0.4]} />
      <directionalLight
        position={[span * 2, span * 3, span * 1.5]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={span * 10}
        shadow-camera-left={-shadowRange}
        shadow-camera-right={shadowRange}
        shadow-camera-top={shadowRange}
        shadow-camera-bottom={-shadowRange}
      />
      <Ground L={L} W={W} />
      <Trees L={L} W={W} />
      <CourtScene config={config} />
      <OrbitControls
        target={[0, 0, 0]}
        minDistance={span * 0.3}
        maxDistance={span * 4}
        minPolarAngle={Math.PI / 12}
        maxPolarAngle={Math.PI / 2.05}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
