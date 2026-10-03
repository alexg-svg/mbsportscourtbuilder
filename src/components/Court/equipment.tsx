import React, { useMemo } from 'react';
import * as THREE from 'three';
import { canvas, toTexture, useRepeated } from './realism';

// Detailed 3D equipment built from primitives. Scale: 1 ft = 0.1 units, so a
// 10 ft rim sits at y = 1.0. Each piece is drawn in its own local frame and
// placed by the court components.

// ─── Shared materials ─────────────────────────────────────────────────────────
const powderBlack = { color: '#22262d', metalness: 0.45, roughness: 0.45 };
const galvanized  = { color: '#a3abb5', metalness: 0.75, roughness: 0.35 };

// ─── Net and mesh textures ────────────────────────────────────────────────────
let netTex: THREE.Texture | null = null;
/** Square knotted netting, white strands on transparent. */
function netTexture() {
  if (netTex) return netTex;
  const [c, ctx] = canvas(64);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  for (const v of [1.5, 33.5]) {
    ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, 64); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, v); ctx.lineTo(64, v); ctx.stroke();
  }
  netTex = toTexture(c, true);
  return netTex;
}

let chainTex: THREE.Texture | null = null;
/** Chain-link diamond weave. */
function chainTexture() {
  if (chainTex) return chainTex;
  const [c, ctx] = canvas(64);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 32); ctx.lineTo(32, 0); ctx.lineTo(64, 32); ctx.lineTo(32, 64); ctx.closePath();
  ctx.stroke();
  chainTex = toTexture(c, true);
  return chainTex;
}

const NET_TILE = 0.06; // two net cells (≈3.5 in each) per texture tile

function NetMaterial({ color = '#f8fafc', map }: { color?: string; map?: THREE.Texture }) {
  return (
    <meshStandardMaterial
      color={color} map={map ?? netTexture()} transparent alphaTest={0.25}
      side={THREE.DoubleSide} roughness={0.8} depthWrite={false}
    />
  );
}

