// Recover a camera from four image points that mark the corners of a known
// rectangle on the ground, so the 3D court can be rendered into a photo.
//
// Conventions
// - Image points are in photo pixels, origin top-left, y down.
// - The ground rectangle is the court's surfaced area in scene units:
//   plane X runs along the court length (0..lenX), plane Y along the width
//   (0..lenY), plane Z points up.
// - The 3D scene has the court centered at the origin, length along Z,
//   width along X, Y up (see Court3D).

export type Pt = [number, number];

/** Solve A·x = b (n×n) by Gaussian elimination with partial pivoting. */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** Homography H (3×3, row-major) mapping plane points src[i] to image points dst[i]. */
export function homography(src: Pt[], dst: Pt[]): number[] | null {
  const A: number[][] = [], b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = solve(A, b);
  return h ? [...h, 1] : null;
}

type V3 = [number, number, number];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a: V3) => scale(a, 1 / Math.hypot(...a));

export interface YardCamera {
  /** Focal length in photo pixels. */
  f: number;
  /** Rotation rows r1, r2, r3 (plane → camera, OpenCV style: x right, y down, z forward). */
  R: [V3, V3, V3];
  t: V3;
  /** True when the plane had to be mirrored to keep the camera above ground. */
  mirrored: boolean;
}

/**
 * Estimate focal length and pose from four tapped corners.
 * `corners` are in tap order and map to plane corners (0,0), (lenX,0),
 * (lenX,lenY), (0,lenY). Returns null if the taps are degenerate.
 */
export function solveCamera(corners: Pt[], lenX: number, lenY: number, imgW: number, imgH: number): YardCamera | null {
  const cx = imgW / 2, cy = imgH / 2;
  const centered = corners.map(([u, v]) => [u - cx, v - cy] as Pt);

  for (const mirrored of [false, true]) {
    const plane: Pt[] = mirrored
      ? [[0, lenY], [lenX, lenY], [lenX, 0], [0, 0]]
      : [[0, 0], [lenX, 0], [lenX, lenY], [0, lenY]];
    const H = homography(plane, centered);
    if (!H) return null;
    const [h11, h12, h13, h21, h22, h23, h31, h32, h33] = H;

    // Focal length from the two rotation constraints (r1 ⟂ r2, |r1| = |r2|)
    const est: number[] = [];
    const den1 = h31 * h32;
    if (Math.abs(den1) > 1e-12) { const f2 = -(h11 * h12 + h21 * h22) / den1; if (f2 > 0) est.push(Math.sqrt(f2)); }
    const den2 = h31 * h31 - h32 * h32;
    if (Math.abs(den2) > 1e-12) { const f2 = (h12 * h12 + h22 * h22 - h11 * h11 - h21 * h21) / den2; if (f2 > 0) est.push(Math.sqrt(f2)); }
    const big = Math.max(imgW, imgH);
    let f = est.length ? est.reduce((a, b) => a + b) / est.length : big * 1.1;
    f = Math.min(Math.max(f, big * 0.35), big * 5);

    // K⁻¹·H = λ [r1 r2 t]
    const a1: V3 = [h11 / f, h21 / f, h31];
    const a2: V3 = [h12 / f, h22 / f, h32];
    const a3: V3 = [h13 / f, h23 / f, h33];
    let lambda = 2 / (Math.hypot(...a1) + Math.hypot(...a2));
    if (a3[2] * lambda < 0) lambda = -lambda; // plane must be in front of the camera
    const r1 = norm(scale(a1, lambda));
    const r2 = norm(sub(scale(a2, lambda), scale(r1, dot(r1, scale(a2, lambda)))));
    const r3 = cross(r1, r2);
    const t = scale(a3, lambda);

    // R has r1, r2, r3 as its columns
    const R: [V3, V3, V3] = [
      [r1[0], r2[0], r3[0]],
      [r1[1], r2[1], r3[1]],
      [r1[2], r2[2], r3[2]],
    ];
    // Camera center in plane coords is −Rᵀt; it must be above the ground (Z > 0)
    const centerZ = -dot(r3, t);
    if (centerZ > 0) return { f, R, t, mirrored };
  }
  return null;
}

/**
 * Camera world matrix (column-major 4×4, three.js layout) for the scene,
 * where the court's surfaced area spans x ∈ [−hx, hx], z ∈ [−hz, hz].
 */
export function cameraWorldMatrix(cam: YardCamera, hx: number, hz: number): number[] {
  const { R, t } = cam;
  // world → plane: X = z + hz, Y = x + hx, Z = y
  const Mw = [
    [0, 0, 1, hz],
    [1, 0, 0, hx],
    [0, 1, 0, 0],
    [0, 0, 0, 1],
  ];
  // plane → OpenCV camera
  const E = [
    [...R[0], t[0]],
    [...R[1], t[1]],
    [...R[2], t[2]],
    [0, 0, 0, 1],
  ];
  // OpenCV camera → three.js camera (flip y and z)
  const F = [[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, 0], [0, 0, 0, 1]];
  const mul = (A: number[][], B: number[][]) =>
    A.map((row) => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
  const V = mul(F, mul(E, Mw)); // world → camera (view matrix)

  // Invert the rigid transform: [Rv | tv]⁻¹ = [Rvᵀ | −Rvᵀ tv]
  const Rv = [V[0].slice(0, 3), V[1].slice(0, 3), V[2].slice(0, 3)];
  const tv = [V[0][3], V[1][3], V[2][3]];
  const W = [0, 1, 2].map((i) => [Rv[0][i], Rv[1][i], Rv[2][i]]);
  const pos = W.map((row) => -(row[0] * tv[0] + row[1] * tv[1] + row[2] * tv[2]));
  // column-major
  return [
    W[0][0], W[1][0], W[2][0], 0,
    W[0][1], W[1][1], W[2][1], 0,
    W[0][2], W[1][2], W[2][2], 0,
    pos[0], pos[1], pos[2], 1,
  ];
}

/** Vertical field of view in degrees for a focal length in pixels. */
export const fovFromFocal = (f: number, imgH: number) => (2 * Math.atan(imgH / 2 / f) * 180) / Math.PI;
