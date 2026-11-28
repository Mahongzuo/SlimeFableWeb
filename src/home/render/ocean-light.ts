/** WaterShade PO.o1ud5q4f, r170 GLSL port. The atlas stores light intensity in R/G. */
export const OCEAN_CAUSTICS_GLSL = /* glsl */ `
uniform sampler2D tCaustics;
// Follow the sun ray from the receiver to the same cloud slab seen in the sky.
float oceanSunTransmission(sampler2D pano, vec3 point, vec3 eye, vec3 sun) {
  vec3 entry = point + sun * (1650.0 - point.y) / max(0.08, sun.y);
  vec3 d = normalize(entry - eye);
  vec2 uv = vec2(fract(atan(d.x,d.z) / 6.2831853 + .5), sqrt(max(0.,asin(clamp(d.y,0.,1.)) / 1.5707963)));
  return texture2D(pano, uv).a;
}
vec3 lightSeabed(vec3 albedo, vec3 focus, float depth, float sunHeight) {
  vec3 incident = exp(-vec3(.34,.080,.045) * depth / max(.65,sunHeight));
  vec3 diffuse = albedo * (vec3(.016,.085,.105) + incident);
  return diffuse + focus * (vec3(.20,.62,.67) + diffuse * 2.6) * incident;
}
float causticIntensity(vec2 uv) {
  return dot(texture2D(tCaustics, uv).rg, vec2(0.5));
}
vec3 oceanCaustics(vec3 receiver, vec3 sun, float level, float time, float daylight, float overcast) {
  float depth = max(0.0, level - receiver.y);
  vec2 p = receiver.xz + depth * sun.xz / max(0.35, sun.y) * 0.42;
  vec2 normalOffset = 0.026 * vec2(sin(p.y * 0.71 + time), cos(p.x * 0.53 - time * 0.8));
  vec2 drift = vec2(0.85, 0.53) * time * 0.1;
  vec2 uv = p / 7.5 + normalOffset + drift;
  float second = causticIntensity(p / 8.25 + normalOffset - drift);
  vec2 split = vec2(0.005, 0.0025);
  vec3 focused = min(vec3(second), vec3(causticIntensity(uv + split),
                         causticIntensity(uv), causticIntensity(uv - split)));
  float sunlight = daylight * smoothstep(0.0, 0.3, sun.y) * (1.0 - 0.92 * overcast);
  return pow(0.9 * focused, vec3(4.5)) * sunlight * exp(-depth * 0.10);
}
`;
