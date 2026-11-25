import assert from 'node:assert/strict';
import test from 'node:test';
import {FaceDirector,type Mood} from '../src/slime/face';

test('each expression has a distinct finite pose, including fishing surprise and glide',()=>{
  const moods:Mood[]=['Idle','Move','Jump','Glide','Attack','Hurt','Happy','Spit','Focus','Squash','Bliss','Sleep','Wicked','Surprised'];
  const seen=new Set<string>();
  for(const mood of moods){
    const face=new FaceDirector();
    face.pulse(mood,2,70);
    for(let i=0;i<60;i++)face.update(1/60,[0,0,0],true,false,false);
    assert.equal(face.mood,mood);
    const channels=Object.values(face.pose);
    assert.ok(channels.every(Number.isFinite));
    seen.add(channels.map(v=>v.toFixed(3)).join(','));
  }
  assert.equal(seen.size,moods.length);
});

test('airborne, glide and landing expressions blend and honour higher priority interactions',()=>{
  const f=new FaceDirector(),once=(grounded:boolean,glide=false)=>f.update(1/60,[0,0,0],grounded,false,false,glide);
  const rest=f.pose.eyeOpen;once(false);assert.equal(f.mood,'Jump');assert.ok(f.pose.eyeOpen>rest);
  once(false,true);assert.equal(f.mood,'Glide');assert.ok(f.pose.smile>.085 && f.pose.smile<.13);
  f.pulse('Hurt',.35,75);f.pulse('Happy',.2,45);once(true);assert.equal(f.mood,'Hurt');
  for(let i=0;i<30;i++)once(true);assert.equal(f.mood,'Idle');
  for(let i=0;i<610;i++)once(true);assert.equal(f.mood,'Sleep');
  f.reset();assert.equal(f.mood,'Idle');assert.equal(f.pose.eyeOpen,rest);assert.equal(f.blink,0);
});
