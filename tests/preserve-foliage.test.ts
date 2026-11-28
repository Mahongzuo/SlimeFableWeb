import test from 'node:test';
import assert from 'node:assert/strict';
import {preserveRects,preserveHeight,preserveDefs} from '../src/world/expansion';
import {habitats,preserveCover,bloomSuitability} from '../src/home/foliage/preserve-habitat';
import {trailX} from '../src/home/preserve-trails';
import {readFileSync} from 'node:fs';

test('native preserve cover leaves paths, allotments and deep water clear, with connected habitat on dry ground',()=>{
  const rects=preserveRects([]).filter(r=>r.biome!=='trail');
  assert.equal(rects.length,5);
  for(const r of rects){
    const cx=(r.minX+r.maxX)/2,cz=(r.minZ+r.maxZ)/2;
    assert.equal(preserveCover(r,trailX(r,cz+5),cz+5),0);
    for(const dx of [-11,11])assert.equal(preserveCover(r,cx+dx,r.minZ+8),0);
    let covered=0;
    for(let z=r.minZ+1;z<r.maxZ;z++)for(let x=r.minX+1;x<r.maxX;x++){
      const cover=preserveCover(r,x,z),suitability=bloomSuitability(r,x,z);
      assert.ok(cover>=0&&cover<=1&&suitability>=0&&suitability<=1);
      if((r.biome==='marsh'||r.biome==='bamboo')&&preserveHeight(r,x,z)<.14)assert.equal(cover,0);
      if(cover>.4)covered++;
    }
    assert.ok(covered>(r.maxX-r.minX)*(r.maxZ-r.minZ)*.22,r.biome);
  }
  assert.equal(new Set(rects.map(r=>habitats[r.biome].bloom.join('+'))).size,5);
});
test('all wild residents and streamed canopy species have a standing, calibrated far representation',()=>{
  const entries=JSON.parse(readFileSync('public/models/companions/preserve-impostors.json','utf8'));
  const names=[...preserveDefs.flatMap(r=>[...r.animals]),'redwood-tree','nature-bamboo','nature-willow'];
  assert.equal(new Set(names.map(id=>entries[id].row)).size,names.length);
  for(const name of names)assert.ok(entries[name].span>0&&entries[name].center>0,name);
});
