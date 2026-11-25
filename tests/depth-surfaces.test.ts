import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {atlasLevels} from '../content/atlas';
import {abilityLevels} from '../content/ability';
import {atlasCourse,freshRun} from '../src/templates/atlas';
import {abilityLayout} from '../src/templates/ability';
import {generateLayout} from '../src/templates/mode-world';
import {buildAtlas} from '../src/themes/atlas';
import {workshopArt} from '../src/themes/ability';
import {buildModeWorld} from '../src/themes/mode-world';
import {buildModeLandmark} from '../src/themes/mode-landmarks';
import {chronicleLevels} from '../content/chronicle';
import {generateChronicle} from '../src/templates/chronicle';
import {buildChronicleScene} from '../src/themes/chronicle';
import type {Stage} from '../src/level/stage';

type Vec=[number,number,number];
const stage=()=>({scene:new T.Scene()} as Stage);

// Raycast the actual generated instances. Two front-facing meshes answering at the same
// depth indicate a visible duplicate; triangles sharing a mesh edge count as one surface.
function checkFace(s:Stage,from:Vec,at:Vec,label:string,tolerance=.004){
  s.scene.updateMatrixWorld(true);
  const eye=new T.Vector3(...from),point=new T.Vector3(...at),dir=point.clone().sub(eye).normalize();
  const objects:any[]=[];
  s.scene.traverseVisible((obj:any)=>{if(obj.isMesh)objects.push(obj);});
  const hits=new T.Raycaster(eye,dir).intersectObjects(objects,false);
  assert.ok(hits.length,label+' missed the modeled surface');
  assert.ok(hits[0].point.distanceTo(point)<tolerance,label+' blocked at '+hits[0].point.toArray());
  const front=hits.filter((h:any)=>h.distance-hits[0].distance<.0001);
  const surfaces=new Set(front.map((h:any)=>h.object.uuid+' / '+h.instanceId));
  assert.equal(surfaces.size,1,label+' has duplicate visible faces');
}

test('ink court banks, bridges and scroll stay single-faced from above and at a grazing angle',()=>{
  const s=stage(), l=generateLayout('0101','depth-inspection');
  const canvas=()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})});
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:canvas}});
  try{
    buildModeWorld(s,l,'trial','depth-inspection');
    for(const x of [-1.525,1.525])for(const z of [-5.17,4.53]){
      const at:Vec=[x,0,z];
      checkFace(s,[x,4,z],at,'bank overhead');
      checkFace(s,[x+.03,.85,z+1.5],at,'bank oblique');
    }
    const bridge=l.world.boxes[0],z=(bridge.max[2]+bridge.min[2])/2+.19;
    checkFace(s,[.62,2,z],[.62,bridge.max[1],z],'bridge cap');
    // The ink scroll has one textured face, independent of the mode using this landmark.
    const scroll=stage();buildModeLandmark(scroll,'0101',[0,0,0]);
    checkFace(scroll,[.21,2.47,2],[.21,2.47,-.17],'scroll front');
    checkFace(scroll,[2.45,2.83,2],[.21,2.47,-.17],'scroll side');
  }finally{
    if(previous) Object.defineProperty(globalThis,'document',previous);
    else Reflect.deleteProperty(globalThis,'document');
  }
});

test('January 1 history workshops have clean deck sides and distinct gate joints',()=>{
  const ability=abilityLevels.find(v=>v.id==='0101-1823')!,workshop=stage();
  workshopArt(workshop,ability,abilityLayout(ability));
  checkFace(workshop,[8,-.075,1.23],[5,-.075,1.23],'stone side wall');
  checkFace(workshop,[7,.36,2.4],[5,-.075,1.23],'stone side wall at an angle');
  const spec=atlasLevels.find(v=>v.id==='0101-1864')!,s=stage(),c=atlasCourse(spec),run=freshRun();
  const art=buildAtlas(s,spec,c);art.paint(run,0,0);
  const gate=c.gates.find(g=>g.sign==='fold'||g.sign==='leap')!;
  const h=gate.sign==='fold'?.86:.34;
  // Probe where the upright and crossbar used to have identical front faces.
  const g=s.scene.children.find((child:any)=>child.isGroup&&Math.abs(child.position.z+gate.distance)<.001);
  assert.ok(g);
  const at:Vec=[g.position.x+.91,h-.025,-gate.distance+.11];
  checkFace(s,[at[0],at[1],at[2]+.45],at,'gate front');
  checkFace(s,[at[0]+.29,at[1]-.009,at[2]+.40],at,'gate side');
});

test('chronicle procedural themes keep single-faced ground seams and plinth tops from overhead and oblique angles',()=>{
  for(const spec of chronicleLevels){
    const s=stage(), layout=generateChronicle(spec);
    buildChronicleScene(s,spec,layout);
    const fin=layout.finish.pos;
    // Check finish plinth top (y = 0.36) from overhead & grazing oblique
    checkFace(s,[fin[0]+.4,fin[1]+4,fin[2]+.3],[fin[0]+.4,fin[1],fin[2]+.3],spec.id+' plinth overhead');
    checkFace(s,[fin[0]+1.8,fin[1]+1.1,fin[2]+2.4],[fin[0]+.4,fin[1],fin[2]+.3],spec.id+' plinth oblique');
    // Check spawn ground surface from overhead & grazing oblique
    const sp=layout.spawn;
    const spGround=spec.mode==='glide'?5.4:0;
    checkFace(s,[sp[0]+.6,spGround+4,sp[2]-.4],[sp[0]+.6,spGround,sp[2]-.4],spec.id+' spawn overhead');
    checkFace(s,[sp[0]+1.9,spGround+1.1,sp[2]+1.5],[sp[0]+.6,spGround,sp[2]-.4],spec.id+' spawn oblique');
  }
});
