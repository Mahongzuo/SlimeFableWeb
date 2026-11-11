import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {Stage, StageLook} from '../level/stage';
import type {LanderSpec} from '../../content/levels/types';
import {landerTriangles, horizonTriangles, horizonHeight, terrainHeight, sunlightCenter, type LanderLayout} from '../templates/lander';
import {rng} from '../templates/random';
import type {FlybyLayout, FlybyState} from '../templates/flyby';

/** Shared, texture-free parts for the 1969 / 1970 / 1980 / 2014 space chapters. */
export const spaceLook: StageLook = {skyTop: '#01030b', skyHorizon: '#040914', fog: [180, 450], sun: '#fff1d6', sunIntensity: 3.4, hemiSky: '#344763', hemiGround: '#080a10', ink: '#02040a', wash: '#030611'};
const silver = '#c7d3d9', blue = '#164675', gold = '#b49a67';
function part(stage: Stage, root: any, geometry: any, color: string, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, stage.toon(color)); m.position.set(x, y, z); root.add(m); return m;
}
/** Static parts sharing a material become one draw each; animation stays at the parent pivot. */
function compact(root: any) {
  root.updateMatrixWorld(true);
  const groups = new Map<any, any[]>();
  root.traverse((m: any) => { if (m.isMesh) { const a = groups.get(m.material) ?? []; a.push(m.geometry.clone().applyMatrix4(m.matrixWorld)); groups.set(m.material, a); } });
  root.clear();
  for (const [material, geometries] of groups) {
    const geometry = mergeGeometries(geometries.map(g => g.index ? g.toNonIndexed() : g));
    const m = new THREE.Mesh(geometry, material); m.castShadow = true; m.receiveShadow = true; root.add(m);
    geometries.forEach(g => g.dispose());
  }
  return root;
}
export function createSolarWing(stage: Stage, width = 6, depth = 2.6) {
  const g = new THREE.Group(); g.name = 'solar-wing-fx';
  part(stage, g, new THREE.BoxGeometry(width, .10, depth), silver);
  for (let x = 0; x < 8; x++) for (let z = 0; z < 4; z++) part(stage, g, new THREE.BoxGeometry(width / 8 - .035, .025, depth / 4 - .035), (x + z) % 2 ? blue : '#235d90', -width / 2 + (x + .5) * width / 8, .065, -depth / 2 + (z + .5) * depth / 4);
  return compact(g);
}
export function createAntennaDish(stage: Stage, radius = 1) {
  const g = new THREE.Group(); g.name = 'antenna-dish-fx';
  const profile = Array.from({length: 9}, (_, i) => { const r = radius * i / 8; return new THREE.Vector2(r, r * r / radius * .45); });
  const bowl = part(stage, g, new THREE.LatheGeometry(profile, 20), silver); bowl.material = stage.toon(silver, {side: THREE.DoubleSide});
  part(stage, g, new THREE.CylinderGeometry(.025, .025, radius * .9, 6), gold, 0, radius * .35);
  part(stage, g, new THREE.SphereGeometry(radius * .09, 8, 6), blue, 0, radius * .8);
  return compact(g);
}
export function createTruss(stage: Stage, length = 4, width = .5) {
  const g = new THREE.Group(); g.name = 'truss-fx';
  for (const z of [-1, 1]) part(stage, g, new THREE.BoxGeometry(length, .045, .045), silver, 0, 0, z * width / 2);
  const count = Math.ceil(length / width), step = length / count;
  for (let i = 0; i < count; i++) { const beam = part(stage, g, new THREE.BoxGeometry(Math.hypot(step, width), .035, .035), silver, -length / 2 + (i + .5) * step); beam.rotation.y = (i % 2 ? 1 : -1) * Math.atan2(width, step); }
  return compact(g);
}
export function createStarDome(seed = 'space', radius = 150) {
  const r = rng(seed), dome = new THREE.Group(); dome.name = 'star-dome-fx';
  // Three size classes plus a dense, dim tilted Milky Way, each a single draw.
  for (let layer = 0; layer < 4; layer++) {
    const positions: number[] = [], colors: number[] = [], count = [1350,240,55,2400][layer];
    for (let i=0;i<count;i++) {
      const a = r.range(0,Math.PI*2), h = layer === 3 ? Math.sin(a + .7)*.46 + r.range(-.065,.065) : r.range(-1,1);
      const s = Math.sqrt(1-h*h), light = r.range(.45,1);
      positions.push(radius*s*Math.cos(a),radius*h,radius*s*Math.sin(a));
      colors.push(light*(i%5===0?1:.76),light*.87,light*(i%5===0?.75:1));
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const stars = new THREE.Points(geo,new THREE.PointsMaterial({size:[.18,.35,.6,.15][layer],vertexColors:true,transparent:true,opacity:layer===3?.24:.95,depthWrite:false,fog:false}));
    stars.layers.set(1); dome.add(stars);
  }
  return dome;
}
export function createSun(stage: Stage, position: [number, number, number] = [-80, 75, -85], radius = 3) {
  const g = new THREE.Group(); g.name = 'distant-sun-fx';
  const sun = part(stage, g, new THREE.SphereGeometry(radius, 16, 12), '#fff2d0'); sun.material = stage.toon('#fff2d0', {emissive: '#ffe8b0', emissiveIntensity: 2});
  const halo = stage.glow('#ffe0a0', radius * 7, .65); g.add(halo); g.position.fromArray(position); return g;
}
/** The white dish, long RTG boom and engraved gold disc identify the 1977 probe. */
export function createVoyager(stage: Stage) {
  const g = new THREE.Group(); g.name = 'voyager-probe-fx';
  part(stage,g,new THREE.CylinderGeometry(.48,.4,.35,10),gold,0,-.1);
  const dish=createAntennaDish(stage,.85); dish.position.set(-.75,.18,0);dish.rotation.z=.8;g.add(dish);
  const boom=createTruss(stage,2.8,.12);boom.position.set(1.6,-.1,0);g.add(boom);
  for(let i=0;i<3;i++) {
    part(stage,g,new THREE.CylinderGeometry(.16,.16,.36,10),'#525c6c',2.1+i*.36,-.1).rotation.z=Math.PI/2;
    for(let k=0;k<3;k++) part(stage,g,new THREE.BoxGeometry(.03,.45,.45),silver,2+i*.36+k*.1,-.1);
  }
  part(stage,g,new THREE.CylinderGeometry(.23,.23,.035,32),'#f4cd65',.04,.1,.4).rotation.x=Math.PI/2;
  for(let i=1;i<5;i++) {const groove=part(stage,g,new THREE.TorusGeometry(i*.041,.005,4,32),'#866537',.04,.1,.425);groove.name='gold-record-groove-fx';}
  part(stage,g,new THREE.BoxGeometry(.025,2,.025),silver,.3,.9,-.25);
  part(stage,g,new THREE.BoxGeometry(.4,.16,.25),blue,-.3,.2,-.48);
  compact(g);g.traverse((m:any)=>{m.castShadow=false;m.receiveShadow=false;});return g;
}
/** Flyby scenery shares only reusable spacecraft parts with the lander; its scene stays independent. */
export function buildFlybySpace(stage: Stage, l: FlybyLayout) {
  const root=new THREE.Group();root.name='saturn-system-fx';stage.scene.add(root);
  const stars=createStarDome(l.spec.seed,170);stage.scene.add(stars,createSun(stage,[-85,65,-85],2.5));
  stage.sun.position.set(-45,55,-20);stage.sun.target.position.set(0,0,0);
  stage.scene.traverse((o:any)=>{if(o.isHemisphereLight)o.intensity=.8;});
  const r=rng(l.spec.seed+'-flyby-art'), tint=new THREE.Color();
  const bodies=new Map<string,any>();
  for(const b of l.spec.bodies) {
    const geo=new THREE.SphereGeometry(b.radius,48,32),p=geo.getAttribute('position'),colors:number[]=[];
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i)/b.radius,y=p.getY(i)/b.radius,z=p.getZ(i)/b.radius;
      const band=Math.sin(y*43+Math.sin(x*6)*.5);
      tint.set(b.color).multiplyScalar(b.id==='saturn'||b.id==='jupiter'? .86+.12*band : .95+.05*Math.sin(x*21+z*13));
      if(b.id==='mimas') {const d=Math.hypot(x-.12,y-.5,z-.82);const dent=d<.48?1-.22*(1-d/.48):1;p.setXYZ(i,p.getX(i)*dent,p.getY(i)*dent,p.getZ(i)*dent);if(d<.4)tint.multiplyScalar(.58);}
      colors.push(tint.r,tint.g,tint.b);
    }
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
    const mat=stage.toon('#ffffff').clone();mat.vertexColors=true;
    const m=new THREE.Mesh(geo,mat);m.position.set(b.position[0],0,b.position[1]);m.name=b.id+'-body-fx';root.add(m);bodies.set(b.id,m);
    if(b.id==='titan') {
      const haze=part(stage,root,new THREE.SphereGeometry(b.radius*1.055,40,24),'#eda94d',b.position[0],0,b.position[1]);
      haze.material=stage.toon('#eaa244',{transparent:true,opacity:.19,emissive:'#cf7422',emissiveIntensity:.4});haze.material.depthWrite=false;haze.layers.set(1);haze.name='titan-haze-fx';
    }
  }
  // Bands and their particles use the very same radii as the contact simulation.
  const ringGeo:THREE.BufferGeometry[]=[];
  for(let radius=l.spec.rings.inner;radius<l.spec.rings.outer;radius+=.22) {
    const outer=Math.min(radius+.16,l.spec.rings.outer);
    if(outer>l.spec.rings.gap[0]&&radius<l.spec.rings.gap[1])continue;
    const geo=new THREE.RingGeometry(radius,outer,160);geo.rotateX(-Math.PI/2);
    geo.translate(l.ringBody.position[0],0,l.ringBody.position[1]);
    const color=new THREE.Color(radius<l.spec.rings.gap[0]?'#a99578':'#d9c39a').multiplyScalar(r.range(.85,1.05));
    const colors=new Float32Array(geo.getAttribute('position').count*3);
    for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}
    geo.setAttribute('color',new THREE.BufferAttribute(colors,3));ringGeo.push(geo);
  }
  const ringMat=stage.toon('#ffffff',{side:THREE.DoubleSide}).clone();ringMat.vertexColors=true;
  const rings=new THREE.Mesh(mergeGeometries(ringGeo),ringMat);rings.name='saturn-rings-fx';rings.layers.set(1);root.add(rings);ringGeo.forEach(g=>g.dispose());
  const dust=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.085,0),stage.toon('#e2d5b8'),900),dummy=new THREE.Object3D();dust.name='ring-particles-fx';dust.layers.set(1);
  for(let i=0;i<900;i++) {
    let radius=r.range(l.spec.rings.inner,l.spec.rings.outer);
    if(radius>l.spec.rings.gap[0]&&radius<l.spec.rings.gap[1])radius=l.spec.rings.gap[1]+r.range(.15,2);
    const angle=r.range(0,Math.PI*2);dummy.position.set(l.ringBody.position[0]+Math.cos(angle)*radius,r.range(-.15,.15),l.ringBody.position[1]+Math.sin(angle)*radius);dummy.scale.setScalar(r.range(.4,1.5));dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);
  }root.add(dust);
  function circle(x:number,z:number,radius:number,color:string) {
    const positions:number[]=[];
    for(let i=0;i<80;i++) if(i%3!==0) for(const k of [i,i+1]) {const a=k/80*Math.PI*2;positions.push(x+Math.cos(a)*radius,.25,z+Math.sin(a)*radius);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    const line=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:.5}));line.name='shutter-window-fx';line.layers.set(1);root.add(line);return line;
  }
  const windows=l.spec.photos.map(p=>circle(p.center[0],p.center[1],p.radius,'#9bcfce'));
  const gravity=circle(l.titan.position[0],l.titan.position[1],l.spec.encounterRadius,'#e8c27a');
  const signal=stage.glow('#ffd579',1.2,.9);signal.position.set(l.spec.hidden.position[0],.6,l.spec.hidden.position[1]);signal.name='record-signal-fx';root.add(signal);
  const probe=createVoyager(stage);stage.scene.add(probe);
  const jet=part(stage,probe,new THREE.ConeGeometry(.19,1,12),'#ffb356',-.6,-.2,0);jet.rotation.z=Math.PI/2;jet.material=stage.toon('#ffb356',{emissive:'#ff7333',emissiveIntensity:2});jet.name='fire-thrust-fx';
  return {root,probe,bodies,windows,gravity,signal,
    update(s:FlybyState,thrust:number,spread:number) {
      probe.position.set(s.x,s.height+.7,s.z);probe.rotation.y=-Math.atan2(s.vz,s.vx);
      jet.visible=thrust>0;jet.scale.y=.65+thrust*2;
      windows.forEach((w,i)=>{w.visible=!(s.photos&(1<<i));w.material.opacity=.4+.12*Math.sin(s.time*2);});
      gravity.material.opacity=s.encounter?.75:.35;signal.visible=!s.hidden;signal.material.opacity=.65+.25*Math.sin(s.time*3);
      probe.scale.y=1-spread*.12;stars.position.copy(stage.camera.position);
    },
  };
}
export function createRosetta(stage: Stage) {
  const g = new THREE.Group(); g.name = 'rosetta-fx';
  part(stage, g, new THREE.BoxGeometry(1.8, 1.5, 1.8), gold);
  part(stage, g, new THREE.BoxGeometry(1.85, .25, 1.85), blue, 0, .65);
  for (const side of [-1, 1]) { const wing = createSolarWing(stage, 8, 2.8); wing.position.x = side * 5.2; g.add(wing); const truss = createTruss(stage, 2.2); truss.position.x = side * 1.6; g.add(truss); }
  const dish = createAntennaDish(stage, .8); dish.position.y = 1; dish.rotation.z = .45; g.add(dish);
  return compact(g);
}
export function createPhilaeShell(stage: Stage) {
  const g = new THREE.Group(); g.name = 'philae-shell-fx';
  // An open harness leaves the jelly face and deformation visible.
  part(stage, g, new THREE.BoxGeometry(.65, .28, .14), blue, 0, .45, .28);
  for (const s of [-1, 1]) {
    part(stage, g, new THREE.BoxGeometry(.12, .42, .57), '#d7ac52', s * .34, .38, .10);
    // Faceted foil folds catch the hard sun without an imported texture.
    for (let i=0;i<4;i++) { const foil=part(stage,g,new THREE.OctahedronGeometry(.12,0),i%2?'#a87932':'#e6c574',s*.405,.23+i*.1,.1); foil.scale.set(.22,.65,2); }
  }
  part(stage,g,new THREE.BoxGeometry(.68,.13,.55),'#d7ac52',0,.6,.10);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3, leg = part(stage, g, new THREE.CylinderGeometry(.025, .035, .65, 6), silver, Math.sin(a) * .43, .16, Math.cos(a) * .43); leg.rotation.z = Math.sin(a) * .7; leg.rotation.x = -Math.cos(a) * .7;
    part(stage, g, new THREE.CylinderGeometry(.12, .14, .035, 6), blue, Math.sin(a) * .62, -.05, Math.cos(a) * .62);
  }
  part(stage, g, new THREE.CylinderGeometry(.02, .02, .45, 6), silver, -.22, .78, .22);
  part(stage, g, new THREE.ConeGeometry(.055, .35, 6), silver, .31, .07, .18).rotation.z = Math.PI;
  return compact(g);
}
function label(stage: Stage, text: string, x: number, y: number, z: number) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
  const c = canvas.getContext('2d')!; c.fillStyle = '#122d4c'; c.fillRect(0, 0, 512, 96); c.strokeStyle = '#c8d9e4'; c.strokeRect(5, 5, 502, 86); c.fillStyle = '#f1e8d1'; c.font = '600 36px "Microsoft YaHei",sans-serif'; c.textAlign = 'center'; c.fillText(text, 256, 60);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .42), stage.toon('#ffffff', {map: texture, side: THREE.DoubleSide})); m.position.set(x, y, z); m.name = 'site-label-fx'; stage.scene.add(m);
  const post = part(stage,stage.scene,new THREE.CylinderGeometry(.035,.045,y,6),'#80909a',x,y/2,z); post.name='site-post-fx';
  return m;
}
/** Vertex colour strata keep the entire ground/cliff mesh to one material. */
function surfaceGeometry(triangles: number[], seed: string, cliffs = false) {
  const r=rng(seed), geo=new THREE.BufferGeometry(), colors:number[]=[], color=new THREE.Color();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(triangles,3)); geo.computeVertexNormals();
  const normal=geo.getAttribute('normal');
  for(let i=0;i<triangles.length;i+=9) {
    const x=(triangles[i]+triangles[i+3]+triangles[i+6])/3, y=(triangles[i+1]+triangles[i+4]+triangles[i+7])/3, z=(triangles[i+2]+triangles[i+5]+triangles[i+8])/3;
    const side=cliffs && y>0.3 && Math.abs(normal.getY(i/3))<.55;
    const dust=Math.sin(x*.27+Math.sin(z*.17)*2)+Math.cos(z*.39-x*.11)+.35*Math.sin(x*1.8+z*.9);
    if(side) {
      const band=Math.floor((y+6)/.55)%5;
      color.set(['#535c61','#8e9b9e','#37424c','#687c87','#414a51'][band]);
      // Cold mineral reflection on the face turned away from the sun.
      if(normal.getX(i/3)>.3) color.lerp(new THREE.Color('#739cb5'),.35);
    } else color.set(dust>.75?'#8b8982':dust>-.25?'#63645f':'#3a3e40');
    color.multiplyScalar(r.range(.95,1.05));
    for(let k=0;k<3;k++) colors.push(color.r,color.g,color.b);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); return geo;
}
/** Cratered second lobe: displaced solid rock, a low neck and a blunt bill, never transparent. */
function cometLobe(stage: Stage, seed: string) {
  const root=new THREE.Group(); root.name='duck-head-lobe-fx';
  const r=rng(seed), cuts=Array.from({length:16},()=>({x:r.range(-1,1),y:r.range(-.6,1),z:r.range(-1,1),radius:r.range(.12,.29)}));
  for(const [x,y,z,sx,sy,sz] of [[7,21,-88,43,36,33],[24,-12,-62,27,24,29],[-22,14,-78,24,16,23]]) {
    const geo=new THREE.IcosahedronGeometry(1,4), p=geo.getAttribute('position');
    for(let i=0;i<p.count;i++) {
      const a=p.getX(i),b=p.getY(i),c=p.getZ(i);
      let h=1+.065*Math.sin(a*11+b*5)*Math.cos(c*9)+.035*Math.sin(b*21+c*13);
      for(const q of cuts) { const d=Math.hypot(a-q.x,b-q.y,c-q.z)/q.radius; if(d<1) h-=.13*(1-d*d); else if(d<1.25) h+=.035*Math.sin((d-1)*Math.PI*4); }
      p.setXYZ(i,a*h,b*h,c*h);
    }
    geo.computeVertexNormals();
    const m=part(stage,root,geo,'#777a77',x,y,z); m.scale.set(sx,sy,sz);
  }
  compact(root); return root;
}
/** Soft edge and longitudinal fading, shared by distant dust and sunlight shafts. */
function fadedMaterial(stage: Stage, color: string, opacity: number) {
  const mat=stage.toon(color,{transparent:true,opacity,emissive:color,emissiveIntensity:.7,side:THREE.DoubleSide}).clone();
  mat.depthWrite=false;
  mat.onBeforeCompile=(shader:any)=>{
    shader.vertexShader='varying vec2 vFade;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvFade=uv;');
    shader.fragmentShader='varying vec2 vFade;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      diffuseColor.a *= pow(max(0.,sin(vFade.x*3.14159265)),1.5)*sin(vFade.y*3.14159265);`);
  };
  mat.customProgramCacheKey=()=> 'space-soft-shaft-v1'; return mat;
}
export function buildLanderSpace(stage: Stage, l: LanderLayout, spec: LanderSpec) {
  const r=rng(l.seed+'-art'), root=new THREE.Group(); root.name='comet-surface'; stage.scene.add(root);
  // A single hard solar key, with only a faint sky fill. No extra point/directional lights.
  stage.scene.traverse((o:any)=>{if(o.isHemisphereLight)o.intensity=.16;});
  stage.sun.position.set(-35,75,5); stage.sun.target.position.set(30,0,0);
  Object.assign(stage.sun.shadow.camera,{left:-78,right:78,top:70,bottom:-70,near:1,far:190}); stage.sun.shadow.camera.updateProjectionMatrix();
  const mat=stage.toon('#ffffff').clone(); mat.vertexColors=true;
  const surface=new THREE.Mesh(surfaceGeometry(landerTriangles(l),l.seed,true),mat); surface.name='comet-heightfield'; stage.add(surface,root);
  const horizon=new THREE.Mesh(surfaceGeometry(horizonTriangles(l),l.seed+'-horizon'),mat); horizon.name='curved-horizon-fx'; horizon.receiveShadow=true; stage.scene.add(horizon);
  const stars=createStarDome(l.seed); stage.scene.add(stars,createSun(stage,[-117,135,9],2),cometLobe(stage,l.seed));

  const dummy=new THREE.Object3D(), tint=new THREE.Color();
  const rocks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),stage.toon('#737574'),150); rocks.name='rock-shoulders-fx';
  for(let i=0;i<150;i++) {
    const p=l.platforms[i%3], tier=Math.floor(i/3)%5, column=Math.floor(i/15), flank=column<5?-1:1;
    // Five overlapping stones per shoulder column, rooted in the ground and backed by the cliff.
    const layer=(p.position[1]-.8)/5, x=p.position[0]+(column%5-2)*1.8;
    const z=p.position[2]+flank*(4.9+.18*Math.sin(column));
    dummy.position.set(x,(tier+.5)*layer-.3,z);dummy.scale.set(1.45,layer*.72,1.35);
    dummy.rotation.set(0,r.range(-.3,.3),0);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);rocks.setColorAt(i,tint.set(i%4===0?'#92a4ac':'#656866').multiplyScalar(r.range(.95,1.05)));
  }
  rocks.castShadow=true; rocks.receiveShadow=true;stage.scene.add(rocks);
  const pebbles=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),stage.toon('#7a7e7c'),950); pebbles.name='pebbles-fx';
  for(let i=0;i<950;i++) {
    const x=r.range(-34,88),z=r.range(-44,38),s=r.range(.07,.42);
    const inside=x>=-14&&x<66&&z>=-24&&z<24;
    dummy.position.set(x,(inside?terrainHeight(l,x,z):horizonHeight(l,x,z))+s*.3,z);dummy.scale.set(s*1.7,s*.65,s);dummy.rotation.set(r.next(),r.next()*6,r.next());dummy.updateMatrix();pebbles.setMatrixAt(i,dummy.matrix);pebbles.setColorAt(i,tint.set('#a3a39a').multiplyScalar(r.range(.75,1.05)));
  }
  pebbles.receiveShadow=true;stage.scene.add(pebbles);

  // Long gauze ribbons originate behind the curved horizon. Soft particles rise along them.
  const jets=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1,1,12),fadedMaterial(stage,'#b8c9d6',.095),18);jets.name='distant-dust-jets-fx';jets.layers.set(1);
  for(let i=0;i<18;i++) {
    dummy.position.set(-47+i*7.3,13+(i%3)*6,-105-(i%3)*6);dummy.scale.set(8+i%3*3,65+i%4*8,1);dummy.rotation.set(0,(i%3-1)*.35,-.32);dummy.updateMatrix();jets.setMatrixAt(i,dummy.matrix);
  }
  stage.scene.add(jets);
  const motes=Array.from({length:22},(_,i)=>{
    const s=stage.glow('#bdceda',r.range(2.5,6),.08);s.name='rising-dust-fx';stage.scene.add(s);
    return {sprite:s,x:-55+(i%11)*12,z:-98-r.range(0,17),phase:r.next()};
  });
  const rings=[l.agilkia,...l.platforms,l.abydos].map((p,i)=>{
    const radius=p.radius;
    const m=new THREE.Mesh(new THREE.RingGeometry(radius-.045,radius,80),stage.toon(i===0?'#ebc981':'#b1e8f5',{emissive:i===0?'#ebc981':'#b1e8f5',emissiveIntensity:1.3,side:THREE.DoubleSide}).clone());
    m.rotation.x=-Math.PI/2;m.position.set(p.position[0],p.position[1]+.04,p.position[2]);m.name='landing-ring-fx';m.layers.set(1);stage.scene.add(m);return m;
  });
  const sunDirection=new THREE.Vector3(-65,75,5).normalize(),axis=new THREE.Vector3(0,1,0);
  const shafts=l.platforms.map(()=>{
    const m=new THREE.Mesh(new THREE.CylinderGeometry(.45,spec.sunlight.radius,23,24,8,true),fadedMaterial(stage,'#ffe5ab',.075));m.name='sun-shaft-fx';m.layers.set(1);m.quaternion.setFromUnitVectors(axis,sunDirection);stage.scene.add(m);return m;
  });
  label(stage,'Agilkia',0,.85,-4.6);label(stage,'Abydos',59,1,-2.8);
  const panels=l.platforms.map(p=>{const g=createSolarWing(stage,1.8,1.1);g.traverse((m:any)=>{m.layers.set(1);m.castShadow=false;});g.position.set(p.position[0],p.position[1]+.7,p.position[2]);g.scale.x=.15;stage.scene.add(g);return g;});
  const duck=new THREE.Group();duck.name='duck-rock-fx';
  const body=part(stage,duck,new THREE.IcosahedronGeometry(1,1),'#afa790');body.scale.set(1,.65,.7);
  part(stage,duck,new THREE.IcosahedronGeometry(.48,1),'#c2b9a0',.65,.65,0);const beak=part(stage,duck,new THREE.ConeGeometry(.24,.5,5),'#b69a6e',1.1,.65,0);beak.rotation.z=-Math.PI/2;
  compact(duck);duck.position.set(l.hidden.position[0],terrainHeight(l,l.hidden.position[0],l.hidden.position[2])+.6,l.hidden.position[2]);stage.scene.add(duck);
  const glint=stage.glow('#e8c27a',1.8,.6);glint.position.set(0,1.2,0);duck.add(glint);
  const rosetta=createRosetta(stage);rosetta.scale.setScalar(1.65);stage.scene.add(rosetta);
  const shell=createPhilaeShell(stage);stage.scene.add(shell);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.18,.9,10),stage.toon('#ffb854',{emissive:'#ff8b38',emissiveIntensity:2,transparent:true,opacity:.8}));flame.rotation.z=Math.PI;flame.name='thruster-fx';flame.visible=false;stage.scene.add(flame);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.10,.45,1,12,1,true),fadedMaterial(stage,'#aadfff',.65));beam.name='transmission-fx';beam.layers.set(1);beam.visible=false;stage.scene.add(beam);
  const beamDirection=new THREE.Vector3();
  const centers=l.platforms.map(p=>[...p.position] as [number,number,number]);
  return {root,rosetta,shell,flame,duck,beam,panels,
    update(time:number,p:number[],spread:number,collected:boolean[],jet:boolean,transmission:number) {
      for(let i=0;i<3;i++) {
        const c=sunlightCenter(spec,l.platforms[i],time,centers[i]);
        const lit=Math.abs(c[0]-l.platforms[i].position[0])<=spec.sunlight.radius;
        rings[i+1].material.color.set(lit?'#ffe5ab':'#526677');
        rings[i+1].material.emissive.set(lit?'#ffe5ab':'#24333f');
        rings[i+1].material.emissiveIntensity=lit?1.3:.2;
        shafts[i].position.set(c[0]+sunDirection.x*11.5,c[1]+sunDirection.y*11.5,c[2]+sunDirection.z*11.5);
        panels[i].scale.x=collected[i]?1:.15;
      }
      shell.position.set(p[0],p[1]+.1,p[2]);shell.scale.set(1+spread*.35,1-spread*.35,1+spread*.35);
      flame.visible=jet;flame.position.set(p[0],p[1]-.3,p[2]);
      rosetta.position.set(transmission>=0?59+(transmission-.5)*16:14+Math.sin(time*.045)*12,transmission>=0?25:39,transmission>=0?-2:-20);
      rosetta.rotation.set(.32,time*.015,-.12);
      for(const m of motes) {const f=(time*.012+m.phase)%1;m.sprite.position.set(m.x+f*20,-14+f*78,m.z);m.sprite.material.opacity=Math.sin(f*Math.PI)*.10;}
      beam.visible=transmission>=0;
      if(beam.visible) {beamDirection.set(rosetta.position.x-59,rosetta.position.y-.7,rosetta.position.z-1);beam.scale.y=beamDirection.length();beam.position.set((59+rosetta.position.x)/2,(.7+rosetta.position.y)/2,(1+rosetta.position.z)/2);beam.quaternion.setFromUnitVectors(axis,beamDirection.normalize());}
      // Keep the star field infinitely distant even in the descent and finale cameras.
      stars.position.copy(stage.camera.position);
    },
  };
}
