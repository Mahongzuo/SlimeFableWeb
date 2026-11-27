/**
 * Physically-based rendering parameters for the Home infinite-ocean island pipeline.
 * All scalar fields can be tuned live (?tune=1) or fitted by scripts/calibrate-home.mjs.
 */
export interface HomeRenderParams {
  // Physical atmosphere (Hillaire 2020)
  rayleighScale: number;
  mieScale: number;
  mieAnisotropy: number;
  ozoneScale: number;
  sunIlluminance: number;
  skyLuminanceScale: number;

  // IBL / GI bounce
  envIntensity: number;
  hemiIntensity: number;
  sunBounceIntensity: number;

  // Ocean optical & wave response
  oceanAbsorbR: number;
  oceanAbsorbG: number;
  oceanAbsorbB: number;
  oceanScatterIntensity: number;
  oceanChoppiness: number;
  oceanFoamStrength: number;
  oceanGlintStrength: number;

  // Volumetric clouds
  cloudCoverageBias: number;
  cloudDensity: number;
  cloudSilverLining: number;

  // Volumetric fog / aerial perspective
  fogDensityScale: number;
  fogHeightFalloff: number;
  fogInscatterStrength: number;

  // Post-processing: GTAO, Auto Exposure & Local Tone Mapping
  gtaoRadius: number;
  gtaoIntensity: number;
  exposureTarget: number;
  exposureBias: number;
  localShadowBoost: number;
  localHighlightCompress: number;
  saturation: number;

  // Terrain & foliage albedo / SSS calibration
  grassAlbedoScale: number;
  grassSssStrength: number;
}

export const DEFAULT_RENDER_PARAMS: HomeRenderParams = {
  rayleighScale: 1.12,
  mieScale: 1.05,
  mieAnisotropy: 0.80,
  ozoneScale: 1.15,
  sunIlluminance: 4.8,
  skyLuminanceScale: 0.92,

  envIntensity: 0.62,
  hemiIntensity: 0.16,
  sunBounceIntensity: 0.14,

  oceanAbsorbR: 0.56,
  oceanAbsorbG: 0.135,
  oceanAbsorbB: 0.042,
  oceanScatterIntensity: 0.64,
  oceanChoppiness: 1.15,
  oceanFoamStrength: 0.62,
  oceanGlintStrength: 1.25,

  cloudCoverageBias: 0.02,
  cloudDensity: 0.88,
  cloudSilverLining: 0.95,

  fogDensityScale: 0.72,
  fogHeightFalloff: 0.042,
  fogInscatterStrength: 0.58,

  gtaoRadius: 1.65,
  gtaoIntensity: 0.95,
  exposureTarget: 0.135,
  exposureBias: -0.10,
  localShadowBoost: 0.12,
  localHighlightCompress: 0.36,
  saturation: 1.12,

  grassAlbedoScale: 0.96,
  grassSssStrength: 0.95,
};

export interface ParamBounds {
  min: number;
  max: number;
  step: number;
  label: string;
}

export const RENDER_PARAM_BOUNDS: Record<keyof HomeRenderParams, ParamBounds> = {
  rayleighScale: {min: 0.4, max: 2.2, step: 0.05, label: 'Rayleigh 散射'},
  mieScale: {min: 0.3, max: 3.0, step: 0.05, label: 'Mie 气溶胶'},
  mieAnisotropy: {min: 0.45, max: 0.92, step: 0.01, label: 'Mie 前向角'},
  ozoneScale: {min: 0.2, max: 2.2, step: 0.05, label: '臭氧吸收'},
  sunIlluminance: {min: 1.5, max: 9.0, step: 0.1, label: '太阳照度'},
  skyLuminanceScale: {min: 0.5, max: 2.2, step: 0.05, label: '天空亮度'},
  envIntensity: {min: 0.2, max: 2.0, step: 0.05, label: 'IBL 环境强度'},
  hemiIntensity: {min: 0.1, max: 1.4, step: 0.05, label: '半球补光'},
  sunBounceIntensity: {min: 0.0, max: 1.0, step: 0.04, label: '地表反弹 GI'},
  oceanAbsorbR: {min: 0.18, max: 0.95, step: 0.02, label: '海水红光吸收'},
  oceanAbsorbG: {min: 0.04, max: 0.35, step: 0.01, label: '海水绿光吸收'},
  oceanAbsorbB: {min: 0.015, max: 0.18, step: 0.005, label: '海水蓝光吸收'},
  oceanScatterIntensity: {min: 0.1, max: 1.5, step: 0.05, label: '浪峰透光 SSS'},
  oceanChoppiness: {min: 0.4, max: 2.4, step: 0.05, label: '波浪陡度'},
  oceanFoamStrength: {min: 0.2, max: 1.8, step: 0.05, label: '碎浪泡沫'},
  oceanGlintStrength: {min: 0.3, max: 2.5, step: 0.05, label: '海面日光闪烁'},
  cloudCoverageBias: {min: -0.25, max: 0.35, step: 0.02, label: '云量偏置'},
  cloudDensity: {min: 0.2, max: 2.0, step: 0.05, label: '体积云密度'},
  cloudSilverLining: {min: 0.1, max: 2.0, step: 0.05, label: '云缘银边'},
  fogDensityScale: {min: 0.2, max: 2.5, step: 0.05, label: '体积雾倍率'},
  fogHeightFalloff: {min: 0.008, max: 0.12, step: 0.002, label: '雾高度衰减'},
  fogInscatterStrength: {min: 0.05, max: 1.5, step: 0.05, label: '太阳空气散射'},
  gtaoRadius: {min: 0.5, max: 3.5, step: 0.1, label: 'GTAO 半径'},
  gtaoIntensity: {min: 0.0, max: 1.5, step: 0.05, label: 'GTAO 强度'},
  exposureTarget: {min: 0.10, max: 0.45, step: 0.01, label: '目标曝光亮度'},
  exposureBias: {min: -1.2, max: 1.2, step: 0.05, label: '曝光补偿 EV'},
  localShadowBoost: {min: 0.0, max: 0.85, step: 0.03, label: '局部暗部提亮'},
  localHighlightCompress: {min: 0.0, max: 0.85, step: 0.03, label: '局部高光压缩'},
  saturation: {min: 0.75, max: 1.35, step: 0.02, label: '色彩饱和度'},
  grassAlbedoScale: {min: 0.65, max: 1.45, step: 0.02, label: '草地反照率'},
  grassSssStrength: {min: 0.15, max: 1.8, step: 0.05, label: '草叶逆光 SSS'},
};

export function clampRenderParams(input: Partial<HomeRenderParams>): HomeRenderParams {
  const out = {...DEFAULT_RENDER_PARAMS};
  for (const key of Object.keys(RENDER_PARAM_BOUNDS) as (keyof HomeRenderParams)[]) {
    const val = input[key];
    if (typeof val === 'number' && Number.isFinite(val)) {
      const b = RENDER_PARAM_BOUNDS[key];
      out[key] = Math.max(b.min, Math.min(b.max, val));
    }
  }
  return out;
}
