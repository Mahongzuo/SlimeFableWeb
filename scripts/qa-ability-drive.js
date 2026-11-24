async ({early=false,shootFrame=false}={}) => {
 const level=window.__level, actor=window.__slime, {layout:l,puzzle:p,spec:s}=level;
 const renderer=actor.ctx.renderer, draw=renderer.render;
 renderer.setAnimationLoop(null);
 renderer.render=()=>{};
 const key=(code,on)=>dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,bubbles:true}));
 const tap=code=>{key(code,true);key(code,false)};
 const assert=(value,msg)=>{if(!value) throw Error(s.id+' '+msg+' '+JSON.stringify({p,pos:actor.position,shots:actor.latest?.shots,elem:actor.element,err:actor.workerErrors}))};
 const tick=async(n=1)=>{for(let i=0;i<n;i++){level.step(.05);if(actor.busy)await new Promise(r=>actor.worker.addEventListener('message',r,{once:true}))}};
 const until=async(pred,count,msg)=>{for(let i=0;i<count&&!pred();i++)await tick();assert(pred(),msg)};
 const chooseElement=async n=>{
   for(let i=0;i<25&&actor.element!==n;i++){tap('Digit'+(n+1));await tick()}
   assert(actor.element===n,'element switch after cooldown');
 };
 const move=async(x,z)=>{for(let i=0;i<140;i++){
   const dx=x-actor.position[0],dz=z-actor.position[2];
   for(const [k,yes] of [['KeyD',dx>.10],['KeyA',dx<-.10],['KeyW',dz<-.10],['KeyS',dz>.10]])key(k,yes);
   if(Math.abs(dx)<.16&&Math.abs(dz)<.16)break;
   await tick();
 }for(const k of ['KeyA','KeyD','KeyS','KeyW'])key(k,false);
 await tick(2);assert(Math.hypot(actor.position[0]-x,actor.position[2]-z)<.5,'movement failed')};
 const nearEnd=()=>move(l.end[0],l.end[2]), f=()=>tap('KeyF');
 document.querySelector('[data-action=start]').click();
 assert(level.phase==='play','start');f();assert(!p.ready,'unearned finale');
 if(s.mode==='relay'){
   tap('KeyG');await until(()=>p.contact[0],90,'physical contact');
   if(early){tap('KeyX');await until(()=>!p.contact[0]&&!actor.latest.shots.length,100,'early recall');assert(!p.ready&&l.bridge.max[1]<0,'early bridge');tap('KeyG');await until(()=>p.contact[0],90,'second contact')}
   await nearEnd();assert(p.step===1,'bridge crossing');await chooseElement((s.element+1)%6);f();assert(p.step===1,'wrong element');
   await chooseElement(s.element);f();assert(p.step===2,'calibration');
   if(shootFrame){await tick(38);renderer.render=draw;level.step(.01);renderer.render=()=>{};await window.captureAbility('phoenix');}
   f();assert(!p.ready,'manual recall required');tap('KeyX');await until(()=>p.ready,100,'recall');
 }else if(s.mode==='circuit'){
   await chooseElement(s.element);f();assert(!p.step,'polarity');await chooseElement((s.element+1)%6);f();await nearEnd();await chooseElement(s.element);f();assert(!p.ready,'spread required');
   key('KeyC',true);await tick(12);f();key('KeyC',false);
 }else if(s.mode==='climb'){
   await nearEnd();assert(p.climbed,'actual cling');await chooseElement((s.element+1)%6);f();assert(!p.ready,'wrong summit element');await chooseElement(s.element);f();
 }else if(s.mode==='tide'){
   await chooseElement(0);f();assert(!p.step,'wind required');await chooseElement(1);f();await move(l.buoy[0][0],l.buoy[0][2]);assert(p.step===1,'water element required');
   await chooseElement(0);await tick();await move(l.buoy[1][0],l.buoy[1][2]);await nearEnd();f();
 }else if(s.mode==='duet'){
   tap('KeyG');await until(()=>p.contact[0],80,'first clone');await move(l.marks[0][0],l.marks[0][2]);assert(!p.flowers,'both clones required');
   tap('KeyQ');tap('KeyG');await until(()=>p.contact.every(Boolean),100,'two physical contacts');
   for(const [x,,z] of l.marks)await move(x,z);await nearEnd();
 }else{
   await chooseElement(s.element);tap('KeyJ');await tick(22);assert(!p.step&&!p.ready,'attack must hit');
   await move(0,l.target[2]+1.1);
   for(let i=0;i<50&&!p.ready;i++){tap('KeyJ');await tick(2)}await nearEnd();
 }
 assert(p.ready,'ready');f();assert(level.phase==='finale','finale');
 if(shootFrame&&s.kind==='memorial'){
   await tick(24);renderer.render=draw;level.step(.01);renderer.render=()=>{};await window.captureAbility('peace');
 }
 await tick(70);
 assert(level.phase==='done','done');const sv=JSON.parse(localStorage.getItem('slimefable.web.save.v1'));
 assert(sv.completed.includes(s.id)&&sv.souvenirs.includes(s.id),'saved');
 renderer.render=draw;return {id:s.id,mode:s.mode};
}