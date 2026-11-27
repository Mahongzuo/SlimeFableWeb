import * as T from 'three';
import type {Vec} from '../slime/types';
import {elements} from '../slime/elements';
import {disturbWater} from './water-waves';

interface Drop {p:T.Vector3;v:T.Vector3;r:number;level:number;age:number}
const count=84,edges=80,up=new T.Vector3(0,1,0);

// A droplet transmits most of the background through its centre. Thin rims and
// a tight directional highlight read at gameplay distance without an emissive disc.
function sprayMaterial(ctx:any){
  return new T.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{sun:ctx.U.uSun,lightDir:{value:new T.Vector3()}},
    vertexShader:`varying vec3 nWorld,eye;
      void main(){
        mat4 model=modelMatrix*instanceMatrix;
        vec3 p=(model*vec4(position,1.)).xyz;
        nWorld=normalize(transpose(inverse(mat3(model)))*normal);
        eye=cameraPosition-p;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
      }`,
    fragmentShader:`uniform float sun;uniform vec3 lightDir;varying vec3 nWorld,eye;
      void main(){
        vec3 n=normalize(nWorld),v=normalize(eye);float rim=pow(1.-max(0.,dot(n,v)),2.);
        float shine=pow(max(dot(n,normalize(lightDir+v)),0.),46.);
        float sky=smoothstep(-.4,.75,reflect(-v,n).y);
        vec3 tint=mix(vec3(.08,.32,.32),vec3(.59,.86,.94),sky);
        gl_FragColor=vec4(tint*(.32+.68*sun)+vec3(1.,.96,.87)*shine*sun,
                            .13+.49*rim+.33*shine);
        #include <colorspace_fragment>
      }`});
}

function waterCrown(){
  const coords=new Float32Array((edges+1)*2*3),indices:number[]=[];
  for(let i=0;i<edges;i++){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.BufferAttribute(coords,3).setUsage(T.DynamicDrawUsage));geo.setIndex(indices);
  const mat=new T.MeshStandardMaterial({color:0xb0e6df,roughness:.17,transparent:true,depthWrite:false,side:T.DoubleSide});
  const mesh=new T.Mesh(geo,mat);mesh.visible=false;mesh.frustumCulled=false;mesh.layers.set(1);mesh.renderOrder=3;
  return {mesh,age:1,power:0,seed:0};
}
export class SeaFX {
  private drops:Drop[]=Array.from({length:count},()=>({p:new T.Vector3(),v:new T.Vector3(),r:0,level:0,age:0}));
  private spray:any;
  private pose=new T.Object3D();private axis=new T.Vector3();private cursor=0;
  private crowns=Array.from({length:3},waterCrown);private wake=0;
  private steam:any[]=[];private steamClock=0;
  constructor(private ctx:any){
    this.spray=new T.InstancedMesh(new T.SphereGeometry(1,12,8),sprayMaterial(ctx),count);
    this.spray.count=0;this.spray.frustumCulled=false;this.spray.layers.set(1);this.spray.renderOrder=4;
    this.spray.instanceMatrix.setUsage(T.DynamicDrawUsage);
    ctx.scene.add(this.spray,...this.crowns.map(c=>c.mesh));
    for(let i=0;i<10;i++){
      const sprite=ctx.mats.glowSprite(0xe0eee8,.15);sprite.visible=false;sprite.layers.set(1);
      ctx.scene.add(sprite);this.steam.push(sprite);
    }
  }
  private emit(x:number,z:number,level:number,power:number,angle:number){
    const d=this.drops[this.cursor];this.cursor=(this.cursor+1)%count;
    const radial=.55+Math.random()*power*.86,foot=.21+Math.random()*.12;
    d.p.set(x+Math.cos(angle)*foot,level+.035,z+Math.sin(angle)*foot);
    d.v.set(Math.cos(angle)*radial,1.05+Math.random()*power*1.65,Math.sin(angle)*radial);
    d.level=level;d.age=0;d.r=(.009+.017*Math.random()**1.8)*(.80+.17*power);
  }
  splash(p:Vec,speed:number,level=this.ctx.groundY(p[0],p[2])){
    const power=Math.min(2.4,Math.max(.45,speed*.23));
    const c=this.crowns.reduce((a,b)=>a.age>b.age?a:b);
    c.age=0;c.power=power;c.seed=Math.random()*6.28;c.mesh.position.set(p[0],level+.012,p[2]);c.mesh.visible=true;
    const n=Math.round(12+power*17);
    for(let i=0;i<n;i++)this.emit(p[0],p[2],level,power,(i+Math.random())*Math.PI*2/n);
    disturbWater(this.ctx,p[0],p[2],.32+power*.12);
  }
  update(dt:number,slime:any){
    const p=slime.position as Vec,speed=Math.hypot(slime.velocity[0],slime.velocity[2]);
    if(slime.swimming&&speed>.32){
      this.wake+=speed*dt;
      if(this.wake>.46){this.wake=0;disturbWater(this.ctx,p[0]-slime.forward[0]*.22,p[2]-slime.forward[2]*.22,.105);}
    }else this.wake=0;
    this.spray.material.uniforms.lightDir.value.copy(this.ctx.sun.userData.offset).normalize();
    let active=0;
    for(const d of this.drops){
      if(!d.r)continue;
      d.age+=dt;d.p.addScaledVector(d.v,dt);d.v.y-=9.81*dt;
      if(d.p.y<d.level){d.r=0;continue;}
      this.pose.position.copy(d.p);
      this.pose.quaternion.setFromUnitVectors(up,this.axis.copy(d.v).normalize());
      this.pose.scale.set(d.r,d.r*(1.15+.32*d.v.length()),d.r);
      this.pose.updateMatrix();this.spray.setMatrixAt(active++,this.pose.matrix);
    }
    this.spray.count=active;this.spray.instanceMatrix.needsUpdate=active>0;
    for(const c of this.crowns){
      if(!c.mesh.visible)continue;
      c.age+=dt;const phase=c.age/.39;
      if(phase>=1){c.mesh.visible=false;continue;}
      const pos=c.mesh.geometry.attributes.position,h=Math.sin(Math.PI*phase)**.75;
      for(let i=0;i<=edges;i++){
        const a=i/edges*Math.PI*2,crest=.58+.24*Math.sin(7*a+c.seed)+.18*Math.sin(13*a-c.seed);
        const r=.23+phase*(.36+.11*c.power)+.035*Math.sin(3*a+c.seed);
        const rim=r+h*(.055+.045*c.power);
        pos.setXYZ(i*2,r*Math.cos(a),0,r*Math.sin(a));
        pos.setXYZ(i*2+1,rim*Math.cos(a),h*crest*(.18+.14*c.power),rim*Math.sin(a));
      }
      pos.needsUpdate=true;c.mesh.geometry.computeVertexNormals();
      c.mesh.material.opacity=(1-phase)*.36;
    }
    this.steamClock-=dt;
    if(slime.swimming&&slime.element===2&&this.steamClock<=0){
      this.steamClock=.12;const mist=this.steam.find(s=>!s.visible);
      if(mist){mist.visible=true;mist.userData.age=0;mist.position.set(p[0]+(Math.random()-.5)*.35,p[1]+.27,p[2]);}
    }
    for(const mist of this.steam)if(mist.visible){
      const a=mist.userData.age+=dt;mist.position.y+=dt*.43;mist.scale.setScalar(.11+a*.32);
      mist.material.opacity=.15*Math.sin(Math.min(1,a)*Math.PI);mist.visible=a<1;
    }
  }
  static tint(element:number){return elements[element].color;}
}
