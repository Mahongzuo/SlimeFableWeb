import type {LifeData} from '../life/state';
/** Small DOM pieces for the casual loops, in the same storybook style as game-ui (classes live in ui.css). */
export class LifeUI {
  private root: HTMLElement; private coins: HTMLElement; private fish: HTMLElement;
  constructor() {
    this.root = document.createElement('div'); this.root.id = 'life-ui';
    this.root.innerHTML = `<div class="coins card grain">🐚 <b>0</b><small>贝壳</small></div>
      <div class="fishing card grain hidden"><div class="fish-title">甩竿…</div><div class="fish-meter"><i class="green"></i><i class="needle"></i></div><div class="fish-progress"><i></i></div><div class="fish-help"></div></div>`;
    document.body.appendChild(this.root);
    this.coins = this.root.querySelector('.coins b')!; this.fish = this.root.querySelector('.fishing')!;
  }
  show(on: boolean) { this.root.classList.toggle('hidden', !on); }
  refresh(life: LifeData) { const t = String(life.coins); if (this.coins.textContent !== t) { this.coins.textContent = t; this.coins.parentElement!.classList.remove('bump'); void (this.coins.parentElement as HTMLElement).offsetWidth; this.coins.parentElement!.classList.add('bump'); } }
  fishing(state: {title: string; help: string; tension?: number; progress?: number; green?: [number, number]; alarm?: boolean} | null) {
    this.fish.classList.toggle('hidden', !state); if (!state) return;
    (this.fish.querySelector('.fish-title') as HTMLElement).textContent = state.title;
    (this.fish.querySelector('.fish-help') as HTMLElement).innerHTML = state.help;
    const meter = this.fish.querySelector('.fish-meter') as HTMLElement, reel = state.tension !== undefined;
    meter.style.visibility = reel ? 'visible' : 'hidden'; (this.fish.querySelector('.fish-progress') as HTMLElement).style.visibility = reel ? 'visible' : 'hidden';
    if (!reel) return;
    const g = state.green ?? [.25, .8], green = meter.querySelector('.green') as HTMLElement;
    green.style.left = g[0] * 100 + '%'; green.style.width = (g[1] - g[0]) * 100 + '%';
    (meter.querySelector('.needle') as HTMLElement).style.left = Math.min(100, state.tension! * 100) + '%';
    meter.classList.toggle('alarm', !!state.alarm);
    (this.fish.querySelector('.fish-progress i') as HTMLElement).style.width = Math.min(100, (state.progress ?? 0) * 100) + '%';
  }
}