/** Quads with UVs measured in world units, so net cells keep their real size. */
function quadsGeometry(quads: [number, number, number][][], tile: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  quads.forEach(([a, b, c, d], q) => {
    const w = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / tile;
    const h = Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]) / tile;
    pos.push(...a, ...b, ...c, ...d);
    uv.push(0, 0, w, 0, w, h, 0, h);
    const o = q * 4;
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ─── Court nets (tennis, pickleball, volleyball, badminton) ───────────────────
/**
 * A net hung between two posts along the X axis, centered at `position`.
 * The top sags from `postH` at the posts to `centerH` in the middle.
 */
export function SportNet({ position, width, postH, centerH, bottom = 0.01, postR = 0.0125,
  postColor = powderBlack, centerStrap = false }: {
  position: [number, number, number]; width: number; postH: number; centerH: number;
  bottom?: number; postR?: number; postColor?: typeof powderBlack; centerStrap?: boolean;
}) {
  const { netGeo, tapeGeo } = useMemo(() => {
    const nx = 24;
    const top = (u: number) => postH - (postH - centerH) * (1 - (2 * u - 1) ** 2);
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i <= nx; i++) {
      const u = i / nx, x = -width / 2 + width * u, t = top(u);
      pos.push(x, bottom, 0, x, t, 0);
      uv.push(x / NET_TILE, bottom / NET_TILE, x / NET_TILE, t / NET_TILE);
      if (i < nx) { const o = i * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
    }
    const netGeo = new THREE.BufferGeometry();
    netGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    netGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    netGeo.setIndex(idx);
    netGeo.computeVertexNormals();
    const pts = Array.from({ length: nx + 1 }, (_, i) =>
      new THREE.Vector3(-width / 2 + width * i / nx, top(i / nx), 0));
    const tapeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.007, 6, false);
    return { netGeo, tapeGeo };
  }, [width, postH, centerH, bottom]);

  return (
    <group position={position}>
      <mesh geometry={netGeo}><NetMaterial color="#1f2328" /></mesh>
      <mesh geometry={tapeGeo} castShadow>
        <meshStandardMaterial color="#f8fafc" roughness={0.6} />
      </mesh>
      {centerStrap && (
        <mesh position={[0, centerH / 2, 0]}>
          <boxGeometry args={[0.017, centerH, 0.004]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
      )}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * width / 2, 0, 0]}>
          <mesh position={[0, postH / 2 + 0.01, 0]} castShadow>
            <cylinderGeometry args={[postR, postR, postH + 0.02, 12]} />
            <meshStandardMaterial {...postColor} />
          </mesh>
          <mesh position={[0, postH + 0.02, 0]}>
            <sphereGeometry args={[postR * 1.15, 12, 8]} />
            <meshStandardMaterial {...postColor} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Basketball goal ──────────────────────────────────────────────────────────
/**
 * In-ground goal with glass backboard. Local frame: backboard face at z = 0,
 * court toward +z, rim at 10 ft. `rotationY` = π turns it to face −z.
 */
export function BasketballGoal({ position, rotationY = 0 }: {
  position: [number, number, number]; rotationY?: number;
}) {
  const netMap = useRepeated(netTexture(), 12, 3);
  const rimY = 1.0, boardY = 1.125, overhang = 0.6;
  const tape = (w: number, h: number, x: number, y: number) => (
    <mesh position={[x, y, 0.008]}>
      <boxGeometry args={[w, h, 0.002]} />
      <meshStandardMaterial color="#ffffff" roughness={0.5} />
    </mesh>
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Pole with safety pad and base plate */}
      <mesh position={[0, 0.6, -overhang]} castShadow>
        <boxGeometry args={[0.05, 1.2, 0.05]} />
        <meshStandardMaterial {...powderBlack} />
      </mesh>
      <mesh position={[0, 0.3, -overhang]} castShadow>
        <boxGeometry args={[0.08, 0.6, 0.08]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.7} />
      </mesh>
      {/* Extension arm */}
      <mesh position={[0, boardY - 0.02, -overhang / 2]} castShadow>
        <boxGeometry args={[0.04, 0.04, overhang]} />
        <meshStandardMaterial {...powderBlack} />
      </mesh>
      <mesh position={[0, boardY - 0.12, -overhang / 2]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.025, 0.025, overhang * 0.95]} />
        <meshStandardMaterial {...powderBlack} />
      </mesh>
      {/* Tempered glass backboard, 72 × 42 in, aluminum frame */}
      <mesh position={[0, boardY, 0]} castShadow>
        <boxGeometry args={[0.6, 0.35, 0.012]} />
        <meshStandardMaterial color="#d7ecf2" transparent opacity={0.3} roughness={0.05} metalness={0.2} depthWrite={false} />
      </mesh>
      {[[0, 0.175], [0, -0.175]].map(([x, y], i) => (
        <mesh key={`h${i}`} position={[x, boardY + y, 0]}>
          <boxGeometry args={[0.61, 0.014, 0.018]} />
          <meshStandardMaterial {...galvanized} />
        </mesh>
      ))}
      {[[0.3, 0], [-0.3, 0]].map(([x, y], i) => (
        <mesh key={`v${i}`} position={[x, boardY + y, 0]}>
          <boxGeometry args={[0.014, 0.36, 0.018]} />
          <meshStandardMaterial {...galvanized} />
        </mesh>
      ))}
      {/* Shooter's square, 24 × 18 in, bottom edge at rim height */}
      {tape(0.2, 0.017, 0, rimY + 0.15)}
      {tape(0.017, 0.15, -0.1, rimY + 0.075)}
      {tape(0.017, 0.15, 0.1, rimY + 0.075)}
      {tape(0.2, 0.017, 0, rimY + 0.0085)}
      {/* Rim, bracket and net */}
      <mesh position={[0, rimY - 0.01, 0.035]}>
        <boxGeometry args={[0.07, 0.03, 0.06]} />
        <meshStandardMaterial color="#e2541c" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, rimY, 0.125]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.075, 0.005, 8, 32]} />
        <meshStandardMaterial color="#e2541c" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, rimY - 0.07, 0.125]}>
        <cylinderGeometry args={[0.074, 0.045, 0.14, 24, 1, true]} />
        <NetMaterial map={netMap} />
      </mesh>
    </group>
  );
}

