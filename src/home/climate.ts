export const seasonNames = ['春', '夏', '秋', '冬'] as const;
export const weatherNames = {
  auto: '自动天气', clear: '晴天', cloudy: '多云', mist: '薄雾',
  rain: '降雨', rainbow: '雨后彩虹', snow: '落雪',
} as const;
export type WeatherMode = keyof typeof weatherNames;
type Preset = Exclude<WeatherMode, 'auto'>;
export function weatherMode(value: unknown): WeatherMode {
  return typeof value === 'string' && Object.hasOwn(weatherNames, value) ? value as WeatherMode : 'auto';
}
const dayMs = 86400000, beijingOffset = 8 * 3600000;
const rad = Math.PI / 180;
const saturate = (x: number) => Math.min(1, Math.max(0, x));

/** Modern Beijing civil dates use UTC+8. The sun follows a representative Jiangnan latitude. */
export function beijingSky(now: number) {
  const local = now + beijingOffset;
  const date = new Date(local), month = date.getUTCMonth();
  const season = Math.floor(((month + 10) % 12) / 3);
  const days = Math.floor((local - Date.UTC(date.getUTCFullYear(), 0, 1)) / dayMs);
  const hourAngle = ((local % dayMs) / dayMs - .5) * 2 * Math.PI;
  const latitude = 31 * rad, tilt = 23.44 * rad * Math.sin((days - 80) * 2 * Math.PI / 365.25);
  const east = -Math.cos(tilt) * Math.sin(hourAngle);
  const up = Math.sin(latitude) * Math.sin(tilt) + Math.cos(latitude) * Math.cos(tilt) * Math.cos(hourAngle);
  const north = Math.cos(latitude) * Math.sin(tilt) - Math.sin(latitude) * Math.cos(tilt) * Math.cos(hourAngle);
  return {season, date: date.toISOString().slice(0, 10), east, up, north,
    daylight: saturate((up + .13) / .32), twilight: saturate(1 - Math.abs(up) / .3)};
}

// Reproducible seasonal fronts share the same schedule when returning from a level.
const patterns: readonly Preset[][] = [
  ['clear','mist','cloudy','rain','rainbow','clear','cloudy','mist'],
  ['clear','cloudy','rain','rainbow','clear','clear','rain','rainbow'],
  ['clear','mist','clear','cloudy','rain','rainbow','clear','cloudy'],
  ['clear','mist','cloudy','snow','cloudy','clear','snow','clear'],
];
export function naturalWeather(now: number, season: number): Preset {
  const front = Math.floor((now + beijingOffset) / 180000);
  return patterns[season][front % patterns[season].length];
}
const profiles = {
  clear:   {cloud:.14, fog:.04, wind:.29, rain:0, snow:0, rainbow:0},
  cloudy:  {cloud:.83, fog:.21, wind:.64, rain:0, snow:0, rainbow:0},
  mist:    {cloud:.50, fog:.95, wind:.18, rain:0, snow:0, rainbow:0},
  rain:    {cloud:.98, fog:.58, wind:.92, rain:1, snow:0, rainbow:0},
  rainbow: {cloud:.34, fog:.16, wind:.39, rain:.10, snow:0, rainbow:1},
  snow:    {cloud:.80, fog:.53, wind:.46, rain:0, snow:1, rainbow:0},
};
export class HomeClimate {
  mode: WeatherMode = 'auto';
  sky: ReturnType<typeof beijingSky>;
  target: Preset;
  readonly weather: typeof profiles.clear & {time:number;sun:number;shaft:number;wet:number;cover:number};
  private skySecond: number;
  private fixedMinute: number|null=null;
  get minute(){return this.fixedMinute;}
  setTime(minute:unknown){
    this.fixedMinute=typeof minute==='number' && Number.isInteger(minute) && minute>=0 && minute<1440 ? minute : null;
    this.skySecond=-1;
  }
  private bow = 0;
  constructor(now = Date.now()) {
    this.sky = beijingSky(now);
    this.skySecond = Math.floor(now / 1000);
    this.target = naturalWeather(now, this.sky.season);
    const front = profiles[this.target];
    this.weather = {...front, time:0, sun:1, shaft:.5, wet:front.rain, cover:front.snow * .7};
    this.bow = front.rainbow;
    this.update(0,now);
  }
  update(time: number, now = Date.now()) {
    const second = Math.floor(now / 1000);
    if (second !== this.skySecond) {
      const displayTime=this.fixedMinute===null ? now : Math.floor((now+beijingOffset)/dayMs)*dayMs-beijingOffset+this.fixedMinute*60000;
      this.sky=beijingSky(displayTime);this.skySecond=second;
    }
    const w = this.weather, dt = Math.max(0, time - w.time);
    w.time = time;
    this.target = this.mode === 'auto' ? naturalWeather(now, this.sky.season) : this.mode;
    const front = profiles[this.target], blend = -Math.expm1(-dt / 2.6);
    for (const key of ['cloud','fog','wind','rain','snow'] as const) w[key] += (front[key] - w[key]) * blend;
    this.bow += (front.rainbow - this.bow) * blend;
    w.rainbow = this.bow * this.sky.daylight;
    const damp = Math.max(w.rain, this.bow * .63);
    w.wet += (damp - w.wet) * -Math.expm1(-dt / (damp > w.wet ? 3 : 21));
    w.cover += (w.snow - w.cover) * -Math.expm1(-dt / (w.snow > w.cover ? 6 : 32));
    w.sun = .14 + .86 * this.sky.daylight * (1 - .5 * w.cloud);
    w.shaft = this.sky.daylight * (1 - w.cloud) * (.55 + .55 * this.bow);
  }
}
