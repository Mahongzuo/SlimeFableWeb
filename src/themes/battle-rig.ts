import * as T from 'three';

type Side = 'L' | 'R';
type Triple = [number, number, number];
type Ring = [number, number, number, string?, number?];
type Pose = Record<string, Triple>;
export type BattleVariant = 'light'|'heavy'|'captain'|'boarder'|'figurehead';
export type RigAttack = 'shoot'|'thrust'|'sweep'|'follow';
type RigPhase = 'approach' | 'windup' | 'strike' | 'recover' | 'down';

const ink = '#273d48', teal = '#335d69', sea = '#488e95', red = '#983f3e', cinnabar = '#c75043';
const gold = '#d6aa66', light = '#f0d9af', canvas = '#c4a77e', rope = '#866846', boot = '#414247';
const vec = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);

// All garment rings are built in bind space. Intermediate rings at the knees,
// elbows, waist and collar blend both adjoining joints continuously.
function makeBody(ship: boolean,variant?:BattleVariant) {
  const root = new T.Group(), joints: Record<string, T.Bone> = {}, bones: T.Bone[] = [];
  function bone(name: string, parent: string | null, x: number, y: number, z: number) {
    const joint = new T.Bone();
    joint.name = name;
    joint.position.set(x, y, z);
    (parent ? joints[parent] : root).add(joint);
    joints[name] = joint;
    bones.push(joint);
    return joint;
  }
  bone('Hips', null, 0, .70, 0);
  bone('Spine', 'Hips', 0, .12, 0);
  bone('Chest', 'Spine', 0, .24, 0);
  bone('Flinch', 'Chest', 0, 0, 0);
  bone('Head', 'Flinch', 0, .23, 0);
  if(ship)bone('Hat', 'Head', 0, 0, 0);
  for (const [s, k] of [['L', -1], ['R', 1]] as const) {
    bone('Thigh'+s, 'Hips', k*.147, -.025, 0);
    bone('Shin'+s, 'Thigh'+s, 0, -.31, .012);
    bone('Foot'+s, 'Shin'+s, 0, -.28, -.012);
    bone('Arm'+s, 'Flinch', k*.265, .10, .008);
    bone('Elbow'+s, 'Arm'+s, 0, -.30, 0);
    bone('Hand'+s, 'Elbow'+s, 0, -.285, 0);
  }
  bone('Pole', 'Flinch', -.085, -.175, .21);
  root.updateMatrixWorld(true);
  const positions:number[]=[], colors:number[]=[], uv:number[]=[], indices:number[]=[], skin:number[]=[], weights:number[]=[];
  function loft(name:string, rings:Ring[], baseColor:string, n=18, offset:Triple=[0,0,0], blend?:string,
                sculpt?:(a:number, row:number)=>Triple) {
    const origin=joints[name].getWorldPosition(vec()), start=positions.length/3, primary=bones.indexOf(joints[name]);
    const secondary=blend ? bones.indexOf(joints[blend]) : primary;
    rings.forEach(([height, rx, rz, dye, weight],i)=>{
      const col=new T.Color(dye||baseColor), mix=weight??0;
      for(let j=0;j<n;j++){
        const a=2*Math.PI*j/n, d=sculpt?.(a,i)??[0,0,0];
        positions.push(origin.x+offset[0]+rx*Math.cos(a)+d[0],origin.y+offset[1]+height+d[1],origin.z+offset[2]+rz*Math.sin(a)+d[2]);
        uv.push((j/n)*6, (height+origin.y)*7);
        const seam=1-.055*(.5+.5*Math.cos(5*a+i*.12));
        colors.push(col.r*seam,col.g*seam,col.b*seam); skin.push(primary,secondary,0,0); weights.push(1-mix,mix,0,0);
        if(i){const b=start+(i-1)*n+j,c=start+(i-1)*n+(j+1)%n;indices.push(b,b+n,c,c,b+n,c+n);}
      }
    });
    const end=start+(rings.length-1)*n;
    for(let j=1;j<n-1;j++)indices.push(start,start+j,start+j+1,end,end+j+1,end+j);
  }
  const coats:Record<BattleVariant,[string,string]>={light:['#54726b','#72917c'],heavy:['#31495a','#557d92'],captain:['#633b37','#b44739'],boarder:['#856347','#b58b5e'],figurehead:['#3b6267','#b8874c']};
  const [coat,accent]=variant?coats[variant]:[ship?teal:red,ship?sea:cinnabar];
  loft('Hips',[[-.17,.28,.165,coat],[-.142,.305,.179,gold],[-.126,.303,.18,coat],[0,.25,.165,accent],[.12,.214,.14,coat,.42]],coat,24,[0,0,0],'Spine',
    (a,i)=>[0,i<3?.035*Math.cos(6*a):0,0]);
  loft('Spine',[[-.08,.228,.162,ink],[0,.25,.177,gold],[.055,.24,.167,rope],[.09,.232,.158,coat,.15],[.235,.29,.18,accent,.85],[.34,.275,.166,coat,1],[.39,.164,.128,ink,1]],coat,24,[0,0,0],'Flinch');
  loft('Head',[[-.02,.105,.115,ink],[.025,.168,.147,canvas],[.09,.198,.169,light],[.185,.21,.165,light],[.24,.164,.145,canvas]],canvas,24);
  // The mask is inset under the brim, with brass eyelets and a stitched central join.
  function oval(b:string, color:string, at:Triple, radii:Triple) {
    const [x,y,z]=radii;
    loft(b,[[-y,.19*x,.19*z],[-y*.7,.75*x,.75*z],[0,x,z],[y*.7,.75*x,.75*z],[y,.19*x,.19*z]],color,14,at);
  }
  oval('Head',ink,[0,.115,.147],[.155,.056,.043]);
  for(const x of [-.070,.070])oval('Head',gold,[x,.119,.184],[.022,.019,.012]);
  for(const x of [-.093,.093])for(const y of [-.01,.07])oval('Flinch',gold,[x,y,.162],[.014,.014,.014]);
  for(const [s,k] of [['L',-1],['R',1]] as const){
    loft('Thigh'+s,[[-.30,.09,.09,ink,.55],[-.25,.115,.099,coat,.15],[-.13,.128,.118,coat],[-.025,.12,.11,coat]],coat,18,[0,0,0],'Shin'+s);
    loft('Shin'+s,[[-.285,.063,.067,ink,.36],[-.22,.067,.071,rope],[-.20,.075,.08,gold],[-.17,.073,.08,canvas],[-.13,.083,.087,rope],[-.11,.086,.089,light],[-.045,.090,.094,canvas],[.005,.087,.087,ink]],canvas,16,[0,0,0],'Foot'+s);
    loft('Foot'+s,[[-.081,.089,.148,boot],[-.054,.099,.155,boot],[-.013,.095,.15,ink],[.053,.067,.10,ink]],ink,18,[0,0,.044]);
    loft('Arm'+s,[[-.30,.068,.067,canvas,.48],[-.23,.083,.091,light,.10],[-.14,.091,.10,canvas],[-.09,.139,.141,gold],[-.073,.145,.143,coat],[.014,.143,.141,accent],[.075,.089,.093,coat]],coat,18,[0,0,0],'Elbow'+s);
    loft('Elbow'+s,[[-.283,.061,.062,rope,.42],[-.23,.075,.074,gold,.1],[-.20,.079,.08,ink],[-.11,.082,.086,teal],[-.088,.083,.087,gold],[-.065,.077,.082,canvas],[.012,.068,.069,light]],canvas,16,[0,0,0],'Hand'+s);
    oval('Hand'+s,canvas,[0,-.033,.008],[.071,.083,.067]);
    if(!ship){
      for(let i=0;i<3;i++)loft('Arm'+s,[[-.045,.149-i*.006,.149-i*.006,gold],[-.032,.147-i*.006,.147-i*.006,ink],[.007,.13-i*.006,.135-i*.006,red]],red,18,[0,-.035-i*.071,0]);
    }else{
      for(let j=0;j<3;j++)oval('Arm'+s,gold,[k*.122,-.036-j*.033,.028],[.022,.011,.058]);
    }
  }
  if(ship){
    loft('Hat',[[.208,.215,.17,ink],[.222,.22,.174,cinnabar],[.249,.214,.169,red],[.295,.172,.145,teal],[.33,.07,.085,ink]],ink);
    // Upturned three-corner brim: a single folded surface with a narrow selvage.
    if(variant!=='boarder')loft('Hat',[[.205,.19,.15,teal],[.210,.275,.236,ink],[.22,.32,.29,gold],[.236,.318,.288,ink]],ink,48,[0,0,0],undefined,(a,i)=>{
      const lobe=.5+.5*Math.cos(3*a+1.4);return [Math.cos(a)*lobe*.036*i/3,lobe*.11*i/3,Math.sin(a)*lobe*.036*i/3];
    });
    if(variant==='boarder'){
      loft('Hat',[[.204,.214,.167,rope],[.221,.219,.17,light],[.238,.218,.169,red],[.267,.194,.15,rope],[.30,.08,.11,canvas]],rope);
    }else oval('Hat',cinnabar,[-.225,.279,.08],[.048,.056,.04]);
  }else{
    loft('Head',[[.19,.251,.207,ink],[.207,.248,.20,gold],[.23,.224,.188,ink],[.31,.19,.164,teal],[.39,.056,.06,ink]],ink,24);
    for(const k of [-1,1])loft('Head',[[.268,.032,.022,gold],[.32,.046,.022,gold],[.404,.035,.018,gold],[.46,.004,.005,gold]],gold,12,[k*.047,0,.154],undefined,(_,i)=>[k*i*.029,0,-i*.01]);
    for(const k of [-1,1])loft('Head',[[.065,.066,.105,ink],[.08,.068,.105,gold],[.139,.069,.098,red],[.16,.065,.098,ink],[.20,.061,.10,teal]],ink,12,[k*.179,0,-.025]);
  }
  // Twill folds, piping and garment fastenings have their own thickness.
  loft('Flinch',[[.085,.126,.112,ink],[.134,.141,.12,canvas],[.18,.124,.112,light],[.241,.099,.103,rope]],canvas,20);
  if(ship){
    loft('Flinch',[[.098,.20,.143,sea],[.126,.245,.163,light],[.146,.227,.151,teal],[.165,.137,.119,ink]],teal,22,[0,0,0],undefined,
      (a,i)=>[0,-.068*Math.max(0,Math.sin(a))*(1-i/4),0]);
    for(const k of [-1,1]){
      // A rolled neckerchief, with the two ends tucked through a brass slide.
      loft('Flinch',[[-.018,.018,.014,red],[.015,.029,.018,cinnabar],[.08,.039,.023,cinnabar],[.145,.043,.023,red]],cinnabar,14,[k*.025,.02,.162],undefined,(_,i)=>[k*i*.021,0,-.006*i]);
      loft('Spine',[[-.025,.036,.017,ink],[.015,.045,.018,rope],[.086,.042,.021,canvas],[.14,.034,.018,light],[.18,.026,.017,canvas]],canvas,14,[k*.132,.02,.13],undefined,(_,i)=>[k*.014*i,0,-i*.003]);
    }
    oval('Flinch',gold,[0,.025,.174],[.031,.019,.019]);
    // The pressure cuff uses a woven cuff, brass lip and a small nozzle in the palm.
    loft('HandR',[[-.106,.032,.043,ink],[-.091,.046,.051,gold],[-.074,.049,.058,sea],[-.05,.053,.060,ink]],ink,16,[0,0,.011]);
  }else{
    for(let i=0;i<4;i++){
      const y=.033-i*.046;
      loft('Flinch',[[y-.037,.055,.015,ink],[y-.019,.173,.025,gold],[y+.007,.19,.03,red],[y+.025,.174,.016,cinnabar]],red,20,[0,0,.142],undefined,
        (a)=>[0,.033*Math.abs(Math.cos(a)),0]);
      for(const k of [-1,1]) oval('Flinch',light,[k*.116,y+.014,.165],[.011,.006,.009]);
    }
    for(const k of [-1,1])loft('Hips',[[-.255,.038,.021,gold],[-.24,.05,.021,red],[-.13,.052,.025,cinnabar],[-.012,.035,.026,red]],red,14,[k*.193,.03,.075],undefined,(_,i)=>[k*.019*(3-i),0,.029*(3-i)]);
  }
  for(const [side,k] of [['L',-1],['R',1]] as const){
    oval('Hand'+side,canvas,[-k*.044,-.02,.044],[.032,.057,.031]);
    for(let n=0;n<4;n++)oval('Head',rope,[k*(.155+n*.005),.08+n*.029,.081],[.018,.004,.014]);
  }
  if(variant==='heavy'||variant==='captain'){
    for(const [i,k] of [['L',-1],['R',1]] as const){
      for(let n=0;n<4;n++)loft('Arm'+i,[[-.041,.138,.162,gold],[-.023,.165,.174,ink],[.026,.151,.159,coat]],coat,18,[k*(.039+n*.011),.048-n*.051,0]);
      loft('Head',[[.267,.035,.03,gold],[.33,.060,.028,gold],[.43,.047,.025,variant==='captain'?cinnabar:gold],[.56,.006,.010,gold]],gold,14,[k*.09,0,.135],undefined,(_,n)=>[k*n*.041,0,-n*.014]);
    }
  }
  if(variant==='figurehead'){
    for(const k of [-1,1]){
      loft('Hat',[[.27,.05,.022,rope],[.31,.068,.03,gold],[.395,.053,.023,canvas],[.46,.04,.018,gold],[.51,.005,.01,light]],gold,14,[k*.12,0,.084],undefined,(_,n)=>[k*.035*n,0,-.022*n]);
      loft('Flinch',[[-.13,.066,.033,gold],[-.02,.13,.05,rope],[.072,.12,.053,gold],[.122,.054,.044,light]],rope,18,[k*.137,0,.109]);
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(skin,4));
  geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const weave=new Uint8Array(32*32*4);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    const i=(y*32+x)*4, raised=((x+(y>>1))%5===0)?15:0, groove=(y%4===0||x%4===0)?15:0;
    weave[i]=weave[i+1]=weave[i+2]=234+raised-groove;
    weave[i+3]=255;
  }
  const map=new T.DataTexture(weave,32,32);
  map.wrapS=map.wrapT=T.RepeatWrapping;map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;
  map.generateMipmaps=true;map.needsUpdate=true;
  const mesh=new T.SkinnedMesh(geometry,new T.MeshStandardMaterial({map,vertexColors:true,roughness:.84}));
  mesh.name=ship?'CanvasPuppet':'BannerGuardian';mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
  root.add(mesh); mesh.bind(new T.Skeleton(bones)); return {root,joints,mesh};
}

