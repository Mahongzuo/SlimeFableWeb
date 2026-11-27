import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Stage,StageLook} from '../level/stage';
import {bakeDesk, fibers, texture} from './jan01-chapter';
import {bridgeX, foldAngle, paperBlocks, ribbon, type BookRun} from '../templates/jan01-book';

const ink='#274859', leaf='#487574', gold='#d59850', coral='#b55d41', cream='#ffdfaa';
export const bookLight:StageLook={skyTop:'#9aaeb2',skyHorizon:'#f6dcb1',fog:[29,74],sun:'#ffe1b3',sunIntensity:1.65,
  hemiSky:'#ffebc8',hemiGround:'#8a9190',ink:'#353d42',wash:'#f1d9b4'};

/** All the small cut-paper shapes in one hinge travel together and share a draw call. */
function cutPaper(stage:Stage, parent:T.Object3D){
  const shapes:T.BufferGeometry[]=[];
  function part(geometry:T.BufferGeometry,color:string,x:number,y:number,z:number,tilt=0){
    geometry.rotateZ(tilt);geometry.translate(x,y,z);
    const c=new T.Color(color),n=geometry.attributes.position.count,colors=new Float32Array(n*3);
    for(let i=0;i<n;i++)c.toArray(colors,i*3);
    geometry.setAttribute('color',new T.BufferAttribute(colors,3));
    shapes.push(geometry.index?geometry.toNonIndexed():geometry);
  }
  function block(x:number,y:number,z:number,w:number,h:number,d:number,color:string,tilt=0){
    part(new T.BoxGeometry(w,h,d),color,x,y,z,tilt);
  }
  function silhouette(points:number[][],color:string,x:number,y:number,z:number,depth=.045){
    const outline=new T.Shape(points.map(([u,v])=>new T.Vector2(u,v)));
    part(new T.ExtrudeGeometry(outline,{depth,bevelEnabled:false}),color,x,y,z);
  }
  function cottage(x:number,z:number,k:number,roof:string){
    const faceY=.84*k,front=z+.075;
    silhouette([[-.88,0],[.88,0],[.88,1.07],[.12,1.74],[-.88,1.07]].map(([u,v])=>[u*k,v*k]),cream,x,0,z,.068);
    silhouette([[-1,1],[.08,1.85],[1.02,1.10],[.86,1.02],[.08,1.62],[-.87,.93]].map(([u,v])=>[u*k,v*k]),roof,x,0,front);
    block(x-.51*k,1.43*k,z,.2*k,.55*k,.1,roof);
    block(x+.16*k,.32*k,front+.02,.32*k,.64*k,.04,ink);
    for(const side of [-1,1]){
      const wx=x+side*.56*k;
      block(wx,faceY*.83,front+.04,.31*k,.42*k,.046,ink);
      for(const dx of [-.068,.068]) for(const dy of [-.091,.091])
        block(wx+dx*k,faceY*.83+dy*k,front+.085,.10*k,.14*k,.025,'#edbc70');
    }
    for(let i=0;i<8;i++)block(x+(-.77+i*.21)*k,.09*k,front+.03,.14*k,.035*k,.04,roof);
  }
  function tree(x:number,z:number,k:number,tone:string){
    for(let j=0;j<3;j++){
      const w=(.67-j*.14)*k, y=(.34+j*.48)*k;
      silhouette([[-w,y],[-w*.78,y+.32*k],[-w*.91,y+.31*k],[0,y+1.12*k],[w*.89,y+.27*k],[w*.71,y+.29*k],[w,y]],tone,x,0,z+j*.06);
    }
    block(x,.42*k,z+.19,.10*k,.84*k,.055,ink);
    for(let j=0;j<4;j++)block(x-.09*k,(.64+j*.28)*k,z+.22,.028*k,.29*k,.022,cream,-.62);
  }
  function willow(x:number,z:number,k:number){
    const crown=[[-.87,1.07],[-1.04,1.47],[-.9,1.85],[-.63,1.94],[-.59,2.27],[-.31,2.45],[0,2.39],[.22,2.61],[.54,2.42],[.62,2.15],[.85,1.92],[1,1.65],[.81,1.21],[.34,1.08],[0,1.22],[-.44,1.03]];
    silhouette(crown.map(([a,b])=>[a*k,b*k]),leaf,x,0,z);
    silhouette([[-.14,0],[.1,0],[.08,.91],[.54,1.8],[.43,1.77],[.01,1.15],[-.37,1.93],[-.43,1.93],[-.09,.86]].map(([a,b])=>[a*k,b*k]),ink,x,0,z+.06);
    for(let j=0;j<17;j++){
      const dx=(j%5-2)*.27,dy=1.36+Math.floor(j/5)*.25;
      block(x+dx*k,dy*k,z+.13,.025*k,.15*k,.016,'#c3bc85',dx>.05?-.43:.5);
    }
  }
  function flush(){
    if(!shapes.length)return;
    const geo=mergeGeometries(shapes);if(!geo)throw Error('纸景合批失败');
    const mat=stage.toon('#ffffff').clone();mat.vertexColors=true;
    const mesh=new T.Mesh(geo,mat);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
    shapes.forEach(g=>g.dispose());shapes.length=0;
  }
  return {block,silhouette,cottage,tree,willow,flush};
}

