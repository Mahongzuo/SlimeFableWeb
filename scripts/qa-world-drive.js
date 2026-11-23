async id=>{
 const a=__slime,l=__level,map=l.layout,ren=a.ctx.renderer;
 const draw=ren.render;ren.setAnimationLoop(null);ren.render=()=>{};
 const key=(code,on)=>dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,bubbles:true}));
 const tap=code=>{key(code,true);key(code,false)};
 const tick=async(n=1)=>{for(let i=0;i<n;i++){l.step(.05);if(a.busy)await new Promise(r=>a.worker.addEventListener('message',r,{once:true}));}};
 const check=(v,m)=>{if(!v)throw Error(m+' '+JSON.stringify({phase:l.phase,prog:l.progress,pos:a.position,health:l.health,aim:l.aim,active:l.active,shots:a.latest.shots,spread:a.spread,cling:a.cling,hit:a.combat.targets[0]?.hits}));};
 const move=async(x,z)=>{for(let i=0;i<190;i++){
  const dx=x-a.position[0],dz=z-a.position[2];
  for(const [k,v] of [['KeyD',dx>.11],['KeyA',dx<-.11],['KeyW',dz<-.11],['KeyS',dz>.11]])key(k,v);
  if(Math.abs(dx)<.18&&Math.abs(dz)<.18)break;
  await tick();
 }for(const k of ['KeyA','KeyD','KeyS','KeyW'])key(k,false);await tick(2);
 check(Math.hypot(a.position[0]-x,a.position[2]-z)<.50,'move '+x+','+z)};
 const goto=async p=>move(p[0],p[2]),use=()=>tap('KeyF');
 const point=i=>{for(let n=0;n<6&&l.aim!==i;n++)tap('KeyQ');check(l.aim===i,'aim '+i)};
 const fire=async(i)=>{point(i);tap('KeyG');await tick(22)};
 const stage=i=>goto(map.stations[i].at);
 const seal=async(i)=>{await stage(i);use();await tick(2);};
 const deck=map.stations[0].at[0],start=document.querySelector('[data-w=start]');start.click();await tick(2);
 check(l.phase==='play','start');
 use();await tick();
 if(id==='1123-trial'){
   await move(deck,4.45);await seal(0);await move(deck,-4.35);
 }else if(id==='1123-lower'){
   key('KeyC',true);await tick(12);await move(deck*-1,3.1);await stage(1);
   await move(map.latch[0],map.latch[2]+.55);key('KeyC',false);await tick(10);
   for(let j=0;j<40&&l.progress<1;j++){tap('KeyJ');await tick(2)}
 }else if(id==='0101-trial'){
   await seal(1);await seal(0);await move(deck,3.95);const high=map.stations[2].at;
   await move(high[0],3.95);await seal(2);await move(high[0],-4.6);
 }else if(id==='0815-trial'){
   await move(deck,4.45);await seal(0);await move(deck,-4.5);
 }else if(id==='0815-high'){
   await move(-deck,4.4);await seal(1);await move(-deck,-4.3);
 }else if(id==='0815-shot'){
   await stage(0);
   await fire(0);check(l.active[0]&&!l.active[1]&&l.progress<1,'single receiver insufficient');
   tap('KeyX');await tick(18);check(!l.active[0],'recall disconnects');
   await fire(0);await fire(1);await tick(15);check(l.active.every(Boolean)&&l.progress===1,'both feeds locked');
 }else if(id==='0101-shot'){
   await fire(0);check(!l.visited.size,'wrong sight circle blocked');
   for(let i=0;i<3;i++){
    await stage(i);
    if(i===1)await move(-map.side*.96,.18);
    for(let attempt=0;attempt<5&&!l.visited.has(i);attempt++){
     if(attempt===2){tap('KeyX');await tick(58);await move(map.side*.94,.18);}
     await fire(i);
    }
    check(l.visited.has(i),'observed moving star '+i);
   }
 }else if(id==='1123-shot'){
   const x=map.stations[0].at[0];
   await fire(1);check(!l.visited.size,'no uplink or high vantage');
   await fire(3);check(l.active[0],'supply contact');
   await fire(1);check(l.visited.has(1),'relay cloud scan');
   tap('KeyX');await tick(25);await move(x,2.62);await stage(0);
   for(const i of [0,2]){await fire(i);check(l.visited.has(i),'high observation '+i);}
   await move(x,-4.15);
 }
 check(l.progress===1,'not complete');await goto(map.end);use();check(l.phase==='finale','manual finish');
 await tick(30);
 if(window.captureWorldFinale){
   ren.render=draw;l.step(.012);await window.captureWorldFinale(id);ren.render=()=>{};
 }
 await tick(36);check(l.phase==='done','saved');
 return {completed:l.spec.id,visited:[...l.visited],realBody:a.latest.count};
}
