export const DOCK = {x: -11.1, z: 8};
export const voyageHelp = [
  [
    '离港准备',
    '在临水书埠西南的柳岸钓台上，点「启航」或按 H。从深水按 F 也能召船。每趟配 12 发，码头每 6 贝壳加购 6 发，最多加购 24 发。',
  ],
  [
    '驾驶与遇敌',
    '按住 W 前进、S 倒航，松开收帆。A / D 转舵；触屏用前进、倒航和左右舵。每向外探索 300–2,000 米，野兔会指出陌生船帆。原路返航安全。',
  ],
  [
    '左右舷开炮',
    '转动船身，让目标进入左舷或右舷的 58 米射界。对应按钮显示「可命中」时按 Q 或 E；每炮消耗 1 发，小熊猫装填约 1.7 秒。敌方瞄准时驶离橙色落点。弹尽可满帆拉开 100 米脱离。',
  ],
  [
    '停船、海钓与登岛',
    '和平时按 F 抛竿，咬钩时按 F 或点提竿，随后按住或松开收线。按 C 入水，空格上浮，C / Shift 下潜。也可空格离船，游上浅滩；靠近原船按 F 或点「登梯」。鱼获立即入包。',
  ],
  [
    '带货箱回家',
    '战胜敌船可再向外探索，也可循返港指引驶回家园近海，点「靠港结算」。只有这一步才把货箱换成贝壳。战败撤回柳岸钓台，已入包的鱼保留，本趟货箱和余弹损失。登岛与钓鱼都可自由选择。',
  ],
];
export class VoyageControls {
  readonly el = document.createElement('section');
  private info = document.createElement('span');
  private buttons = new Map<string, HTMLButtonElement>();
  private row = document.createElement('div');
  private guide = document.createElement('div');
  helpOpen = false;
  private releasingLock = false;
  private unlock = () => {
    if (this.releasingLock && !document.pointerLockElement) {
      this.releasingLock = false;
    }
  };
  private onLockChange = (event: Event) => {
    if (this.releasingLock && !document.pointerLockElement) {
      event.stopImmediatePropagation();
      this.unlock();
    }
  };
  constructor(
    private action: (id: string) => void,
    private hold: (id: string, down: boolean) => void,
  ) {
    document.addEventListener('pointerlockchange', this.onLockChange, true);
    this.el.className = 'voyage-controls';
    this.el.hidden = true;
    this.el.setAttribute('aria-label', '史莱姆号航海');
    this.info.className = 'voyage-readout';
    this.row.className = 'voyage-actions';
    this.el.append(this.info, this.row, this.guide);
    document.body.append(this.el);
    this.guide.className = 'voyage-guide';
    this.guide.hidden = true;
    this.guide.innerHTML =
      '<h2>史莱姆号航海手册</h2>' +
      voyageHelp.map(([h, p]) => '<h3>' + h + '</h3><p>' + p + '</p>').join('') +
      '<button type="button">返回航次 · F1</button>';
    this.guide.querySelector('button')!.onclick = () => this.toggleHelp();
    for (const [id, title] of Object.entries({
      buy: '补给 6 发 · 6 贝壳 P',
      launch: '启航 H',
      summon: '登船 F',
      KeyW: '前进',
      KeyS: '倒航',
      KeyA: '左舵',
      KeyD: '右舵',
      port: '左舷 Q',
      starboard: '右舷 E',
      fish: '垂钓 F',
      dive: '潜水 C',
      leave: '离船',
      land: '靠港结算 H',
      hook: '提竿 / 收线',
      cancel: '收竿',
      Space: '上浮',
      KeyC: '下潜',
      board: '登梯 F',
      surface: '浮出',
      help: 'F1 帮助',
    })) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.voyage = id;
      btn.textContent = title;
      this.row.append(btn);
      this.buttons.set(id, btn);
      if (id.startsWith('Key') || id === 'Space' || id === 'hook') {
        btn.onpointerdown = (e) => {
          e.preventDefault();
          btn.setPointerCapture(e.pointerId);
          this.hold(id, true);
        };
        btn.onlostpointercapture = () => this.hold(id, false);
        btn.onpointerup = btn.onpointercancel = () => this.hold(id, false);
        btn.onclick = (e) => {
          if (e.detail === 0) {
            this.hold(id, true);
            this.hold(id, false);
          }
        };
      } else btn.onclick = () => (id === 'help' ? this.toggleHelp() : this.action(id));
    }
  }
  toggleHelp() {
    if (this.el.hidden) return;
    this.helpOpen = !this.helpOpen;
    this.guide.hidden = !this.helpOpen;
    this.row.hidden = this.helpOpen;
    if (this.helpOpen) {
      this.hold('clear', false);
      this.guide.scrollTop = 0;
      this.guide.querySelector('button')!.focus({preventScroll: true});
    }
  }
  show(info: string, ids: string[], port = '', starboard = '') {
    if (document.pointerLockElement && !this.releasingLock) {
      this.releasingLock = true;
      document.exitPointerLock();
    }
    this.el.hidden = false;
    if (this.info.textContent !== info) this.info.textContent = info;
    for (const [id, b] of this.buttons) b.hidden = id !== 'help' && !ids.includes(id);
    for (const [id, txt] of [
      ['port', port],
      ['starboard', starboard],
    ])
      if (txt) {
        const b = this.buttons.get(id)!;
        b.textContent = txt;
        b.classList.toggle('ready', txt.includes('可命中'));
      }
  }
  hide() {
    this.el.hidden = true;
    this.helpOpen = false;
    this.guide.hidden = true;
    this.row.hidden = false;
  }
  dispose() {
    document.removeEventListener('pointerlockchange', this.onLockChange, true);
    this.el.remove();
  }
}
