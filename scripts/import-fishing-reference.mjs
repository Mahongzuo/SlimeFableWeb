// Regenerate the companion and original species metadata from the local fishing-3d distribution.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {transformSync} from 'esbuild';
const folder = process.argv[2] || '../Gamedemo/fishing-3d/assets';
const source = fs.readFileSync(path.join(folder,fs.readdirSync(folder).find(f=>f.endsWith('.js'))),'utf8');
const start = source.indexOf('const Tu=3.2;function vi(');
const endToken = 'this.pendingWaveImpulses.length=0}}';
const end = source.indexOf(endToken,source.indexOf('dispose(){',source.indexOf('class S2{',start)));
if(start<0 || end<0) throw Error('Companion module has changed');
const adapter = `import {Vector3 as R,Color as X,Matrix4 as xe,Euler as Si,Quaternion as Mi,SphereGeometry as ne,CylinderGeometry as ve,BufferGeometry as Ee,Float32BufferAttribute as Zt,Mesh as $t,Object3D as Ae,Group as Ie,InstancedMesh as ze,MeshStandardMaterial as ce,DynamicDrawUsage as ae} from 'three';
const Zi=1e8, Le=[];
function _(object,key,value){object[key]=value}
`;
const code=adapter+source.slice(start,end+endToken.length)+'\nexport {S2 as OtterCompanion};';
fs.writeFileSync('src/home/fishing-reference.js','// Fishing-3D companion. Regenerate using scripts/import-fishing-reference.mjs.\n'+transformSync(code,{format:'esm',target:'es2022'}).code);
const data=source.slice(source.indexOf('const di=')+9,source.indexOf(',Gs=',source.indexOf('const di=')));
fs.writeFileSync('src/life/fish-reference.ts','// Species definitions from fishing-3d.\nexport const referenceFish = '+JSON.stringify(Object.values(vm.runInNewContext('('+data+')',Object.create(null))),null,2)+';\n');
