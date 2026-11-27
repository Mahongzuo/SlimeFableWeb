import {climateMaterial} from '../home/climate-material';
import {gardenRoads} from '../home/garden-regions';
import {riverDistance} from '../home/waterway';
import {getTerrainSplatTextures} from '../home/render/terrain-splat';
import {inland, lakeEdge, pathDistance, PATHS, WORLD, ZONES, zoneAt, LAKE} from './map';
import {coastalSeabedHeightAt} from './island-coast';
/** Grass tint per zone (sunlit sage-emerald Pine & Parcel / Ghibli meadow albedo), then 3-layer soil/flagstone paths & sand are splatted in PBR. */
const GRASS: Record<string, number> = {harbor:0x6ba352, park:0x72aa55, lake:0x5d9c61, farm:0x7aaa50, forest:0x548f57};
const DIRT = 0xd2b382, SAND = 0xe8d8ad, MUD = 0x87765a, SKIRT = 0x7d6b55;

/** Shared inland grass/meadow vertex color formula used by both inland terrain and seamless coastal skirt. */
export function sampleInlandGrassColor(x: number, zz: number, out: any, tint: any) {
  out.setHex(GRASS[zoneAt(x, zz)] ?? GRASS.park);
  const big = Math.sin(x * .11 + Math.sin(zz * .07) * 2) * Math.sin(zz * .13 + Math.cos(x * .05) * 2);
  const fine = Math.sin(x * 1.7 + zz * .9) * Math.sin(x * .37 - zz * 1.3);
  if (big > .32) out.lerp(tint.setHex(0x86b75e), Math.min(.40, (big - .32) * 1.05));
  else if (big < -.42) out.lerp(tint.setHex(0xb4c466), Math.min(.30, (-.42 - big) * 0.95));
  out.offsetHSL(fine * .010, 0, fine * .022);
  return out;
}
/**
 * Unified road-splat weight at (x, zz) across ALL inland zones (so gardenRoads continues seamlessly
 * across the harbor/park z=30 border without any abrupt seam or rectangular overlay tile).
 */
export function sampleTerrainRoadWeight(x: number, zz: number): number {
  const inSpawnQuay = Math.hypot(x - 10, zz - 17) < 9.55;
  if (inSpawnQuay) return 0;
  let pathW = 0;
  const p = pathDistance(x, zz);
  // Wide smooth 0..1 gradient (3.35m shoulder -> 1.55m full stone road) driving 3-layer soil + cobbles
  if (p < 3.35) pathW = Math.max(pathW, Math.min(1, (3.35 - p) / 1.80));
  // Garden road network spans harbor & south park (z <= 40, x >= -31)
  if (x >= -31 && zz <= 40) {
    const road = gardenRoads.typeAt(x, zz);
    if (road) {
      pathW = Math.max(pathW, road === 'stonepath' ? 0.96 : 0.48);
    } else {
      const nearInner =
        gardenRoads.typeAt(x + 0.85, zz) ||
        gardenRoads.typeAt(x - 0.85, zz) ||
        gardenRoads.typeAt(x, zz + 0.85) ||
        gardenRoads.typeAt(x, zz - 0.85);
      if (nearInner) {
        pathW = Math.max(pathW, 0.42);
      } else {
        const nearOuter =
          gardenRoads.typeAt(x + 1.55, zz) ||
          gardenRoads.typeAt(x - 1.55, zz) ||
          gardenRoads.typeAt(x, zz + 1.55) ||
          gardenRoads.typeAt(x, zz - 1.55);
        if (nearOuter) pathW = Math.max(pathW, 0.22);
      }
    }
  }
  return pathW;
}