function flag(joint:T.Bone, root:T.Group) {
  const poleMat=new T.MeshStandardMaterial({color:rope,roughness:.85});
  function ferrule(z:number,l:number,r1:number,r2:number,mat:T.Material) {
    const part=new T.Mesh(new T.CylinderGeometry(r1,r2,l,12),mat);
    part.rotation.x=Math.PI/2;part.position.z=z;part.castShadow=true;joint.add(part);
  }
  ferrule(.695,1.70,.024,.033,poleMat);
  const brass=new T.MeshStandardMaterial({color:gold,metalness:.35,roughness:.42});
  for(const z of [-.14,-.05,.20,.54,1.20,1.51])ferrule(z,.045,.036,.036,brass);
  ferrule(1.63,.20,.001,.046,brass);
  const cols=20,rows=13,pts:number[]=[],tints:number[]=[],ix:number[]=[];
  for(let i=0;i<=cols;i++)for(let j=0;j<=rows;j++){
    const u=i/cols,v=j/rows;
    pts.push(0,-v*.43,.57+u*.91);
    const diamond=Math.abs(u-.52)*2.4+Math.abs(v-.49)*1.5;
    const dye=(u<=.05||u>=.95||v<=.09||v>=.92||diamond<.17||diamond>.35&&diamond<.51)?gold:red;
    const c=new T.Color(dye);tints.push(c.r,c.g,c.b);
    if(i&&j){const k=i*(rows+1)+j;ix.push(k-rows-2,k-1,k,k-rows-2,k,k-rows-1);}
  }
  const geo=new T.BufferGeometry(),p=new T.Float32BufferAttribute(pts,3);
  geo.setAttribute('position',p);geo.setAttribute('color',new T.Float32BufferAttribute(tints,3));geo.setIndex(ix);
  const cloth=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));
  cloth.castShadow=true;cloth.frustumCulled=false;joint.add(cloth);
  const toDeck=new T.Matrix4(),toFlag=new T.Matrix4(),corner=vec(),edge=vec(),drape=vec();
  let drag=0,lastYaw=0;
  return (dt:number,time:number)=>{
    const yaw=joint.rotation.y;
    if(dt>0){const rate=T.MathUtils.clamp((yaw-lastYaw)/dt,-12,12);drag=T.MathUtils.lerp(drag,rate,1-Math.exp(-dt*9));}
    lastYaw=yaw;
    joint.updateWorldMatrix(true,false);toDeck.copy(root.matrixWorld).invert().multiply(joint.matrixWorld);toFlag.copy(toDeck).invert();
    edge.set(0,0,1).transformDirection(toDeck);drape.set(edge.z,0,-edge.x).normalize();
    for(let i=0;i<=cols;i++)for(let j=0;j<=rows;j++){
      const u=i/cols,v=j/rows,bend=Math.min(.30,Math.abs(drag)*.036);
      corner.set((.035*Math.sin(u*11+time*3-v*2)-drag*.022)*v,-.045-v*(.43-bend)+.020*Math.sin(u*8)*v,.57+u*.91-.042*v*v).applyMatrix4(toDeck);
      if(corner.y<.016){
        corner.addScaledVector(drape,.016-corner.y);
        corner.y=.016+.012*Math.sin(u*10+v*3)**2;
      }
      corner.applyMatrix4(toFlag);p.setXYZ(i*(rows+1)+j,corner.x,corner.y,corner.z);
    }
    p.needsUpdate=true;geo.computeVertexNormals();
  };
}
type PoseKey = [number,Pose];
const radians = Math.PI/180;
function poseClip(name:string, keys:PoseKey[], bind:Record<string,T.Bone>) {
  const tracks:T.KeyframeTrack[]=[];
  for(const channel of new Set(keys.flatMap(([,pose])=>Object.keys(pose)))) {
    const translate=channel.endsWith('Pos'), joint=translate?channel.slice(0,-3):channel;
    const times:number[]=[],values:number[]=[];
    for(const [t,p] of keys){
      const tuple=p[channel];if(!tuple)continue;
      times.push(t);
      if(translate)values.push(...tuple);
      else values.push(...new T.Quaternion().setFromEuler(new T.Euler(...tuple.map(v=>v*radians) as Triple,'YXZ')).toArray());
    }
    if(!bind[joint])throw Error('Missing animation joint '+joint);
    tracks.push(translate? new T.VectorKeyframeTrack(joint+'.position',times,values):new T.QuaternionKeyframeTrack(joint+'.quaternion',times,values));
  }
  return new T.AnimationClip(name,keys[keys.length-1][0],tracks);
}