function printedLeaf(stage:Stage,index:number) {
  const map=texture(640,480,g=>{
    g.fillStyle=['#ebcf9d','#edd7aa','#d6c996','#ded1a4','#ded0a6','#ebd5aa'][index];
    g.fillRect(0,0,640,384);fibers(g,640,384,2300);
    for(const offset of [12,17]){
      g.strokeStyle=offset===12?'#8a6946':'#b59a69';g.lineWidth=offset===12?2:1;
      g.strokeRect(offset,offset,640-offset*2,384-offset*2);
    }
    g.strokeStyle='#786849';g.lineWidth=1;
    for(const [x,y,dx,dy] of [[22,22,1,1],[618,22,-1,1],[22,362,1,-1],[618,362,-1,-1]]){
      g.save();g.translate(x,y);g.scale(dx,dy);
      for(let k=0;k<5;k++){g.beginPath();g.ellipse(5+k*5,7+k*3,7,2.8,.4,0,Math.PI*2);g.stroke();}
      g.restore();
    }
    g.fillStyle='#88734e';g.font='italic 22px Georgia';g.textAlign='center';g.fillText(['I','II','·','·','·','III'][index],320,350);
    if(index===0||index===5){
      // Inked contours and stalks belonging to the final landscape, printed in the sheet.
      for(let row=0;row<6;row++){g.beginPath();g.strokeStyle='#a2936b80';
        for(let j=0;j<=90;j++){const x=25+j*6.5,y=138+row*13+26*Math.sin(j*.083+row*.16)+14*Math.sin(j*.17);j?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}
      for(let j=0;j<33;j++){const x=38+(j*83)%556,y=220+17*Math.sin(j);
        g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+4,y-8,x+7,y-11);g.stroke();}
    }
    if(index===5){
      // The last spread has a cut-paper landscape printed beneath the hinged houses.
      g.save();g.beginPath();g.rect(32,33,576,258);g.clip();
      const arch=g.createLinearGradient(0,40,0,254);arch.addColorStop(0,'#8ca9a5');arch.addColorStop(1,'#eacea0');
      g.fillStyle=arch;g.fillRect(32,33,576,258);
      g.fillStyle='#fad18b';g.beginPath();g.arc(412,105,33,0,Math.PI*2);g.fill();
      for(let k=0;k<3;k++){g.fillStyle=['#859d91','#627e74','#436764'][k];g.beginPath();g.moveTo(0,325);
        for(let i=0;i<66;i++)g.lineTo(i*10,135+k*43+21*Math.sin(i*.16+k)+12*Math.cos(i*.23+k*.5));
        g.lineTo(650,325);g.closePath();g.fill();}
      for(let j=0;j<36;j++){const x=42+((j*77)%546),y=235+Math.sin(j*.7)*11;
        g.fillStyle='#dcc999';g.fillRect(x,y,1.5,8);g.fillRect(x+2,y-2,1.5,6);}
      g.restore();
    }
    g.fillStyle=index===1?'#6b5e52':'#b79d78';g.fillRect(0,384,640,96);
    for(let j=0;j<13;j++){
      g.fillStyle=j%3===0?'#876d57':'#e2c699';g.fillRect(0,387+j*7,640,j%3===0?1:2);
    }
  });
  return stage.toon('#ffffff',{map});
}