/** Ground meshes for every home zone (1 m grid) plus the island skirt round the new outline. */
export function buildInlandGround(ctx: any) {
  const T = ctx.THREE, group = new T.Group(); group.name = 'inland-ground';
  const mat = ctx.mats.toon(0xffffff, {noCache: true, roughness: 0.90, metalness: 0.01}); climateMaterial(mat,'terrain'); mat.vertexColors = true;
  const splat = getTerrainSplatTextures();
  // Inject 3-layer UE-Landscape PBR splatting (learned from stylized-scene + Pine & Parcel + Meadow):
  // Painted Meadow Turf (+ undergrowth brush dabs & canopy AO) -> Damp Earth/Moss Shoulder -> Voronoi Flagstones + Pebble Speckles!
  const prevCompile = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey();
  mat.onBeforeCompile = function(shader: any, renderer: any) {
    prevCompile.call(this, shader, renderer);
    if (!splat) return;
    shader.uniforms.uTurfMap = {value: splat.turfAlbedo};
    shader.uniforms.uTurfNorm = {value: splat.turfNormal};
    shader.uniforms.uFlagMap = {value: splat.flagstoneAlbedo};
    shader.uniforms.uFlagNorm = {value: splat.flagstoneNormal};
    shader.uniforms.uSandMap = {value: splat.sandAlbedo};
    shader.uniforms.uSandNorm = {value: splat.sandNormal};
    shader.vertexShader = 'attribute vec2 aSplat;\nvarying vec3 vTurfWorld;\nvarying vec2 vSplat;\n' +
      shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvTurfWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvSplat = aSplat;');
    shader.uniforms.uLakeShape = {value: new T.Vector4(LAKE.center[0], LAKE.center[1], LAKE.rx, LAKE.rz)};
    shader.uniforms.uLakeLevel = {value: LAKE.level};
    shader.uniforms.uLakeTime = ctx.U?.uTime ?? {value: 0};
    shader.fragmentShader = 'uniform sampler2D uTurfMap, uTurfNorm, uFlagMap, uFlagNorm, uSandMap, uSandNorm;\nuniform vec4 uLakeShape;\nuniform float uLakeLevel, uLakeTime;\nvarying vec3 vTurfWorld;\nvarying vec2 vSplat;\n' +
      shader.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 turfUV = vTurfWorld.xz * 0.28;
      vec2 flagUV = vTurfWorld.xz * 0.36;
      vec2 sandUV = vTurfWorld.xz * 0.25;
      vec3 turfTex = texture2D(uTurfMap, turfUV).rgb;
      vec4 flagTex = texture2D(uFlagMap, flagUV);
      vec3 sandTex = texture2D(uSandMap, sandUV).rgb;

      // Multi-scale organic noise breakup (meadow-inspired) so path shoulders meander softly without banding
      float edgeN1 = sin(vTurfWorld.x * 1.15 + sin(vTurfWorld.z * 0.92)) * 0.5 + 0.5;
      float edgeN2 = cos(vTurfWorld.z * 2.45 - sin(vTurfWorld.x * 2.10)) * 0.5 + 0.5;
      float edgeN = edgeN1 * 0.65 + edgeN2 * 0.35;
      float mossN = sin(vTurfWorld.x * 0.42 - vTurfWorld.z * 0.38 + edgeN * 1.6) * 0.5 + 0.5;
      float soilN = sin(vTurfWorld.x * 2.7 + vTurfWorld.z * 2.3) * 0.5 + 0.5;
      float brushDab = sin(vTurfWorld.x * 3.2 + sin(vTurfWorld.z * 2.9) * 1.1) * cos(vTurfWorld.z * 3.5 - vTurfWorld.x * 1.7);
      float pebbleS = fract(sin(dot(floor(vTurfWorld.xz * 8.5), vec2(127.1, 311.7))) * 43758.5453);

      // 3-layer UE-Landscape weights: Meadow (0..0.38) -> Trampled Earth/Moss Shoulder (0.16..0.68) -> Flagstones (0.48..1.0)
      float pVal = clamp(vSplat.x, 0.0, 1.0);
      float stoneBias = (flagTex.a - 0.45) * 0.36 + (edgeN - 0.5) * 0.18;
      float roadW = smoothstep(0.45, 0.72, pVal + stoneBias) * smoothstep(0.18, 0.42, pVal);
      float coverW = smoothstep(0.08, 0.52, pVal + (edgeN - 0.5) * 0.22);
      float soilW = clamp(coverW - roadW, 0.0, 1.0);
      float grassW = clamp(1.0 - coverW, 0.0, 1.0);

      // Layer 1: Painterly meadow turf with undergrowth brush dabs & subtle canopy AO so 3D grass sits grounded
      vec3 meadow = diffuseColor.rgb * mix(vec3(1.0), turfTex * 1.05, 0.84) * mix(0.88, 1.0, coverW);
      meadow *= 1.0 + brushDab * 0.055;
      meadow = mix(meadow, meadow * vec3(1.05, 1.02, 0.88), smoothstep(0.55, 0.92, mossN) * 0.22);
      // Layer 2: Warm trampled ochre-umber earth mottled with mossy grout & tiny pebble speckles
      vec3 earthBase = mix(vec3(0.65, 0.54, 0.39), vec3(0.52, 0.42, 0.31), soilN);
      vec3 soilCol = mix(earthBase, vec3(0.51, 0.57, 0.34), mossN * 0.52) * (0.90 + 0.18 * flagTex.a);
      soilCol *= 0.92 + 0.16 * smoothstep(0.72, 0.94, pebbleS) - 0.12 * smoothstep(0.24, 0.06, pebbleS);
      // Damp darker transition lip where turf meets trampled verge (gives crisp organic grounding)
      float lip = smoothstep(0.06, 0.28, coverW) * (1.0 - smoothstep(0.28, 0.62, coverW));
      // Layer 3: Sunlit Voronoi limestone flagstones with soft crevice AO
      float stoneAO = mix(0.84, 1.0, smoothstep(0.06, 0.52, flagTex.a));
      vec3 stoneCol = flagTex.rgb * 1.03 * stoneAO;

      vec3 col = meadow * grassW + soilCol * soilW + stoneCol * roadW;
      col *= 1.0 - 0.10 * lip;
      // Stippled sand along lake shore / river banks
      float sW = clamp(vSplat.y, 0.0, 1.0);
      col = mix(col, sandTex * 1.02, sW);
      // Damp lake bank: a darker band just above the waterline that laps gently up and down
      vec2 lakeD = (vTurfWorld.xz - uLakeShape.xy) / uLakeShape.zw;
      float lakeAng = atan(lakeD.y, lakeD.x);
      float lapLine = uLakeLevel + 0.05 + 0.035 * sin(uLakeTime * 0.9 + lakeAng * 3.0);
      float bankWet = (1.0 - smoothstep(lapLine, lapLine + 0.26, vTurfWorld.y)) * (1.0 - smoothstep(1.15, 1.45, length(lakeD)));
      col *= 1.0 - 0.26 * bankWet * max(sW, 0.45);
      diffuseColor.rgb = col;
      // __TERRAIN_SPLAT_END__`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      // 3D world-space normal bevels for flagstones, meadow turf & beach sand
      vec3 tN = texture2D(uTurfNorm, vTurfWorld.xz * 0.28).xyz * 2.0 - 1.0;
      vec3 fN = texture2D(uFlagNorm, vTurfWorld.xz * 0.36).xyz * 2.0 - 1.0;
      vec3 sN = texture2D(uSandNorm, vTurfWorld.xz * 0.25).xyz * 2.0 - 1.0;
      float nRoadW = smoothstep(0.42, 0.72, vSplat.x);
      float nSandW = clamp(vSplat.y, 0.0, 1.0);
      vec2 slopeXZ = mix(tN.xy * 0.22, fN.xy * 0.72, nRoadW);
      slopeXZ = mix(slopeXZ, sN.xy * 0.32, nSandW);
      vec3 wPerturb = normalize(vec3(slopeXZ.x, 1.0, slopeXZ.y));
      vec3 vPerturb = normalize((viewMatrix * vec4(wPerturb, 0.0)).xyz);
      normal = normalize(mix(normal, vPerturb, 0.65));`);
  };
  mat.customProgramCacheKey = () => prevKey + '-pbr-splat-v5';
  mat.needsUpdate = true;
  const c = new T.Color(), tint = new T.Color();
  for (const z of ZONES) {

    const w = z.max[0] - z.min[0], h = z.max[1] - z.min[1], geo = new T.PlaneGeometry(w, h, w, h); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3), splats = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + (z.min[0] + z.max[0]) / 2, zz = pos.getZ(i) + (z.min[1] + z.max[1]) / 2, y = inland(x, zz);
      pos.setXYZ(i, x, y, zz);
      sampleInlandGrassColor(x, zz, c, tint);
      const inSpawnQuay = Math.hypot(x - 10, zz - 17) < 9.55;
      const pathW = sampleTerrainRoadWeight(x, zz);
      let sandW = 0;
      const e = lakeEdge(x, zz);
      if (e < 1.28) {
        const sw = Math.min(1, (1.28 - e) / .18);
        sandW = Math.max(sandW, y < LAKE.level - .2 ? sw * 0.45 : sw);
        if (y < LAKE.level - .2) c.lerp(tint.setHex(MUD), sw);
      }
      if (z.id === 'harbor' || (z.id === 'park' && zz < 33)) {
        const edge = riverDistance(x, zz);
        if (!inSpawnQuay && edge < 4.8 && zz < 31.5) sandW = Math.max(sandW, Math.min(1, (4.8 - edge) / 1.4));
      }
      colors.set([c.r, c.g, c.b], i * 3);
      splats.set([pathW, sandW], i * 2);
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3));
    geo.setAttribute('aSplat', new T.BufferAttribute(splats, 2));
    geo.computeVertexNormals();
    // Match exact continuous analytic normals along BOTH outer WORLD border and internal zone seams (zero lighting crease!)
    const normAttr = geo.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i), vz = pos.getZ(i);
      const onOuter =
        Math.abs(vx - WORLD.min[0]) < 1.5 || Math.abs(vx - WORLD.max[0]) < 1.5 ||
        Math.abs(vz - WORLD.min[1]) < 1.5 || Math.abs(vz - WORLD.max[1]) < 1.5;
      const onZoneSeam =
        Math.abs(vx - z.min[0]) < 0.5 || Math.abs(vx - z.max[0]) < 0.5 ||
        Math.abs(vz - z.min[1]) < 0.5 || Math.abs(vz - z.max[1]) < 0.5;
      if (onOuter || onZoneSeam) {
        const eps = 0.65;
        const hFn = onOuter ? coastalSeabedHeightAt : inland;
        const nx = hFn(vx - eps, vz) - hFn(vx + eps, vz);
        const ny = 2 * eps;
        const nz = hFn(vx, vz - eps) - hFn(vx, vz + eps);
        const inv = 1 / Math.hypot(nx, ny, nz);
        normAttr.setXYZ(i, nx * inv, ny * inv, nz * inv);
      }
    }
    normAttr.needsUpdate = true;
    const mesh = new T.Mesh(geo, mat); mesh.name = `ground-${z.id}`; mesh.receiveShadow = true; group.add(mesh);
  }
  // Outer coastline, stratified cliffs, beaches and seabed are sculpted by IslandCoastSystem (zero overlap).
  void WORLD; void SKIRT;
  // stones along both verges of every path (walk-through, so they never snag the slime)
  const stones: [number, number, number][] = [];
  for (const path of PATHS) for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1], [bx, bz] = path[i], len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / len, nz = (bx - ax) / len;
    for (let d = 0; d < len; d += .55 + ((d * 13.7) % 1) * .5) for (const side of [-1, 1]) { const x = ax + (bx - ax) * d / len + nx * side * 2.15, zz = az + (bz - az) * d / len + nz * side * 2.15; if (zoneAt(x, zz) !== 'harbor' && pathDistance(x, zz) > 1.9 && !gardenRoads.typeAt(x, zz)) stones.push([x, zz, (d * 7.1 + side) % 1]); }
  }
  const sm = new T.InstancedMesh(new T.DodecahedronGeometry(.16, 0), ctx.mats.toon(0xffffff), stones.length); sm.name = 'path-stones-fx';
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
  stones.forEach(([x, zz, r], i) => { e.set(r * 3, r * 9, 0); q.setFromEuler(e); m.compose(new T.Vector3(x, inland(x, zz) + .02, zz), q, new T.Vector3(1 + r, .55 + r * .3, .9 + r * .6)); sm.setMatrixAt(i, m); sm.setColorAt(i, c.setHex(0xbdb5a2).offsetHSL(0, 0, (r - .5) * .12)); });
  sm.castShadow = sm.receiveShadow = true; group.add(sm);
  ctx.scene.add(group);
  return group;
}
