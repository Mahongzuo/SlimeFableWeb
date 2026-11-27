import * as T from 'three';

/**
 * Delicate falling rain streaks + soft radial mist splash specks.
 * Replaces the previous dense wireframe 14-gon LineSegments rings & spiky crowns
 * so water surfaces stay serene and rely on the sparse shader ripples instead.
 */
export function gardenRain(scene: any, camera: any, U: any, height: (x: number, z: number) => number) {
  const count = 260;
  const anchors = new Float32Array(count * 3);
  const phases = new Float32Array(count);

  // 1. Slender translucent falling rain streaks
  const streakVerts = new Float32Array([0, 0, 0, 0, 0.38, 0]);
  const streakGeo = new T.InstancedBufferGeometry();
  streakGeo.setAttribute('position', new T.Float32BufferAttribute(streakVerts, 3));
  const anchorAttr = new T.InstancedBufferAttribute(anchors, 3);
  const seedAttr = new T.InstancedBufferAttribute(phases, 1);
  streakGeo.setAttribute('anchor', anchorAttr);
  streakGeo.setAttribute('seed', seedAttr);
  streakGeo.instanceCount = count;

  let state = 3821;
  const random = () => (state = (state * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < count; i++) phases[i] = random();

  const streakMat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: U,
    vertexShader: `
      attribute vec3 anchor;
      attribute float seed;
      uniform float uTime, uRain;
      varying float vAlpha;
      void main() {
        float phase = fract(uTime * (0.78 + seed * 0.32) + seed * 71.0);
        float fall = max(0.0, 0.72 - phase) * 14.0;
        vec3 p = anchor + vec3(-0.075, 1.0, 0.022) * (fall + position.y);
        float tip = position.y / 0.38;
        vAlpha = step(phase, 0.72) * (0.14 + 0.30 * (1.0 - tip)) * uRain;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        if (vAlpha < 0.01) discard;
        gl_FragColor = vec4(0.80, 0.91, 0.98, vAlpha);
      }`,
  });

  const rain = new T.LineSegments(streakGeo, streakMat);
  rain.name = 'garden-rain-contacts';
  rain.layers.set(1);
  rain.frustumCulled = false;
  scene.add(rain);

  // 2. Soft sparse radial splash mist specks on impact (subtle, non-wireframe, zero spiky rings!)
  const splashCount = 96;
  const splashPos = new Float32Array(splashCount * 3);
  const splashSeed = new Float32Array(splashCount);
  for (let i = 0; i < splashCount; i++) splashSeed[i] = phases[i];
  const splashGeo = new T.BufferGeometry();
  const splashAnchorAttr = new T.BufferAttribute(splashPos, 3);
  splashGeo.setAttribute('position', splashAnchorAttr);
  splashGeo.setAttribute('aSeed', new T.BufferAttribute(splashSeed, 1));

  const splashMat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: U,
    vertexShader: `
      attribute float aSeed;
      uniform float uTime, uRain;
      varying float vAlpha;
      void main() {
        float phase = fract(uTime * (0.78 + aSeed * 0.32) + aSeed * 71.0);
        float t = clamp((phase - 0.72) / 0.28, 0.0, 1.0);
        vec3 p = position;
        p.y += 0.02 + sin(t * 3.14159) * (0.04 + aSeed * 0.04);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = max(1.0, -mv.z);
        gl_PointSize = clamp((10.0 + t * 14.0) / dist, 1.5, 7.0);
        vAlpha = step(0.72, phase) * sin(t * 3.14159) * 0.28 * uRain * (1.0 - smoothstep(14.0, 30.0, dist));
      }`,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        if (vAlpha < 0.01) discard;
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        // Soft delicate mist halo rather than a harsh polygon ring
        float soft = pow(1.0 - d, 2.2);
        gl_FragColor = vec4(0.84, 0.93, 0.99, soft * vAlpha);
      }`,
  });

  const splashes = new T.Points(splashGeo, splashMat);
  splashes.name = 'garden-rain-splashes-fx';
  splashes.layers.set(1);
  splashes.frustumCulled = false;
  scene.add(splashes);

  const last = new Int32Array(count).fill(-1);
  return function update(time: number) {
    const visible = U.uRain.value > 0.012;
    rain.visible = visible;
    splashes.visible = visible;
    if (!visible) return;
    let changed = false;
    let splashChanged = false;
    for (let i = 0; i < count; i++) {
      const s = phases[i];
      const cycle = Math.floor(time * (0.78 + s * 0.32) + s * 71.0);
      if (cycle === last[i]) continue;
      last[i] = cycle;
      const span = i < count * 0.55 ? 16 : 38;
      const x = camera.position.x + (random() - 0.5) * span;
      const z = camera.position.z + (random() - 0.5) * span;
      const y = height(x, z);
      anchorAttr.setXYZ(i, x, y, z);
      changed = true;
      if (i < splashCount) {
        splashAnchorAttr.setXYZ(i, x, y, z);
        splashChanged = true;
      }
    }
    if (changed) anchorAttr.needsUpdate = true;
    if (splashChanged) splashAnchorAttr.needsUpdate = true;
  };
}
