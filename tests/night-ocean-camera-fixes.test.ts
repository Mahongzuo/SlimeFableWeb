import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CAMERA_ARM_MAX, CAMERA_ARM_MIN} from '../src/slime/character';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('鼠标滚轮最远拉远距离扩至原上限 5 倍（26m）并采用比例步进', () => {
  assert.equal(CAMERA_ARM_MIN, 1.2);
  assert.equal(CAMERA_ARM_MAX, 26.0);
  const src = read('../src/slime/character.ts');
  assert.match(src, /const step=Math\.max\(\.4,this\.arm\*\.14\)/, 'wheel step should scale proportionally with arm distance');
  assert.match(src, /clamp\(this\.arm\+Math\.sign\(e\.deltaY\)\*step,CAMERA_ARM_MIN,CAMERA_ARM_MAX\)/);
});

test('海洋着色器接入全局雨滴涟漪并收窄高精度泡沫范围', () => {
  const waterSrc = read('../src/home/render/water-surface.ts');
  const oceanSrc = read('../src/home/render/fft-ocean.ts');
  const pipeSrc = read('../src/home/render/pipeline.ts');

  assert.match(waterSrc, /uRain:\s*\{value:\s*0\}/, 'WaterShared must expose shared uRain uniform');
  assert.match(waterSrc, /float rainRings\(/, 'WATER_COMMON_GLSL must share rainRings helper');
  assert.match(waterSrc, /float wRainSplash\(/, 'WATER_COMMON_GLSL must share wRainSplash helper');
  assert.match(pipeSrc, /w\.uRain\.value\s*=\s*env\.rain/, 'pipeline must sync env.rain to shared water uniforms');

  assert.match(oceanSrc, /if\s*\(uRain\s*>\s*0\.01\)/, 'OCEAN_FRAG must apply raindrop ripples');
  assert.match(oceanSrc, /rainRings\(vWorldPos\.xz,\s*uTime\)/, 'OCEAN_FRAG must sample rainRings on ocean surface');
  assert.match(oceanSrc, /wRainSplash\(vWorldPos\.xz,\s*uTime\)/, 'OCEAN_FRAG must add raindrop splash glints');

  // High-frequency foam & narrowed surf zone (no stretched 0.12 tile or harsh foamStroke)
  assert.match(oceanSrc, /vWorldPos\.xz\s*\*\s*0\.48/, 'lace foam should sample at finer world scale');
  assert.match(oceanSrc, /smoothstep\(0\.25,\s*3\.1,\s*sdf\.x\)/, 'coastal surf zone should be tightened to <= 3.1m');
  assert.doesNotMatch(oceanSrc, /foamStroke\s*=/, 'hard-threshold foamStroke blob mix should be removed');
});

test('夜晚史莱姆轨迹与墙面湿痕接入实时昼夜天空色，移除硬编码白天高亮反射', () => {
  const wetSrc = read('../src/slime/wet-film.ts');
  const wallSrc = read('../src/slime/wall-film.ts');
  const renderSrc = read('../src/slime/render.ts');
  const stageSrc = read('../src/home/garden-stage.ts');

  assert.match(stageSrc, /uDaylight:\s*\{value:\s*1\}/);
  assert.match(stageSrc, /uSkyHorizon:/);
  assert.match(stageSrc, /uSkyZenith:/);

  assert.match(wetSrc, /uniform float uDaylight;/);
  assert.match(wetSrc, /mix\(uSkyHorizon,uSkyZenith,clamp\(R\.y,0\.,1\.\)\)/);
  assert.doesNotMatch(wetSrc, /vec3\(\.74,\.90,\.94\)/, 'must not hardcode bright daylight sky fallback in wet-film');
  assert.match(wallSrc, /uniform float uDaylight;/);
  assert.match(renderSrc, /uniform float uDaylight;/);
});

test('UE UDS 风格夜景：后处理约束夜间目标曝光与 EV 上限，天空与云层具备月晕及月光银边', () => {
  const postSrc = read('../src/home/render/postprocess.ts');
  const atmoSrc = read('../src/home/render/atmosphere.ts');
  const cloudSrc = read('../src/home/render/clouds.ts');
  const pipeSrc = read('../src/home/render/pipeline.ts');
  const grassSrc = read('../src/home/foliage/grass-ism.ts');

  assert.match(postSrc, /float effTargetKey = mix\(uTargetKey,\s*0\.082,\s*night\)/);
  assert.match(postSrc, /float maxEv = mix\(5\.5,\s*1\.65,\s*night\)/);
  assert.match(postSrc, /fu\.uDaylight\.value\s*=\s*daylight/);
  assert.match(atmoSrc, /wideMoonGlow/, 'atmosphere should include UDS-style wide moonlight glow');
  assert.match(atmoSrc, /mwBand/, 'atmosphere should include subtle Milky Way band');
  assert.match(cloudSrc, /moonLight/, 'clouds should include cool-silver moonlight scattering at night');
  assert.match(pipeSrc, /environmentIntensity = p\.envIntensity \* \(0\.26 \+ 0\.74 \* daylight\)/);
  assert.match(grassSrc, /vec3\(\.052,\.088,\.135\)/);
});
