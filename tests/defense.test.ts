import assert from 'node:assert/strict';
import test from 'node:test';
import {DefenseGame,DEFENSE_CARDS, type DefenseEnemy,type EnemyKind,type TowerKind} from '../src/templates/defense.ts';

const control=['water','thunder','wind','dark'] as const;
const barricade=['physical','wind','fire','dark'] as const;
export type DefenseStrategy='control'|'barricade';
export const defenseLoadouts={control,barricade};

/** Uses only information the player sees: incoming lane, live monsters and tiles.
 * One producer funds five main defenders; once each lane has one, add support. */
export function defend(game:DefenseGame,style:DefenseStrategy){
  if(game.phase==='setup')game.start(defenseLoadouts[style]);
  if(!['wave','interval'].includes(game.phase))return;
  const main:TowerKind=style==='control'?'water':'physical',front=style==='control'?2:6;
  const has=(lane:number,col:number)=>game.towers.some(t=>t.lane===lane&&t.col===col);
  if(!has(2,0)&&game.wave<=2)game.plant(2,0,'dew');
  const urgency=(lane:number)=>game.enemies.filter(e=>e.lane===lane).reduce((s,e)=>s+13-e.x,0)
    +(game.upcoming?.lane===lane?4:0);
  const lanes=[2,1,3,0,4].sort((a,b)=>urgency(b)-urgency(a));
  for(const lane of lanes)if(!has(lane,front)){
    if(game.plant(lane,front,main))continue;
    if(game.dew<DEFENSE_CARDS[main].cost)return;
  }
  if(game.towers.filter(t=>t.kind===main).length<5)return;
  if(!has(4,0))game.plant(4,0,'dew');
  const rows:{col:number;kinds:readonly TowerKind[]}[]=style==='control'?
    [{col:1,kinds:['dark','thunder','wind','thunder','dark']},{col:3,kinds:['wind','dark','thunder','wind','wind']},{col:4,kinds:['dark','water','wind','thunder','water']},{col:5,kinds:['thunder','dark','water','dark','thunder']}]:
    [{col:2,kinds:['fire','wind','fire','fire','wind']},{col:3,kinds:['dark','fire','wind','dark','fire']},{col:4,kinds:['fire','dark','wind','fire','fire']}];
  for(const row of rows)for(const lane of lanes)if(!has(lane,row.col)){
    if(!game.plant(lane,row.col,row.kinds[lane])&&game.dew<DEFENSE_CARDS[row.kinds[lane]].cost)return;
  }
}

