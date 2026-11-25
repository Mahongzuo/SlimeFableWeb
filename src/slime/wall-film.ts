import {elements} from './elements';
import {distance,type Vec} from './types';

/** Project each contact onto visible wall pixels, including irregular plaster and stone. */
export class WallFilm {
  private readonly capacity=64;
  private next=0;
  private last:Vec|null=null;
  private lastTime=-Infinity;
  private mesh:any;
  private born:any;
  private tint:any;
  private dummy:any;
  private axis:any;
  private normal:any;
  constructor(T:any,scene:any,shared:any){
    const geo=new T.BoxGeometry(1,1,1);
    this.born=new T.InstancedBufferAttribute(new Float32Array(this.capacity).fill(-100),1);
    this.tint=new T.InstancedBufferAttribute(new Float32Array(this.capacity*3),3);
    geo.setAttribute('birth',this.born);geo.setAttribute('tint',this.tint);
    const mat=new T.ShaderMaterial({side:T.BackSide,transparent:true,depthWrite:false,depthTest:false,
      uniforms:shared,vertexShader:`attribute float birth;attribute vec3 tint;
        varying vec3 center,wallNormal,wallTint;varying float age;uniform float uTime;
        void main(){center=instanceMatrix[3].xyz;wallNormal=normalize(instanceMatrix[2].xyz);
          wallTint=tint;age=uTime-birth;gl_Position=projectionMatrix*viewMatrix*instanceMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec3 center,wallNormal,wallTint;varying float age;uniform sampler2D uDepth;
        uniform vec2 uResolution;uniform mat4 uInvProjection,uInvView;
        void main(){
          if(age>6.)discard;
          vec2 uv=gl_FragCoord.xy/uResolution;
          vec4 eye=uInvProjection*vec4(uv*2.-1.,texture2D(uDepth,uv).r*2.-1.,1.);
          vec3 p=(uInvView*vec4(eye.xyz/eye.w,1.)).xyz;
          vec3 n=normalize(cross(dFdx(p),dFdy(p)));
          vec3 d=p-center;float z=dot(d,wallNormal);
          if(abs(z)>.27 || dot(n,wallNormal)<.45)discard;
          vec2 xy=vec2(dot(d,cross(vec3(0.,1.,0.),wallNormal))/.22,d.y/.26);
          float r=length(xy)+.035*sin(xy.y*11.+center.x);
          float coverage=(1.-smoothstep(.76,1.,r))*(1.-smoothstep(2.,6.,age));
          float shine=exp(-abs(r-.78)*19.)*max(0.,xy.y+.45);
          gl_FragColor=vec4(wallTint*.50+vec3(.10,.20,.23)+shine*.55,coverage*.52);
          #include <colorspace_fragment>
        }`});
    this.mesh=new T.InstancedMesh(geo,mat,this.capacity);this.mesh.count=0;
    this.mesh.frustumCulled=false;this.mesh.renderOrder=5;scene.add(this.mesh);
    this.dummy=new T.Object3D();this.axis=new T.Vector3(0,0,1);this.normal=new T.Vector3();
    this.colors=elements.map(e=>new T.Color(e.color));
  }
  private colors:any[];
  touch(point:Vec,normal:Vec,element:number,time:number){
    if(this.last && distance(this.last,point)<.10 && time-this.lastTime<1)return;
    this.last=[...point];this.lastTime=time;
    const i=this.next++%this.capacity,c=this.colors[element],d=this.dummy;
    d.position.fromArray(point);d.quaternion.setFromUnitVectors(this.axis,this.normal.fromArray(normal));
    d.scale.set(.48,.56,.56);d.updateMatrix();
    this.mesh.setMatrixAt(i,d.matrix);this.born.setX(i,time);this.tint.setXYZ(i,c.r,c.g,c.b);
    this.mesh.count=Math.min(this.next,this.capacity);
    this.mesh.instanceMatrix.needsUpdate=this.tint.needsUpdate=this.born.needsUpdate=true;
  }
  reset(){this.next=0;this.mesh.count=0;this.last=null;}
  dispose(){this.mesh.geometry.dispose();this.mesh.material.dispose();this.mesh.dispose();}
}
