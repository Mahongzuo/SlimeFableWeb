/**
 * Perceptual OKLab / OKLCH color metrics & damped Levenberg-Marquardt least-squares solver
 * used by the Step 5-8 math-driven scene calibration loop.
 */

export interface OKLCH {
  L: number; // Perceptual lightness [0..1]
  C: number; // Chroma [0..~0.4]
  h: number; // Hue angle in degrees [0..360)
}

export function srgbToLinear(c: number): number {
  const x = Math.max(0, Math.min(1, c));
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(c: number): number {
  const x = Math.max(0, Math.min(1, c));
  return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

/** Bjorn Ottosson's OKLab / OKLCH conversion from sRGB [0..1]. */
export function srgbToOklch(r: number, g: number, b: number): OKLCH {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(Math.max(0, l));
  const m_ = Math.cbrt(Math.max(0, m));
  const s_ = Math.cbrt(Math.max(0, s));

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const C = Math.hypot(a, bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return {L, C, h};
}

export function oklchToSrgb(L: number, C: number, hDeg: number): [number, number, number] {
  const hRad = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const bb = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * bb;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

/** Shortest signed hue difference in degrees [-180, 180]. */
export function hueDeltaDeg(h1: number, h2: number): number {
  let d = ((h1 - h2 + 540) % 360) - 180;
  if (d < -180) d += 360;
  return d;
}

/** Weighted OKLCH perceptual distance vector (dL, dC, chroma-weighted dH). */
export function oklchResidual(meas: OKLCH, target: OKLCH, wL = 1.0, wC = 1.4, wH = 0.85): [number, number, number] {
  const dL = (meas.L - target.L) * wL;
  const dC = (meas.C - target.C) * wC;
  // Scale hue residual by geometric mean chroma so near-neutral colors don't destabilize hue gradients
  const chromaScale = Math.sqrt(Math.max(0, meas.C * target.C));
  const dhRad = (hueDeltaDeg(meas.h, target.h) * Math.PI) / 180;
  const dH = 2 * chromaScale * Math.sin(dhRad * 0.5) * wH;
  return [dL, dC, dH];
}

/** Solve symmetric positive-definite linear system A * x = b via Gaussian elimination with partial pivoting. */
export function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    let best = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(M[r][col]);
      if (v > best) {
        best = v;
        pivot = r;
      }
    }
    if (best < 1e-12) return null;
    if (pivot !== col) {
      const tmp = M[col];
      M[col] = M[pivot];
      M[pivot] = tmp;
    }
    const diag = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= diag;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (f === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map(row => row[n]);
}

/**
 * One damped Levenberg-Marquardt step given current parameter vector theta, bounds,
 * residual vector r(theta), and finite-difference Jacobian J (rows = residuals, cols = params).
 */
export function lmStep(
  theta: number[],
  residuals: number[],
  jacobian: number[][],
  lambda: number,
  bounds: [number, number][],
): number[] {
  const m = residuals.length;
  const p = theta.length;
  const JtJ: number[][] = Array.from({length: p}, () => new Array(p).fill(0));
  const Jtr: number[] = new Array(p).fill(0);

  for (let i = 0; i < m; i++) {
    const ri = residuals[i];
    const Ji = jacobian[i];
    for (let a = 0; a < p; a++) {
      Jtr[a] += Ji[a] * ri;
      for (let b = a; b < p; b++) {
        JtJ[a][b] += Ji[a] * Ji[b];
      }
    }
  }
  for (let a = 0; a < p; a++) {
    for (let b = 0; b < a; b++) JtJ[a][b] = JtJ[b][a];
    JtJ[a][a] += lambda * Math.max(1e-4, JtJ[a][a] + 1e-3);
  }

  const rhs = Jtr.map(v => -v);
  const delta = solveLinearSystem(JtJ, rhs);
  if (!delta) return [...theta];
  return theta.map((v, idx) => Math.max(bounds[idx][0], Math.min(bounds[idx][1], v + delta[idx])));
}
