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

function Slab({ x, y, w, h, L, W, color, alpha = 1, yOff = 0.005, roughness = 0.8 }: {
  x: number; y: number; w: number; h: number;
  L: number; W: number; color: string; alpha?: number; yOff?: number; roughness?: number;
}) {
  return (
    <mesh position={[tx(y + h / 2, W), yOff, tz(x + w / 2, L)]} receiveShadow>
      <boxGeometry args={[h * S, 0.01, w * S]} />
      <meshStandardMaterial color={color} transparent={alpha < 1} opacity={alpha} roughness={roughness} />
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

// ─── Accessory building blocks ────────────────────────────────────────────────

function LightPole({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 1.2, 8]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0.15, 1.22, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.015, 0.015, 0.36, 6]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0.30, 1.22, 0]} castShadow>
        <boxGeometry args={[0.18, 0.05, 0.28]} />
        <meshStandardMaterial color="#FCD34D" emissive="#FCD34D" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

function Bench3D({ x, z, rotY = 0 }: { x: number; z: number; rotY?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.21, 0]}>
        <boxGeometry args={[0.62, 0.04, 0.16]} />
        <meshStandardMaterial color="#92400E" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.36, -0.065]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.62, 0.04, 0.16]} />
        <meshStandardMaterial color="#92400E" roughness={0.85} />
      </mesh>
      <mesh position={[-0.26, 0.1, 0]}>
        <boxGeometry args={[0.035, 0.2, 0.035]} />
        <meshStandardMaterial color="#7C3500" roughness={0.85} />
      </mesh>
      <mesh position={[ 0.26, 0.1, 0]}>
        <boxGeometry args={[0.035, 0.2, 0.035]} />
        <meshStandardMaterial color="#7C3500" roughness={0.85} />
      </mesh>
    </group>
  );
}

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

