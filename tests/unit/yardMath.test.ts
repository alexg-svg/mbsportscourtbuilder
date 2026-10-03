import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { solveCamera, cameraWorldMatrix, fovFromFocal, type Pt } from '../../src/components/Yard/yardMath';

// Take pictures of a known court with known cameras, then check that the
// camera recovered from the four corner taps matches.
const W = 1600, H = 1200, hx = 3.3, hz = 3.15;
const lenX = 2 * hz, lenY = 2 * hx;
const planeToWorld = (X: number, Y: number) => new THREE.Vector3(Y - hx, 0, X - hz);
const fwd: [number, number][] = [[0, 0], [lenX, 0], [lenX, lenY], [0, lenY]];
const rev: [number, number][] = [[0, lenY], [lenX, lenY], [lenX, 0], [0, 0]];

const cameras = [
  { pos: [6, 4, 7], fov: 50 },
  { pos: [-3, 2.5, 9], fov: 60 },
  { pos: [0.5, 12, 1], fov: 40 },
  { pos: [9, 1.6, -2], fov: 65 },
] as const;

describe('solveCamera', () => {
  for (const c of cameras) {
    for (const [dir, corners] of [['clockwise', fwd], ['counter-clockwise', rev]] as const) {
      it(`recovers a ${c.fov}° camera from ${dir} taps`, () => {
        const cam = new THREE.PerspectiveCamera(c.fov, W / H, 0.01, 1000);
        cam.position.set(c.pos[0], c.pos[1], c.pos[2]);
        cam.lookAt(0.3, 0, -0.4);
        cam.updateMatrixWorld();
        const proj = (p: THREE.Vector3): Pt => { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
        const taps = corners.map((q) => proj(planeToWorld(...q)));

        const sol = solveCamera(taps, lenX, lenY, W, H);
        expect(sol).not.toBeNull();
        expect(fovFromFocal(sol!.f, H)).toBeCloseTo(c.fov, 3);

        const est = new THREE.PerspectiveCamera(fovFromFocal(sol!.f, H), W / H, 0.01, 1000);
        new THREE.Matrix4().fromArray(cameraWorldMatrix(sol!, hx, hz)).decompose(est.position, est.quaternion, est.scale);
        est.updateMatrixWorld();
        expect(est.position.y).toBeCloseTo(c.pos[1], 3);
        // Every assigned corner lands back on its tap
        (sol!.mirrored ? rev : fwd).forEach((q, i) => {
          const b = planeToWorld(...q).project(est);
          expect(Math.hypot((b.x + 1) / 2 * W - taps[i][0], (1 - b.y) / 2 * H - taps[i][1])).toBeLessThan(0.01);
        });
      });
    }
  }

  it('rejects degenerate taps', () => {
    expect(solveCamera([[10, 10], [10, 10], [10, 10], [10, 10]], lenX, lenY, W, H)).toBeNull();
  });
});
