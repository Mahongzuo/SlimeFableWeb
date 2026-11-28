import test from 'node:test';
import assert from 'node:assert/strict';
import {freshLife} from '../src/life/state';
import {bindSportSite,sportLand,computeDynamicFrontier} from '../src/world/expansion';
import {disciplines,entrants,settleSport,sportsLog,reward,trainingFactors,type Sport} from '../src/life/sports';
import {SportsMatch} from '../src/home/sports-match';
const rest={dx:0,dz:0,held:false};
function fixture(sport:Sport){
  const pool=entrants(freshLife(),sport),n=sport==='football'?5:sport==='basketball'?3:1;
  const team=pool.slice(0,n);team[0]={...team[0],rating:50,traits:[3,3,3,3,3,3]};
  return new SportsMatch(sport,team,pool.slice(n,n+(sport==='swim'?5:n)),()=>.5);
}
test('first four finishes across sports train, every finish pays; settlement is idempotent',()=>{
  const life=freshLife(),coins=life.coins;let earned=0;
  for(let i=1;i<=20;i++){
    const sport=disciplines[i%5];
    earned+=reward(sport,2);const r=settleSport(life,i,sport,2,'2026-11-01');assert.ok(r);
    assert.equal(settleSport(life,i,sport,2,'2026-11-01'),null);
  }
  assert.equal(life.coins,coins+earned);assert.equal(life.earnedShells,coins+earned);
  assert.equal(sportsLog(life).ability,54);
  for(let d=2;d<=9;d++)for(let i=0;i<4;i++)settleSport(life,sportsLog(life).matches+1,'tennis',1,'d'+d);
  assert.equal(sportsLog(life).ability,86);
  for(let i=0;i<4;i++)assert.equal(settleSport(life,sportsLog(life).matches+1,'swim',6,'d14')?.after,87+i);
  for(let i=0;i<10;i++)settleSport(life,sportsLog(life).matches+1,'football',1,'future'+i);
  assert.equal(sportsLog(life).ability,95);assert.equal(trainingFactors(90).speed,1.12);
});
test('sports parcel is stable for upgraded saves and excludes purchase candidates',()=>{
  const life=freshLife(),tiles=life.home!.expansions;
  tiles.push({id:'exp-e-s',gx:1,gz:0,theme:'jiangnan'} as any);
  const site=bindSportSite(tiles);assert.equal(site,2);const [r]=sportLand(tiles);
  assert.equal(r.minX,71);assert.equal(r.maxX-r.minX,160);
  assert.ok(computeDynamicFrontier(tiles,[80,60],100).every(t=>t.gx<site||t.gx>=site+4||t.gz<0||t.gz>1));
  assert.equal(bindSportSite(tiles,site),site);
});
test('each discipline has a specialist at 89 and enough distinct visitors even without pets',()=>{
  for(const sport of disciplines){
    const pool=entrants(freshLife(),sport);assert.equal(Math.max(...pool.map(a=>a.rating)),89);
    assert.ok(pool.length>=(sport==='football'?9:sport==='swim'?5:2));
  }
});
test('swimmers touch both walls, wait for player and award last place',()=>{
  const m=fixture('swim');for(let i=0;i<3600;i++)m.update(1/60,rest);
  assert.equal(m.rank,0);assert.ok(m.players.slice(1).every(p=>p.finish));
  m.action(0,true,rest);
  for(let i=0;i<1600;i++)m.update(1/60,{...rest,held:true});
  assert.equal(m.players[0].distance,25);m.action(0,true,rest);
  for(let i=0;i<1600&&!m.rank;i++)m.update(1/60,{...rest,held:true});
  assert.equal(m.rank,6);assert.equal(reward('swim',m.rank),3);
});
test('soccer counts whole-ball goals and distinguishes corner and goal kicks',()=>{
  const m=fixture('football');m.waiting=0;
  const cross=(z:number,hitter:number)=>{
    m.owner=-1;m.lastHit=hitter;m.ball={x:52.49,z,y:.2};
    m.flight={from:{x:52.49,z},to:{x:53,z},height:.1,endY:.2,startY:.2,duration:.08,age:0,kind:'shot',hitter,serve:false};
    for(let i=0;i<10&&m.flight;i++)m.update(1/60,rest);
  };
  cross(0,0);assert.equal(m.score[0],1);
  m.waiting=0;cross(8,0);assert.match(m.message,/球门球/);
  m.waiting=0;cross(-8,5);assert.match(m.message,/角球/);
});
test('basketball needs clearance and gives two points for a made shot outside arc',()=>{
  const m=fixture('basketball');m.waiting=0;m.cleared=false;m.action(.9,false,rest);assert.equal(m.flight,null);
  m.players.slice(3).forEach(p=>{p.x=13;p.z=6;});
  m.players[0].x=5.5;m.players[0].z=0;m.cleared=true;m.action(.85,false,rest);
  for(let i=0;i<240&&m.flight;i++)m.update(1/60,rest);
  assert.deepEqual(m.score,[2,0]);
});
test('tennis first serve fault replays, second fault scores; badminton uses one landing',()=>{
  for(const sport of ['tennis','badminton'] as const){
    const m=fixture(sport);m.waiting=0;
    const fault=()=>{m.action(.3,false,rest);assert.ok(m.flight);m.flight!.to.z=30;for(let i=0;i<2000&&m.flight;i++)m.update(1/60,rest);};
    fault();if(sport==='tennis'){assert.deepEqual(m.score,[0,0]);assert.ok(m.fault);m.waiting=0;fault();}
    assert.deepEqual(m.score,[0,1]);
  }
});
