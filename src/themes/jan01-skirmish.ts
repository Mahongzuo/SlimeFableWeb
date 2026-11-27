// 以飞行艇船体与双翼为轮廓。系缆、船棚、风标和放行铃是关卡演绎。
import * as T from 'three';
import type {Stage} from '../level/stage';
import type {Kit} from './folio-landmarks';
import {rng} from '../templates/random';

export function bayWater(stage:Stage) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const g=canvas.getContext('2d')!, random=rng('tampa-bay-water');
  g.fillStyle='#6bafa8';g.fillRect(0,0,512,512);
  for(let i=0;i<820;i++){
    const x=random.range(0,512),y=random.range(0,512),w=random.range(2,18);
    g.strokeStyle=i%5?'#398b8e45':'#c5e3cb9a';g.lineWidth=random.range(.65,1.8);
    g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+w*.4,y-2,x+w,y-.5);g.stroke();
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(8,8);
  return stage.toon('#ffffff',{map});
}

export function launchBoat(k:Kit, root:T.Group, stage:Stage) {
  const aircraft=k.group(root), spinner=k.group(aircraft,0,1.2,.64);
  aircraft.name='tampa-benoist-flying-boat';
  const stations=[[-2.35,.025,.61],[-1.85,.31,.49],[-.95,.51,.48],[.15,.54,.46],[.84,.42,.45],[1.55,.16,.50],[1.8,.06,.55]];
  const pts:number[]=[], index:number[]=[];
  stations.forEach(([z,r,y],i)=>{
    pts.push(-r,y,z,-r*.76,y-.26,z,0,y-.48,z,r*.76,y-.26,z,r,y,z);
    if(i)for(let j=0;j<4;j++){const a=(i-1)*5+j;index.push(a,a+1,a+5,a+1,a+6,a+5);}
  });
  const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(pts,3));geom.setIndex(index);geom.computeVertexNormals();
  const shell=new T.Mesh(geom,stage.toon('#a6633e',{side:T.DoubleSide}));shell.castShadow=true;aircraft.add(shell);
  for(let i=1;i<stations.length;i++)for(const side of [-1,1]){
    const [az,ar,ay]=stations[i-1],[bz,br,by]=stations[i];
    k.beam(aircraft,'#e3b276',[side*ar,ay,az],[side*br,by,bz],.035);
  }
  k.box(aircraft,'#48372c',0,.28,-.69,.66,.12,.77);
  for(const x of [-.24,.24]){
    k.put('box',aircraft,'toon','#77503b',x,.52,-.38,.31,.39,.085,-.16);
    k.ball(aircraft,'#784d39',x,.67,-.64,.16,.21,.14);
    k.ball(aircraft,'#e3b27d',x,.92,-.64,.135);
    k.ball(aircraft,'#72523b',x,1.01,-.64,.147,.082,.15);
  }
  for(const y of [.78,1.91]) {
    for(const side of [-1,1]){
      const wing=k.group(aircraft,side*1.95,y,0);
      k.box(wing,'#e7c78c',0,0,0,3.8,.09,1.14);
      for(let rib=0;rib<9;rib++){const x=-1.72+rib*.43;k.beam(wing,'#bb996d',[x,.052,-.55],[x,.052,.55],.012);}
    }
  }
  for(const x of [-3.48,-1.56,1.56,3.48]){
    for(const z of [-.46,.46])k.beam(aircraft,'#795436',[x,.82,z],[x,1.87,z],.046);
    k.beam(aircraft,'#9d8564',[x,.83,-.46],[x,1.86,.46],.015);
  }
  k.box(aircraft,'#55554c',0,1.12,.27,.46,.40,.62);
  for(const x of [-.24,.24])for(let i=0;i<3;i++)k.cyl(aircraft,'#858477',x,1.29,.04+i*.18,.088,.36);
  for(const side of [-1,1]) {
    k.beam(aircraft,'#8d6540',[side*.39,.40,.69],[side*.52,.89,2.68],.045);
    k.beam(aircraft,'#8d6540',[side*.58,1.90,.53],[side*.52,.89,2.68],.038);
    k.ball(aircraft,'#a3764f',side*3.36,.32,-.02,.15,.16,.46);
    k.beam(aircraft,'#846140',[side*3.36,.44,-.11],[side*3.36,.76,-.25],.038);
  }
  k.ball(aircraft,'#efd098',0,.89,2.62,1.17,.066,.46);
  k.ball(aircraft,'#c98759',0,1.24,2.68,.072,.49,.44);
  k.ball(spinner,'#795139',0,0,0,.09,.76,.045);k.ball(spinner,'#c39b5d',0,0,0,.13,.13,.08);
  const wake=k.group(root);
  for(let i=0;i<15;i++)for(const side of [-1,1]){
    const d=i*.25;
    k.ball(wake,i%3?'#d1e8dd':'#f1eede',side*(.27+d*.29),0,d,.12+d*.05,.017,.17);
  }
  return (time:number,finish:number)=>{
    const distance=finish<2 ? .82*finish*finish : 3.28+(finish-2)*3.28;
    const climb=Math.max(0,finish-1.85);
    aircraft.position.set(-7.25-distance*.22,-.5+.042*Math.sin(time*2.1)+climb*1.12,-.35-distance*.975);
    aircraft.rotation.set(Math.min(.15,finish*.066),.22,.019*Math.sin(time*1.4));
    spinner.rotation.z=time*(finish?28:7);
    wake.visible=finish>.04 && finish<4.3;
    wake.position.set(aircraft.position.x+.15,-.524,aircraft.position.z+.65);wake.rotation.y=.22;
    const width=Math.max(.06,1-climb*.41);wake.scale.set(width,1,Math.min(1,finish+.05));
  };
}