function animationLibrary(ship:boolean, joints:Record<string,T.Bone>) {
  const keys:PoseKey[]=[];
  const ready:Pose={HipsPos:[0,.70,0],Hips:[0,0,0],Spine:[3,0,0],Chest:[-2,0,0],Head:[0,0,0],
    ArmL:[-13,0,-12],ArmR:[-17,0,12],ElbowL:[-31,0,0],ElbowR:[-37,0,0],Pole:[-57,22,-7],PolePos:[-.065,-.14,.32]};
  const at=(changes:Pose):Pose=>({...ready,...changes});
  const clips:T.AnimationClip[]=[];
  clips.push(poseClip('watch',[[0,ready],[.95,at({Spine:[0,3,1],Chest:[-1,0,-1],Head:[-3,-5,1]})],[1.9,ready]],joints));
  for(const run of [false,true]){
    keys.length=0;
    const duration=run?.66:1, swing=run?32:20;
    for(let i=0;i<=8;i++){
      const a=i*Math.PI/4, stride=Math.sin(a), rise=.5-.5*Math.cos(2*a);
      keys.push([duration*i/8,at({HipsPos:[.022*stride,.667+rise*(run?.048:.027),0],
        Hips:[0,6*stride,-2*stride],Spine:[run?10:5,-3*stride,1.5*stride],Chest:[-3,-8*stride,2*stride],Head:[-2,2*stride,0],
        ArmL:[-17+swing*stride,0,-13],ArmR:[-17-swing*stride,0,13],ElbowL:[-35-8*stride,0,0],ElbowR:[-35+8*stride,0,0]})]);
    }
    clips.push(poseClip(run?'run':'walk',keys,joints));
  }
  const attackKeys:PoseKey[]=ship?[
    [0,ready],
    [.23,at({HipsPos:[.08,.642,0],Hips:[0,-10,-7],Spine:[5,-7,3],Chest:[0,-18,7],Head:[5,28,-5],ArmR:[-30,8,14],ElbowR:[-62,0,0]})],
    [.53,at({HipsPos:[.11,.675,.035],Hips:[0,-15,-4],Spine:[7,-12,6],Chest:[-2,-8,4],Head:[0,32,-4],ArmR:[-58,18,13],ElbowR:[-38,0,0],ArmL:[-28,-14,-22]})],
    [.80,at({HipsPos:[.115,.675,.035],Hips:[0,-15,-4],Spine:[7,-12,6],Chest:[-2,-8,4],Head:[0,32,-4],ArmR:[-76,31,8],ElbowR:[-18,0,0],ArmL:[-28,-14,-22]})],
    [.875,at({HipsPos:[.078,.66,-.02],Hips:[0,-12,-3],Spine:[-5,-8,6],Chest:[-9,-16,7],Head:[6,33,-4],ArmR:[-82,30,12],ElbowR:[-51,0,0],ArmL:[-15,-12,-27]})],
    [1.13,at({HipsPos:[.066,.652,-.017],Spine:[-3,-6,6],Chest:[-3,-11,3],Head:[1,18,-2],ArmR:[-48,12,17],ElbowR:[-50,0,0]})],
    [1.65,ready]
  ]:[
    [0,ready],
    [.27,at({HipsPos:[-.075,.60,-.035],Hips:[4,-15,5],Spine:[12,-10,4],Chest:[-3,-11,3],Head:[4,26,-5],Pole:[-66,-48,-8]})],
    [.64,at({HipsPos:[-.062,.635,-.015],Hips:[1,-18,3],Spine:[-6,-16,4],Chest:[-9,-14,5],Head:[7,34,-5],Pole:[-40,-81,-5],PolePos:[-.13,-.075,.28]})],
    [.84,at({HipsPos:[-.045,.625,.008],Hips:[1,-9,2],Spine:[-4,-18,2],Chest:[-3,-13,1],Head:[4,35,-3],Pole:[-12,-70,-5],PolePos:[-.10,-.11,.33]})],
    [.955,at({HipsPos:[.020,.59,.07],Hips:[4,8,-2],Spine:[16,0,-5],Chest:[5,-6,-3],Head:[-8,0,3],Pole:[5,0,2],PolePos:[-.025,-.15,.39]})],
    [1.08,at({HipsPos:[.070,.595,.070],Hips:[5,16,-5],Spine:[20,14,-9],Chest:[9,8,-4],Head:[-10,-24,4],Pole:[-3,54,2],PolePos:[.055,-.13,.34]})],
    [1.27,at({HipsPos:[.094,.575,.079],Hips:[7,16,-6],Spine:[25,16,-10],Chest:[11,9,-3],Head:[6,-24,6],Pole:[9,35,4],PolePos:[.055,-.19,.35]})],
    [1.65,at({HipsPos:[.073,.595,.055],Hips:[4,14,-3],Spine:[22,13,-9],Chest:[6,5,-3],Head:[4,-24,4],Pole:[10,40,4],PolePos:[.055,-.19,.35]})],
    [1.90,at({HipsPos:[.026,.64,.02],Hips:[0,5,0],Spine:[-4,5,-4],Chest:[-8,5,-2],Head:[4,-12,3],Pole:[-28,38,-2]})],
    [2.30,ready]
  ];
  clips.push(poseClip(ship?'lean-and-fire':'plant-and-sweep',attackKeys,joints));
  if(!ship){
    clips.push(poseClip('driving-thrust',[
      [0,ready],[.19,at({HipsPos:[-.045,.606,-.06],Spine:[10,-14,4],Head:[-5,16,0],Pole:[-21,13,0],PolePos:[-.11,-.14,.32]})],
      [.48,at({HipsPos:[-.05,.583,-.075],Spine:[15,-12,3],Chest:[4,-2,1],Head:[-10,15,0],Pole:[1,7,0],PolePos:[-.12,-.13,.34]})],
      [.61,at({HipsPos:[.01,.572,.19],Spine:[14,3,-3],Chest:[5,0,0],Head:[-10,-4,0],Pole:[0,-3,0],PolePos:[.005,-.09,.40]})],
      [.75,at({HipsPos:[.02,.59,.15],Spine:[12,4,-3],Head:[-8,-5,0],Pole:[3,-5,0],PolePos:[.018,-.13,.38]})],[1.24,ready]
    ],joints));
    clips.push(poseClip('returning-sweep',[
      [0,ready],[.23,at({HipsPos:[.067,.622,-.02],Spine:[-4,19,-7],Chest:[-6,13,-5],Head:[2,-21,2],Pole:[-37,58,-7]})],
      [.56,at({HipsPos:[.062,.605,0],Spine:[6,18,-7],Chest:[1,16,-3],Head:[-3,-26,3],Pole:[-12,58,0],PolePos:[.08,-.13,.31]})],
      [.68,at({HipsPos:[.018,.58,.085],Spine:[12,0,3],Chest:[4,0,0],Head:[-6,0,0],Pole:[2,0,-3],PolePos:[-.01,-.12,.40]})],
      [.82,at({HipsPos:[-.068,.596,.10],Spine:[14,-21,4],Chest:[3,-12,4],Head:[-7,24,-2],Pole:[-7,-63,2],PolePos:[-.09,-.12,.34]})],
      [1.03,at({HipsPos:[-.063,.605,.036],Spine:[12,-18,5],Head:[-2,16,-4],Pole:[-12,-57,0]})],[1.65,ready]
    ],joints));
    const kneel=at({HipsPos:[-.045,.34,-.035],Hips:[12,0,8],Spine:[24,-4,9],Chest:[8,4,8],Head:[24,3,0],Pole:[-19,54,0]});
    clips.push(poseClip('broken-standard',[[0,ready],[.18,kneel],[.68,kneel]],joints));
  }else{
    clips.push(poseClip('rope-pounce',[
      [0,ready],[.24,at({HipsPos:[0,.54,-.06],Spine:[22,0,0],Head:[-12,0,0],ArmR:[24,5,19],ArmL:[27,-5,-19]})],
      [.42,at({HipsPos:[0,.89,.14],Spine:[18,0,0],ArmR:[-67,4,16],ArmL:[-58,-4,-24],ElbowL:[-35,0,0],ElbowR:[-26,0,0]})],
      [.61,at({HipsPos:[0,.67,.32],Spine:[26,0,0],Head:[-16,0,0],ArmR:[-69,2,4],ArmL:[-63,-3,-7],ElbowL:[-14,0,0],ElbowR:[-12,0,0]})],
      [.79,at({HipsPos:[0,.48,.21],Spine:[39,6,0],Head:[-13,0,0],ArmR:[-28,0,8],ArmL:[-35,-5,-10]})],[1.38,ready]
    ],joints));
  }
  const folded=at({HipsPos:[.08,.215,-.09],Hips:[-75,12,-39],Spine:[-12,7,-8],Chest:[8,-8,3],Head:[18,-20,12],
    ArmL:[25,15,-73],ArmR:[-21,25,53],ElbowL:[-15,0,0],ElbowR:[-32,0,0],Pole:[11,74,-15]});
  clips.push(poseClip('fall',[[0,ready],[.18,at({HipsPos:[.035,.52,-.01],Chest:[-22,5,-16],Head:[-8,5,6]})],[.55,folded],[.67,{...folded,HipsPos:[.09,.229,-.095]}],[.82,folded]],joints));
  return clips;
}