// ─── Goals (futsal, handball, hockey) ─────────────────────────────────────────
/**
 * Goal frame with netting. Local frame: goal mouth at z = 0 facing +z, net
 * extending back toward −z.
 */
export function Goal({ position, rotationY = 0, width, height, depth, frameColor = '#f8fafc', frameR = 0.013, stripes }: {
  position: [number, number, number]; rotationY?: number; width: number; height: number;
  depth: number; frameColor?: string; frameR?: number; stripes?: string;
}) {
  const hw = width / 2;
  const netGeo = useMemo(() => {
    const bh = height * 0.75, d = -depth;
    return quadsGeometry([
      // back
      [[-hw, 0, d], [hw, 0, d], [hw, bh, d], [-hw, bh, d]],
      // roof, sloping from crossbar down to the back
      [[-hw, height, 0], [hw, height, 0], [hw, bh, d], [-hw, bh, d]],
      // sides
      [[-hw, 0, 0], [-hw, 0, d], [-hw, bh, d], [-hw, height, 0]],
      [[hw, 0, d], [hw, 0, 0], [hw, height, 0], [hw, bh, d]],
    ], NET_TILE);
  }, [hw, height, depth]);

  const tube = (len: number, pos: [number, number, number], rot: [number, number, number], r = frameR, color = frameColor) => (
    <mesh position={pos} rotation={rot} castShadow>
      <cylinderGeometry args={[r, r, len, 12]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
    </mesh>
  );

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {tube(height, [-hw, height / 2, 0], [0, 0, 0])}
      {tube(height, [hw, height / 2, 0], [0, 0, 0])}
      {tube(width + frameR * 2, [0, height, 0], [0, 0, Math.PI / 2])}
      {/* Painted stripes on the posts and bar (handball style) */}
      {stripes && [0.2, 0.6].map((f) => (
        <React.Fragment key={f}>
          {tube(height * 0.2, [-hw, height * (f + 0.1), 0], [0, 0, 0], frameR * 1.05, stripes)}
          {tube(height * 0.2, [hw, height * (f + 0.1), 0], [0, 0, 0], frameR * 1.05, stripes)}
        </React.Fragment>
      ))}
      {/* Ground frame */}
      {tube(width, [0, frameR, -depth], [0, 0, Math.PI / 2], frameR * 0.6)}
      {tube(depth, [-hw, frameR, -depth / 2], [Math.PI / 2, 0, 0], frameR * 0.6)}
      {tube(depth, [hw, frameR, -depth / 2], [Math.PI / 2, 0, 0], frameR * 0.6)}
      <mesh geometry={netGeo}><NetMaterial /></mesh>
    </group>
  );
}

// ─── Sports lighting ──────────────────────────────────────────────────────────
/**
 * 20 ft steel pole with twin LED floodlights aimed at `aim`. At night each
 * pole adds a spotlight onto the court.
 */
