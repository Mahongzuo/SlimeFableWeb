import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AnimationClip, AnimationMixer, Group, NumberKeyframeTrack, Object3D} from 'three';
import {makeRanchAnimator, ranchModelUrl} from '../src/home/ranch-models';
import {RANCH_SPECIES} from '../src/life/ranch';
import {HABITAT_SPECIES} from '../src/life/habitat';

test('each saved ranch species has a distinct local model, a matching portrait and working locomotion clips', () => {
  assert.equal(RANCH_SPECIES.length, 33);
  assert.equal(new Set(RANCH_SPECIES.map(s => s.asset)).size, 33);
  for (const sp of RANCH_SPECIES) {
    assert.equal(sp.asset, sp.id);
    const file = readFileSync('public' + ranchModelUrl(sp.asset, 'glb'));
    assert.equal(file.toString('ascii',0,4), 'glTF');
    assert.equal(file.readUInt32LE(8),file.length);
    const gltf = JSON.parse(file.toString('utf8',20,20+file.readUInt32LE(12)));
    assert.match(gltf.asset.copyright,/CC/);
    const names = gltf.animations.map((a: {name: string}) => a.name.toLowerCase());
    assert.ok(names.includes('idle') || names.includes('survey'));
    assert.ok(names.includes('walk'));
    for (const clip of gltf.animations) assert.ok(clip.channels.length > 0);
    if (sp.asset==='ranch-otter' || sp.asset==='ranch-capybara') assert.ok(names.includes('swimidle') && names.includes('swim'));
    if (sp.asset==='ranch-crane' || sp.asset==='ranch-pheasant') assert.ok(names.includes('call'));
    assert.ok(gltf.buffers.every((b: {uri?: string}) => !b.uri));
    assert.ok((gltf.images??[]).every((i: {bufferView?: number}) => typeof i.bufferView === 'number'));
    const png = readFileSync('public' + ranchModelUrl(sp.asset, 'png'));
    if (png.toString('ascii',0,4)==='RIFF') assert.equal(png.toString('ascii',8,12),'WEBP');
    else {assert.equal(png.toString('ascii',1,4),'PNG');assert.ok(png.readUInt32BE(16)>=256);}
    const visitor = HABITAT_SPECIES.find(v=>v.id===sp.id.replace('ranch-','visitor-'));
    if (visitor) assert.equal(visitor.asset,sp.asset);
  }
});

test('pose selection blends locomotion and reactions independently for two animals sharing the clips', () => {
  const clips=['idle','walk','run','gesture','swimIdle'].map((name,index)=>new AnimationClip(name,1,[
    new NumberKeyframeTrack('Joint.position[y]',[0,1],[index,index+.25]),
  ]));
  const make=()=>{
    const root=new Group(), joint=new Object3D();
    joint.name='Joint';root.add(joint);
    const animator=makeRanchAnimator(root,clips,new AnimationMixer(root),.1);
    return {animator,joint};
  };
  const a=make(), b=make();
  a.animator.setPose('run');a.animator.update(.3);b.animator.update(.3);
  assert.ok(a.joint.position.y>2 && b.joint.position.y<1);
  a.animator.setPose('float');a.animator.update(.3);assert.ok(a.joint.position.y>4);
  b.animator.setPose('notice');b.animator.update(1.5);assert.equal(b.joint.position.y,3.25);
  b.animator.setPose('walk');b.animator.update(.3);assert.ok(b.joint.position.y>1 && b.joint.position.y<2);
  assert.ok(a.joint.position.y>4);
});