function simulate(style:DefenseStrategy,seed:string){
  const g=new DefenseGame(seed),played=new Set<TowerKind>(),effects=new Set<string>();
  for(let s=0;s<660;s++){
    defend(g,style);g.tick(.5);
    for(const e of g.effects){if(e.kind==='shot'&&e.element)played.add(e.element);if(e.reaction)effects.add(e.reaction);}
    g.tick(.5);
    if(g.phase==='transmit'||g.phase==='lost')return {g,played,effects};
  }
  throw Error('campaign did not resolve '+seed);
}
for(const style of ['control','barricade'] as const)test(style+' lineup defends the daily and forty practice seeds',()=>{
  let min=999,max=0;
  for(let i=0;i<=40;i++){
    const seed=i===0?'1116-defense-v1':'daily-defense-'+i,{g,played,effects}=simulate(style,seed);
    assert.equal(g.phase,'transmit',JSON.stringify({seed,style,t:g.elapsed,leaks:g.leaks,wave:g.wave,towers:g.towers.length}));
    assert.equal(g.tapes,2);assert.equal(g.leaks,0);
    assert.ok(g.elapsed>=300&&g.elapsed<=420,[seed,style,g.elapsed].join(' '));
    for(const expected of defenseLoadouts[style])assert.ok(played.has(expected),[seed,style,expected].join(' '));
    assert.ok(effects.has(style==='control'?'chain':'push'));
    assert.equal(g.decodedBits,1679);assert.equal(g.decodedRows,73);assert.equal(g.transmit(),true);assert.equal(g.transmit(),false);
    min=Math.min(min,g.elapsed);max=Math.max(max,g.elapsed);
  }
  console.log(style,'duration',Math.round(min),Math.round(max));
});
function isolated(elements:readonly('water'|'fire'|'wind'|'thunder'|'dark'|'physical')[]=control){
  const game=new DefenseGame('mechanics');assert.ok(game.start(elements));return game;
}
function enemy(game:DefenseGame,kind:EnemyKind,lane:number,x:number,hp=160):DefenseEnemy{
  const target:DefenseEnemy={id:10000+game.enemies.length,kind,lane,x,hp,maxHp:hp,speed:.16,shadow:false,split:false,
    slowUntil:0,wetUntil:0,jamAt:20,strikeAt:0};
  game.enemies.push(target);return target;
}
test('first add echoes in wave three and introduce interference with wave six',()=>{
  const game=new DefenseGame('1116-defense-v1'),first=new Map<EnemyKind,number>();
  for(let i=0;i<900;i++){
    defend(game,'control');
    for(const e of game.enemies)if(!first.has(e.kind))first.set(e.kind,game.wave);
    if(game.phase==='transmit')break;
    game.tick(.5);
  }
  assert.deepEqual([...first.entries()],[['noise',1],['echo',3],['detune',6]]);
});

test('draft and plots validate before spending; removed producers stop producing',()=>{
  const g=new DefenseGame('dew');
  assert.equal(g.start(['dark','dark','wind','water']),false);assert.equal(g.start(['fire','water','dark']),false);
  assert.equal(g.plant(2,2,'dew'),false);assert.equal(g.transmit(),false);
  assert.equal(g.upcoming?.lane,2);assert.equal(g.upcoming?.kind,'noise');assert.ok(g.start(control));assert.equal(g.start(control),false);
  assert.equal(g.plant(-1,2,'dew'),false);assert.equal(g.plant(1,8,'dew'),false);assert.equal(g.plant(1,2,'fire'),false);
  assert.equal(g.dew,150);assert.equal(g.plant(1,2,'dew'),true);assert.equal(g.plant(1,2,'water'),false);
  const startBalance=g.dew;g.tick(13.1);
  assert.equal(g.dew,startBalance+14+11);assert.equal(g.remove(1,2),true);assert.equal(g.remove(1,2),false);
  const after=g.dew;g.tick(11);assert.equal(g.dew,after+14);assert.equal(g.transmit(),false);
});

test('water slows and wets a real target, fire consumes the aura and hits its neighbours',()=>{
  const g=isolated(['water','fire','physical','dark']);g.plant(1,1,'water');g.plant(1,2,'fire');
  const target=enemy(g,'noise',1,6.6),near=enemy(g,'noise',1,6.95),far=enemy(g,'noise',2,6.7);
  g.tick(.65);assert.equal(target.hp,target.maxHp-11-33);assert.equal(near.hp,near.maxHp-20);assert.equal(far.hp,far.maxHp);
  assert.ok(target.slowUntil>g.elapsed);assert.equal(target.wetUntil,0);
  assert.ok(g.effects.some(e=>e.reaction==='vaporize'&&e.targetId===target.id));
  const previous=target.x;g.tick(.5);assert.ok(Math.abs(previous-target.x-.16*.55*.5)<1e-6);

});

