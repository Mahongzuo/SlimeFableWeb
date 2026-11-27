import * as THREE from 'three';

/**
 * Meadow-inspired camera-wrapped GPU drifting pollen / dandelion motes (day)
 * and soft floating warm firefly dust (night). Automatically fades out in rain/snow.
 */
export class AtmosphereMotes {
  readonly points: THREE.Points;
  private readonly mat: THREE.ShaderMaterial;

  constructor(count = 420) {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 3);

    let s = 918273;
    const rand = () => {
      s = (Math.imul(1664525, s) + 1013904223) | 0;
      return (s >>> 0) / 4294967296;
    };

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (rand() - 0.5) * 26;
      pos[i * 3 + 1] = rand() * 6.5;
      pos[i * 3 + 2] = (rand() - 0.5) * 26;
      seed[i * 3 + 0] = rand() * Math.PI * 2; // phase
      seed[i * 3 + 1] = 0.55 + rand() * 0.95; // drift speed
      seed[i * 3 + 2] = 0.65 + rand() * 0.85; // particle size
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));

    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: {value: 0},
        uWind: {value: 0.4},
        uDaylight: {value: 1.0},
        uFade: {value: 1.0},
        uSunDir: {value: new THREE.Vector3(0.4, 0.7, 0.5)},
        uSunColor: {value: new THREE.Color(0xfff1d5)},
        uCenter: {value: new THREE.Vector3()},
      },
      vertexShader: `
        attribute vec3 aSeed;
        uniform float uTime, uWind, uDaylight;
        uniform vec3 uCenter, uSunDir;
        varying float vAlpha;
        varying float vBacklit;
        varying float vTwinkle;
        void main() {
          vec3 box = vec3(26.0, 6.5, 26.0);
          vec3 p = position;
          float t = uTime * aSeed.y;
          p.x += uTime * (0.28 + 0.52 * uWind) * aSeed.y + sin(t * 0.75 + aSeed.x) * 0.75;
          p.z += uTime * (0.16 + 0.30 * uWind) * aSeed.y + cos(t * 0.65 + aSeed.x * 1.3) * 0.75;
          p.y += sin(t * 0.95 + aSeed.x * 2.1) * 0.45 + uTime * 0.08 * aSeed.y;

          // Wrap smoothly around camera focus so motes surround the player everywhere on the island
          vec3 rel = mod(p - uCenter + box * 0.5, box) - box * 0.5;
          vec3 worldPos = uCenter + rel;
          worldPos.y = max(0.35, uCenter.y * 0.35 + 1.65 + rel.y);

          vec3 edgeD = abs(rel) / (box * 0.5);
          float boxFade = 1.0 - smoothstep(0.68, 0.98, max(edgeD.x, max(edgeD.y, edgeD.z)));

          vec3 toCam = normalize(cameraPosition - worldPos);
          vBacklit = pow(max(dot(-toCam, normalize(uSunDir)), 0.0), 2.0);
          vTwinkle = 0.55 + 0.45 * sin(uTime * (2.1 + aSeed.y * 1.4) + aSeed.x * 3.0);

          vec4 mv = viewMatrix * vec4(worldPos, 1.0);
          gl_Position = projectionMatrix * mv;
          float dist = max(1.2, -mv.z);
          float nearFade = smoothstep(1.2, 3.0, dist);
          vAlpha = boxFade * nearFade;
          gl_PointSize = clamp((16.0 * aSeed.z) / dist, 1.6, 5.8);
        }
      `,
      fragmentShader: `
        uniform float uDaylight, uFade;
        uniform vec3 uSunColor;
        varying float vAlpha;
        varying float vBacklit;
        varying float vTwinkle;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if (d > 1.0) discard;
          float soft = pow(1.0 - d, 2.2);
          // Warm sunlit pollen by day -> gentle golden-mint firefly dust at night
          vec3 dayCol = mix(vec3(1.0, 0.96, 0.78), uSunColor * vec3(1.12, 1.02, 0.75), 0.55);
          vec3 nightCol = vec3(0.76, 0.94, 0.56);
          vec3 col = mix(nightCol, dayCol, smoothstep(0.12, 0.55, uDaylight));
          float dayGain = 0.24 + 0.44 * vBacklit;
          float nightGain = 0.38 * vTwinkle;
          float gain = mix(nightGain, dayGain * vTwinkle, smoothstep(0.12, 0.55, uDaylight));
          float alpha = soft * vAlpha * gain * uFade;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    this.points = new THREE.Points(geo, this.mat);
    this.points.name = 'meadow-atmosphere-motes';
    this.points.layers.set(1);
    this.points.frustumCulled = false;
  }

  update(
    time: number,
    daylight: number,
    sunDir: THREE.Vector3,
    sunColor: THREE.Color,
    wind: number,
    rain: number,
    snow: number,
    cameraPos: THREE.Vector3,
  ) {
    const precip = Math.max(rain, snow);
    const fade = Math.max(0, 1 - precip * 1.65);
    this.points.visible = fade > 0.02;
    if (!this.points.visible) return;
    const u = this.mat.uniforms;
    u.uTime.value = time;
    u.uWind.value = wind;
    u.uDaylight.value = daylight;
    u.uFade.value = fade;
    u.uSunDir.value.copy(sunDir);
    u.uSunColor.value.copy(sunColor);
    u.uCenter.value.copy(cameraPos);
  }

  dispose() {
    this.points.geometry.dispose();
    this.mat.dispose();
  }
}
