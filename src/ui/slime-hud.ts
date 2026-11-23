import './slime-hud.css';
import type {SlimeCharacter} from '../slime/character';
import {elements} from '../slime/elements';
import type {SkillSlot} from '../slime/skills';

interface HudFeatures {
  elements: boolean;
  skills: boolean;
  health?: boolean;
}

export function mountSlimeHud(
  actor: SlimeCharacter,
  features: HudFeatures = {elements: true, skills: true},
  parent: HTMLElement = document.body,
) {
  const root = document.createElement('div');
  root.className = 'slime-hud';
  root.hidden = true;
  const health = features.health ? '<label class="health-meter card">生命 <span></span><progress aria-label="生命值"></progress></label>' : '';
  const jewels = features.elements ? `<div class="elements card" role="group" aria-label="切换元素">${elements.map((e, i) =>
    `<button class="el" data-el="${i}" style="--c:${e.color}" aria-label="${e.name}属性"><kbd>${i+1}</kbd><i></i><span>${e.name}</span><em class="el-cd"></em></button>`
  ).join('')}</div>` : '';
  const skills = features.skills ? `<div class="skills-dock card" id="skills-dock"><div class="sk-role" id="sk-role"></div>
    <div class="sk-row">${(['E','R','Q'] as const).map(slot =>
      `<button class="sk-btn${slot==='Q'?' sk-ult':''}" data-skill="${slot}">${slot==='Q'?'<span class="sk-ring"></span>':''}<span class="sk-key">${slot}</span><b class="sk-ico"></b><span class="sk-name"></span><em class="sk-cd"></em></button>`
    ).join('')}</div></div>` : '';
  root.innerHTML = `<div class="element-stack">${health}${jewels}</div>${skills}`;
  parent.appendChild(root);

  const elementButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('.el'), button =>
    ({button, mask:button.querySelector<HTMLElement>('.el-cd')!}));
  const skillButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('.sk-btn'), button => ({
    button, icon:button.querySelector('b')!, name:button.querySelector('.sk-name')!,
    mask:button.querySelector<HTMLElement>('.sk-cd')!,
  }));
  const role = root.querySelector('.sk-role');
  const healthBar = root.querySelector('progress');
  const healthText = root.querySelector('.health-meter span');
  root.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button || root.hidden || actor.mode !== 'play') return;
    if (button.dataset.el !== undefined) actor.setElement(Number(button.dataset.el));
    else if (button.dataset.skill) actor.castSkill(button.dataset.skill as SkillSlot);
    nextRefresh = 0;
  });
  let nextRefresh = 0;
  function update(visible: boolean, hp?: {current:number; max:number}) {
    root.hidden = !visible;
    if (!visible) { nextRefresh = 0; return; }
    const now = performance.now();
    if (now < nextRefresh) return;
    nextRefresh = now + 45;
    const state = actor.getCombatHudState();
    const element = elements[state.element];
    root.style.setProperty('--accent',element.color);
    if (hp && healthBar && healthText) {
      healthBar.max = hp.max;
      healthBar.value = hp.current;
      healthText.textContent = Math.ceil(Math.max(0,hp.current)) + ' / ' + hp.max;
    }
    elementButtons.forEach(({button,mask}, index) => {
      const active = index === state.element;
      const cooling = !active && state.switchCd > 0.01;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
      button.classList.toggle('cooling',cooling);
      mask.style.setProperty('--cd-pct', cooling ? Math.round(100*state.switchCd/state.switchMax)+'%' : '0%');
      mask.textContent = cooling ? state.switchCd.toFixed(1) : '';
    });
    if (role) role.textContent = element.icon+' '+element.name+' · '+state.role;
    for (const {button,icon,name,mask} of skillButtons) {
      const skill = state.skills.find(s => s.slot === button.dataset.skill)!;
      const cooling = skill.cd > 0.05;
      button.title = skill.name+'（'+skill.slot+'） · 冷却 '+skill.maxCd+' 秒'+(skill.energyCost?' · 能量 '+skill.energyCost:'');
      icon.textContent = skill.icon;
      name.textContent = skill.shortName;
      button.classList.toggle('cooling',cooling);
      button.classList.toggle('ready',skill.ready);
      button.classList.toggle('ult-full',skill.slot === 'Q' && skill.ready);
      if (skill.slot === 'Q') button.style.setProperty('--energy', Math.round(100*state.energy/state.maxEnergy)+'%');
      mask.style.setProperty('--cd-pct', cooling ? Math.round(100*skill.cd/skill.maxCd)+'%' : '0%');
      mask.textContent = cooling ? (skill.cd >= 10 ? String(Math.ceil(skill.cd)) : skill.cd.toFixed(1)) : '';
    }
  }
  return {update, dispose: () => root.remove()};
}