test('thunder arcs to adjacent rows only, wind pushes light creatures, dark focus increases on the same target',()=>{
  const chain=isolated();chain.plant(2,1,'thunder');
  const a=enemy(chain,'noise',2,7),b=enemy(chain,'noise',3,7.5),c=enemy(chain,'noise',0,7);
  chain.tick(.6);assert.ok(a.hp<a.maxHp&&b.hp<b.maxHp);assert.equal(c.hp,c.maxHp);assert.ok(chain.effects.some(f=>f.reaction==='chain'));
  const wind=isolated();wind.plant(0,1,'wind');const light=enemy(wind,'noise',0,5);wind.tick(.6);assert.ok(light.x>5);
  const heavy=isolated();heavy.plant(0,1,'wind');const jam=enemy(heavy,'detune',0,5);heavy.tick(.6);assert.ok(jam.x<5);
  const dark=isolated();dark.plant(0,1,'dark');const one=enemy(dark,'noise',0,5),two=enemy(dark,'noise',0,6);dark.tick(.6);
  assert.equal(one.maxHp-one.hp,7);dark.tick(1.6);assert.equal(one.maxHp-one.hp,16);
  one.hp=0;dark.tick(1.6);assert.equal(two.maxHp-two.hp,7);
});

test('rock shield arrests movement in reach, takes damage, and frees the lane when removed',()=>{
  const g=isolated(barricade);g.plant(1,4,'physical');const target=enemy(g,'noise',1,4.97);
  g.tick(.7);assert.equal(target.x,4.97);assert.equal(target.hp,target.maxHp-14);
  assert.ok(g.towers[0].hp<g.towers[0].maxHp);g.remove(1,4);g.tick(.2);assert.ok(target.x<4.97);
});

test('echo takes its first hit before producing exactly one non-replicating shadow',()=>{
  const g=isolated();g.plant(2,1,'water');const first=enemy(g,'echo',2,6);
  g.tick(.6);const image=g.enemies.find(e=>e.shadow)!;
  assert.ok(first.split&&image&&image.x>first.x&&image.maxHp<first.maxHp);
  assert.equal(g.enemies.filter(e=>e.shadow).length,1);
  first.hp=0;g.useTape(2);
  assert.ok(image.hp<image.maxHp);assert.equal(g.enemies.filter(e=>e.shadow).length,1);
});

test('detuner silences an actual tower; a tape clears only the selected row and triggers one extra volley',()=>{
  const g=isolated();g.plant(0,2,'water');g.plant(1,2,'dark');
  const jam=enemy(g,'detune',0,4.2);jam.jamAt=0;const other=enemy(g,'detune',1,4.2);other.jamAt=0;
  g.tick(.6);assert.equal(jam.hp,jam.maxHp);assert.ok(g.towers.every(t=>t.jammedUntil>g.elapsed));
  assert.equal(g.useTape(6),false);assert.equal(g.tapes,2);
  assert.ok(g.useTape(0));assert.equal(jam.hp,jam.maxHp-11);assert.equal(other.hp,other.maxHp);
  assert.equal(g.towers[0].jammedUntil,0);assert.ok(g.towers[1].jammedUntil>g.elapsed);
  assert.ok(g.useTape(0));assert.equal(jam.hp,jam.maxHp-22);assert.equal(g.useTape(0),false);assert.equal(g.tapes,0);
});
test('three leaks fail immediately; terminal state cannot accept time, tapes, plants or transmission',()=>{
  const g=isolated();g.tick(200);assert.equal(g.phase,'lost');assert.equal(g.leaks,3);assert.equal(g.integrity,0);
  const t=g.elapsed;g.tick(99);assert.equal(g.elapsed,t);assert.equal(g.useTape(0),false);assert.equal(g.plant(0,0,'dew'),false);assert.equal(g.transmit(),false);
});

test('small variable frame deltas and large ticks produce identical waves and economy',()=>{
  const g=isolated(),h=isolated();g.plant(2,2,'water');h.plant(2,2,'water');
  for(let i=0;i<600;i++)g.tick(1/30);h.tick(20);
  assert.deepEqual([g.enemies,g.dew,g.towers,g.wave,g.elapsed],[h.enemies,h.dew,h.towers,h.wave,h.elapsed]);
});