const down=vec(0,-1,0);
function twoBoneSolver(upper:T.Bone,lower:T.Bone,lengthA:number,lengthB:number) {
  const a=vec(),dir=vec(),bend=vec(),elbow=vec(),end=vec(),orientation=new T.Quaternion();
  function aim(bone:T.Bone,from:T.Vector3,to:T.Vector3){
    bone.parent!.getWorldQuaternion(orientation).invert();
    dir.copy(to).sub(from).normalize().applyQuaternion(orientation);
    bone.quaternion.setFromUnitVectors(down,dir);
  }
  return (target:T.Vector3,pole:T.Vector3)=>{
    upper.getWorldPosition(a);dir.copy(target).sub(a);
    const d=T.MathUtils.clamp(dir.length(),.035,lengthA+lengthB-.0001);
    dir.normalize();end.copy(a).addScaledVector(dir,d);
    bend.copy(pole).sub(a);bend.addScaledVector(dir,-bend.dot(dir)).normalize();
    const along=(lengthA*lengthA-lengthB*lengthB+d*d)/(2*d);
    elbow.copy(a).addScaledVector(dir,along).addScaledVector(bend,Math.sqrt(Math.max(0,lengthA*lengthA-along*along)));
    aim(upper,a,elbow);aim(lower,elbow,end);
  };
}

