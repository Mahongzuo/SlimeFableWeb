import type {Vec} from '../slime/types';

export const rainDrift = [-.075, .022] as const;

/** Read the display buffer: the worker can already have reclaimed the previous frame's arrays. */
export interface RainBody {
  positions: Float32Array;
  clusters: Float32Array;
  count: number;
  center: Vec;
  radii: Vec;
  offset: Vec;
  generation: number;
}

/** Highest rendered main-body triangle crossed by this segment of a falling streak. */
export function rainBodyHit(body: RainBody, x: number, z: number, floor: number, low: number, high: number): Vec | null {
  const [sx,sz] = rainDrift;
  const [ox,oy,oz] = body.offset;
  const [cx,cy,cz] = body.center;
  const [rx,ry,rz] = body.radii;
  const by = cy + oy, pad = .09;
  if (low > by + ry*1.5 + pad || high < by - ry*1.5 - pad ||
      Math.abs(x + sx*(by-floor) - cx-ox) > rx*1.5 + pad ||
      Math.abs(z + sz*(by-floor) - cz-oz) > rz*1.5 + pad) return null;
  const v = body.positions;
  const ux = x - ox + sx*(oy-floor), uz = z - oz + sz*(oy-floor);
  let highest = -Infinity;
  for (let i=0;i<body.count;i+=3) {
    if (body.clusters[i] !== 0) continue;
    const k = i*3;
    const ax=v[k]-sx*v[k+1], az=v[k+2]-sz*v[k+1];
    const bx=v[k+3]-sx*v[k+4]-ax, bz=v[k+5]-sz*v[k+4]-az;
    const cx2=v[k+6]-sx*v[k+7]-ax, cz2=v[k+8]-sz*v[k+7]-az;
    const det=bx*cz2-bz*cx2;
    if (Math.abs(det)<1e-10) continue;
    const dx=ux-ax, dz=uz-az;
    const b=(dx*cz2-dz*cx2)/det, c=(bx*dz-bz*dx)/det;
    if (b<0 || c<0 || b+c>1) continue;
    const y=oy+v[k+1]+b*(v[k+4]-v[k+1])+c*(v[k+7]-v[k+1]);
    if (y>=low && y<=high && y>highest) highest=y;
  }
  return highest===-Infinity ? null : [x+sx*(highest-floor),highest,z+sz*(highest-floor)];
}
