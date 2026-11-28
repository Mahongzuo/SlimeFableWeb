import {Vector4} from 'three';

interface MeadowActor {
  position: readonly number[];
  mode: string;
  grounded: boolean;
  velocity: readonly number[];
  swimming: boolean;
  spread: number;
  cling?: unknown;
  ridePlane?: unknown;
}

export class MeadowMotion {
  readonly foot = new Vector4(0, 0, 0, 0);
  readonly trail = Array.from({length: 4}, () => new Vector4(0, 0, 0, 0));
  readonly wind = {value: .29};
  readonly phase = {value: 0};
  private readonly lastPrint = new Vector4(0, 0, 0, 0);
  private unsupportedTime = 0;

  advanceWind(dt: number, target: number) {
    const strength = Math.max(0, Math.min(.8, target));
    this.wind.value += (strength - this.wind.value) * -Math.expm1(-dt / .65);
    // Integrate angular velocity so a weather change never shifts an existing wave in time.
    this.phase.value += dt * (.72 + .42 * this.wind.value);
  }

  updateContact(dt: number, actor: MeadowActor | undefined, ground: number | null) {
    for (const print of this.trail) print.w = Math.max(0, print.w - dt * 2.8);
    const foot = this.foot;
    if (!actor) {
      foot.w = this.lastPrint.w = 0;
      return;
    }
    const [x, y, z] = actor.position;
    this.unsupportedTime = actor.grounded ? 0 : this.unsupportedTime + dt;
    // A capsule can briefly lose support over triangle boundaries. A jump lifts off immediately.
    const supported = actor.grounded || (foot.w > 0 && this.unsupportedTime < .07 && Math.abs(actor.velocity[1]) < .65);
    const onGrass = actor.mode === 'play' && supported && !actor.swimming && !actor.cling &&
      !actor.ridePlane && ground !== null && Math.abs(y - ground) <= (foot.w > 0 ? .16 : .10);
    const radius = onGrass ? .48 + .53 * actor.spread : 0;
    foot.set(x, y, z, radius);
    if (!onGrass || this.lastPrint.w === 0) {
      this.lastPrint.copy(foot);
      return;
    }
    const distance = Math.hypot(x - this.lastPrint.x, z - this.lastPrint.z);
    if (distance < .12) {
      this.lastPrint.w = radius;
      return;
    }
    if (distance <= 1.5) {
      for (let i = this.trail.length - 1; i > 0; i--) this.trail[i].copy(this.trail[i - 1]);
      this.trail[0].copy(this.lastPrint);
      this.trail[0].w *= .85;
    }
    this.lastPrint.copy(foot);
  }
}

/** Both shaders sample a single travelling gust. Its magnitude is at most one. */
export const MEADOW_WIND_GLSL = `
  uniform float uMeadowWind, uMeadowPhase;
  float meadowWave(vec2 root) {
    float p = dot(root, vec2(.14,.095)) - uMeadowPhase;
    return .78 * sin(p) + .22 * sin(p * 1.53 + dot(root, vec2(-.06,.04)));
  }
`;
