// Fishing-3D companion. Regenerate using scripts/import-fishing-reference.mjs.
import { Vector3 as R, Color as X, Matrix4 as xe, Euler as Si, Quaternion as Mi, SphereGeometry as ne, CylinderGeometry as ve, BufferGeometry as Ee, Float32BufferAttribute as Zt, Mesh as $t, Object3D as Ae, Group as Ie, InstancedMesh as ze, MeshStandardMaterial as ce, DynamicDrawUsage as ae } from "three";
const Zi = 1e8, Le = [];
function _(object, key, value) {
  object[key] = value;
}
const Tu = 3.2;
function vi(n, t, e) {
  return Math.max(t, Math.min(e, n));
}
function ps(n, t, e) {
  const i = vi((e - n) / (t - n), 0, 1);
  return i * i * (3 - 2 * i);
}
function rp(n) {
  let t = n;
  for (; t > Math.PI; ) t -= Math.PI * 2;
  for (; t < -Math.PI; ) t += Math.PI * 2;
  return t;
}
function Cu(n, t, e) {
  return n + rp(t - n) * e;
}
function Ka(n, t, e, i, s) {
  const o = s * s, a = o * s;
  return 0.5 * (2 * t + (-n + e) * s + (2 * n - 5 * t + 4 * e - i) * o + (-n + 3 * t - 3 * e + i) * a);
}
function _2() {
  const n = [{ z: 0.6, cy: 0.108, rx: 0.024, ry: 0.02 }, { z: 0.555, cy: 0.102, rx: 0.088, ry: 0.068 }, { z: 0.495, cy: 0.114, rx: 0.132, ry: 0.102 }, { z: 0.42, cy: 0.142, rx: 0.172, ry: 0.144 }, { z: 0.34, cy: 0.134, rx: 0.166, ry: 0.138 }, { z: 0.25, cy: 0.092, rx: 0.154, ry: 0.132 }, { z: 0.14, cy: 0.048, rx: 0.205, ry: 0.168 }, { z: 0, cy: 0.026, rx: 0.238, ry: 0.184 }, { z: -0.15, cy: 0.014, rx: 0.222, ry: 0.172 }, { z: -0.29, cy: 2e-3, rx: 0.172, ry: 0.14 }, { z: -0.41, cy: -8e-3, rx: 0.112, ry: 0.088 }, { z: -0.58, cy: -0.014, rx: 0.072, ry: 0.052 }, { z: -0.76, cy: -0.016, rx: 0.042, ry: 0.028 }, { z: -0.92, cy: -0.016, rx: 0.019, ry: 0.013 }, { z: -1.02, cy: -0.015, rx: 4e-3, ry: 4e-3 }], t = 32, e = 16, i = [], s = n.length - 1;
  for (let v = 0; v <= t; v++) {
    const g = v / t * s, x = Math.min(Math.floor(g), s - 1), b = g - x, y = Math.max(0, x - 1), M = Math.min(s, x + 1), T = Math.min(s, x + 2), C = n[y], A = n[x], w = n[M], S = n[T];
    i.push({ z: Ka(C.z, A.z, w.z, S.z, b), cy: Ka(C.cy, A.cy, w.cy, S.cy, b), rx: Math.max(3e-3, Ka(C.rx, A.rx, w.rx, S.rx, b)), ry: Math.max(3e-3, Ka(C.ry, A.ry, w.ry, S.ry, b)) });
  }
  const o = new X(7162941), a = new X(5388075), r = new X(14205861), l = new X(14798516), h = new X(), c = e + 1, u = (t + 1) * c, d = new Float32Array(u * 3), p = new Float32Array(u * 3);
  for (let v = 0; v <= t; v++) {
    const g = i[v];
    for (let x = 0; x <= e; x++) {
      const b = x / e * Math.PI * 2, y = Math.cos(b), M = Math.sin(b);
      let T = M * g.ry, C = y * g.rx;
      M < 0 && g.z > -0.35 && g.z < 0.3 && (T *= 0.88);
      const A = ps(0.45, 0.51, g.z) * (1 - ps(0.55, 0.595, g.z));
      A > 0.01 && M < 0.25 && M > -0.65 && (C *= 1 + 0.14 * A * Math.abs(y));
      const w = (v * c + x) * 3;
      d[w] = C, d[w + 1] = g.cy + T, d[w + 2] = g.z, h.copy(o);
      const S = ps(0.42, 0.96, M), E = ps(-0.42, -0.92, g.z);
      h.lerp(a, vi(S * 0.42 + E * 0.58, 0, 0.72));
      const N = ps(-0.34, -0.18, g.z) * (1 - ps(0.43, 0.56, g.z)), D = 1 - ps(-0.32, 0.12, M);
      h.lerp(r, N * D * 0.96);
      const z = 1 - ps(-0.18, 0.26, M);
      h.lerp(l, A * z * 0.88), p[w] = h.r, p[w + 1] = h.g, p[w + 2] = h.b;
    }
  }
  const m = [];
  for (let v = 0; v < t; v++) for (let g = 0; g < e; g++) {
    const x = v * c + g, b = x + 1, y = (v + 1) * c + g, M = y + 1;
    m.push(x, y, b), m.push(b, y, M);
  }
  const f = new Ee();
  return f.setAttribute("position", new Zt(d, 3)), f.setAttribute("color", new Zt(p, 3)), f.setIndex(m), f.computeVertexNormals(), f;
}
function M2(n, t) {
  const e = [];
  let i = 0;
  const s = n.index ? n.toNonIndexed() : n.clone();
  n.dispose(), s.attributes.normal || s.computeVertexNormals(), i += s.attributes.position.count, e.push({ geo: s, uniformColor: null });
  const o = new xe(), a = new R(), r = new Si(), l = new Mi(), h = new R();
  for (const f of t) {
    const v = f.geometry.index ? f.geometry.toNonIndexed() : f.geometry.clone();
    f.geometry.dispose(), a.set(f.position ? f.position[0] : 0, f.position ? f.position[1] : 0, f.position ? f.position[2] : 0), r.set(f.rotation ? f.rotation[0] : 0, f.rotation ? f.rotation[1] : 0, f.rotation ? f.rotation[2] : 0), l.setFromEuler(r), h.set(f.scale ? f.scale[0] : 1, f.scale ? f.scale[1] : 1, f.scale ? f.scale[2] : 1), o.compose(a, l, h), v.applyMatrix4(o), v.computeVertexNormals(), i += v.attributes.position.count, e.push({ geo: v, uniformColor: new X(f.color) });
  }
  const c = new Float32Array(i * 3), u = new Float32Array(i * 3), d = new Float32Array(i * 3);
  let p = 0;
  for (const { geo: f, uniformColor: v } of e) {
    const g = f.attributes.position, x = f.attributes.normal, b = f.attributes.color, y = g.count;
    for (let M = 0; M < y; M++) {
      const T = (p + M) * 3;
      c[T] = g.getX(M), c[T + 1] = g.getY(M), c[T + 2] = g.getZ(M), u[T] = x.getX(M), u[T + 1] = x.getY(M), u[T + 2] = x.getZ(M), v ? (d[T] = v.r, d[T + 1] = v.g, d[T + 2] = v.b) : b ? (d[T] = b.getX(M), d[T + 1] = b.getY(M), d[T + 2] = b.getZ(M)) : (d[T] = 1, d[T + 1] = 1, d[T + 2] = 1);
    }
    p += y, f.dispose();
  }
  const m = new Ee();
  return m.setAttribute("position", new Zt(c, 3)), m.setAttribute("normal", new Zt(u, 3)), m.setAttribute("color", new Zt(d, 3)), m;
}
class S2 {
  constructor(t, e) {
    _(this, "group");
    _(this, "scene");
    _(this, "events");
    _(this, "bodyPivot");
    _(this, "pawsMesh");
    _(this, "shaderUniforms");
    _(this, "geometries", []);
    _(this, "materials", []);
    _(this, "position", new R(-5.4, -0.02, 5.2));
    _(this, "velocity", new R(0, 0, 0));
    _(this, "heading", 0);
    _(this, "currentSpeed", 0);
    _(this, "headYaw", 0);
    _(this, "smoothWaveHeight", 0);
    _(this, "smoothWaveSlopeX", 0);
    _(this, "smoothWaveSlopeZ", 0);
    _(this, "paddlePhase", 0);
    _(this, "rippleCooldown", 0.25);
    _(this, "waveImpulseCooldown", 0.1);
    _(this, "celebrating", false);
    _(this, "celebrateTimer", 0);
    _(this, "celebrateBaseHeading", 0);
    _(this, "celebrateRippleCooldown", 0);
    _(this, "pendingWaveImpulses", []);
    _(this, "dummyPaw", new Ae());
    _(this, "tmpTarget", new R());
    _(this, "tmpSteer", new R());
    _(this, "tmpAvoid", new R());
    _(this, "tmpPawWorld", new R());
    this.scene = t, this.events = e, this.group = new Ie(), this.group.name = "OtterCompanion", this.bodyPivot = new Ie(), this.group.add(this.bodyPivot), this.shaderUniforms = { uSwimPhase: { value: 0 }, uSwimAmp: { value: 1 }, uHeadYaw: { value: 0 }, uBackFloat: { value: 0 } };
    const i = [{ geometry: new ne(0.044, 10, 8), color: 1577488, position: [0, 0.118, 0.592], scale: [1.14, 0.84, 0.92] }];
    for (const c of [-1, 1]) {
      i.push({ geometry: new ne(0.031, 8, 7), color: 1380366, position: [c * 0.094, 0.172, 0.515] }, { geometry: new ne(0.011, 6, 5), color: 16777215, position: [c * 0.104, 0.183, 0.538] }, { geometry: new ne(0.052, 8, 7), color: 5190953, position: [c * 0.145, 0.228, 0.365], rotation: [0.1, c * 0.28, -c * 0.16], scale: [0.96, 0.96, 0.52] }, { geometry: new ne(0.03, 7, 6), color: 9069648, position: [c * 0.148, 0.225, 0.382], rotation: [0.1, c * 0.28, -c * 0.16], scale: [0.85, 0.85, 0.35] });
      const u = [{ yOff: 0.112, zOff: 0.538, rotZ: -c * 1.36, rotY: c * 0.26 }, { yOff: 0.092, zOff: 0.546, rotZ: -c * 1.54, rotY: c * 0.12 }, { yOff: 0.072, zOff: 0.534, rotZ: -c * 1.72, rotY: c * 0.02 }];
      for (const d of u) {
        const p = new ve(2e-3, 46e-4, 0.23, 4);
        p.translate(0, 0.115, 0), i.push({ geometry: p, color: 16051424, position: [c * 0.072, d.yOff, d.zOff], rotation: [0, d.rotY, d.rotZ] });
      }
    }
    const s = _2(), o = this.trackGeo(M2(s, i)), a = this.trackMat(new ce({ vertexColors: true, roughness: 0.36, metalness: 0.06, envMapIntensity: 1.1 }));
    a.customProgramCacheKey = () => "otter-wet-fur-spline-v3", a.onBeforeCompile = (c) => {
      c.uniforms.uSwimPhase = this.shaderUniforms.uSwimPhase, c.uniforms.uSwimAmp = this.shaderUniforms.uSwimAmp, c.uniforms.uHeadYaw = this.shaderUniforms.uHeadYaw, c.uniforms.uBackFloat = this.shaderUniforms.uBackFloat, c.vertexShader = c.vertexShader.replace("#include <common>", `#include <common>
uniform float uSwimPhase;
uniform float uSwimAmp;
uniform float uHeadYaw;
uniform float uBackFloat;
varying vec3 vOtterLocalPos;`), c.vertexShader = c.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
vOtterLocalPos = position;
float _headW = smoothstep(0.20, 0.44, transformed.z);
float _hy = uHeadYaw * _headW;
float _ch = cos(_hy);
float _sh = sin(_hy);
vec2 _hRel = vec2(transformed.x, transformed.z - 0.24);
transformed.x = _hRel.x * _ch + _hRel.y * _sh;
transformed.z = 0.24 - _hRel.x * _sh + _hRel.y * _ch;

float _tailW = smoothstep(0.16, -0.96, transformed.z);
float _spineWave = sin(uSwimPhase + transformed.z * 4.5) * (0.012 + 0.21 * _tailW * _tailW) * uSwimAmp;
transformed.x += _spineWave;
transformed.y += cos(uSwimPhase * 0.95 + transformed.z * 3.8) * 0.042 * _tailW * _tailW * uSwimAmp;

transformed.y += uBackFloat * (0.045 * _headW + 0.032 * _tailW);`), c.fragmentShader = c.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vOtterLocalPos;`), c.fragmentShader = c.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
float _furGrain = sin(vOtterLocalPos.x * 95.0 + sin(vOtterLocalPos.z * 28.0) * 2.2)
                * cos(vOtterLocalPos.z * 54.0 + vOtterLocalPos.y * 42.0);
float _furStr = smoothstep(0.56, 0.35, vOtterLocalPos.z) * 0.065;
diffuseColor.rgb *= (1.0 + _furGrain * _furStr);`), c.fragmentShader = c.fragmentShader.replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
float _wetCoat = smoothstep(-0.04, 0.14, vOtterLocalPos.y);
roughnessFactor = clamp(roughnessFactor - 0.08 * _wetCoat + sin(vOtterLocalPos.z * 70.0 + vOtterLocalPos.x * 110.0) * 0.04, 0.20, 0.65);`), c.fragmentShader = c.fragmentShader.replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
vec3 _wetV = normalize(vViewPosition);
float _wetF = pow(1.0 - clamp(dot(normalize(normal), _wetV), 0.0, 1.0), 3.0);
reflectedLight.directSpecular += vec3(0.32, 0.38, 0.42) * _wetF * 0.48;`);
    };
    const r = new $t(o, a);
    r.castShadow = true, r.receiveShadow = true, this.bodyPivot.add(r);
    const l = this.trackGeo(new ne(0.068, 9, 7));
    l.scale(0.92, 0.46, 1.48), l.translate(0, -0.015, 0.04);
    const h = this.trackMat(new ce({ color: 4928039, roughness: 0.42, metalness: 0.06, envMapIntensity: 0.9 }));
    this.pawsMesh = new ze(l, h, 4), this.pawsMesh.instanceMatrix.setUsage(ae), this.pawsMesh.frustumCulled = false, this.pawsMesh.receiveShadow = true, this.bodyPivot.add(this.pawsMesh), this.updatePawInstances(0, 0, 0, 0, 0, 0), this.group.position.copy(this.position), this.group.rotation.y = this.heading, this.scene.add(this.group);
  }
  trackGeo(t) {
    return this.geometries.push(t), t;
  }
  trackMat(t) {
    return this.materials.push(t), t;
  }
  updatePawInstances(t, e, i, s, o, a) {
    this.dummyPaw.position.set(0.185, -0.04, 0.19), this.dummyPaw.rotation.set(t, 0.14, o), this.dummyPaw.scale.set(0.95, 1, 0.95), this.dummyPaw.updateMatrix(), this.pawsMesh.setMatrixAt(0, this.dummyPaw.matrix), this.dummyPaw.position.set(-0.185, -0.04, 0.19), this.dummyPaw.rotation.set(e, -0.14, -o), this.dummyPaw.scale.set(0.95, 1, 0.95), this.dummyPaw.updateMatrix(), this.pawsMesh.setMatrixAt(1, this.dummyPaw.matrix), this.dummyPaw.position.set(0.17, -0.055, -0.22), this.dummyPaw.rotation.set(i, Math.PI - 0.18, 0.08 * a), this.dummyPaw.scale.set(1.12, 0.9, 1.15), this.dummyPaw.updateMatrix(), this.pawsMesh.setMatrixAt(2, this.dummyPaw.matrix), this.dummyPaw.position.set(-0.17, -0.055, -0.22), this.dummyPaw.rotation.set(s, Math.PI + 0.18, -0.08 * a), this.dummyPaw.scale.set(1.12, 0.9, 1.15), this.dummyPaw.updateMatrix(), this.pawsMesh.setMatrixAt(3, this.dummyPaw.matrix), this.pawsMesh.instanceMatrix.needsUpdate = true;
  }
  pushWaveImpulse(t, e, i, s) {
    this.pendingWaveImpulses.length >= 6 || this.pendingWaveImpulses.push({ x: t, z: e, radius: i, strength: s });
  }
  consumeWaveImpulses() {
    if (this.pendingWaveImpulses.length === 0) return [];
    const t = this.pendingWaveImpulses.slice();
    return this.pendingWaveImpulses.length = 0, t;
  }
  getWakeState() {
    return { x: this.position.x, z: this.position.z, speed: this.currentSpeed };
  }
  celebrateCatch() {
    this.celebrating = true, this.celebrateTimer = 0, this.celebrateBaseHeading = this.heading, this.celebrateRippleCooldown = 0.05, this.pushWaveImpulse(this.position.x, this.position.z, 0.68, -0.24), this.events.emit("ripple:spawn", { x: this.position.x, z: this.position.z, maxScale: 1.65, duration: 1.05, opacity: 0.72 });
  }
  setPositionImmediate(t, e, i) {
    this.position.set(t, -0.02, e), this.velocity.set(0, 0, 0), this.currentSpeed = 0, this.heading = i, this.headYaw = 0, this.smoothWaveHeight = 0, this.smoothWaveSlopeX = 0, this.smoothWaveSlopeZ = 0, this.celebrating = false, this.celebrateTimer = 0, this.pendingWaveImpulses.length = 0, this.shaderUniforms.uHeadYaw.value = 0, this.shaderUniforms.uBackFloat.value = 0, this.bodyPivot.rotation.set(0, 0, 0), this.bodyPivot.position.set(0, 0, 0), this.group.position.copy(this.position), this.group.rotation.y = this.heading;
  }
  update(t, e, i, s, o, a) {
    const r = Math.min(t, 0.05);
    if (r <= 0) return;
    const l = 1 - Math.exp(-8.5 * r), h = a ? vi(a.height, -0.22, 0.22) : 0, c = a ? vi(a.slopeX, -0.5, 0.5) : 0, u = a ? vi(a.slopeZ, -0.5, 0.5) : 0;
    this.smoothWaveHeight += (h - this.smoothWaveHeight) * l, this.smoothWaveSlopeX += (c - this.smoothWaveSlopeX) * l, this.smoothWaveSlopeZ += (u - this.smoothWaveSlopeZ) * l;
    const d = Math.sin(s), p = Math.cos(s), m = -Math.cos(s), f = Math.sin(s), v = Math.sin(e * 0.85) * 0.24, g = Math.cos(e * 0.62) * 0.16, x = 1.88 + v, b = 1.15 + g;
    this.tmpTarget.set(i.x + m * x - d * b, 0, i.z + f * x - p * b);
    const y = Math.hypot(this.tmpTarget.x, this.tmpTarget.z), M = Zi - 1.1;
    if (y > M && y > 1e-3) {
      const K = M / y;
      this.tmpTarget.x *= K, this.tmpTarget.z *= K;
    }
    this.tmpSteer.set(this.tmpTarget.x - this.position.x, 0, this.tmpTarget.z - this.position.z);
    const T = this.tmpSteer.length();
    if (this.celebrating) T > 0.35 ? this.tmpSteer.multiplyScalar(0.55 / T) : this.tmpSteer.set(0, 0, 0);
    else if (T > 1e-3) {
      const K = vi(T * 1.45 + Math.abs(o) * 0.35, 0, 4.4);
      this.tmpSteer.multiplyScalar(K / T);
    }
    this.tmpAvoid.set(0, 0, 0);
    const C = this.position.x - i.x, A = this.position.z - i.z, w = Math.hypot(C, A), S = 1.65;
    if (w < S && w > 1e-3) {
      const K = (S - w) / S * 5;
      this.tmpAvoid.x += C / w * K, this.tmpAvoid.z += A / w * K;
    }
    for (let K = 0; K < Le.length; K++) {
      const ct = Le[K];
      if (!ct.breaksSurface) continue;
      const H = this.position.x - ct.x, $ = this.position.z - ct.z, tt = Math.hypot(H, $), et = ct.radius + 0.9;
      if (tt < et && tt > 1e-3) {
        const ft = (et - tt) / et * 6.5;
        this.tmpAvoid.x += H / tt * ft, this.tmpAvoid.z += $ / tt * ft;
      }
    }
    const E = 1 - Math.exp(-3.4 * r), N = this.tmpSteer.x + this.tmpAvoid.x, D = this.tmpSteer.z + this.tmpAvoid.z;
    if (this.velocity.x += (N - this.velocity.x) * E, this.velocity.z += (D - this.velocity.z) * E, this.celebrating) {
      const K = Math.exp(-2.8 * r);
      this.velocity.x *= K, this.velocity.z *= K;
    }
    this.position.x += this.velocity.x * r, this.position.z += this.velocity.z * r;
    const z = Math.hypot(this.position.x, this.position.z);
    if (z > Zi - 0.7 && z > 1e-3) {
      const K = (Zi - 0.7) / z;
      this.position.x *= K, this.position.z *= K;
    }
    for (let K = 0; K < Le.length; K++) {
      const ct = Le[K];
      if (!ct.breaksSurface) continue;
      const H = this.position.x - ct.x, $ = this.position.z - ct.z, tt = Math.hypot(H, $), et = ct.radius + 0.55;
      tt < et && tt > 1e-3 && (this.position.x = ct.x + H / tt * et, this.position.z = ct.z + $ / tt * et);
    }
    const B = Math.hypot(this.velocity.x, this.velocity.z);
    this.currentSpeed = B;
    const U = Math.sin(this.heading), k = Math.cos(this.heading), G = -k, V = U, Q = vi(-(this.smoothWaveSlopeX * U + this.smoothWaveSlopeZ * k) * 0.62, -0.24, 0.24), nt = vi((this.smoothWaveSlopeX * G + this.smoothWaveSlopeZ * V) * 0.52, -0.22, 0.22);
    if (this.celebrating) {
      this.celebrateTimer += r;
      const K = vi(this.celebrateTimer / Tu, 0, 1), ct = ps(0, 0.15, K), H = ps(0.84, 1, K), $ = ct * (1 - H);
      this.bodyPivot.rotation.z = $ * Math.PI + nt * 0.55;
      const tt = ps(0.1, 0.88, K);
      this.heading = this.celebrateBaseHeading + tt * Math.PI * 4;
      const et = Math.sin(this.celebrateTimer * 9.5) * 0.025;
      this.position.y = -0.02 + $ * 0.068 + et + this.smoothWaveHeight * 0.9, this.bodyPivot.rotation.x = Math.sin(this.celebrateTimer * 7.5) * 0.1 * $ + Q * 0.6;
      const ft = this.celebrateTimer * 18, vt = 0.58 * $ + 0.2 * (1 - $);
      if (this.updatePawInstances(-0.45 * $ + Math.sin(ft) * vt, -0.45 * $ - Math.sin(ft) * vt, 0.35 * $ - Math.sin(ft + 0.7) * vt, 0.35 * $ + Math.sin(ft + 0.7) * vt, 0.26 * $, $), this.paddlePhase += r * 11.5, this.shaderUniforms.uSwimPhase.value = this.paddlePhase, this.shaderUniforms.uSwimAmp.value = 1.35, this.shaderUniforms.uHeadYaw.value = Math.sin(this.celebrateTimer * 6.5) * 0.22, this.shaderUniforms.uBackFloat.value = $, this.celebrateRippleCooldown -= r, this.celebrateRippleCooldown <= 0 && $ > 0.35) {
        this.celebrateRippleCooldown = 0.22;
        const St = this.celebrateTimer * 5.2, Tt = this.position.x + Math.cos(St) * 0.26, j = this.position.z + Math.sin(St) * 0.26;
        this.pushWaveImpulse(Tt, j, 0.42, -0.14), this.events.emit("ripple:spawn", { x: Tt, z: j, maxScale: 1.15, duration: 0.85, opacity: 0.65 });
      }
      this.celebrateTimer >= Tu && (this.celebrating = false, this.celebrateTimer = 0, this.bodyPivot.rotation.z = 0, this.bodyPivot.rotation.x = 0, this.shaderUniforms.uBackFloat.value = 0);
    } else {
      let K = s;
      if (B > 0.18) K = Math.atan2(this.velocity.x, this.velocity.z);
      else {
        const Tt = Math.atan2(i.x - this.position.x, i.z - this.position.z);
        K = Cu(s, Tt, 0.28);
      }
      const ct = 1 - Math.exp(-5 * r);
      this.heading = Cu(this.heading, K, ct), this.position.y = -0.02 + Math.sin(e * 2.7 + 0.8) * 0.024 + this.smoothWaveHeight * 0.92;
      const H = vi(B * 0.035, 0, 0.12);
      this.bodyPivot.rotation.x = -H + Math.sin(e * 2.7) * 0.03 + Q, this.bodyPivot.rotation.z += (nt - this.bodyPivot.rotation.z) * (1 - Math.exp(-7.5 * r));
      const $ = 4.2 + B * 2.8;
      this.paddlePhase += r * $;
      const tt = 0.25 + vi(B * 0.22, 0, 0.45), et = Math.sin(this.paddlePhase), ft = Math.cos(this.paddlePhase);
      this.updatePawInstances(et * tt, -et * tt, -ft * tt * 0.85, ft * tt * 0.85, 0.06, 0);
      const vt = Math.atan2(i.x - this.position.x, i.z - this.position.z), St = vi(rp(vt - this.heading), -0.45, 0.45);
      if (this.headYaw += (St * 0.45 - this.headYaw) * (1 - Math.exp(-4 * r)), this.shaderUniforms.uSwimPhase.value = this.paddlePhase * 0.92, this.shaderUniforms.uSwimAmp.value = 0.65 + vi(B * 0.42, 0, 0.95), this.shaderUniforms.uHeadYaw.value = this.headYaw, this.shaderUniforms.uBackFloat.value *= Math.exp(-8 * r), this.waveImpulseCooldown -= r, this.waveImpulseCooldown <= 0 && B > 0.2) {
        this.waveImpulseCooldown = vi(0.18 - B * 0.025, 0.08, 0.18);
        const Tt = Math.sin(this.heading), j = Math.cos(this.heading), st = -vi(0.055 + B * 0.032, 0.055, 0.16);
        this.pushWaveImpulse(this.position.x + Tt * 0.16, this.position.z + j * 0.16, 0.38, st);
      }
      if (this.rippleCooldown -= r, this.rippleCooldown <= 0) {
        const Tt = B > 0.25;
        this.rippleCooldown = Tt ? vi(0.62 - B * 0.11, 0.22, 0.58) : 1.15;
        const j = Math.sin(this.heading), st = Math.cos(this.heading), I = Tt ? -0.42 : 0.05, Mt = Math.sin(this.paddlePhase) * 0.16;
        this.tmpPawWorld.set(this.position.x + j * I - st * Mt, 0, this.position.z + st * I + j * Mt), Tt || this.pushWaveImpulse(this.tmpPawWorld.x, this.tmpPawWorld.z, 0.34, -0.05), this.events.emit("ripple:spawn", { x: this.tmpPawWorld.x, z: this.tmpPawWorld.z, maxScale: Tt ? 1.25 : 0.95, duration: Tt ? 1.05 : 1.35, opacity: Tt ? 0.52 : 0.35 });
      }
    }
    this.group.position.copy(this.position), this.group.rotation.y = this.heading;
  }
  dispose() {
    this.scene.remove(this.group);
    for (const t of this.geometries) t.dispose();
    for (const t of this.materials) t.dispose();
    this.geometries.length = 0, this.materials.length = 0, this.pendingWaveImpulses.length = 0;
  }
}
export {
  S2 as OtterCompanion
};