export function LightPole({ x, z, aim, night }: {
  x: number; z: number; aim: [number, number]; night: boolean;
}) {
  const H = 2.0;
  const rotY = Math.atan2(aim[0] - x, aim[1] - z);
  const target = useMemo(() => new THREE.Object3D(), []);
  const dirX = Math.sin(rotY), dirZ = Math.cos(rotY);
  return (
    <>
      <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <cylinderGeometry args={[0.06, 0.07, 0.08, 16]} />
          <meshStandardMaterial color="#a8a29e" roughness={0.9} />
        </mesh>
        <mesh position={[0, H / 2, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.035, H, 12]} />
          <meshStandardMaterial {...galvanized} />
        </mesh>
        <mesh position={[0, H - 0.02, 0.04]} castShadow>
          <boxGeometry args={[0.36, 0.022, 0.022]} />
          <meshStandardMaterial {...galvanized} />
        </mesh>
        {[-0.12, 0.12].map((fx) => (
          <group key={fx} position={[fx, H - 0.05, 0.1]} rotation={[-0.55, 0, 0]}>
            {/* Yoke bracket */}
            {[-0.07, 0.07].map((yx) => (
              <mesh key={yx} position={[yx, 0.012, -0.01]}>
                <boxGeometry args={[0.008, 0.04, 0.03]} />
                <meshStandardMaterial {...galvanized} />
              </mesh>
            ))}
            <mesh castShadow>
              <boxGeometry args={[0.13, 0.025, 0.1]} />
              <meshStandardMaterial color="#2d3036" metalness={0.4} roughness={0.5} />
            </mesh>
            {/* Cooling fins */}
            {[-0.04, -0.013, 0.013, 0.04].map((fz) => (
              <mesh key={fz} position={[0, 0.016, fz]}>
                <boxGeometry args={[0.12, 0.008, 0.004]} />
                <meshStandardMaterial color="#2d3036" metalness={0.4} roughness={0.5} />
              </mesh>
            ))}
            {/* Glare visor along the front edge */}
            <mesh position={[0, -0.02, 0.052]} rotation={[0.5, 0, 0]}>
              <boxGeometry args={[0.13, 0.004, 0.035]} />
              <meshStandardMaterial color="#2d3036" metalness={0.4} roughness={0.5} />
            </mesh>
            <mesh position={[0, -0.014, 0]}>
              <boxGeometry args={[0.11, 0.004, 0.08]} />
              <meshStandardMaterial color="#fffaf0" emissive="#fff3d6" emissiveIntensity={night ? 4 : 0.3} toneMapped={!night} />
            </mesh>
          </group>
        ))}
      </group>
      {night && (
        <>
          <primitive object={target} position={[aim[0], 0, aim[1]]} />
          <spotLight
            position={[x + dirX * 0.1, H - 0.06, z + dirZ * 0.1]}
            target={target}
            color="#fff1d9"
            intensity={1.1}
            angle={1.15}
            penumbra={0.35}
            decay={0}
          />
        </>
      )}
    </>
  );
}