function CourtAccessories3D({ config }: { config: CourtConfig }) {
  const { dimensions: { length: L, width: W }, selectedAccessories: acc } = config;
  const halfW = (W * S) / 2;
  const halfL = (L * S) / 2;
  const edgeX = halfW + 0.9;  // just outside the 8ft border pad
  const edgeL = halfL + 0.9;

  const nodes: React.ReactNode[] = [];

  // ── Lighting ──
  if (acc.includes('lighting-2-pole')) {
    nodes.push(
      <LightPole key="lp1" x={-edgeX} z={0} />,
      <LightPole key="lp2" x={ edgeX} z={0} />,
    );
  } else if (acc.includes('lighting-4-pole')) {
    nodes.push(
      <LightPole key="lp1" x={-edgeX} z={-halfL * 0.5} />,
      <LightPole key="lp2" x={-edgeX} z={ halfL * 0.5} />,
      <LightPole key="lp3" x={ edgeX} z={-halfL * 0.5} />,
      <LightPole key="lp4" x={ edgeX} z={ halfL * 0.5} />,
    );
  } else if (acc.includes('lighting-6-pole')) {
    nodes.push(
      <LightPole key="lp1" x={-edgeX} z={-halfL * 0.65} />,
      <LightPole key="lp2" x={-edgeX} z={0}             />,
      <LightPole key="lp3" x={-edgeX} z={ halfL * 0.65} />,
      <LightPole key="lp4" x={ edgeX} z={-halfL * 0.65} />,
      <LightPole key="lp5" x={ edgeX} z={0}             />,
      <LightPole key="lp6" x={ edgeX} z={ halfL * 0.65} />,
    );
  }

  // ── Fencing ──
  if (acc.includes('chain-link-fence') || acc.includes('vinyl-fence')) {
    const isVinyl = acc.includes('vinyl-fence');
    const hasWind = acc.includes('windscreen');
    const fColor   = hasWind ? '#166534' : isVinyl ? '#CBD5E1' : '#94A3B8';
    const fH       = hasWind ? 0.34 : 0.2;
    const fOpacity = hasWind ? 0.52 : isVinyl ? 0.8 : 0.45;
    nodes.push(
      <mesh key="fn" position={[0, fH / 2, -edgeL]}>
        <boxGeometry args={[edgeX * 2 + 0.025, fH, 0.025]} />
        <meshStandardMaterial color={fColor} transparent opacity={fOpacity} />
      </mesh>,
      <mesh key="fs" position={[0, fH / 2, edgeL]}>
        <boxGeometry args={[edgeX * 2 + 0.025, fH, 0.025]} />
        <meshStandardMaterial color={fColor} transparent opacity={fOpacity} />
      </mesh>,
      <mesh key="fw" position={[-edgeX, fH / 2, 0]}>
        <boxGeometry args={[0.025, fH, edgeL * 2]} />
        <meshStandardMaterial color={fColor} transparent opacity={fOpacity} />
      </mesh>,
      <mesh key="fe" position={[edgeX, fH / 2, 0]}>
        <boxGeometry args={[0.025, fH, edgeL * 2]} />
        <meshStandardMaterial color={fColor} transparent opacity={fOpacity} />
      </mesh>,
    );
  }

  // ── Benches ──
  if (acc.includes('bench-2') || acc.includes('bench-4')) {
    const count  = acc.includes('bench-4') ? 4 : 2;
    const bX     = edgeX - 0.3;
    const fracs  = count === 2 ? [-0.28, 0.28] : [-0.55, -0.18, 0.18, 0.55];
    fracs.forEach((f, i) => {
      nodes.push(<Bench3D key={`bench-${i}`} x={bX} z={halfL * f} rotY={Math.PI / 2} />);
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
        <ArcLine cxFt={bX} cyFt={ftY} r={0.75} a0={0} a1={Math.PI * 2} L={L} W={W} color="#F97316" lw={3} />
      )}
      {acc.includes('basketball-hoop-double') && !half && (
        <ArcLine cxFt={L - bX} cyFt={ftY} r={0.75} a0={0} a1={Math.PI * 2} L={L} W={W} color="#F97316" lw={3} />
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
        <ArcLine cxFt={bX}     cyFt={midY} r={0.75} a0={0} a1={Math.PI * 2} L={L} W={W} color="#F97316" lw={3} />
      )}
      {acc.includes('basketball-hoop-double') && (
        <ArcLine cxFt={L - bX} cyFt={midY} r={0.75} a0={0} a1={Math.PI * 2} L={L} W={W} color="#F97316" lw={3} />
      )}
      {/* Pickleball nets */}
      {acc.includes('pickleball-net') && [pklX1, pklX2].map((bx, i) => (
        <group key={`pkl-net-${i}`}>
          <mesh position={[tx(pklY + pklW / 2, W), 0.06, tz(bx + pklLen / 2, L)]}>
            <boxGeometry args={[(pklW + 0.3) * S, 0.12, 0.02]} />
            <meshStandardMaterial color="white" transparent opacity={0.7} />
          </mesh>
          <mesh position={[tx(pklY, W) - 0.03, 0.08, tz(bx + pklLen / 2, L)]}>
            <cylinderGeometry args={[0.025, 0.025, 0.16, 8]} />
            <meshStandardMaterial color="#6B7280" />
          </mesh>
          <mesh position={[tx(pklY + pklW, W) + 0.03, 0.08, tz(bx + pklLen / 2, L)]}>
            <cylinderGeometry args={[0.025, 0.025, 0.16, 8]} />
            <meshStandardMaterial color="#6B7280" />
          </mesh>
        </group>
      ))}
      {/* Tennis net at center */}
      {acc.includes('tennis-net') && (
        <>
          <mesh position={[0, 0.08, tz(L / 2, L)]}>
            <boxGeometry args={[(W + 0.6) * S, 0.16, 0.025]} />
            <meshStandardMaterial color="white" transparent opacity={0.7} />
          </mesh>
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
      {/* Net */}
      <mesh position={[0, 0.07, tz(L / 2, L)]}>
        <boxGeometry args={[(W + 0.4) * S, 0.14, 0.02]} />
        <meshStandardMaterial color="white" transparent opacity={0.7} />
      </mesh>
      {acc.includes('badminton-net') && (
        <>
          <mesh position={[tx(0, W) - 0.03, 0.1, tz(L / 2, L)]}>
            <cylinderGeometry args={[0.025, 0.025, 0.2, 8]} />
            <meshStandardMaterial color="#6B7280" />
          </mesh>
          <mesh position={[tx(W, W) + 0.03, 0.1, tz(L / 2, L)]}>
            <cylinderGeometry args={[0.025, 0.025, 0.2, 8]} />
            <meshStandardMaterial color="#6B7280" />
          </mesh>
        </>
      )}
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
      {/* Futsal goals */}
      {acc.includes('futsal-goals') && (
        <>
          {/* Left goal */}
          <mesh position={[tx(midY, W), 0.1, tz(-goalLen / 2, L)]}>
            <boxGeometry args={[goalW * S, 0.2, goalLen * S]} />
            <meshStandardMaterial color="white" transparent opacity={0.3} wireframe />
          </mesh>
          {/* Right goal */}
          <mesh position={[tx(midY, W), 0.1, tz(L + goalLen / 2, L)]}>
            <boxGeometry args={[goalW * S, 0.2, goalLen * S]} />
            <meshStandardMaterial color="white" transparent opacity={0.3} wireframe />
          </mesh>
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
      {/* Hockey goals */}
      {acc.includes('hockey-goals') && (
        <>
          <mesh position={[tx(midY, W), 0.06, tz(goalLineX - goalDepth / 2, L)]}>
            <boxGeometry args={[goalW * S, 0.12, goalDepth * S]} />
            <meshStandardMaterial color="white" transparent opacity={0.3} wireframe />
          </mesh>
          <mesh position={[tx(midY, W), 0.06, tz(L - goalLineX + goalDepth / 2, L)]}>
            <boxGeometry args={[goalW * S, 0.12, goalDepth * S]} />
            <meshStandardMaterial color="white" transparent opacity={0.3} wireframe />
          </mesh>
        </>
      )}
      {/* Dasher boards */}
      {acc.includes('dasher-boards') && (
        <>
          <mesh position={[0, 0.02, tz(0, L)]}>
            <boxGeometry args={[(W * S) + 0.05, 0.04, 0.025]} />
            <meshStandardMaterial color="#E2E8F0" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0.02, tz(L, L)]}>
            <boxGeometry args={[(W * S) + 0.05, 0.04, 0.025]} />
            <meshStandardMaterial color="#E2E8F0" transparent opacity={0.85} />
          </mesh>
          <mesh position={[tx(0, W) - 0.01, 0.02, 0]}>
            <boxGeometry args={[0.025, 0.04, (L * S)]} />
            <meshStandardMaterial color="#E2E8F0" transparent opacity={0.85} />
          </mesh>
          <mesh position={[tx(W, W) + 0.01, 0.02, 0]}>
            <boxGeometry args={[0.025, 0.04, (L * S)]} />
            <meshStandardMaterial color="#E2E8F0" transparent opacity={0.85} />
          </mesh>
        </>
      )}
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
      {/* Handball goals accessory */}
      {acc.includes('handball-goals') && (
        <>
          <mesh position={[tx(midY, W), 0.1, tz(-goalLen / 2, L)]}>
            <boxGeometry args={[goalW * S, 0.2, goalLen * S]} />
            <meshStandardMaterial color="white" transparent opacity={0.3} wireframe />
          </mesh>
          <mesh position={[tx(midY, W), 0.1, tz(L + goalLen / 2, L)]}>
            <boxGeometry args={[goalW * S, 0.2, goalLen * S]} />
            <meshStandardMaterial color="white" transparent opacity={0.3} wireframe />
          </mesh>
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
      {/* Net */}
      <mesh position={[0, 0.09, tz(L / 2, L)]}>
        <boxGeometry args={[(W + 0.4) * S, 0.18, 0.025]} />
        <meshStandardMaterial color="white" transparent opacity={0.7} />
      </mesh>
      {acc.includes('volleyball-net') && (
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

// ─── Exported component ───────────────────────────────────────────────────────
export function Court3D({ config }: { config: CourtConfig }) {
  const { length: L, width: W } = config.dimensions;
  const span = Math.max(L, W) * S;
  const camX = span * 0.85;
  const camY = span * 0.90;
  const camZ = span * 0.85;
  const shadowRange = span * 2.2;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <div style={{ position: 'absolute', bottom: 10, right: 12, zIndex: 10,
      fontSize: 11, fontFamily: 'system-ui, sans-serif', fontWeight: 600,
      color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em',
      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
      pointerEvents: 'none', userSelect: 'none' }}>
      mbsportsbuilders.com
    </div>
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
      <CourtAccessories3D config={config} />
      <SportSpecificAccessories3D config={config} />
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
    </div>
  );
}
