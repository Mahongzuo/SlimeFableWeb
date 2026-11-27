import * as T from 'three';
import {gardenRain} from './rain-contact';
import {HomeClimate} from './climate';
import {surfaceClimate} from './climate-material';
import {inland, LAKE, lakeEdge} from '../world/map';
import {riverCenter, riverLevel} from './waterway';
import {HomeRenderPipeline} from './render/pipeline';
import {OceanSystem} from './render/fft-ocean';
import {VolumetricClouds} from './render/clouds';
import {HomePostProcess} from './render/postprocess';
import {clampRenderParams, RENDER_PARAM_BOUNDS, type HomeRenderParams} from './render/params';
import {IslandCoastSystem} from '../world/island-coast';
import {waterWaves} from './water-waves';
import {AtmosphereMotes} from './foliage/atmosphere-motes';
import {simpondLighting} from './simpond-assets';

const palette = {
  wood: 0x936f50, woodDark: 0x66513e, woodWeathered: 0x94806a, concrete: 0xb5b7a6, concreteWet: 0x889d95,
  concreteDark: 0x7c8c80, gravel: 0xa59e86, grass: 0x91a877, iron: 0x526560, rope: 0xb29b77, ropeWet: 0x887b62,
  safetyYellow: 0xcbab68, sand: 0xcab998, boatOffWhite: 0xe3dfca, tileRoof: 0x526b62, tileRoofDark: 0x405750, tileRoofLight: 0x788d7f,
};