// Silhouettes are equipment attached to the same animated shoulders and spine.
// The ship guardian opens two lacquered shutters around its actual sail knot.
function campaignEquipment(variant:BattleVariant|undefined,joints:Record<string,T.Bone>){
  const mounts:T.Group[]=[],covers:T.Group[]=[];
  const material=(color:string)=>new T.MeshStandardMaterial({color,roughness:.83,side:T.DoubleSide});
  const bronze=material(gold), cord=material(rope), linen=material(light), iron=material(ink);
  const add=(parent:T.Object3D,geo:T.BufferGeometry,m:T.Material,position:Triple)=>{
    const part=new T.Mesh(geo,m);part.position.set(...position);part.castShadow=true;parent.add(part);return part;
  };
  if(variant==='captain'||variant==='heavy'){
    const dye=material(variant==='heavy'?'#365669':'#aa463c');
    for(const k of (variant==='captain'?[-1,1]:[-1])){
      const mount=new T.Group();joints.Flinch.add(mount);mount.position.set(k*.17,-.09,-.20);mounts.push(mount);
      add(mount,new T.CylinderGeometry(.014,.024,1.03,9),cord,[0,.49,0]);
      const pole=add(mount,new T.CylinderGeometry(.012,.015,.31,9),bronze,[k*.13,.93,0]);pole.rotation.z=Math.PI/2;
      const cloth=new T.PlaneGeometry(.27,.61,5,8),v=cloth.attributes.position;
      for(let i=0;i<v.count;i++)v.setXYZ(i,v.getX(i),v.getY(i)+Math.abs(v.getX(i))*.12,v.getZ(i)+.028*Math.sin(v.getX(i)*31)*(1-v.getY(i)));
      cloth.computeVertexNormals();add(mount,cloth,dye,[k*.134,.60,0]);
      for(let n=0;n<3;n++){const split=add(mount,new T.BoxGeometry(.057,.057,.024),bronze,[k*.13,.70-n*.087,.041]);split.rotation.z=Math.PI/4;}
      if(variant==='heavy')mount.rotation.z=.26;
    }
  }
  if(variant==='boarder'){
    for(const [side,k] of [['L',-1],['R',1]] as const){
      const hand=joints['Hand'+side];
      const hook=new T.CatmullRomCurve3([vec(0,0,0),vec(k*.05,-.12,.06),vec(k*.08,-.21,.09),vec(k*.12,-.20,.01),vec(k*.115,-.15,-.03)]);
      add(hand,new T.TubeGeometry(hook,17,.019,8,false),bronze,[0,-.01,0]);
      for(let n=0;n<3;n++){const coil=add(joints['Elbow'+side],new T.TorusGeometry(.075-n*.004,.014,6,18),cord,[0,-.14-n*.026,0]);coil.rotation.x=Math.PI/2;}
    }
  }
  if(variant==='figurehead'){
    for(let n=0;n<3;n++){
      const loop=add(joints.Flinch,new T.TorusGeometry(.075,.022,7,21),n===1?linen:bronze,[0,-.045,.19+n*.012]);loop.rotation.z=n*Math.PI/3;loop.scale.x=.49;
    }
    for(const k of [-1,1]){
      const cover=new T.Group();joints.Flinch.add(cover);cover.position.set(k*.135,-.01,.151);covers.push(cover);
      const shield=add(cover,new T.SphereGeometry(1,12,8),iron,[-k*.067,-.029,.080]);shield.scale.set(.068,.094,.031);
      const rivet=add(cover,new T.SphereGeometry(.012,8,6),bronze,[-k*.065,-.025,.114]);rivet.scale.z=.6;
    }
  }
  let spread=0,open=0;
  return (dt:number,enraged:boolean,exposed:boolean,dead:boolean)=>{
    spread=T.MathUtils.lerp(spread,enraged&&!dead?1:0,1-Math.exp(-dt*4));
    open=T.MathUtils.lerp(open,exposed&&!dead?1:0,1-Math.exp(-dt*9));
    if(variant==='captain')mounts.forEach((m,i)=>{m.rotation.z=(i?-1:1)*(.09+spread*.86);});
    covers.forEach((m,i)=>{m.rotation.y=(i?1:-1)*open*1.30;});
  };
}

