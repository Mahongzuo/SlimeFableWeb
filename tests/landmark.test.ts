import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import spec from '../content/levels/1116-1974';
import {days} from '../content/registry';
import {levels} from '../content/levels/registry';
import {advanceClimb,generateLandmark,pointOnLeg,validateLandmark} from '../src/templates/landmark';
import {makeBoards,energize,solved,undoContact} from '../src/level/pixel-board';

test('1116 portal opens the registered chapter and carries the archived 1679 bits',()=>{
  assert.equal(days['1116'].chapters[0].status,'web');
  assert.equal(levels[days['1116'].chapters[0].id],spec);
  assert.equal(spec.board.rows.length,73);
  assert.ok(spec.board.rows.every(row=>/^[01]{23}$/.test(row)));
  assert.equal(createHash('sha256').update(spec.board.rows.join('')).digest('hex'),'24babf56f872fc2c38c940b4a438811be454f04a041fe56b3c239662f261dd66');
});
test('the tower jump is reachable and the cable descends throughout its span',()=>{
  const route=generateLandmark(spec);assert.ok(validateLandmark(route).ok);
  const jump=route.find(v=>v.action==='jump')!;
  assert.ok(pointOnLeg(jump,.5,[0,0,0])[1]>jump.end[1]);
  assert.equal(validateLandmark([{...jump,end:[99,99,99]}]).ok,false);
  const cable=route.at(-1)!;let y=cable.start[1];
  for(let i=1;i<=50;i++){const p=pointOnLeg(cable,i/50,[0,0,0]);assert.ok(p[1]<y);y=p[1];}
  const climber={leg:0,t:0,launched:false};
  advanceClimb(climber,route,'slide',1);assert.equal(climber.t,0);
  for(let i=0;i<40*60&&climber.leg<route.length;i++)advanceClimb(climber,route,route[climber.leg].action,1/60);
  assert.equal(climber.leg,route.length);
});
test('40 seeds populate solvable contacts across all five panels; undo preserves accuracy history',()=>{
  for(let i=0;i<40;i++){
    const panels=makeBoards(spec.board,'trial'+i);
    assert.equal(panels.map(p=>p.bits).join(''),spec.board.rows.join(''));
    for(const panel of panels){
      const zero=panel.bits.indexOf('0');
      energize(panel,zero,false);assert.equal(panel.history.length,0);
      energize(panel,zero,true);assert.equal(panel.mistakes,1);
      for(const bit of panel.missing){assert.equal(panel.bits[bit],'1');energize(panel,bit,true);}
      assert.equal(solved(panel),false);
      while(panel.history.length)undoContact(panel);
      assert.equal(panel.mistakes,1);
      for(const bit of panel.missing)energize(panel,bit,true);
      assert.ok(solved(panel));
    }
  }
});
