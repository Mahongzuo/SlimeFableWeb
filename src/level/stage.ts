import * as THREE from 'three';
/** Sky, fog and ink colours a theme hands to the stage. */
export interface StageLook {skyTop: string; skyHorizon: string; fog: [number, number]; sun: string; sunIntensity: number; hemiSky: string; hemiGround: string; ink: string; wash: string}
export const LAYER = {OUTLINE: 0, NO_OUTLINE: 1};
const vert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
// Same grade as the harbour: one-sided depth edges + normal creases in ink, high-key watercolour lift, paper grain.
const frag = `#include <packing>
uniform sampler2D tColor, tNormal, tDepth; uniform vec2 uRes; uniform float uNear, uFar, uLine, uFade;
uniform vec3 uInk, uWash; varying vec2 vUv;
float lin(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); }
vec3 nrm(vec2 uv){ return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec2 px = uLine / uRes; vec3 col = texture2D(tColor, vUv).rgb; float d0 = lin(vUv), edge = 0.0;
  if (d0 < uFar * 0.95) {
    float dmax = max(max(lin(vUv - vec2(px.x,0.)), lin(vUv + vec2(px.x,0.))), max(lin(vUv - vec2(0.,px.y)), lin(vUv + vec2(0.,px.y))));
    float de = smoothstep(0.012 + d0*0.00012, 0.03 + d0*0.0002, (dmax - d0) / d0);
    vec3 n0 = nrm(vUv); float ne = max(1.0 - dot(n0, nrm(vUv + vec2(px.x,0.))), 1.0 - dot(n0, nrm(vUv + vec2(0.,px.y))));
    edge = max(de, smoothstep(0.22, 0.45, ne) * 0.85) * mix(1.0, 0.55, smoothstep(40.0, 120.0, d0));
  }
  col = mix(col, mix(col * 0.42, uInk, 0.42), edge * 0.82);
  float l = dot(col, vec3(0.299,0.587,0.114)); col = mix(vec3(l), col, 1.10); col = col * 0.97 + vec3(0.018, 0.024, 0.024);
  float vig = smoothstep(0.55, 1.15, length((vUv - 0.5) * vec2(uRes.x/uRes.y, 1.0)) * 1.05); col = mix(col, uWash, vig * 0.14);
  col += (hash(floor(vUv * uRes / 1.5)) - 0.5) * 0.014; col = mix(uWash, col, uFade);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
/**
 * A level's renderer: toon materials, sky dome, shadowed sun, outline composite, then the slime on top.
 * Exposes the same context shape the slime module and the harbour expose, so level code reads like home code.
 */
export class Stage {
  readonly renderer: any; readonly scene: any; readonly camera: any; readonly sun: any; readonly controls = {enabled: false, target: new THREE.Vector3(), update() {}};
  readonly THREE = THREE; private gradient: any; private cache = new Map<string, any>(); private opaque: any; private normals: any; private normalMat: any;
  private comp: any; private compScene: any; private compCam: any; private size = new THREE.Vector2(); private edgeCam: any; time = 0;
  constructor(look: StageLook) {
    const r = this.renderer = new THREE.WebGLRenderer({antialias: true});
    r.setPixelRatio(Math.min(devicePixelRatio, 1.6)); r.setSize(innerWidth, innerHeight); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(r.domElement);
    const scene = this.scene = new THREE.Scene(); scene.fog = new THREE.Fog(look.skyHorizon, look.fog[0], look.fog[1]);
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .04, 220); this.camera.layers.enable(LAYER.NO_OUTLINE);
    this.edgeCam = new THREE.PerspectiveCamera(); this.edgeCam.layers.set(LAYER.OUTLINE);
    const sun = this.sun = new THREE.DirectionalLight(look.sun, look.sunIntensity); sun.position.set(-14, 26, 12); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left: -30, right: 30, top: 24, bottom: -24, near: 1, far: 70}); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
    scene.add(sun, sun.target, new THREE.HemisphereLight(look.hemiSky, look.hemiGround, 1.35));
    const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), new THREE.ShaderMaterial({side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {uTop: {value: new THREE.Color(look.skyTop)}, uHorizon: {value: new THREE.Color(look.skyHorizon)}},
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uTop, uHorizon; varying vec3 vP; void main(){ gl_FragColor = vec4(mix(uHorizon, uTop, smoothstep(0.0, 0.55, vP.y)), 1.0); }'}));
    sky.layers.set(LAYER.NO_OUTLINE); sky.renderOrder = -10; scene.add(sky);
    const g = new Uint8Array([90, 170, 255]); this.gradient = new THREE.DataTexture(g, 3, 1, THREE.RedFormat); this.gradient.minFilter = this.gradient.magFilter = THREE.NearestFilter; this.gradient.needsUpdate = true;
    this.opaque = new THREE.WebGLRenderTarget(1, 1, {type: THREE.HalfFloatType, samples: 4}); this.opaque.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    this.normals = new THREE.WebGLRenderTarget(1, 1, {type: THREE.HalfFloatType}); this.normals.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    this.normalMat = new THREE.MeshNormalMaterial();
    this.comp = new THREE.ShaderMaterial({depthTest: false, depthWrite: false, vertexShader: vert, fragmentShader: frag, uniforms: {
      tColor: {value: this.opaque.texture}, tNormal: {value: this.normals.texture}, tDepth: {value: this.normals.depthTexture}, uRes: {value: new THREE.Vector2(1, 1)},
      uNear: {value: this.camera.near}, uFar: {value: this.camera.far}, uLine: {value: 1}, uFade: {value: 0}, uInk: {value: new THREE.Color(look.ink)}, uWash: {value: new THREE.Color(look.wash)}}});
    this.compScene = new THREE.Scene(); const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.comp); quad.frustumCulled = false; this.compScene.add(quad);
    this.compCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    addEventListener('resize', () => { r.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); });
  }
  /** Cached toon material, same idea as the harbour's ctx.mats.toon. */
  toon(color: number | string, opts: {emissive?: number | string; emissiveIntensity?: number; map?: any; transparent?: boolean; opacity?: number; side?: number} = {}) {
    const key = opts.map ? null : JSON.stringify([color, opts]);
    if (key && this.cache.has(key)) return this.cache.get(key);
    const m = new THREE.MeshToonMaterial({color, gradientMap: this.gradient, emissive: opts.emissive ?? 0, emissiveIntensity: opts.emissiveIntensity ?? 1, map: opts.map ?? null, transparent: !!opts.transparent, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide});
    if (key) this.cache.set(key, m); return m;
  }
  glow(color: number | string, scale = 1, opacity = .6) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32); grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({map: new THREE.CanvasTexture(c), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending}));
    s.scale.setScalar(scale); s.layers.set(LAYER.NO_OUTLINE); return s;
  }
  /** Mesh helper: casts and receives shadows, outlined by default. */
  add(mesh: any, parent: any = this.scene) { mesh.traverse((m: any) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); parent.add(mesh); return mesh; }
  render(dt: number, slime?: {render(p: any): void}) {
    this.time += dt; const r = this.renderer;
    r.getDrawingBufferSize(this.size);
    if (this.opaque.width !== this.size.x || this.opaque.height !== this.size.y) { this.opaque.setSize(this.size.x, this.size.y); this.normals.setSize(this.size.x, this.size.y); this.comp.uniforms.uRes.value.copy(this.size); this.comp.uniforms.uLine.value = Math.max(1, r.getPixelRatio() * .75); }
    const k = Math.min(1, this.time / 1.2); this.comp.uniforms.uFade.value = k * k * (3 - 2 * k);
    this.edgeCam.copy(this.camera); this.edgeCam.layers.set(LAYER.OUTLINE);
    const fog = this.scene.fog; this.scene.fog = null; this.scene.overrideMaterial = this.normalMat;
    r.setRenderTarget(this.normals); r.setClearColor(0x8080ff, 1); r.clear(); r.render(this.scene, this.edgeCam);
    this.scene.overrideMaterial = null; this.scene.fog = fog;
    r.setClearColor(0xffffff, 1); r.setRenderTarget(this.opaque); r.clear(); r.render(this.scene, this.camera);
    r.setRenderTarget(null); r.render(this.compScene, this.compCam);
    slime?.render({color: this.opaque.texture, depth: this.normals.depthTexture, time: this.time});
  }
}
