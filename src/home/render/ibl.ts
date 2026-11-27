import * as THREE from 'three';
import type {PhysicalAtmosphere} from './atmosphere';

const ENV_SPHERE_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const ENV_SPHERE_FRAG = `
precision highp float;
varying vec3 vDir;
uniform sampler2D tSkyView;
uniform vec3 uSunDir;
uniform vec3 uGroundTint;
uniform float uDaylight;
uniform sampler2D tCloudPano;
uniform float uUseClouds;

const float PI = 3.14159265359;

vec2 dirToSkyUV(vec3 d) {
  float azim = atan(d.x, d.z);
  float u = azim / (2.0 * PI) + 0.5;
  float lat = asin(clamp(d.y, -1.0, 1.0));
  float s = lat >= 0.0 ? 1.0 : -1.0;
  float v = 0.5 + 0.5 * s * sqrt(abs(lat) / (PI * 0.5));
  return vec2(fract(u), clamp(v, 0.002, 0.998));
}

void main() {
  vec3 d = normalize(vDir);
  if (d.y >= -0.02) {
    vec3 sky = texture2D(tSkyView, dirToSkyUV(d)).rgb;
    if (uUseClouds > 0.5 && d.y > 0.0) {
      vec2 cuv = vec2(fract(atan(d.x, d.z) / (2.0 * PI) + 0.5), sqrt(clamp(asin(d.y) / (PI * 0.5), 0.0, 1.0)));
      vec4 c = texture2D(tCloudPano, clamp(cuv, vec2(0.0, 0.001), vec2(1.0, 0.999)));
      sky = sky * c.a + c.rgb;
    }
    sky *= 0.24;
    vec3 night = mix(vec3(0.042, 0.072, 0.125), vec3(0.024, 0.046, 0.088), max(d.y, 0.0));
    vec3 col = sky + night * (1.0 - smoothstep(0.02, 0.35, uDaylight));
    // Keep IBL physically balanced against direct sun (5:1 to 7:1 contrast ratio)
    gl_FragColor = vec4(min(col, vec3(1.6)), 1.0);
  } else {
    // Lower hemisphere: physical ocean + sunlit island ground bounce
    vec3 horizon = texture2D(tSkyView, dirToSkyUV(normalize(vec3(d.x, 0.04, d.z)))).rgb * 0.20;
    vec3 bounce = mix(horizon * 0.55, uGroundTint * (0.15 + 0.28 * uDaylight), smoothstep(-0.02, -0.55, d.y));
    gl_FragColor = vec4(min(bounce, vec3(0.85)), 1.0);
  }
}`;

/**
 * Generates a real-time PMREM environment map from the PhysicalAtmosphere Sky-View LUT
 * plus lower-hemisphere ocean/island bounce, giving all PBR meshes grounded global illumination.
 */
export class DynamicIBL {
  private pmrem: THREE.PMREMGenerator;
  private cubeRT: THREE.WebGLCubeRenderTarget;
  private cubeCam: THREE.CubeCamera;
  private envScene: THREE.Scene;
  private envMat: THREE.ShaderMaterial;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private lastSun = new THREE.Vector3(0, -1, 0);
  private lastDaylight = -1;
  private lastStorm = -1;
  private lastUpdate = -1e9;
  private pending = true;

  constructor(renderer: THREE.WebGLRenderer, atmo: PhysicalAtmosphere) {
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileCubemapShader();
    this.cubeRT = new THREE.WebGLCubeRenderTarget(64, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    this.cubeCam = new THREE.CubeCamera(0.1, 20, this.cubeRT);

    this.envScene = new THREE.Scene();
    this.envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: ENV_SPHERE_VERT,
      fragmentShader: ENV_SPHERE_FRAG,
      uniforms: {
        tSkyView: {value: atmo.skyViewRT.texture},
        uSunDir: {value: new THREE.Vector3(0.4, 0.7, 0.5)},
        uGroundTint: {value: new THREE.Color(0x285a68)},
        uDaylight: {value: 1.0},
        tCloudPano: {value: null},
        uUseClouds: {value: 0},
      },
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 12), this.envMat);
    this.envScene.add(sphere);
  }

  update(
    renderer: THREE.WebGLRenderer,
    targetScene: THREE.Scene,
    sunDir: THREE.Vector3,
    daylight: number,
    storminess: number,
    force = false,
  ) {
    const sunShift = this.lastSun.dot(sunDir) < 0.9985;
    const dayShift = Math.abs(this.lastDaylight - daylight) > 0.03;
    const stormShift = Math.abs(this.lastStorm - storminess) > 0.05;
    if (force || sunShift || dayShift || stormShift) this.pending = true;
    if (this.envRT && !this.pending) return;
    // At most two refreshes per second; a pending change waits for the next slot
    const now = performance.now();
    if (this.envRT && now - this.lastUpdate < 500) return;
    this.lastUpdate = now;
    this.pending = false;

    this.envMat.uniforms.uSunDir.value.copy(sunDir);
    this.envMat.uniforms.uDaylight.value = daylight;

    const prevRT = renderer.getRenderTarget();
    this.cubeCam.update(renderer, this.envScene);
    // Reuse the same PMREM target so refreshes never reallocate GPU memory
    const nextEnv = this.pmrem.fromCubemap(this.cubeRT.texture, this.envRT);
    renderer.setRenderTarget(prevRT);

    if (this.envRT !== nextEnv) {
      this.envRT?.dispose();
      this.envRT = nextEnv;
      targetScene.environment = nextEnv.texture;
    }

    this.lastSun.copy(sunDir);
    this.lastDaylight = daylight;
    this.lastStorm = storminess;
  }

  /** Cloud panorama for the upper hemisphere; overcast skies dim and cool the ambient light. */
  setClouds(tex: THREE.Texture | null, enabled: boolean) {
    const u = this.envMat.uniforms;
    u.tCloudPano.value = tex;
    u.uUseClouds.value = enabled && tex ? 1 : 0;
  }

  dispose() {
    this.envRT?.dispose();
    this.cubeRT.dispose();
    this.pmrem.dispose();
    this.envMat.dispose();
  }
}
