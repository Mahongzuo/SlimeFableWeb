import {LAKE} from '../world/map';
/**
 * The lake uses the harbour's own sea shader (posterised reflection strips, rain rings, sun glitter, shore foam),
 * re-pointed at its own planar reflection one plane higher. The shader's harbour-only inputs (quay distance,
 * floats, slipway) are swapped for the lake ellipse. Reflection renders only when the camera is near the lake.
 */
export function lakeWater(ctx: any) {
  const T = ctx.THREE, sea = ctx.scene.getObjectByName('water-surface');
  if (!sea?.material?.fragmentShader || !ctx.waterReflection) return null;
  const [cx, cz] = LAKE.center, shore = .93; // where the lake bed meets the water level (map.ts inland())
  const refl = new ctx.waterReflection.constructor(LAKE.level, .4);
  const base = sea.material, keep = base.uniforms.uWaterRefl.value; base.uniforms.uWaterRefl.value = null; // avoid cloning a render target texture
  const mat = base.clone(); base.uniforms.uWaterRefl.value = keep;
  for (const k of ['uTime', 'uCloud', 'uSun', 'uRain', 'uSunDir']) if (ctx.U[k]) mat.uniforms[k] = ctx.U[k];
  mat.uniforms.uWaterRefl = {value: refl.texture}; mat.uniforms.uWaterReflMatrix = {value: refl.textureMatrix};
  mat.uniforms.uLake = {value: new T.Vector4(cx, cz, LAKE.rx, LAKE.rz)};
  // a fresher, greener palette than the open sea
  const tint: Record<string, number> = {cSeaGlass: 0xbfe6d2, cShallow: 0x8ccfb8, cTeal: 0x4fa79a, cDeepTeal: 0x2f7f7c, cDeepBlue: 0x2a5f6e};
  for (const [k, c] of Object.entries(tint)) if (mat.uniforms[k]) mat.uniforms[k] = {value: new T.Color(c)};
  let fs: string = mat.fragmentShader; const swap = (from: RegExp | string, to: string) => { const next = fs.replace(from as any, to); if (next === fs) throw new Error('lake water: shader changed, missing ' + from); fs = next; };
  swap('void main(){', `uniform vec4 uLake;
float lakeE(vec2 p){ return length((p - uLake.xy) / uLake.zw); }
void main(){
  if (lakeE(vWP.xz) > 1.06) discard;`);
  swap(/float dS = shoreDist\(wp\.xz\);/, `float dS = (${shore.toFixed(2)} - lakeE(wp.xz)) * min(uLake.z, uLake.w);`);
  swap(/float dF = floatDist\(wp\.xz\);/, 'float dF = 99.0;');
  swap(/float slip = slipDepth\(wp\.xz, wp\.y\);/, 'float slip = 99.0;');
  swap(/vec4\(wp\.x \+ off\.x, [-0-9.e]+, wp\.z \+ off\.y, 1\.0\)/, `vec4(wp.x + off.x, ${LAKE.level.toFixed(3)}, wp.z + off.y, 1.0)`);
  mat.fragmentShader = fs;
  let vs: string = mat.vertexShader; const vs2 = vs.replace('worldPosition.y += waveHeight(worldPosition.xz, uTime);', 'worldPosition.y += waveHeight(worldPosition.xz, uTime) * 0.35;'); mat.vertexShader = vs2;
  const geo = new T.PlaneGeometry(LAKE.rx * 2.2, LAKE.rz * 2.2, 88, 64).rotateX(-Math.PI / 2);
  const mesh = new T.Mesh(geo, mat); mesh.name = 'lake-water-surface'; mesh.position.set(cx, LAKE.level, cz);
  mesh.layers.mask = sea.layers.mask; mesh.renderOrder = sea.renderOrder; mesh.receiveShadow = true;
  const size = new T.Vector2(), centre = new T.Vector3(cx, LAKE.level, cz);
  return {mesh, update() {
    const cam = ctx.camera; mesh.visible = cam.position.distanceTo(centre) < 110; if (!mesh.visible) return;
    ctx.renderer.getDrawingBufferSize(size); refl.setSize(size.x, size.y); refl.render(ctx.renderer, ctx.scene, cam);
  }};
}
