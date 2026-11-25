import {climateMaterial} from './climate-material';
import {gateTitle,gateSummary,gatePalette,type Gate} from '../game/mode-gates';
import {Vec} from '../slime/types';
import {PortalSlot, pillarOffset} from './layout';
import {SERIF, SANS, tagTexture, paperCard} from './paper';
const ARCH_W = .94, ARCH_H = 2.7, BASE = .22;
const vert = `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const frag = `uniform float uTime, uOpen, uHover; uniform vec3 uA, uB; varying vec2 vP;
float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
void main(){
  vec2 c = vP - vec2(0.0, ${(ARCH_H * .62).toFixed(3)});
  float r = length(c * vec2(1.0, .78)), a = atan(c.y, c.x);
  float swirl = sin(r * 7.0 - uTime * 1.6 + a * 2.0) * .5 + .5;
  float band = smoothstep(.35, .65, sin(r * 15.0 - uTime * 2.4 + a * 3.0 + swirl * 2.0) * .5 + .5);
  vec3 col = mix(uB, uA, swirl * .75 + band * .25);
  col = mix(col, vec3(1.0, .98, .92), smoothstep(.55, .0, r) * (.55 + .25 * uHover));
  float edge = smoothstep(0.0, .16, ${ARCH_W.toFixed(2)} - abs(vP.x)) * smoothstep(0.0, .10, vP.y - ${BASE.toFixed(2)});
  col += (h(floor(vP * 90.0) + floor(uTime * 8.0)) - .5) * .05;
  gl_FragColor = vec4(col, uOpen * (.78 + .18 * uHover) * edge);
}`;
/** Three chapter arches and three mode arches, all facing the lectern. */
export class TimePortal {
  readonly group: any; gate: Gate | null = null; hover = 0; private open = 0;
  private disc: any; private uniforms: any; private tag: any; private keystone: any; private glow: any; private T: any;
  private tokens:any[]=[];

  constructor(private ctx: any, readonly slot: PortalSlot) {
    const T = this.T = ctx.THREE, toon = ctx.mats.toon;
    const g = this.group = new T.Group(); g.name = `time-portal-${slot.slot}`;
    g.position.fromArray(slot.position); g.rotation.y = slot.yaw;
    const stone = toon(0xb7c0b5), dark = toon(0x80938d), timber = toon(0x735744);
    const plinth = new T.Mesh(new T.CylinderGeometry(1.5, 1.62, BASE, 32), dark); plinth.position.y = BASE / 2; g.add(plinth);
    const top = new T.Mesh(new T.CylinderGeometry(1.32, 1.38, .06, 32), stone); top.position.y = BASE + .02; g.add(top);
    for (const side of [-1, 1]) {
      const p = new T.Mesh(new T.BoxGeometry(.36, ARCH_H, .36), timber); p.position.set(side * pillarOffset, BASE + ARCH_H / 2, 0); g.add(p);
      const cap = new T.Mesh(new T.BoxGeometry(.54, .14, .54), dark); cap.position.set(side * pillarOffset, BASE + ARCH_H, 0); g.add(cap);
      const foot = new T.Mesh(new T.BoxGeometry(.54, .18, .54), dark); foot.position.set(side * pillarOffset, BASE + .09, 0); g.add(foot);
    }
    const arch = new T.Mesh(new T.TorusGeometry(pillarOffset, .2, 10, 32, Math.PI), stone); arch.position.y = BASE + ARCH_H; g.add(arch);
    this.keystone = new T.Mesh(new T.BoxGeometry(.46, .5, .5), toon(0xcfc3a8)); this.keystone.position.y = BASE + ARCH_H + pillarOffset; g.add(this.keystone);
    // One solid curved roof with a continuous ridge and lifted eaves.
    const profile = new T.Shape();
    profile.moveTo(-1.70, .04); profile.quadraticCurveTo(-1.15,-.17,0,.24);
    profile.quadraticCurveTo(1.15,-.17,1.70,.04);profile.lineTo(1.70,.16);
    profile.quadraticCurveTo(1.12,.03,0,.43);profile.quadraticCurveTo(-1.12,.03,-1.70,.16);profile.closePath();
    const roof = new T.Mesh(new T.ExtrudeGeometry(profile,{depth:.95,bevelEnabled:false}),toon(0x506a64));
    climateMaterial(roof.material,'structure');
    roof.position.set(0,4.06,-.475); g.add(roof);
    const beam = new T.Mesh(new T.BoxGeometry(2.68,.20,.50),timber);
    beam.position.set(0,4.00,0);g.add(beam);
    for(const side of [-1,1]){
      const lamp=new T.Mesh(new T.SphereGeometry(.145,8,6),toon(0xc87952));
      lamp.scale.y=1.28;lamp.position.set(side*1.39,3.83,.09);g.add(lamp);
    }
    g.traverse((m:any)=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});
    const shape = new T.Shape(); shape.moveTo(-ARCH_W, BASE); shape.lineTo(ARCH_W, BASE); shape.lineTo(ARCH_W, BASE + ARCH_H); shape.absarc(0, BASE + ARCH_H, ARCH_W, 0, Math.PI, false); shape.lineTo(-ARCH_W, BASE);
    this.uniforms = {uTime: {value: 0}, uOpen: {value: 0}, uHover: {value: 0}, uA: {value: new T.Color('#ffffff')}, uB: {value: new T.Color('#888888')}};
    this.disc = new T.Mesh(new T.ShapeGeometry(shape, 24), new T.ShaderMaterial({uniforms: this.uniforms, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, side: T.DoubleSide}));
    this.disc.layers.set(1); this.disc.renderOrder = 5; g.add(this.disc);
    this.glow = ctx.mats.glowSprite(0xffffff, 3.4, .0); this.glow.position.y = BASE + 1.7; g.add(this.glow);
    this.tag = new T.Sprite(new T.SpriteMaterial({transparent: true, depthWrite: false})); this.tag.layers.set(1); this.tag.renderOrder = 12;
    this.tag.scale.set(2.3, 1.15, 1); this.tag.position.y = BASE + ARCH_H + pillarOffset + 1.05; g.add(this.tag);
    this.addEmblem(g);
    ctx.scene.add(g);
  }
  private addEmblem(parent:any) {
    const T=this.T,slot=this.slot.slot;
    if(slot<3)return;
    const group=new T.Group();group.name='fx-mode-symbol';group.userData.walkThrough=true;
    group.position.set(0,2.1,.28);parent.add(group);
    const mesh=(shape:any,color:string,x:number,y:number,z:number=0,root=group)=>{
      const m=new T.Mesh(shape,new T.MeshBasicMaterial({color}));m.layers.set(1);m.renderOrder=7;
      m.position.set(x,y,z);root.add(m);return m;
    };
    if(slot===3){
      for(const [x,y,colour] of [[-.34,-.1,'#87c7a3'],[0,.20,'#b5e4c3'],[.34,-.1,'#74b2a0']] as const){
        mesh(new T.CylinderGeometry(.20,.24,.11,12),'#e5c781',x,y-.14,.05);
        const jelly=mesh(new T.SphereGeometry(.18,14,10),colour,x,y,.05);jelly.scale.y=.85;
        for(const dx of [-.063,.063])mesh(new T.SphereGeometry(.018,6,5),'#264940',x+dx,y+.015,.216);
      }
    } else if(slot===4){
      this.tokens=[
        mesh(new T.SphereGeometry(.19,16,10),'#87dec5',-.48,0),
        mesh(new T.OctahedronGeometry(.24),'#fae4a7',0,0),
        mesh(new T.BoxGeometry(.30,.30,.26),'#ef9b8d',.48,0)
      ];
    } else if(slot===5){
      const base=mesh(new T.SphereGeometry(.24,16,12),'#fbdaa5',-.46,-.12);base.scale.y=.76;
      this.tokens=[mesh(new T.SphereGeometry(.12,14,10),'#f8c792',0,0)];
      for(let i=1;i<=5;i++){const t=i/6;mesh(new T.SphereGeometry(.023,8,6),'#faf0c8',-.45+t,.58*Math.sin(t*Math.PI)-.12);}
    } else {
      // An enamel shield identifies the sparring gate at every date.
      const shield=new T.Shape();
      shield.moveTo(-.38,.34);shield.lineTo(.38,.34);shield.lineTo(.31,-.07);
      shield.quadraticCurveTo(.2,-.3,0,-.45);shield.quadraticCurveTo(-.2,-.3,-.31,-.07);
      shield.closePath();
      mesh(new T.ExtrudeGeometry(shield,{depth:.08,bevelEnabled:false}),'#e0be8b',0,0);
      const gem=mesh(new T.OctahedronGeometry(.19),'#518985',0,0,.16);
      gem.scale.set(.8,1.25,.45);
    }
  }
  setGate(gate: Gate | null, complete: boolean) {
    this.gate = gate;
    const T = this.T;
    this.tag.material.map?.dispose();
    this.tag.material.map = null;
    if (!gate) { this.tag.visible = false; this.keystone.material = this.ctx.mats.toon(0xb9ad97); this.glow.material.opacity = 0; return; }
    const palette=gatePalette(gate);
    this.uniforms.uA.value.set(palette[0]); this.uniforms.uB.value.set(palette[1]);
    this.keystone.material = this.ctx.mats.toon(new T.Color(palette[0]).getHex());
    this.glow.material.color.set(palette[0]);
    this.tag.material.map = tagTexture(T, (g2, w, h) => {
      paperCard(g2, w, h);
      g2.fillStyle = '#2f2a24'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
      g2.font = `700 ${gate.type==="mode"||gate.archive.length?65:96}px ${SERIF}`; g2.fillText(this.slot.slot + " · " + gateTitle(gate), w / 2, 96);
      g2.font = `500 34px ${SANS}`; g2.fillStyle = '#5b5249';
      const subtitle=gateSummary(gate); const e = subtitle.length > 13 ? subtitle.slice(0, 12) + '…' : subtitle; g2.fillText(e, w / 2, 178);
      if (complete) { g2.fillStyle = '#c8553d'; g2.beginPath(); g2.arc(w - 64, 50, 24, 0, Math.PI * 2); g2.fill(); g2.fillStyle = '#fff'; g2.font = `700 28px ${SANS}`; g2.fillText('✓', w - 64, 52); }
    });
    this.tag.material.needsUpdate = true; this.tag.visible = true;
  }
  /** Local coordinates of a world point: x across the door, z through it. */
  local(p: Vec): Vec {
    const dx = p[0] - this.slot.position[0], dz = p[2] - this.slot.position[2], c = Math.cos(this.slot.yaw), s = Math.sin(this.slot.yaw);
    return [dx * c - dz * s, p[1], dx * s + dz * c];
  }
  update(t: number, dt: number) {
    const target = this.gate ? 1 : 0;
    if(this.slot.slot===4){
      const phase=(t*.42)%1;
      const drop = Math.max(0,1-phase/.25);
      const merge = Math.min(1,Math.max(0,(phase-.55)/.25));
      this.tokens.forEach((m,i)=>{
        m.position.x=(i-1)*(.56-.45*merge);
        m.position.y=.55*drop;
        m.scale.setScalar(phase<.74?1:Math.max(0,(.94-phase)/.2));
      });
    }else if(this.slot.slot===5){
      const flight=(1-Math.cos(t*2.6))/2,ball=this.tokens[0];
      ball.position.set(-.45+flight,.58*Math.sin(flight*Math.PI)-.12,.03);
    }
    this.open += (target - this.open) * (1 - Math.exp(-dt * 3));
    this.uniforms.uTime.value = t; this.uniforms.uOpen.value = this.open; this.uniforms.uHover.value = this.hover;
    this.disc.visible = this.open > .01;
    this.glow.material.opacity = this.open * (.22 + .18 * this.hover);
    this.tag.position.y = BASE + ARCH_H + pillarOffset + 1.05 + Math.sin(t * 1.3 + this.slot.slot) * .06;
  }
}
