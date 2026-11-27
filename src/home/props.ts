import type {DailySpot} from '../game/home-rewards';
import {Vec, distance} from '../slime/types';
import {plazaCenter, ShardSpot} from './layout';
/** The lectern holding the history book, plus the stone ring that ties the six doors together. */
export class Lectern {
  readonly position: Vec = [...plazaCenter]; private glyph: any; private book: any;
  constructor(ctx: any) {
    const T = ctx.THREE, toon = ctx.mats.toon, g = new T.Group(); g.name = 'history-lectern'; g.userData.skipHeightBake = true;
    g.position.fromArray(plazaCenter); g.rotation.y = -Math.PI / 2; // book faces west, towards arrivals
    const stone = toon(0xe9e0cc), dark = toon(0xb9ad97);
    const base = new T.Mesh(new T.CylinderGeometry(.42, .55, .16, 24), dark); base.position.y = .08; g.add(base);
    const stem = new T.Mesh(new T.CylinderGeometry(.2, .28, .78, 16), stone); stem.position.y = .55; g.add(stem);
    const desk = new T.Mesh(new T.BoxGeometry(1.08, .08, .78), dark); desk.position.y = 1.0; desk.rotation.x = .32; g.add(desk);
    this.book = new T.Group(); this.book.position.set(0, 1.07, .02); this.book.rotation.x = .32; g.add(this.book);
    const cover = new T.Mesh(new T.BoxGeometry(.96, .03, .66), toon(0x8f3b2e)); this.book.add(cover);
    for (const side of [-1, 1]) { const page = new T.Mesh(new T.BoxGeometry(.44, .035, .6), toon(0xf7f1e3)); page.position.set(side * .235, .03, 0); page.rotation.z = side * -.07; this.book.add(page); }
    this.glyph = ctx.mats.glowSprite(0xf2c14e, 1.1, .55); this.glyph.position.y = 1.65; g.add(this.glyph);
    ctx.scene.add(g);

  }
  update(t: number) { this.glyph.position.y = 1.65 + Math.sin(t * 2) * .05; this.glyph.material.opacity = .45 + Math.sin(t * 3) * .1; }
}
interface Shard {spot: ShardSpot; group: any; base: number; taken: boolean; fade: number}
/** Twelve collectible time shards hidden around the harbour; ids persist in the save. */
export class Shards {
  readonly list: Shard[] = []; onCollect?: (spot: ShardSpot, count: number) => void;
  private geo:any;private mat:any;
  constructor(private ctx:any){
    this.geo=new ctx.THREE.OctahedronGeometry(.17,0);
    this.mat=ctx.mats.toon(0xf2c14e,{emissive:0xf2a33a,emissiveIntensity:.45});
  }
  arrange(spots:DailySpot[],taken:string[]){
    const {ctx}=this;
    for(const item of this.list)item.group.visible=false;
    spots.forEach((spot,i)=>{
      let item=this.list[i];
      if(!item){
        const group=new ctx.THREE.Group(),gem=new ctx.THREE.Mesh(this.geo,this.mat);
        gem.scale.set(1,1.5,1);group.add(gem,ctx.mats.glowSprite(0xf7d77a,1,.5));ctx.scene.add(group);
        item=this.list[i]={group,spot,base:0,taken:false,fade:1};
      }
      item.spot=spot;item.base=spot.y+.58;item.taken=taken.includes(spot.id);item.fade=item.taken?0:1;
      item.group.name='time-shard-'+spot.id;item.group.scale.setScalar(1);
      item.group.position.set(spot.x,item.base,spot.z);item.group.visible=!item.taken;
    });
    for(const unused of this.list.splice(spots.length))unused.group.removeFromParent();
  }
  get count() { return this.list.filter(s => s.taken).length; }
  update(t: number, dt: number, body: Vec) {
    for (const s of this.list) {
      if (s.taken) { if (s.fade > 0) { s.fade = Math.max(0, s.fade - dt * 2.5); s.group.position.y += dt * 2.2; s.group.scale.setScalar(.4 + s.fade); if (!s.fade) s.group.visible = false; } continue; }
      s.group.position.y = s.base + Math.sin(t * 2 + s.spot.x) * .08; s.group.rotation.y = t * 1.4;
      const p: Vec = [s.spot.x, s.group.position.y - .35, s.spot.z];
      if (distance(p, body) < .85) { s.taken = true; this.onCollect?.(s.spot, this.count); }
    }
  }
}
