import type {Deposit} from './contact';
import type {CollisionWorld} from './world';
import type {Vec} from './types';

export const transientElement=(element:number)=>element===2||element===3;
const flameCount=88, segmentCount=300;
const clipBehindScene=`
 uniform sampler2D uDepth;uniform vec2 uResolution;uniform float uNear,uFar;
 float viewDepth(float d){return uNear*uFar/(uFar+(uNear-uFar)*d);}
 bool behind(){return viewDepth(gl_FragCoord.z)>viewDepth(texture2D(uDepth,gl_FragCoord.xy/uResolution).r)+.012;}`;

export class ContactEffects {
  contacts:Deposit[]=[];
  private flames:any;private arcs:any;
  private bases:any;private launches:any;
  private starts:any;private ends:any;private widths:any;
  private cursor=0;private emitted=-Infinity;
  private segments=0;
  constructor(T:any,scene:any,private world:CollisionWorld,uniforms:any){
    const makeQuad=()=>{
      const g=new T.InstancedBufferGeometry();
      g.setIndex([0,1,2,0,2,3]);
      g.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3));
      return g;
    };
    const attribute=(count:number,size:number)=>new T.InstancedBufferAttribute(new Float32Array(count*size),size).setUsage(T.DynamicDrawUsage);
    const mesh=(g:any,vertexShader:string,fragmentShader:string,name:string)=>{
      const mat=new T.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:false,side:T.DoubleSide});
      const obj=new T.Mesh(g,mat);obj.name=name;obj.frustumCulled=false;obj.renderOrder=3;scene.add(obj);return obj;
    };
    const flame=makeQuad();
    this.bases=attribute(flameCount,3);this.launches=attribute(flameCount,4);
    this.launches.array.fill(-1000);flame.setAttribute('base',this.bases);flame.setAttribute('launch',this.launches);
    flame.instanceCount=flameCount;
    this.flames=mesh(flame,`
      attribute vec3 base;attribute vec4 launch;uniform float uTime;varying vec2 uvFlame;varying float age,seed;
      void main(){
        age=(uTime-launch.x)/(.24+.22*launch.y);seed=launch.y;
        float t=clamp(age,0.,1.);
        vec3 p=base+vec3(launch.z*t,t*(.18+.22*seed),launch.w*t);
        vec4 eye=viewMatrix*vec4(p,1.);
        float swell=(.60+.40*sin(t*3.14159))*(1.-.58*t);
        eye.xy+=position.xy*vec2(.052+.025*seed,.090+.062*seed)*swell;
        uvFlame=position.xy;gl_Position=projectionMatrix*eye;
      }`,`${clipBehindScene}
      varying float age,seed;varying vec2 uvFlame;
      void main(){
        if(age<0.||age>=1.||behind())discard;
        float h=uvFlame.y*.5+.5;
        float curl=sin(h*6.+seed*24.+age*7.)*.26*h;
        float r=length(vec2((uvFlame.x-curl)/max(.15,1.-.78*h),uvFlame.y));
        float body=1.-smoothstep(.38,1.,r);if(body<.012)discard;
        vec3 c=mix(vec3(.9,.055,.004),vec3(1.55,.39,.018),body);
        c=mix(c,vec3(1.8,1.15,.24),(1.-smoothstep(.05,.66,r))*(1.-h));
        gl_FragColor=vec4(c,body*(1.-smoothstep(.48,1.,age))*.91);
        #include <colorspace_fragment>
      }`,'slime-contact-flames');
    const arc=makeQuad();this.starts=attribute(segmentCount,3);this.ends=attribute(segmentCount,3);
    this.widths=attribute(segmentCount,2);arc.setAttribute('widths',this.widths);
    arc.setAttribute('startPoint',this.starts);arc.setAttribute('endPoint',this.ends);arc.instanceCount=0;
    this.arcs=mesh(arc,`attribute vec3 startPoint,endPoint;attribute vec2 widths;varying float across;
      void main(){
        vec4 a=viewMatrix*vec4(startPoint,1.),b=viewMatrix*vec4(endPoint,1.);
        vec2 dir=b.xy-a.xy;dir/=max(.00001,length(dir));across=position.y;
        float t=position.x*.5+.5;vec4 eye=mix(a,b,t);
        eye.xy+=vec2(-dir.y,dir.x)*across*mix(widths.x,widths.y,t)*.016;
        gl_Position=projectionMatrix*eye;
      }`,`${clipBehindScene} varying float across;
      void main(){
        if(behind())discard;
        float d=abs(across),halo=exp(-3.2*d);
        vec3 c=mix(vec3(.33,.065,.95),vec3(1.35,1.12,1.65),1.-smoothstep(.08,.38,d));
        gl_FragColor=vec4(c,max(halo,1.-smoothstep(.22,.57,d)));
        #include <colorspace_fragment>
      }`,'slime-contact-arcs');
    this.flames.visible=false;
  }
  private emitFlames(c:Deposit,time:number){
    for(let n=0;n<4;n++){
      const a=Math.random()*Math.PI*2,s=Math.random(),r=c.radius*(.70+.34*s);
      const i=this.cursor++%flameCount,x=c.center[0]+r*Math.cos(a),z=c.center[2]+r*Math.sin(a);
      this.bases.setXYZ(i,x,c.center[1]+.035,z);
      this.launches.setXYZW(i,time,s,Math.cos(a)*(.04+s*.075),Math.sin(a)*(.04+s*.075));
    }
    this.bases.needsUpdate=this.launches.needsUpdate=true;
  }
  private segment(a:Vec,b:Vec,from:number,to:number){
    if(this.segments>=segmentCount)return;
    this.widths.setXY(this.segments,from,to);this.starts.setXYZ(this.segments,...a);this.ends.setXYZ(this.segments,...b);this.segments++;
  }
  private discharge(c:Deposit,time:number){
    const phase=Math.floor(time*12),salt=phase*19.3+c.id*13.1;
    const noise=(i:number)=>{const n=Math.sin(salt+i*127.3)*43758.55;return n-Math.floor(n);};
    for(let j=0;j<3;j++){
      const k=j*23,a=(j+noise(k)*.77)*Math.PI*2/3;
      const dx=Math.cos(a),dz=Math.sin(a),reach=.18+noise(k+1)*.27;
      const [cx,cy,cz]=c.center;
      let prior:Vec=[cx+dx*c.radius*.82,cy+.105,cz+dz*c.radius*.82];
      for(let n=1;n<=5;n++){
        const t=n/5,jitter=(noise(k+n+2)-.5)*.13;
        const x=cx+dx*(c.radius*.82+t*reach)-dz*jitter,z=cz+dz*(c.radius*.82+t*reach)+dx*jitter;
        const floor=this.world.support(x,z,cy+.04);
        if(floor===null||Math.abs(floor-cy)>.14)break;
        const p:Vec=[x,floor+.015+(1.-t)*(.055+noise(k+n+10)*.065),z];
        this.segment(prior,p,1.-(n-1)*.14,n===5?.06:1.-n*.14);
        if(n===3){
          const bx=x-dz*.113+dx*.047,bz=z+dx*.113+dz*.047,by=this.world.support(bx,bz,cy+.04);
          if(by!==null&&Math.abs(by-cy)<.14){
            const mid:Vec=[(x+bx)*.5+dx*.035,(p[1]+by)*.5+.021,(z+bz)*.5+dz*.035];
            this.segment(p,mid,.60,.34);this.segment(mid,[bx,by+.015,bz],.34,.05);
          }
        }
        prior=p;
      }
    }
  }
  update(time:number,element:number,grounded:boolean){
    this.segments=0;
    const emit=time-this.emitted>.045;
    if(transientElement(element)){
      for(const c of this.contacts){
        if(c.element!==element || (c.id===0&&!grounded))continue;
        if(element===2 && emit){this.emitFlames(c,time);this.emitted=time;}
        else if(element===3)this.discharge(c,time);
      }
    }
    this.flames.visible=element===2 && time-this.emitted<.47;
    this.arcs.geometry.instanceCount=this.segments;this.arcs.visible=this.segments>0;
    if(this.segments)this.starts.needsUpdate=this.ends.needsUpdate=this.widths.needsUpdate=true;
  }
  reset(){this.contacts=[];this.emitted=-Infinity;this.launches.array.fill(-1000);this.launches.needsUpdate=true;this.arcs.visible=this.flames.visible=false;}
  dispose(){for(const mesh of [this.flames,this.arcs]){mesh.geometry.dispose();mesh.material.dispose();}}
}
