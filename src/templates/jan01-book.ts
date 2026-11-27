import type {Vec} from '../slime/types';
import {rng} from './random';

// 原创立体书机关。种子改变风的相位和压花的位置，不改变装订结构。
export const bookSpawn: Vec = [0, .03, 5.45];
export const bookCheckpoints: Vec[] = [bookSpawn, [0, 1.27, 1], [0, 1.03, -5.9]];
export const leafWidth = 8.4;
export const bridgeX = 2.15;
export const leftX = -2.2;
export const ribbon: Vec = [.8, 1, -8.2];
export interface LeafBlock { name: string; x: number; z: number; width: number; depth: number; top: number }
export const paperBlocks: LeafBlock[] = [
  {name:'front-paper', x:0, z:4.65, width:leafWidth, depth:4.7, top:0},
  {name:'spine', x:0, z:1.15, width:leafWidth, depth:2.3, top:1.24},
  {name:'left-fold', x:leftX, z:-1, width:1.8, depth:2, top:1.05},
  {name:'left-crease', x:leftX, z:-2.8, width:1.8, depth:1.6, top:1.8},
  {name:'left-return', x:leftX, z:-4.4, width:1.8, depth:1.6, top:1.45},
  {name:'endpaper', x:0, z:-7.65, width:leafWidth, depth:4.9, top:1},
];

export function bookLayout(seed: string) {
  const random = rng(seed);
  return {windPhase:random.range(0, Math.PI * 2),
    flowers:[[leftX + random.range(-.25,.25), 1.86, -2.85],
      [bridgeX + random.range(-.2,.2), 2.1, -3.3]] as Vec[]};
}

export function foldAngle(time:number, phase:number) {
  return .07 + .42 * (.5 + .5 * Math.sin(time * 1.5 + phase));
}
export interface Reader {position:Vec; clinging:boolean; gliding:boolean; grounded:boolean}
export class BookRun {
  page = 0;
  climbed = false;
  fallen = 0;
  flowers = 0;
  route: 'fold'|'wind'|null = null;
  press = 0;
  finishTime = 0;
  turning = 0;
  constructor(readonly layout:ReturnType<typeof bookLayout>) {}
  read(player:Reader, dt:number) {
    const [x,y,z] = player.position;
    this.turning = Math.max(0,this.turning-dt);
    if(this.page === 3){ this.finishTime += dt; return; }
    if(y < -1.8){ this.fallen++; this.route=null; this.press=0; return 'recover'; }
    if(this.page === 0) {
      if(player.clinging && Math.abs(z-2.3)<.85) this.climbed=true;
      if(this.climbed && player.grounded && y>1 && z<2.27) {
        this.page=1; this.turning=1; return 'turn';
      }
      return;
    }
    if(this.page === 1) {
      if(Math.abs(x-leftX)<.94 && z < -2.15 && z > -4.9 && y>1.25 && player.grounded) this.route='fold';
      if(Math.abs(x-bridgeX)<1.5 && z<-.8 && z>-5.2 && player.gliding) this.route='wind';
      const flower=this.route==='fold'?0:this.route==='wind'?1:-1;
      if(flower>=0) {
        const p=this.layout.flowers[flower];
        if(Math.hypot(x-p[0],z-p[2])<.86 && Math.abs(y-p[1])<1.65) this.flowers|=1<<flower;
      }
      if(this.route && player.grounded && z< -5.28 && y>.65) {
        this.page=2; this.turning=1; return 'turn';
      }
      return;
    }
    const onRibbon=player.grounded && Math.abs(x-ribbon[0])<.67 && Math.abs(z-ribbon[2])<.95;
    this.press=Math.max(0,Math.min(1,this.press+dt*(onRibbon?1.15:-1.9)));
    if(this.press>=1){this.page=3;return 'finish';}
  }
}
