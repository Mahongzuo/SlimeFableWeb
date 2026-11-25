import * as T from 'three';

/** Each world-space drop, expanding ring and rebounding spray share one impact point and clock. */
export function gardenRain(scene:any,camera:any,U:any,height:(x:number,z:number)=>number){
  const count=430, anchors=new Float32Array(count*3), phases=new Float32Array(count);
  const vertices:number[]=[], kinds:number[]=[];
  function line(kind:number,a:number[],b:number[]){vertices.push(...a,...b);kinds.push(kind,kind);}
  line(0,[0,0,0],[0,.41,0]);
  for(let k=0;k<14;k++){
    const a=k*Math.PI/7,b=(k+1)*Math.PI/7;
    line(1,[Math.cos(a),0,Math.sin(a)],[Math.cos(b),0,Math.sin(b)]);
    if(k%2===0)line(2,[Math.cos(a),0,Math.sin(a)],[Math.cos(a)*1.13,.026,Math.sin(a)*1.13]);
  }
  const geo=new T.InstancedBufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geo.setAttribute('kind',new T.Float32BufferAttribute(kinds,1));
  const anchor=new T.InstancedBufferAttribute(anchors,3);
  geo.setAttribute('anchor',anchor);geo.setAttribute('seed',new T.InstancedBufferAttribute(phases,1));geo.instanceCount=count;
  let state=3821;const random=()=>(state=state*16807%2147483647)/2147483647;
  for(let i=0;i<count;i++)phases[i]=random();
  const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:U,
    vertexShader:`attribute vec3 anchor;attribute float seed,kind;uniform float uTime,uRain;varying float alpha;
      void main(){float phase=fract(uTime*(.73+seed*.37)+seed*71.);
        vec3 p=anchor;float fall=max(0.,.68-phase)*13.;
        if(kind<.5){p+=vec3(-.085,1.,.025)*(fall+position.y);alpha=step(phase,.68)*.62;}
        else {float t=clamp((phase-.68)/.32,0.,1.);
          p.xz+=position.xz*(.018+t*(kind<1.5?.21:.13));
          p.y+=.014+(kind>1.5?sin(t*3.14159)*(.07+seed*.10)+position.y:0.);
          alpha=step(.68,phase)*(1.-t)*(kind<1.5?.77:.98);}
        alpha*=uRain;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
    fragmentShader:'varying float alpha;void main(){if(alpha<.015)discard;gl_FragColor=vec4(.72,.89,1.,alpha);}'});
  const rain=new T.LineSegments(geo,mat);rain.name='garden-rain-contacts';rain.layers.set(1);rain.frustumCulled=false;scene.add(rain);
  const last=new Int32Array(count).fill(-1);
  return function update(time:number){
    rain.visible=U.uRain.value>.012;if(!rain.visible)return;
    let changed=false;
    for(let i=0;i<count;i++){
      const s=phases[i],cycle=Math.floor(time*(.73+s*.37)+s*71.);
      if(cycle===last[i])continue;
      last[i]=cycle;
      const span=i<count*.57?13:37;
      const x=camera.position.x+(random()-.5)*span,z=camera.position.z+(random()-.5)*span;
      anchor.setXYZ(i,x,height(x,z),z);changed=true;
    }
    if(changed)anchor.needsUpdate=true;
  };
}
