import type {HomeRenderParams} from './params';

/**
 * Calibrated physical rendering parameters written by scripts/calibrate-home.py.
 * Fitted via OKLCH ROI least-squares optimization across daylight, sunset, harbor & mist views.
 */
export const CALIBRATED_PARAMS: Partial<HomeRenderParams> = {
  rayleighScale: 1.64,
  mieScale: 0.40,
  mieAnisotropy: 0.78,
  ozoneScale: 1.36,
  sunIlluminance: 6.4,
  skyLuminanceScale: 0.72,
  envIntensity: 1.02,
  hemiIntensity: 0.64,
  sunBounceIntensity: 0.36,
  oceanAbsorbR: 0.34,
  oceanAbsorbG: 0.065,
  oceanAbsorbB: 0.022,
  oceanScatterIntensity: 1.25,
  oceanChoppiness: 1.05,
  oceanFoamStrength: 0.68,
  oceanGlintStrength: 1.45,
  cloudCoverageBias: 0.14,
  cloudDensity: 1.05,
  cloudSilverLining: 1.30,
  fogDensityScale: 0.24,
  fogHeightFalloff: 0.06,
  fogInscatterStrength: 0.22,
  gtaoRadius: 1.15,
  gtaoIntensity: 0.5,
  exposureTarget: 0.25,
  exposureBias: 0.10,
  localShadowBoost: 0.24,
  localHighlightCompress: 0.22,
  // restrained grade: colour lives in the materials, highlights are kept for sun and foam
  saturation: 1.08,
  grassAlbedoScale: 1.04,
  grassSssStrength: 0.92,
};