export function createBattleRig(ship:boolean,variant?:BattleVariant) {
  const {root,joints,mesh}=makeBody(ship,variant), mixer=new T.AnimationMixer(root);
  const clips=animationLibrary(ship,joints), actions:Record<string,T.AnimationAction>={};
  for(const clip of clips)actions[clip.name]=mixer.clipAction(clip);
  const equipment=campaignEquipment(variant,joints);
  let attackKind:RigAttack=ship?'shoot':'sweep',duration=0,markers={contact:0,end:0};
  let enraged=false,exposed=false,stun=0;
  const attacks:Record<RigAttack,[string,number,number]>={
    shoot:['lean-and-fire',.80,.98],sweep:['plant-and-sweep',.84,1.08],follow:['returning-sweep',.56,.82],
    thrust:ship?['rope-pounce',.43,.72]:['driving-thrust',.48,.75]
  };
  const moveFlag=ship?null:flag(joints.Pole,root);
  const limbs=(['L','R'] as Side[]).map(s=>({
    s,k:s==='L'?-1:1,arm:twoBoneSolver(joints['Arm'+s],joints['Elbow'+s],.30,.285),
    leg:twoBoneSolver(joints['Thigh'+s],joints['Shin'+s],.31,.28)
  }));
  let active='',age=-1,dead=false,clock=0,hitAge=1,hitSide=1;
  const position=vec(),previousPosition=vec(),heading=vec(0,0,1),delta=vec(),target=vec(),pole=vec();
  const from=vec(),shaft=vec(),clamped=vec(),correction=new T.Quaternion(),parentQ=new T.Quaternion();
  const dropStart=vec(),dropEnd=ship?vec(.68,-.136,-.13):vec(.22,.036,.49),dropStartQ=new T.Quaternion();
  const dropEndQ=new T.Quaternion().setFromEuler(ship?new T.Euler(.11,-.3,-.19):new T.Euler(0,1.09,-.90));
  let fallenTime=0;
  function settleFlag(){
    const joint=joints.Pole;
    joint.getWorldPosition(from);joint.localToWorld(shaft.set(0,0,1.73));
    root.worldToLocal(from);root.worldToLocal(shaft);shaft.sub(from).normalize();
    const contact=age>1.18&&age<1.65?-.034:.014;
    const minY=(contact-from.y)/1.73;
    if(shaft.y>=minY)return;
    const horizontal=Math.sqrt(Math.max(0,1-minY*minY));
    clamped.set(shaft.x,0,shaft.z).normalize().multiplyScalar(horizontal);clamped.y=minY;
    root.localToWorld(clamped.add(from));root.localToWorld(shaft.add(from));root.localToWorld(from);
    correction.setFromUnitVectors(shaft.sub(from).normalize(),clamped.sub(from).normalize());
    joint.parent!.getWorldQuaternion(parentQ);
    correction.premultiply(parentQ.clone().invert()).multiply(parentQ);
    joint.quaternion.premultiply(correction);
  }
  function dropEquipment(dt:number){
    fallenTime+=dt;
    const item=ship?joints.Hat:joints.Pole,u=Math.min(1,fallenTime/.75);
    target.copy(dropStart).lerp(dropEnd,u);target.y+=(ship?.56:.24)*4*u*(1-u);
    root.localToWorld(target);item.parent!.worldToLocal(target);item.position.copy(target);
    root.getWorldQuaternion(parentQ);correction.copy(dropStartQ).slerp(dropEndQ,u).premultiply(parentQ);
    item.parent!.getWorldQuaternion(parentQ);item.quaternion.copy(parentQ.invert().multiply(correction));
  }
  const invRoot=new T.Quaternion(),footRotation=new T.Quaternion();
  const frame={phase:'approach' as RigPhase,release:false,sweep:false,sweepStart:0,sweepEnd:1,previousBase:vec(),previousTip:vec(),bladeBase:vec(),bladeTip:vec(),muzzle:vec()};
  function play(name:string,loop:boolean,fade=.12){
    if(active===name)return;
    const old=actions[active], next=actions[name];
    const shared=old&&['walk','run'].includes(active)&&['walk','run'].includes(name);
    const phase=shared?old.time/old.getClip().duration:0;
    next.reset().stopFading().setEffectiveWeight(1).setLoop(loop?T.LoopRepeat:T.LoopOnce,loop?Infinity:1).play();
    next.clampWhenFinished=!loop;next.time=(phase%1)*next.getClip().duration;
    if(old){if(fade)next.crossFadeFrom(old,fade,false);else old.stop();}
    active=name;
  }
  function update(dt:number,speed:number) {
    clock+=dt;hitAge+=dt;
    frame.previousBase.copy(frame.bladeBase);frame.previousTip.copy(frame.bladeTip);
    frame.release=false;frame.sweep=false;frame.sweepStart=0;frame.sweepEnd=1;
    if(dead){frame.phase='down';}
    else if(stun>0){stun=Math.max(0,stun-dt);frame.phase=stun>0?'recover':'approach';}
    else if(age>=0){
      const previous=age;age+=dt;
      frame.release=attackKind==='shoot'&&previous<markers.contact&&age>=markers.contact;
      frame.sweep=attackKind!=='shoot'&&age>=markers.contact&&previous<markers.end;
      if(frame.sweep&&dt>0){
        frame.sweepStart=T.MathUtils.clamp((markers.contact-previous)/dt,0,1);
        frame.sweepEnd=T.MathUtils.clamp((markers.end-previous)/dt,0,1);
      }
      frame.phase=age<markers.contact?'windup':age<markers.end?'strike':'recover';
      if(age>=duration){age=-1;frame.phase='approach';}
    }
    if(!dead&&age<0&&stun<=0){
      play(speed>.08?(speed>2.0?'run':'walk'):'watch',true);
      actions[active].setEffectiveTimeScale(active==='watch'?1:T.MathUtils.clamp(speed/(active==='walk'?1.05:2.1),.42,1.55));
    }
    mixer.update(dt);
    const snap=hitAge<.34?Math.sin(Math.PI*hitAge/.34)*Math.exp(-hitAge*7):0;
    joints.Flinch.rotation.set(-.18*snap,.44*hitSide*snap,-.26*hitSide*snap);
    root.getWorldPosition(position);root.getWorldQuaternion(invRoot).invert();
    delta.copy(position).sub(previousPosition).applyQuaternion(invRoot);delta.y=0;
    if(delta.lengthSq()>1e-7&&delta.lengthSq()<.5)heading.lerp(delta.normalize(),1-Math.exp(-dt*18)).normalize();
    previousPosition.copy(position);
    const stridePhase=actions[active].time/actions[active].getClip().duration;
    const moving=active==='walk'||active==='run';
    const step=Math.min(.32,Math.max(.12,speed*(active==='run'?.66:1)/(4*actions[active].timeScale||4)));
    equipment(dt,enraged,exposed,dead);
    if(!ship&&!dead)settleFlag();
    if(dead)dropEquipment(dt);
    for(const {s,k,arm,leg} of limbs){
      const a=2*Math.PI*(stridePhase+(k<0?0:.5));
      const ground=(2/Math.PI)*Math.asin(Math.sin(a)),lift=Math.max(0,Math.cos(a));
      let x=k*.148,y=.083,z=k*.06;
      if(moving){x+=heading.x*step*ground;z+=heading.z*step*ground;y+=lift*lift*(active==='run'?.125:.082);}
      else if(!dead&&age>=0){
        const plant=T.MathUtils.smoothstep(age,0,.36)*(1-T.MathUtils.smoothstep(age,duration-.35,duration));
        if(ship&&attackKind==='thrust'){
          const jump=Math.sin(Math.PI*T.MathUtils.clamp((age-.21)/.56,0,1));
          y+=.29*jump;z+=.26*jump;
        }
        else if(ship){if(k>0){x+=.16*plant;y+=.07*Math.sin(Math.PI*plant);}}
        else {z+=k*.16*plant;x+=k*.032*plant;y+=k>0?.08*Math.sin(Math.PI*plant):0;}
      }
      if(dead){x+=k*.126;z+=k*.12+.22;}
      root.localToWorld(target.set(x,y,z));
      root.localToWorld(pole.set(x+k*.03,.38,z+.55));leg(target,pole);
      // Keep the sole parallel to the support while the knees flex.
      joints['Foot'+s].parent!.getWorldQuaternion(footRotation).invert();
      joints['Foot'+s].quaternion.copy(footRotation).multiply(root.quaternion);
      if(!ship&&!dead){
        joints.Pole.localToWorld(target.set(0,0,k<0?-.09:.065));
        root.localToWorld(pole.set(k*.65,.74,-.18));arm(target,pole);
      }
    }
    moveFlag?.(dt,clock);
    joints.HandR.localToWorld(frame.muzzle.set(0,-.087,.022));
    joints.Pole.localToWorld(frame.bladeBase.set(0,0,.46));
    joints.Pole.localToWorld(frame.bladeTip.set(0,0,1.73));
    if(ship&&attackKind==='thrust'){
      joints.HandL.localToWorld(frame.bladeBase.set(0,-.13,.05));
      joints.HandR.localToWorld(frame.bladeTip.set(0,-.21,.09));
    }
    return frame;
  }
  function reset(){
    mixer.stopAllAction();active='';age=-1;dead=false;clock=0;hitAge=1;enraged=false;exposed=false;stun=0;
    if(ship){joints.Hat.position.set(0,0,0);joints.Hat.quaternion.identity();}
    frame.phase='approach';heading.set(0,0,1);root.getWorldPosition(previousPosition);
    play('watch',true,0);update(0,0);
    frame.previousBase.copy(frame.bladeBase);frame.previousTip.copy(frame.bladeTip);
  }
  reset();
  return {root,clips,mesh,update,reset,
    attack(kind:RigAttack=variant==='boarder'?'thrust':ship?'shoot':'sweep'){
      if(dead||age>=0||stun>0)return false;
      const [clip,contact,end]=attacks[kind];
      if(!actions[clip])return false;
      age=0;attackKind=kind;markers={contact,end};duration=actions[clip].getClip().duration;play(clip,false);return true;
    },
    setEnraged(value:boolean){enraged=value;},
    setExposed(value:boolean){exposed=value;},
    stagger(seconds=1){
      if(dead||stun>0||!actions['broken-standard'])return false;
      age=-1;stun=seconds;play('broken-standard',false,.09);return true;
    },
    hit(side:number){if(!dead){hitAge=0;hitSide=side<0?-1:1;}},
    defeat(){
      if(dead)return;
      const item=ship?joints.Hat:joints.Pole;
      root.worldToLocal(item.getWorldPosition(dropStart));
      item.getWorldQuaternion(dropStartQ);root.getWorldQuaternion(parentQ);
      dropStartQ.premultiply(parentQ.invert());fallenTime=0;
      dead=true;age=-1;hitAge=1;play('fall',false,.12);
    }
  };
}
