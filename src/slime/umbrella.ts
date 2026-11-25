import {clamp, mix, smooth} from './types';

/**
 * UE USlimeUmbrellaComponent port (metres, Y-up).
 * Parameters mirror UE defaults:
 *  - FallSpeed = 180 cm/s -> 1.8 m/s
 *  - BrakeSeconds = 0.28 s
 *  - GlideAirControl = 0.65
 *  - OpenSeconds = 0.28 s, CloseSeconds = 0.22 s
 *  - ShotOpenHeight = 120 cm -> 1.2 m
 */
export const UMBRELLA = {
  fallSpeed: 1.8,
  brakeSeconds: 0.28,
  glideAirControl: 0.65,
  openSeconds: 0.28,
  closeSeconds: 0.22,
  shotOpenHeight: 1.2,
  shotFollowSpeed: 4.2,
  shotFallSpeed: 1.8,
  shotMaxFallSpeed: 2.6,
};

/** Pure state machine so physics and tests can run without Three.js. */
export class UmbrellaLogic {
  open = false;
  openAmount = 0;
  private brakeStart = -1;
  private brakeInitialSpeed = UMBRELLA.fallSpeed;

  canUse(grounded: boolean, clinging: boolean, swimming: boolean): boolean {
    return !grounded && !clinging && !swimming;
  }

  toggle(grounded: boolean, clinging: boolean, swimming: boolean, jumps: number, maxJumps = 2): boolean {
    if (!this.canUse(grounded, clinging, swimming)) return false;
    if (!this.open && jumps < maxJumps) return false;
    if (this.open) {
      this.cancel();
    } else {
      this.open = true;
      this.brakeStart = -1;
    }
    return true;
  }

  cancel(immediate = false) {
    this.open = false;
    this.brakeStart = -1;
    if (immediate) this.openAmount = 0;
  }

  /** Step open/close animation and arm braking once downward fall begins. */
  step(dt: number, now: number, vy: number, grounded: boolean, clinging: boolean, swimming: boolean) {
    if (this.open && !this.canUse(grounded, clinging, swimming)) this.cancel();
    if (this.open && vy <= 0 && this.brakeStart < 0) {
      this.brakeStart = now;
      this.brakeInitialSpeed = Math.max(UMBRELLA.fallSpeed, -vy);
    }
    this.openAmount=advanceGlideForm(this.openAmount,this.open,dt);
  }

  /** Clamps downward speed smoothly over BrakeSeconds without adding upward lift. */
  limitFallVelocity(vy: number, now: number): number {
    if (!this.open || vy >= 0 || this.brakeStart < 0) return vy;
    const t = clamp((now - this.brakeStart) / Math.max(UMBRELLA.brakeSeconds, 0.01), 0, 1);
    const limit = mix(this.brakeInitialSpeed, Math.max(UMBRELLA.fallSpeed, 0.3), smooth(t));
    return Math.max(vy, -limit);
  }
}

export function advanceGlideForm(amount:number,open:boolean,dt:number){
  return open ? Math.min(1,amount+dt/UMBRELLA.openSeconds) : Math.max(0,amount-dt/UMBRELLA.closeSeconds);
}
