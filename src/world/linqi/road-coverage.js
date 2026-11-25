// Paint and erase operations are stored in drawing order. All consumers query the same
// rounded, midpoint-smoothed footprint, including at the borders of terrain tiles.
export const roadTypes = ['stonepath', 'dirtpath'];
export const isRoadPaint = type => roadTypes.includes(type);
export const isRoadEdit = type => isRoadPaint(type) || type === 'road-erase';

export function smoothPoints(points) {
  if (points.length < 3) return points;
  const path = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = path.at(-1), c = points[i], next = points[i + 1];
    const b = [(c[0] + next[0]) / 2, (c[1] + next[1]) / 2];
    const curvature = Math.hypot(a[0] - 2*c[0] + b[0], a[1] - 2*c[1] + b[1]);
    const count = Math.min(128, Math.max(1, Math.ceil(Math.sqrt(curvature / .08))));
    for (let j = 1; j <= count; j++) {
      const t = j / count, u = 1 - t;
      path.push([u*u*a[0] + 2*u*t*c[0] + t*t*b[0], u*u*a[1] + 2*u*t*c[1] + t*t*b[1]]);
    }
  }
  path.push(points.at(-1));
  return path;
}

const cache = new WeakMap();
const baked = new WeakMap();
function prepare(stroke) {
  if (baked.has(stroke)) return baked.get(stroke);
  const points = smoothPoints(stroke.p), radius = stroke.w / 2;
  const segments = [];
  const bounds={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
  for (let i = 0; i < Math.max(points.length - 1, 1); i++) {
    const [x,z] = points[i], [xx,zz] = points[i + 1] ?? points[i];
    const dx = xx - x, dz = zz - z;
    const seg={x,z,dx,dz,length2:dx*dx + dz*dz, minX:Math.min(x,xx)-radius,
      maxX:Math.max(x,xx)+radius,minZ:Math.min(z,zz)-radius,maxZ:Math.max(z,zz)+radius};
    segments.push(seg);
    bounds.minX=Math.min(bounds.minX,seg.minX); bounds.maxX=Math.max(bounds.maxX,seg.maxX);
    bounds.minZ=Math.min(bounds.minZ,seg.minZ); bounds.maxZ=Math.max(bounds.maxZ,seg.maxZ);
  }
  const path = {stroke,points,segments,bounds,radius2:radius*radius};
  baked.set(stroke, path);
  return path;
}

export function createRoadCoverage(strokes) {
  if (cache.has(strokes)) return cache.get(strokes);
  const edits = strokes.filter(s => isRoadEdit(s.type) && s.p.length).map(prepare);
  const buckets = new Map();
  // Index on demand so even a long imported stroke only occupies visited cells.
  function editAt(x,z,source=null) {
    const cx = Math.floor(x/4), cz = Math.floor(z/4), key = cx + ',' + cz;
    let candidates = buckets.get(key);
    if (!candidates) {
      candidates = [];
      for (let i = edits.length-1; i >= 0; i--) {
        const path = edits[i], b=path.bounds;
        if(b.maxX<cx*4 || b.minX>(cx+1)*4 || b.maxZ<cz*4 || b.minZ>(cz+1)*4)continue;
        const segments = path.segments.filter(s => s.maxX >= cx*4 && s.minX <= (cx+1)*4
          && s.maxZ >= cz*4 && s.minZ <= (cz+1)*4);
        if (segments.length) candidates.push({path,segments});
      }
      buckets.set(key,candidates);
    }
    for (const {path,segments} of candidates) {
      // A coat of paving can retain an older approach's direction. An eraser removes it.
      if(source && path.stroke!==source && path.stroke.type!=='road-erase')continue;
      for (const seg of segments) {
        if (x < seg.minX || x > seg.maxX || z < seg.minZ || z > seg.maxZ) continue;
        const px=x-seg.x, pz=z-seg.z;
        const t=seg.length2 ? Math.min(1, Math.max(0,(px*seg.dx + pz*seg.dz)/seg.length2)) : 0;
        if ((px-t*seg.dx)**2 + (pz-t*seg.dz)**2 <= path.radius2 + 1e-10) return path.stroke;
      }
    }
    return null;
  }
  function strokeAt(x,z) {
    const stroke = editAt(x,z);
    return stroke?.type === 'road-erase' ? null : stroke;
  }
  const coverage = {paths:edits.filter(({stroke})=>isRoadPaint(stroke.type)),editAt,strokeAt,
    typeAt:(x,z)=>strokeAt(x,z)?.type ?? null,
    survivesAt:(stroke,x,z)=>isRoadPaint(stroke.type)&&editAt(x,z,stroke)===stroke};
  cache.set(strokes,coverage);
  return coverage;
}

// Split a cross section into surviving strips. Refine transitions to millimetres
// so the mesh and walkable footprint share the actual cut edge.
export function crossSection(width, inside) {
  const count = Math.max(2, Math.ceil(width/.09)), step = width/count, runs = [];
  let previous = -width/2, open = inside(previous), from = previous;
  for (let i = 1; i <= count; i++) {
    const offset = -width/2 + i*step, next = inside(offset);
    if (next !== open) {
      let lo = previous, hi = offset;
      for (let j=0; j<7; j++) {
        const mid=(lo+hi)/2;
        if (inside(mid)===open) lo=mid; else hi=mid;
      }
      const edge=(lo+hi)/2;
      if (open) runs.push([from,edge]); else from=edge;
    }
    previous=offset; open=next;
  }
  if (open) runs.push([from,width/2]);
  return runs;
}
