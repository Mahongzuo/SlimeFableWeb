import {Vec} from '../slime/types';
import {elements} from '../slime/elements';
/** Splash droplets, expanding rings and a soft wake for the floating slime. Pooled; no allocations per frame. */
interface Drop {sprite: any; v: Vec; life: number}
interface Ring {mesh: any; life: number; max: number; grow: number}
export class SeaFX {
  private drops: Drop[] = []; private rings: Ring[] = []; private wakeTimer = 0; private steamTimer = 0; private T: any;
  constructor(private ctx: any) {
    const T = this.T = ctx.THREE;
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30); grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.6, 'rgba(235,248,248,.85)'); grad.addColorStop(1, 'rgba(235,248,248,0)'); g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    const map = new T.CanvasTexture(c);
    for (let i = 0; i < 90; i++) { const s = new T.Sprite(new T.SpriteMaterial({map, transparent: true, depthWrite: false, color: 0xffffff})); s.visible = false; s.layers.set(1); s.renderOrder = 11; ctx.scene.add(s); this.drops.push({sprite: s, v: [0, 0, 0], life: 0}); }
    const ringGeo = new T.RingGeometry(.82, 1, 48);
    for (let i = 0; i < 18; i++) { const m = new T.Mesh(ringGeo, new T.MeshBasicMaterial({color: 0xffffff, transparent: true, depthWrite: false, side: T.DoubleSide})); m.rotation.x = -Math.PI / 2; m.visible = false; m.layers.set(1); m.renderOrder = 4; ctx.scene.add(m); this.rings.push({mesh: m, life: 0, max: 1, grow: 1}); }
  }
  private ring(p: Vec, size: number, life: number, opacity = .7) {
    const r = this.rings.find(r => r.life <= 0) ?? this.rings[0];
    r.life = r.max = life; r.grow = size; r.mesh.visible = true; r.mesh.position.set(p[0], p[1], p[2]); r.mesh.scale.setScalar(.2); r.mesh.material.opacity = opacity; r.mesh.userData.opacity = opacity;
  }
  private drop(p: Vec, v: Vec, size: number, color = 0xffffff, life = .9) {
    const d = this.drops.find(d => d.life <= 0) ?? this.drops[0];
    d.life = life; d.v = v; d.sprite.visible = true; d.sprite.position.set(p[0], p[1], p[2]); d.sprite.scale.setScalar(size); d.sprite.material.color.set(color); d.sprite.material.opacity = 1;
  }
  splash(p: Vec, speed: number) {
    const y = this.ctx.groundY(p[0], p[2]) + .02, n = Math.min(42, 10 + Math.round(speed * 5));
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, out = .8 + Math.random() * 1.8, up = 1.6 + Math.random() * speed * .55; this.drop([p[0] + Math.cos(a) * .3, y + .1, p[2] + Math.sin(a) * .3], [Math.cos(a) * out, up, Math.sin(a) * out], .1 + Math.random() * .14); }
    this.ring([p[0], y, p[2]], 1.2 + speed * .22, 1.1, .85); this.ring([p[0], y, p[2]], .7 + speed * .12, .75, .6);
  }
  update(dt: number, slime: any) {
    const p = slime.position as Vec, moving = Math.hypot(slime.velocity[0], slime.velocity[2]);
    if (slime.swimming) {
      const y = this.ctx.groundY(p[0], p[2]) + .02;
      this.wakeTimer -= dt;
      if (this.wakeTimer <= 0) { this.wakeTimer = moving > .4 ? .22 : .9; this.ring([p[0] - slime.forward[0] * .25, y, p[2] - slime.forward[2] * .25], moving > .4 ? .9 : .65, moving > .4 ? 1.3 : 1.8, moving > .4 ? .5 : .32); }
      if (moving > 2) for (let i = 0; i < 2; i++) this.drop([p[0] + (Math.random() - .5) * .4, y + .05, p[2] + (Math.random() - .5) * .4], [-slime.velocity[0] * .15 + (Math.random() - .5), .9 + Math.random() * .8, -slime.velocity[2] * .15 + (Math.random() - .5)], .07 + Math.random() * .06, 0xffffff, .5);
      if (slime.element === 2) { this.steamTimer -= dt; if (this.steamTimer <= 0) { this.steamTimer = .07; this.drop([p[0] + (Math.random() - .5) * .5, y + .25, p[2] + (Math.random() - .5) * .5], [(Math.random() - .5) * .3, .7 + Math.random() * .5, (Math.random() - .5) * .3], .3 + Math.random() * .25, 0xe8e4dc, 1.4); } }
    }
    for (const d of this.drops) { if (d.life <= 0) continue; d.life -= dt; d.v[1] -= (d.sprite.scale.x > .25 ? 0 : 9.8) * dt; d.sprite.position.x += d.v[0] * dt; d.sprite.position.y += d.v[1] * dt; d.sprite.position.z += d.v[2] * dt; d.sprite.material.opacity = Math.min(1, d.life * 2.2); if (d.sprite.scale.x > .25) d.sprite.scale.multiplyScalar(1 + dt * .8); if (d.life <= 0 || d.sprite.position.y < -2.6) { d.life = 0; d.sprite.visible = false; } }
    for (const r of this.rings) { if (r.life <= 0) continue; r.life -= dt; const k = 1 - r.life / r.max; r.mesh.scale.setScalar(.2 + k * r.grow); r.mesh.position.y = this.ctx.groundY(r.mesh.position.x, r.mesh.position.z) + .02; r.mesh.material.opacity = r.mesh.userData.opacity * (1 - k) * (1 - k); if (r.life <= 0) r.mesh.visible = false; }
  }
  static tint(element: number) { return elements[element].color; }
}