export function createGardenStage() {
  const pipeline = new HomeRenderPipeline();
  const {renderer, scene, camera, sun, params} = pipeline;
  const director = new HomeClimate();
  const weather = director.weather;

  const controls = {
    enabled: false,
    target: new T.Vector3(),
    update() {
      camera.lookAt(this.target);
      camera.updateMatrixWorld();
    },
  };

  const U = {
    uTime: {value: 0},
    uSun: {value: 1},
    uWind: {value: 0.5},
    uRain: {value: 0},
    uShaft: {value: 0.5},
    uSunDir: {value: new T.Vector3(0.4, 0.7, 0.5)},
    uSunColor: {value: new T.Color(0xfff1d5)},
    uSlimePos: {value: new T.Vector4(1.5, 0, 17, 0.65)},
    uGrassAlbedoScale: {value: params.grassAlbedoScale},
    uGrassSssStrength: {value: params.grassSssStrength},
    /** Graphics-preset grass density (0..1), applied per instance rank in the grass shader. */
    uGrassDensity: {value: 1},
  };

  const hooks: ((t: number, dt: number) => void)[] = [];
  const ctx: any = {
    THREE: T,
    renderer,
    scene,
    camera,
    controls,
    sun,
    P: palette,
    U,
    weather,
    pipeline,
    params,
    puddles: [
      {x: 6.1, z: 15.4, rx: 1.25, rz: 0.55, rot: 0.3},
      {x: 12.6, z: 19.2, rx: 1.45, rz: 0.57, rot: -0.5},
      {x: 3.2, z: 18.8, rx: 0.7, rz: 0.34, rot: 0.1},
    ],
    renderSlime: null as any,
    rainSurface: null as null | ((x: number, z: number) => number),
    reflectActor: null as any,
    islandCoast: null as IslandCoastSystem | null,
    ocean: null as OceanSystem | null,
    grassField: null as any,
    groundY: (x: number, z: number) =>
      lakeEdge(x, z) < 1
        ? Math.max(inland(x, z), LAKE.level)
        : Math.abs(x - riverCenter(z)) < 4 && z < 30
          ? Math.max(inland(x, z), riverLevel)
          : inland(x, z),
    onUpdate: (fn: (t: number, dt: number) => void) => hooks.push(fn),
    mats: {
      toon: (color: any, options: any = {}) => pipeline.createMaterial(color, options),
      flat: (color: any, opts: any = {}) => new T.MeshBasicMaterial({color, ...opts}),
      glowSprite: pipeline.glow.bind(pipeline),
    },
  };

  // Every water surface shares the game clock (ripple events are stamped with U.uTime) and one detail-normal pair
  pipeline.water.uWaterTime = U.uTime;
  const waves = waterWaves(ctx);
  pipeline.water.tWaterNormal0.value = waves.normals[0];
  pipeline.water.tWaterNormal1.value = waves.normals[1];

  // Sculpted coastal shelf + dynamic island SDF + dual-cascade GPU FFT infinite ocean
  const islandCoast = new IslandCoastSystem(ctx, []);
  const ocean = new OceanSystem(renderer, pipeline.water, islandCoast.sdf, params);
  ocean.mesh.onBeforeRender = r => pipeline.captureOpaque(r);
  islandCoast.onSDFChange(sdf => ocean.setIslandSDF(sdf));
  scene.add(ocean.mesh);
  pipeline.oceanHook = ocean;
  ctx.islandCoast = islandCoast;
  ctx.ocean = ocean;

  // Volumetric clouds & HDR post-processing (GTAO + Volumetric Fog + Auto Exposure + Local Tone Mapping)
  const clouds = new VolumetricClouds(pipeline.atmosphere.skyViewRT.texture);
  const postProcess = new HomePostProcess();
  pipeline.cloudHook = clouds;
  pipeline.postHook = postProcess;

  // Calibration & live tuning API (used by scripts/calibrate-home.py & ?tune=1)
  const calibApi = {
    getParams: () => ({...params}),
    setParams: (patch: Partial<HomeRenderParams>) => {
      const next = clampRenderParams({...params, ...patch});
      Object.assign(params, next);
    },
    setInstantExposure: (on: boolean) => {
      postProcess.instantExposure = on;
    },
    setView: (pos: [number, number, number], target: [number, number, number], minute: number, weatherMode: any) => {
      pipeline.time = Math.max(pipeline.time, 2.0);
      director.setTime(minute);
      director.mode = weatherMode;
      director.update(director.weather.time + 120);
      controls.target.fromArray(target);
      camera.position.fromArray(pos);
      camera.lookAt(target[0], target[1], target[2]);
      camera.updateMatrixWorld();
      postProcess.instantExposure = true;
      clouds.invalidate();
      step(1 / 60);
      // Re-assert camera in case any hook adjusted it, then render clean frame
      camera.position.fromArray(pos);
      camera.lookAt(target[0], target[1], target[2]);
      camera.updateMatrixWorld();
      step(1 / 60);
    },
  };
  (window as any).__homeCalib = calibApi;

  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('tune')) {
    mountTuneOverlay(params, () => {
      postProcess.instantExposure = false;
    });
  }

  const updateRain = gardenRain(scene, camera, U, (x, z) => ctx.rainSurface?.(x, z) ?? ctx.groundY(x, z));

  // Snowflakes
  let seed = 379;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const flakePos = new Float32Array(720 * 3);
  for (let i = 0; i < flakePos.length; i += 3) {
    flakePos[i] = random() * 30 - 15;
    flakePos[i + 1] = random() * 18;
    flakePos[i + 2] = random() * 30 - 15;
  }
  const flakes = new T.BufferGeometry();
  flakes.setAttribute('position', new T.BufferAttribute(flakePos, 3));
  const flakeMat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {uTime: U.uTime, uWind: U.uWind, amount: {value: 0}},
    vertexShader: `uniform float uTime,uWind;void main(){
      vec3 p=position;p.y=mod(p.y-uTime*(1.0+.32*sin(position.x)),18.)-6.;
      p.x=mod(p.x+15.+uTime*uWind+sin(uTime*.8+p.z)*.52,30.)-15.;
      vec4 eye=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*eye;
      gl_PointSize=clamp(19./max(1.,-eye.z),1.5,5.5);}`,
    fragmentShader: `uniform float amount;void main(){
      float a=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));
      gl_FragColor=vec4(.93,.97,1.,a*amount*.93);}`,
  });
  const snow = new T.Points(flakes, flakeMat);
  snow.layers.set(1);
  snow.frustumCulled = false;
  scene.add(snow);

  // Meadow-inspired drifting sunlit pollen (day) & soft firefly dust (night)
  const motes = new AtmosphereMotes(420);
  scene.add(motes.points);

  // Rainbow arc over the sea
  const spectrum = [0xdd8885, 0xe7ab7e, 0xe6cd8a, 0xaace92, 0x8bbfca, 0x9f9ac7];
  const bow = new T.Group();
  bow.position.set(2, -5, -85);
  for (let i = 0; i < spectrum.length; i++) {
    const mat = new T.MeshBasicMaterial({
      color: spectrum[i],
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      opacity: 0,
      fog: false,
    });
    const strip = new T.Mesh(new T.RingGeometry(48 - i * 0.65, 48.64 - i * 0.65, 100, 1, 0, Math.PI), mat);
    strip.layers.set(1);
    bow.add(strip);
  }
  scene.add(bow);

  const fogDay = new T.Color(0x9bc8e2);
  const fogSunset = new T.Color(0xe69f72);
  const fogStorm = new T.Color(0x8aa1ab);
  const fogNight = new T.Color(0x162436);
  const sunDirVec = new T.Vector3();
  const focusPos = new T.Vector3(0, 0, 20);
  let time = 0;
  let drift = 0;

  function step(dt: number) {
    time += dt;
    director.update(time);
    const {season, daylight, twilight, east, up, north} = director.sky;
    const overcast = Math.max(weather.rain, weather.cloud * 0.64, weather.snow * 0.74);

    U.uTime.value = time;
    U.uRain.value = weather.rain;
    U.uWind.value = weather.wind;
    U.uSun.value = weather.sun;
    U.uShaft.value = weather.shaft;
    U.uGrassAlbedoScale.value = params.grassAlbedoScale;
    U.uGrassSssStrength.value = params.grassSssStrength;

    surfaceClimate.season.value = season;
    surfaceClimate.snow.value = weather.cover;
    surfaceClimate.wet.value = weather.wet;

    sunDirVec.set(east, up, -north).normalize();
    U.uSunDir.value.copy(sunDirVec);
    simpondLighting.daylight.value = daylight;
    simpondLighting.sunDir.value.copy(sunDirVec);
    drift += dt * (0.006 + 0.019 * weather.wind);

    const slimeObj = (window as any).__slime;
    if (slimeObj?.position) {
      focusPos.set(slimeObj.position[0], slimeObj.position[1], slimeObj.position[2]);
      U.uSlimePos.value.set(slimeObj.position[0], slimeObj.position[1], slimeObj.position[2], slimeObj.spread ? 1.05 : 0.68);
    } else {
      focusPos.copy(controls.target);
    }

    // Update physical atmosphere LUTs, real-time PMREM IBL, sun/bounce lights, and GPU FFT ocean
    pipeline.updateAtmosphereAndLights({
      sunDir: sunDirVec,
      daylight,
      twilight,
      cloud: weather.cloud,
      storminess: overcast,
      drift,
      wind: weather.wind,
      dt,
      focusPos,
    });
    U.uSunColor.value.copy(sun.color);

    // Keep Three.js built-in scene.fog negligible so volumetric fog & aerial perspective in post-process own the look (no double-fog!)
    const fog = scene.fog as T.FogExp2;
    if (fog) {
      fog.color.copy(fogDay).lerp(fogSunset, twilight * 0.72).lerp(fogStorm, overcast * 0.65).lerp(fogNight, 1 - daylight);
      fog.density = 0.00004;
    }

    for (const fn of hooks) fn(time, dt);

    ocean.syncCameraAndEnv(camera, sun.color, daylight, overcast, Math.min(1, weather.cloud + params.cloudCoverageBias));

    snow.position.copy(camera.position);
    snow.visible = weather.snow > 0.012;
    flakeMat.uniforms.amount.value = weather.snow;
    motes.update(time, daylight, sunDirVec, sun.color, weather.wind, weather.rain, weather.snow, camera.position);
    updateRain(time);
    bow.visible = weather.rainbow > 0.01;
    for (const band of bow.children) (band as any).material.opacity = 0.24 * weather.rainbow;

    const fogDens = (0.00014 + 0.00095 * weather.fog * weather.fog + 0.00038 * weather.rain) * params.fogDensityScale;
    pipeline.render(
      dt,
      {
        sunDir: sunDirVec,
        daylight,
        cloud: weather.cloud,
        storminess: overcast,
        fogDensity: fogDens,
        rain: weather.rain,
      },
      {render: (pass: any) => ctx.renderSlime?.(pass)},
      ctx.reflectActor,
    );
  }

  function run() {
    let last = performance.now();
    renderer.setAnimationLoop(() => {
      const now = performance.now();
      step(Math.min(0.05, (now - last) / 1000));
      last = now;
    });
  }

  function bench(frames = 8) {
    const t = performance.now();
    for (let i = 0; i < frames; i++) step(1 / 60);
    renderer.getContext().finish();
    return (performance.now() - t) / frames;
  }

  const refresh = () => {
    renderer.setPixelRatio((globalThis as any).__renderScale ?? 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  (globalThis as any).__harborResize = refresh;

  return {ctx, camera, renderer, scene, controls, director, pipeline, step, run, bench};
}

/** Optional live developer parameter panel enabled via ?tune=1. */
function mountTuneOverlay(params: HomeRenderParams, onEdit: () => void) {
  const box = document.createElement('div');
  box.style.cssText =
    'position:fixed;right:12px;top:12px;z-index:9999;width:270px;max-height:82vh;overflow:auto;' +
    'background:rgba(14,22,28,.86);color:#eef4f6;font:12px/1.4 system-ui,sans-serif;padding:10px 12px;' +
    'border-radius:10px;border:1px solid rgba(255,255,255,.15);backdrop-filter:blur(8px);';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:700;';
  head.innerHTML = '<span>AAA 物理管线调参</span>';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '复制 JSON';
  copyBtn.style.cssText = 'background:#2b7a78;color:#fff;border:0;border-radius:5px;padding:2px 8px;cursor:pointer;font-size:11px;';
  copyBtn.onclick = () => navigator.clipboard?.writeText(JSON.stringify(params, null, 2));
  head.appendChild(copyBtn);
  box.appendChild(head);

  for (const key of Object.keys(RENDER_PARAM_BOUNDS) as (keyof HomeRenderParams)[]) {
    const b = RENDER_PARAM_BOUNDS[key];
    const row = document.createElement('label');
    row.style.cssText = 'display:block;margin:4px 0;';
    const top = document.createElement('div');
    top.style.cssText = 'display:flex;justify-content:space-between;font-size:11px;opacity:.9;';
    const valSpan = document.createElement('span');
    valSpan.textContent = params[key].toFixed(3);
    top.innerHTML = `<span>${b.label}</span>`;
    top.appendChild(valSpan);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(b.min);
    input.max = String(b.max);
    input.step = String(b.step);
    input.value = String(params[key]);
    input.style.cssText = 'width:100%;margin:2px 0;';
    input.oninput = () => {
      params[key] = Number(input.value);
      valSpan.textContent = params[key].toFixed(3);
      onEdit();
    };
    row.append(top, input);
    box.appendChild(row);
  }
  document.body.appendChild(box);
}