// ─── Fencing ──────────────────────────────────────────────────────────────────
function ChainRun({ start, end, height, windscreen }: {
  start: [number, number]; end: [number, number]; height: number; windscreen: boolean;
}) {
  const len = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const rotY = Math.atan2(end[0] - start[0], end[1] - start[1]) - Math.PI / 2;
  const cx = (start[0] + end[0]) / 2, cz = (start[1] + end[1]) / 2;
  const mesh = useRepeated(chainTexture(), len / 0.05, height / 0.05);
  const posts = Math.max(1, Math.round(len / 1.0)); // posts every 10 ft
  return (
    <group position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
      <mesh position={[0, height / 2, 0]}>
        <planeGeometry args={[len, height]} />
        <meshStandardMaterial color="#b6bcc4" map={mesh} transparent alphaTest={0.2} side={THREE.DoubleSide}
          metalness={0.6} roughness={0.4} depthWrite={false} />
      </mesh>
      {windscreen && (
        <mesh position={[0, height * 0.48, 0.006]} receiveShadow>
          <planeGeometry args={[len, height * 0.9]} />
          <meshStandardMaterial color="#21402c" roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh position={[0, height, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, len, 8]} />
        <meshStandardMaterial {...galvanized} />
      </mesh>
      {Array.from({ length: posts + 1 }, (_, i) => (
        <mesh key={i} position={[-len / 2 + (len * i) / posts, height / 2 + 0.01, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, height + 0.02, 8]} />
          <meshStandardMaterial {...galvanized} />
        </mesh>
      ))}
    </group>
  );
}

function VinylRun({ start, end }: { start: [number, number]; end: [number, number] }) {
  const len = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const rotY = Math.atan2(end[0] - start[0], end[1] - start[1]) - Math.PI / 2;
  const cx = (start[0] + end[0]) / 2, cz = (start[1] + end[1]) / 2;
  const h = 0.6;
  const posts = Math.max(1, Math.round(len / 0.8)); // 8 ft panels
  return (
    <group position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[len, h, 0.02]} />
        <meshStandardMaterial color="#f4f6f8" roughness={0.45} />
      </mesh>
      {Array.from({ length: posts + 1 }, (_, i) => (
        <group key={i} position={[-len / 2 + (len * i) / posts, 0, 0]}>
          <mesh position={[0, h / 2 + 0.02, 0]} castShadow>
            <boxGeometry args={[0.045, h + 0.04, 0.045]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
          <mesh position={[0, h + 0.05, 0]}>
            <boxGeometry args={[0.055, 0.015, 0.055]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Perimeter fence around a rectangle of half-extents hx × hz. */
export function PerimeterFence({ hx, hz, kind, windscreen }: {
  hx: number; hz: number; kind: 'chain' | 'vinyl'; windscreen: boolean;
}) {
  const runs: [[number, number], [number, number]][] = [
    [[-hx, -hz], [hx, -hz]], [[hx, -hz], [hx, hz]],
    [[hx, hz], [-hx, hz]], [[-hx, hz], [-hx, -hz]],
  ];
  return (
    <group>
      {runs.map(([a, b], i) => kind === 'chain'
        ? <ChainRun key={i} start={a} end={b} height={1.0} windscreen={windscreen} />
        : <VinylRun key={i} start={a} end={b} />)}
    </group>
  );
}

// ─── Site furnishings ─────────────────────────────────────────────────────────
/** 6 ft aluminum player bench. Local X runs along the bench. */
export function PlayerBench({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const alum = { color: '#c9ced6', metalness: 0.7, roughness: 0.3 };
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {[-0.045, 0, 0.045].map((z) => (
        <mesh key={z} position={[0, 0.17, z]} castShadow>
          <boxGeometry args={[0.6, 0.012, 0.04]} />
          <meshStandardMaterial {...alum} />
        </mesh>
      ))}
      <mesh position={[0, 0.32, -0.09]} rotation={[-0.15, 0, 0]} castShadow>
        <boxGeometry args={[0.6, 0.05, 0.012]} />
        <meshStandardMaterial {...alum} />
      </mesh>
      {[-0.25, 0.25].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.085, 0.04]} castShadow>
            <boxGeometry args={[0.02, 0.17, 0.02]} />
            <meshStandardMaterial {...powderBlack} />
          </mesh>
          <mesh position={[0, 0.16, -0.07]} castShadow>
            <boxGeometry args={[0.02, 0.32, 0.02]} />
            <meshStandardMaterial {...powderBlack} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 42 in dasher boards with yellow kick plate around a rink. */
export function DasherBoards({ hx, hz }: { hx: number; hz: number }) {
  const h = 0.35, t = 0.02;
  const side = (len: number, pos: [number, number, number], alongZ: boolean, inward: number) => {
    const size = (w: number, hh: number, d: number): [number, number, number] => alongZ ? [d, hh, w] : [w, hh, d];
    const off = (v: number): [number, number, number] =>
      alongZ ? [pos[0] + v * inward, 0, pos[2]] : [pos[0], 0, pos[2] + v * inward];
    const [kx, , kz] = off(t / 2 + 0.001);
    return (
      <group key={`${pos[0]}-${pos[2]}`}>
        <mesh position={[pos[0], h / 2, pos[2]]} castShadow receiveShadow>
          <boxGeometry args={size(len, h, t)} />
          <meshStandardMaterial color="#f5f7fa" roughness={0.35} />
        </mesh>
        <mesh position={[kx, 0.03, kz]}>
          <boxGeometry args={size(len, 0.06, 0.003)} />
          <meshStandardMaterial color="#facc15" roughness={0.5} />
        </mesh>
        <mesh position={[pos[0], h + 0.008, pos[2]]}>
          <boxGeometry args={size(len, 0.016, t + 0.01)} />
          <meshStandardMaterial color="#e11d48" roughness={0.5} />
        </mesh>
      </group>
    );
  };
  return (
    <group>
      {side(hx * 2 + t, [0, 0, -hz], false, 1)}
      {side(hx * 2 + t, [0, 0, hz], false, -1)}
      {side(hz * 2, [-hx, 0, 0], true, 1)}
      {side(hz * 2, [hx, 0, 0], true, -1)}
    </group>
  );
}