export function makeBook(stage:Stage,run:BookRun){
  const root=new T.Group();stage.scene.add(root);
  const scenery=cutPaper(stage,root);
  // A cloth cover, a gilded spine, and stepped fore-edges below the actual playable leaves.
  scenery.block(0,-2.32,-1.6,24,.55,36,'#997452');
  for(const sign of [-1,1]){
    scenery.block(sign*2.38,-1.91,-1.5,4.72,.22,20.35,ink);
    scenery.block(sign*4.55,-1.78,-1.5,.21,.08,20.1,gold);
    for(let j=0;j<5;j++)scenery.block(sign*(4.40-j*.018),-1.64+j*.11,-1.52,.16,.067,19.8-j*.02,'#c3a178');
  }
  scenery.block(0,-1.82,-1.5,.3,.22,20.24,coral);
  // Prints, sill, casements and a sunlit landscape seen through the back of the diorama.
  scenery.block(0,6,-16.9,28,17,.25,'#abc5ba');
  scenery.silhouette([[-15,0],[-15,4],[-9,7],[-6,5],[-2,7.4],[3,5.2],[7,6.8],[14,4],[14,0]],'#789b98',0,-1.5,-16.5);
  scenery.silhouette([[-15,0],[-15,2.5],[-8,4.2],[-4,3.2],[.6,4.9],[4,3.7],[9,4.7],[15,2.5],[15,0]],'#608280',0,-1.5,-16.35);
  const disc=Array.from({length:40},(_,i)=>[1.17*Math.cos(i*Math.PI/20),1.17*Math.sin(i*Math.PI/20)]);
  scenery.silhouette(disc,'#ffcb7d',2.3,7.7,-16.55);
  for(const x of [-10,-5.4,5.4,10]) scenery.block(x,5,-15.8,.21,15,.32,'#875f4c');
  scenery.block(0,9.8,-15.8,24,.22,.32,'#875f4c');
  scenery.block(0,-.24,-15.5,24,.39,.84,'#9f7352');
  scenery.flush();

  const platforms=new T.Group();root.add(platforms);
  for(const [i,b] of paperBlocks.entries()){
    const bottom=b.name==='spine'?-.04:b.top-.58, h=b.top-bottom;
    const geo=new T.BoxGeometry(b.width,h,b.depth),uv=geo.attributes.uv;
    for(let v=0;v<uv.count;v++){
      const top=Math.floor(v/4)===2;
      uv.setY(v,top?.201+.797*uv.getY(v):.003+.193*uv.getY(v));
    }
    geo.clearGroups();
    const mesh=new T.Mesh(geo,printedLeaf(stage,i));
    mesh.name='solid-'+b.name;mesh.userData.walkTarget=true;mesh.position.set(b.x,b.top-h/2,b.z);mesh.receiveShadow=true;
    platforms.add(mesh);
  }
  const foldouts:T.Group[]=[];
  const pages=[{z:5.9,y:0},{z:.8,y:1.24},{z:-6.85,y:1}];
  for(const [i,p] of pages.entries()){
    const hinge=new T.Group();hinge.position.set(0,p.y+.01,p.z);root.add(hinge);foldouts.push(hinge);
    const cut=cutPaper(stage,hinge);
    if(i===0){
      cut.cottage(-3.08,-.1,1.13,coral);cut.willow(3.28,.05,1.22);
      cut.tree(-3.85,-.61,.90,ink);
      for(let n=0;n<9;n++){const x=-3.95+n*.24;cut.block(x,.19,.22,.06,.38,.05,ink);}
      cut.block(-2.99,.23,.26,2,.033,.045,ink);
    }else if(i===1){
      cut.cottage(3.16,-.4,1.27,ink);cut.tree(3.84,-.59,1.3,leaf);
      cut.silhouette([[-.49,0],[.43,0],[.28,1.75],[-.17,1.75]],cream,-3.28,0,0);
      cut.silhouette([[-.45,1.63],[.03,2.08],[.43,1.63]],coral,-3.28,0,.09);
      for(let n=0;n<4;n++){const a=.55+n*Math.PI/2,dx=Math.cos(a),dy=Math.sin(a);
        cut.block(-3.28+dx*.59,1.52+dy*.59,.18,.21,1.12,.045,ink,a-Math.PI/2);
        for(let j=0;j<3;j++)cut.block(-3.28+dx*(.5+j*.2),1.52+dy*(.5+j*.2),.216,.2,.032,.02,cream,a-Math.PI/2);}
    }else{
      cut.cottage(-2.72,-.2,1.07,coral);cut.cottage(-.78,-.55,.86,gold);
      cut.willow(2.82,-.55,1.25);cut.tree(-3.78,-.55,1,ink);
    }
    cut.flush();
  }
  // Exposed stitch loops lie on the upright edge. Their arches leave the climbable wall clear.
  const threadPoints:T.Vector3[]=[];
  for(let j=0;j<14;j++){
    const x=-3.86+j*.59;
    for(let k=0;k<14;k++){
      const t=k/14*Math.PI, u=(k+1)/14*Math.PI;
      threadPoints.push(new T.Vector3(x+.14*Math.cos(t),1.04+.14*Math.sin(t),2.323),new T.Vector3(x+.14*Math.cos(u),1.04+.14*Math.sin(u),2.323));
    }
  }
  root.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(threadPoints),new T.LineBasicMaterial({color:cream})));
  const bridge=new T.Group();bridge.position.set(bridgeX,1.24,0);root.add(bridge);
  const plank=new T.Mesh(new T.BoxGeometry(1.85,.055,2.5),stage.toon('#deab6b'));
  plank.position.set(0,-.0275,-1.25);plank.userData.walkTarget=true;bridge.add(plank);
  const fan=cutPaper(stage,bridge);
  for(let i=0;i<8;i++)fan.block(0,.011,-.18-i*.30,1.76,.014,.028,'#986d47');
  fan.flush();
  const flowers=run.layout.flowers.map((p,i)=>{
    const flower=new T.Group();flower.position.fromArray(p);root.add(flower);
    const piece=cutPaper(stage,flower);piece.block(0,.19,0,.035,.38,.04,leaf,.14);
    for(let k=0;k<6;k++){
      const a=k*Math.PI/3,dx=Math.cos(a)*.16,dy=.42+Math.sin(a)*.16;
      const petal=Array.from({length:10},(_,n)=>[dx+.127*Math.cos(n*Math.PI/5),dy+.1*Math.sin(n*Math.PI/5)]);
      piece.silhouette(petal,i?gold:coral,0,0,.02+k*.008);
    }
    piece.block(0,.42,.135,.105,.11,.04,cream);piece.flush();return flower;
  });
  const tab=new T.Group();tab.position.set(...ribbon);root.add(tab);
  const trim=cutPaper(stage,tab);
  trim.silhouette([[-.46,-.9],[0,-.63],[.46,-.9],[.46,1.15],[-.46,1.15]],coral,0,0,0);
  for(const x of [-.35,.35])trim.block(x,.18,.058,.023,1.7,.018,cream);trim.flush();tab.rotation.x=-Math.PI/2;
  const world=bakeDesk(stage,platforms);
  const turning=(progress:number)=>Math.sin(Math.min(1,Math.max(0,progress))*Math.PI/2);
  function animate(time:number){
    const opening=turning(1-run.turning),closing=turning(run.finishTime/1.85);
    foldouts.forEach((h,i)=>{
      const upright=i===run.page?opening:i<run.page?0:.12;
      const prior=i===run.page-1 && run.page<3?1-opening:0;
      h.rotation.x=-(1-Math.max(upright,prior))*1.30;
      if(i===2&&run.page===3){
        h.rotation.x=-closing*1.55;
        h.scale.z=1-closing*.94;
        h.position.y=pages[2].y+.01+closing*.04;
      }
    });
    const angle=foldAngle(time,run.layout.windPhase);bridge.rotation.x=angle;
    flowers.forEach((f,i)=>{f.visible=run.page===1&&!(run.flowers&(1<<i));f.rotation.z=.09*Math.sin(time*2+i);});
    tab.position.y=ribbon[1]+.025+(1-run.press)*.08;tab.rotation.x=-Math.PI/2+.12*(1-run.press);
    return angle;
  }
  animate(0);
  return {world,animate,platforms,foldouts,bridge};
}
