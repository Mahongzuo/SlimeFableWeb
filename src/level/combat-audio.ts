/**
 * Procedural WebAudio synthesizer shared by Defense (Gate 3), Skirmish (Gate 5) and RPG (Gate 6).
 * Zero external audio assets; safe in headless & SSR environments; includes throttle & persistent mute.
 */

const MUTE_KEY = 'slimefable.combatAudioMuted';

function readMute(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}
function writeMute(v: boolean) {
  try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch { /* ignore */ }
}

export class CombatAudio {
  private ctx: AudioContext | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private master: GainNode | null = null;
  private airGain: GainNode | null = null;
  private airLevel = 0.08;
  private throttles = new Map<string, number>();
  private _muted = readMute();

  get muted(): boolean { return this._muted; }

  setMuted(v: boolean) {
    this._muted = v;
    writeMute(v);
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v ? 0 : 0.72, this.ctx.currentTime, 0.02);
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) {
      try {
        const ctx = new AC();
        const master = ctx.createGain();
        master.gain.value = this._muted ? 0 : 0.72;
        master.connect(ctx.destination);
        this.ctx = ctx;
        this.master = master;
        const len = Math.floor(ctx.sampleRate * 1.6);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        let prev = 0;
        for (let i = 0; i < len; i++) {
          prev = 0.94 * prev + 0.06 * (Math.random() * 2 - 1);
          data[i] = prev * 2.2;
        }
        this.noiseBuf = buf;
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Optional ambient wind/sea loop (replaces legacy DodgeAudio wind bed). */
  startAmbient(mode: 'ship' | 'field' | 'defense') {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noiseBuf || this.airGain) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = mode === 'ship' ? 620 : mode === 'field' ? 1050 : 480;
    const gain = ctx.createGain();
    this.airLevel = mode === 'defense' ? 0.045 : 0.095;
    gain.gain.value = this.airLevel;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    this.airGain = gain;
  }

  pause() { void this.ctx?.suspend().catch(() => {}); }
  resume() { if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => {}); }

  private gate(tag: string, minMs: number): boolean {
    const now = performance.now();
    const last = this.throttles.get(tag) ?? -Infinity;
    if (now - last < minMs) return false;
    this.throttles.set(tag, now);
    return true;
  }

  private tone(
    freq: number,
    endFreq: number,
    dur: number,
    type: OscillatorType = 'sine',
    amp = 0.14,
    delay = 0,
    filterHz = 0,
  ) {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(24, freq), t);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(24, endFreq), t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0005, amp), t + Math.min(0.014, dur * 0.22));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (filterHz > 0) {
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = filterHz;
      osc.connect(flt).connect(env).connect(this.master);
    } else {
      osc.connect(env).connect(this.master);
    }
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, amp: number, freq: number, q = 1.1, delay = 0, filterType: BiquadFilterType = 'bandpass') {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noiseBuf) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const flt = ctx.createBiquadFilter();
    flt.type = filterType;
    flt.frequency.setValueAtTime(freq, t);
    flt.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0005, amp), t + Math.min(0.012, dur * 0.18));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(env).connect(this.master);
    src.start(t, Math.random() * 0.6);
    src.stop(t + dur + 0.03);
  }

  // ---- Defense SFX ----

  playPlant(kind: string) {
    const base = ({water: 420, wind: 520, fire: 340, thunder: 620, dark: 260, physical: 190, dew: 580} as Record<string, number>)[kind] ?? 400;
    this.tone(base * 0.72, base * 1.12, 0.13, 'triangle', 0.16);
    this.tone(base * 1.5, base * 1.65, 0.11, 'sine', 0.08, 0.045);
  }

  playUpgrade(level: number) {
    const notes = level >= 3 ? [523, 659, 784, 1046] : [440, 554, 659];
    notes.forEach((n, i) => this.tone(n, n * 1.02, 0.20, 'triangle', 0.13, i * 0.055));
  }

  playSalvage() {
    this.tone(540, 320, 0.14, 'triangle', 0.12);
    this.tone(420, 260, 0.12, 'sine', 0.08, 0.05);
  }

  playDewPickup() {
    if (!this.gate('dew', 55)) return;
    const j = 0.96 + Math.random() * 0.08;
    this.tone(740 * j, 1120 * j, 0.14, 'sine', 0.12);
    this.tone(1120 * j, 1480 * j, 0.12, 'sine', 0.07, 0.05);
  }

  playTowerShot(kind: string) {
    if (!this.gate('tshot-' + kind, 65)) return;
    const j = 0.93 + Math.random() * 0.14;
    switch (kind) {
      case 'water':
        this.tone(520 * j, 290 * j, 0.10, 'sine', 0.08);
        break;
      case 'wind':
        this.noise(0.11, 0.10, 1450 * j, 2.2);
        break;
      case 'fire':
        this.tone(240 * j, 96 * j, 0.14, 'sawtooth', 0.085, 0, 900);
        this.noise(0.11, 0.10, 520, 0.9);
        break;
      case 'thunder':
        this.tone(920 * j, 340 * j, 0.09, 'square', 0.06, 0, 2200);
        this.noise(0.08, 0.08, 2800, 1.8);
        break;
      case 'dark':
        this.tone(210 * j, 310 * j, 0.13, 'sawtooth', 0.065, 0, 720);
        break;
      case 'physical':
        this.tone(145 * j, 62 * j, 0.14, 'triangle', 0.14);
        break;
      default:
        this.tone(600 * j, 820 * j, 0.11, 'sine', 0.07);
    }
  }

  playReaction(kind?: string) {
    if (!this.gate('react', 75)) return;
    if (kind === 'vaporize' || kind === 'Vaporize' || kind === 'overload' || kind === 'Overload') {
      this.tone(360, 110, 0.22, 'sawtooth', 0.13, 0, 1400);
      this.noise(0.22, 0.17, 1300, 0.8);
    } else if (kind === 'chain' || kind === 'ElectroCharge' || kind === 'LightningSwirl') {
      this.tone(1180, 560, 0.12, 'square', 0.08, 0, 2600);
      this.tone(1520, 880, 0.11, 'triangle', 0.07, 0.045);
    } else if (kind === 'BreakPoise' || kind === 'break') {
      this.playPoiseBreak();
    } else {
      this.tone(640, 960, 0.16, 'triangle', 0.10);
      this.noise(0.13, 0.09, 1800, 1.4);
    }
  }

  playTapeSweep() {
    this.tone(330, 880, 0.28, 'triangle', 0.16);
    this.tone(660, 1320, 0.24, 'sine', 0.11, 0.08);
    this.noise(0.28, 0.16, 1600, 1.2);
  }

  playSupportCast(element: number) {
    const roots = [340, 440, 260, 520, 200, 160];
    const r = roots[element % 6] ?? 320;
    this.tone(r, r * 2, 0.26, 'triangle', 0.16);
    this.tone(r * 1.5, r * 0.5, 0.36, 'sawtooth', 0.13, 0.16, 1200);
    this.noise(0.32, 0.22, 760, 0.7, 0.16);
  }

  playWaveHorn(isBoss = false) {
    if (isBoss) {
      this.tone(110, 104, 0.65, 'sawtooth', 0.16, 0, 540);
      this.tone(164.8, 155.5, 0.55, 'sawtooth', 0.11, 0.15, 620);
      this.tone(82.4, 78, 0.7, 'triangle', 0.18, 0.05);
    } else {
      this.tone(330, 392, 0.22, 'triangle', 0.12);
      this.tone(440, 523, 0.26, 'triangle', 0.11, 0.12);
    }
  }

  playLeakAlarm() {
    this.tone(280, 175, 0.26, 'sawtooth', 0.16, 0, 900);
    this.tone(220, 130, 0.28, 'sawtooth', 0.14, 0.16, 800);
  }

  playTransmitVictory() {
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chord.forEach((f, i) => this.tone(f, f * 1.005, 0.45, 'triangle', 0.12, i * 0.085));
  }

  // ---- Skirmish & ARPG SFX ----

  playCloneFire(element: number) {
    if (!this.gate('fire', 55)) return;
    const pitch = [540, 680, 390, 760, 310, 250][element % 6] ?? 480;
    const j = 0.94 + Math.random() * 0.12;
    this.tone(pitch * j, pitch * 0.46 * j, 0.14, 'triangle', 0.14);
    this.noise(0.09, 0.10, 1100, 1.3);
  }

  playCloneBurst(element: number) {
    if (!this.gate('burst', 55)) return;
    const pitch = [460, 600, 280, 820, 240, 180][element % 6] ?? 400;
    this.tone(pitch, pitch * 0.4, 0.15, 'sine', 0.12);
    this.noise(0.14, 0.13, element === 2 ? 640 : 1550, 1.1);
  }

  playHitmarker(isCrit = false) {
    if (!this.gate('hitm', 40)) return;
    if (isCrit) {
      this.tone(1320, 1760, 0.11, 'triangle', 0.15);
      this.tone(1980, 2420, 0.09, 'sine', 0.10, 0.025);
    } else {
      this.tone(920, 680, 0.065, 'triangle', 0.11);
    }
  }

  playBarrelExplode() {
    this.tone(125, 36, 0.48, 'sawtooth', 0.24, 0, 480);
    this.tone(82, 28, 0.55, 'triangle', 0.22);
    this.noise(0.46, 0.30, 460, 0.65, 0, 'lowpass');
    this.noise(0.24, 0.16, 1600, 1.2, 0.04);
  }

  playBellClang() {
    this.tone(880, 868, 0.72, 'sine', 0.18);
    this.tone(1318, 1298, 0.54, 'triangle', 0.11);
    this.tone(2110, 2060, 0.36, 'sine', 0.07);
  }

  playRecallWhoosh() {
    if (!this.gate('recall', 180)) return;
    this.tone(280, 640, 0.20, 'sine', 0.11);
    this.noise(0.18, 0.09, 1300, 1.6);
  }

  playSlash(comboIdx: number, element: number) {
    if (!this.gate('slash', 65)) return;
    const scale = 1 + comboIdx * 0.14;
    const base = [420, 560, 340, 620, 280, 220][element % 6] ?? 400;
    this.noise(0.13 + (comboIdx === 3 ? 0.07 : 0), comboIdx === 3 ? 0.20 : 0.13, 1200 * scale, 1.4);
    this.tone(base * scale, base * 0.55, comboIdx === 3 ? 0.20 : 0.11, comboIdx === 3 ? 'sawtooth' : 'triangle', comboIdx === 3 ? 0.13 : 0.09, 0, 1600);
  }

  playEnemyWindupFlash() {
    if (!this.gate('windup', 140)) return;
    this.tone(1180, 1680, 0.12, 'sine', 0.13);
    this.tone(1760, 1320, 0.10, 'triangle', 0.08, 0.04);
  }

  playPerfectDodge() {
    const ctx = this.ensure();
    if (ctx && this.airGain) {
      const t = ctx.currentTime;
      this.airGain.gain.cancelScheduledValues(t);
      this.airGain.gain.setTargetAtTime(0.012, t, 0.014);
      this.airGain.gain.setTargetAtTime(this.airLevel, t + 0.24, 0.08);
    }
    this.tone(180, 74, 0.28, 'sine', 0.16);
    this.tone(740, 740, 0.28, 'sine', 0.14);
    this.tone(1110, 1110, 0.24, 'triangle', 0.09, 0.055);
    this.tone(1480, 1520, 0.22, 'sine', 0.06, 0.13);
  }

  playPlayerHurt() {
    if (!this.gate('hurt', 110)) return;
    this.tone(175, 78, 0.20, 'sawtooth', 0.18, 0, 620);
    this.noise(0.16, 0.16, 420, 0.9);
  }

  playPoiseBreak() {
    this.tone(620, 140, 0.26, 'sawtooth', 0.17, 0, 1800);
    this.tone(980, 1480, 0.22, 'triangle', 0.14, 0.03);
    this.noise(0.24, 0.20, 2100, 1.1);
  }

  playExecuteSlam() {
    this.tone(140, 42, 0.42, 'sawtooth', 0.24, 0, 650);
    this.tone(520, 1040, 0.24, 'triangle', 0.16, 0.05);
    this.noise(0.32, 0.24, 920, 0.8);
  }

  playWarDrum() {
    this.tone(118, 54, 0.46, 'triangle', 0.26);
    this.tone(178, 86, 0.34, 'sine', 0.14, 0.02);
    this.noise(0.22, 0.14, 340, 0.9, 0, 'lowpass');
  }

  playHealSip() {
    this.tone(440, 660, 0.18, 'sine', 0.13);
    this.tone(660, 880, 0.22, 'triangle', 0.12, 0.09);
  }

  playRankUp(tier: number) {
    const base = 440 + tier * 75;
    this.tone(base, base * 1.25, 0.16, 'triangle', 0.11);
    this.tone(base * 1.5, base * 1.52, 0.20, 'sine', 0.09, 0.07);
  }

  playObjectiveClear() {
    this.tone(523, 659, 0.18, 'triangle', 0.12);
    this.tone(784, 1046, 0.24, 'sine', 0.10, 0.09);
  }
}
