import {specialKind,type Cascade} from '../templates/mode-match';

export const powers={
 row:{name:'横纹',symbol:'↔',detail:'横向交换形成四连。激活时清除整行。'},
 column:{name:'竖纹',symbol:'↕',detail:'纵向交换形成四连。激活时清除整列。'},
 blast:{name:'爆芯',symbol:'✷',detail:'同色连成 L 形、T 形或十字。激活时清除两格以内的菱形区域（中心与周围 12 格）。'},
 rainbow:{name:'虹彩',symbol:'✧',detail:'同色排成五枚或更长的直线。与普通棋交换，清除棋盘上该颜色的凝露。'}
} as const;


const muteKey='slimefable-match-muted-v1';
type Cue='pick'|'swap'|'reject'|'burst'|'fall'|'clone'|'sweep'|'blast'|'rainbow'|'objective'|'finish';
const notes:Record<Cue,number[]>={
 pick:[462],swap:[310,478],reject:[290,196],burst:[523,659,784],fall:[370,440],
 clone:[494,622,831,988],sweep:[247,370,554,831],blast:[196,131,98],rainbow:[392,494,587,740,880],objective:[587,740,880],finish:[523,659,784,1047]
};

/** One gesture-unlocked mix for board sounds, the studio hum and the broadcast cue. */
export class MatchSound{
 muted=false;
 private audio?:AudioContext;
 private volume?:GainNode;
 private hum?:OscillatorNode;
 constructor(){
   try{this.muted=localStorage.getItem(muteKey)==='1';}catch{}
   document.addEventListener('visibilitychange',()=>{
     if(!this.audio)return;
     void (document.hidden?this.audio.suspend():this.audio.resume()).catch(()=>{});
   });
   addEventListener('pagehide',()=>{void this.audio?.close().catch(()=>{});},{once:true});
 }
 start(studio:boolean){
   if(!this.audio&&typeof AudioContext!=='undefined'){
     try{
       const audio=this.audio=new AudioContext(),master=this.volume=audio.createGain();
       master.gain.value=this.muted?0:.72;master.connect(audio.destination);
       if(studio){
         this.hum=audio.createOscillator();const quiet=audio.createGain();quiet.gain.value=.014;
         this.hum.type='triangle';this.hum.frequency.value=96;this.hum.connect(quiet).connect(master);this.hum.start();
       }
     }catch{return;}
   }
   void this.audio?.resume().catch(()=>{});
 }
 toggle(){
   this.muted=!this.muted;
   try{localStorage.setItem(muteKey,this.muted?'1':'0');}catch{}
   if(this.audio&&this.volume)this.volume.gain.setTargetAtTime(this.muted?0:.72,this.audio.currentTime,.008);
 }
 play(cue:Cue,chain=0){
   const audio=this.audio;if(!audio||!this.volume||this.muted)return;
   const pitch=2**(Math.min(chain,5)*2/12),tones=notes[cue],time=audio.currentTime;
   tones.forEach((hz,i)=>{
     const osc=audio.createOscillator(),amp=audio.createGain();
     const t=time+i*(cue==='finish'?.092:cue==='sweep'?.045:.031);
     const end=t+(cue==='finish'?.36:cue==='objective'?.23:.13);
     osc.type=cue==='reject'||cue==='sweep'?'triangle':'sine';
     osc.frequency.setValueAtTime(hz*pitch*(cue==='burst'?1.07:1),t);
     osc.frequency.exponentialRampToValueAtTime(hz*pitch*(cue==='reject'?.75:1),end);
     amp.gain.setValueAtTime(.0001,t);
     amp.gain.exponentialRampToValueAtTime(cue==='pick'||cue==='fall'?.022:.065,t+.012);
     amp.gain.exponentialRampToValueAtTime(.0001,end);
     osc.connect(amp).connect(this.volume!);osc.start(t);osc.stop(end+.01);
     osc.onended=()=>{osc.disconnect();amp.disconnect();};
   });
 }
 finish(){
   this.hum?.stop();this.hum=undefined;this.play('finish');
 }
}

export class MatchMotion{
 constructor(private cells:HTMLButtonElement[],private grid:HTMLElement,private sound:MatchSound){}
 private get quiet(){return matchMedia('(prefers-reduced-motion: reduce)').matches;}
 private async move(node:Element,frames:Keyframe[],ms:number,delay=0){
   if(this.quiet)return;
   const motion=node.animate(frames,{duration:ms,delay,easing:'ease-out',fill:'backwards'});
   await motion.finished.catch(()=>{});motion.cancel();
 }
 private jelly(i:number){return this.cells[i].querySelector('.ml-jelly')!;}
 async exchange(a:number,b:number,valid:boolean,drag=0){
   this.sound.play(valid?'swap':'reject');
   const one=this.cells[a].getBoundingClientRect(),two=this.cells[b].getBoundingClientRect();
   const dx=two.x-one.x,dy=two.y-one.y,start=Math.min(1,Math.max(0,drag));
   await Promise.all([[a,1],[b,-1]].map(([i,dir])=>{
     const offset=(f:number,shape='')=>'translate('+dx*dir*f+'px,'+dy*dir*f+'px) '+shape;
     const frames:Keyframe[]=valid?[
       {transform:offset(start)},
       {transform:offset(start+(1-start)*.66,'scale(.94,1.06)'),offset:.58},
       {transform:offset(1)}]:[
       {transform:offset(start)},{transform:offset(Math.max(start,.66),'scale(.9,1.08)'),offset:.36},
       {transform:offset(0,'scale(1.09,.93)'),offset:.8},{transform:'none'}];
     return this.move(this.jelly(i),frames,valid?Math.max(72,145*(1-start)):220);
   }));
 }
 private center(i:number){
   const cell=this.cells[i];
   return {x:cell.offsetLeft+cell.offsetWidth/2,y:cell.offsetTop+cell.offsetHeight/2};
 }
 private overlay(className:string){
   const el=document.createElement('span');el.className=className;el.setAttribute('aria-hidden','true');
   this.grid.append(el);return el;
 }
 private async sweep(line:number,vertical:boolean){
   const el=this.overlay('ml-wave'+(vertical?' ml-wave-col':'')),cell=this.center(vertical?line:line*8);
   el.style.setProperty(vertical?'left':'top',(vertical?cell.x:cell.y)+'px');
   const scale=vertical?'scaleY':'scaleX';
   await this.move(el,[{transform:scale+'(.02)',opacity:0},{opacity:.95,offset:.21},
     {transform:scale+'(1)',opacity:.97,offset:.72},{opacity:0}],230);
   el.remove();
 }
 private async shockwave(i:number){
   const el=this.overlay('ml-blast-wave'),p=this.center(i);
   el.style.left=p.x+'px';el.style.top=p.y+'px';
   await this.move(el,[{transform:'translate(-50%,-50%) rotate(45deg) scale(.12)',opacity:.45},
     {opacity:1,offset:.25},{transform:'translate(-50%,-50%) rotate(45deg) scale(1)',opacity:0}],300);
   el.remove();
 }
 private async spectrum(i:number,indices:number[]){
   const p=this.center(i),step=Math.max(1,Math.ceil(indices.length/16));
   await Promise.all(indices.filter((j,n)=>j!==i&&n%step===0).map(async j=>{
     const end=this.center(j),dx=end.x-p.x,dy=end.y-p.y,angle=Math.atan2(dy,dx)+'rad';
     const ray=this.overlay('ml-prism-ray');ray.style.left=p.x+'px';ray.style.top=p.y+'px';
     ray.style.width=Math.hypot(dx,dy)+'px';
     await this.move(ray,[{transform:'rotate('+angle+') scaleX(.03)',opacity:.05},
       {transform:'rotate('+angle+') scaleX(1)',opacity:.95,offset:.55},{transform:'rotate('+angle+') scaleX(1)',opacity:0}],270);
     ray.remove();
   }));
 }
 async clear(indices:number[],cascade:Cascade,chain:number){
   const {sweepRows,sweepCols,blasts,rainbows,created}=cascade;
   this.sound.play(rainbows.length?'rainbow':blasts.length?'blast':sweepRows.length||sweepCols.length?'sweep':'burst',chain);
   if(chain>0&&!this.quiet){
     const tag=this.overlay('ml-chain');tag.textContent='连锁 × '+(chain+1);
     void this.move(tag,[{opacity:0,transform:'translate(-50%,10px) scale(.85)'},{opacity:1,offset:.25},
       {opacity:1,offset:.73},{opacity:0,transform:'translate(-50%,-12px) scale(1.04)'}],460).then(()=>tag.remove());
   }
   if(!this.quiet)await Promise.all([
     ...sweepRows.map(row=>this.sweep(row,false)),...sweepCols.map(col=>this.sweep(col,true)),
     ...blasts.map(i=>this.shockwave(i)),...rainbows.map(i=>this.spectrum(i,indices))
   ]);
   if(created.length)this.sound.play('clone',chain);
   const formation=new Set(created.map(tile=>tile.at));
   await Promise.all([
     ...created.map(async tile=>{
       const kind=specialKind(tile.value);if(kind==='normal'||this.quiet)return;
       const el=this.overlay('ml-form-power');el.textContent=powers[kind].symbol;el.dataset.mark=kind;
       const p=this.center(tile.at);el.style.left=p.x+'px';el.style.top=p.y+'px';
       await this.move(el,[{opacity:0,transform:'translate(-50%,-50%) scale(.45)'},
         {opacity:1,transform:'translate(-50%,-50%) scale(1.16)',offset:.42},
         {opacity:1,transform:'translate(-50%,-50%) scale(.9)'}],195);
       el.remove();
     }),
     ...indices.map(async i=>{
       const cell=this.cells[i];
       if(!this.quiet){
         const splash=document.createElement('span');splash.className='ml-splash';cell.append(splash);
         void this.move(splash,[{transform:'scale(.35)',opacity:.9},{transform:'scale(1.3)',opacity:0}],200).then(()=>splash.remove());
       }
       if(formation.has(i))return this.move(this.jelly(i),[{transform:'scale(.78)'},{transform:'scale(1.17)',filter:'brightness(1.5)'},{transform:'scale(1)'}],180);
       return this.move(this.jelly(i),[{transform:'scale(1)'},{transform:'scale(1.16,.87)',offset:.36},
         {transform:'scale(.35,1.3)',opacity:0}],145);
     })
   ]);
 }
 async drop(cascade:Cascade){
   const stride=this.cells[8].getBoundingClientRect().top-this.cells[0].getBoundingClientRect().top;
   await Promise.all(cascade.falls.map(({to,rows,spawn})=>this.move(this.jelly(to),[
     {transform:'translateY('+(-rows*stride)+'px) scale(.88,1.12)',opacity:spawn?0:1},
     {opacity:1,offset:.35},
     {transform:'translateY(2px) scale(1.12,.89)',offset:.78},
     {transform:'translateY(-2px) scale(.99,1.03)',offset:.9},
     {transform:'none'}],Math.min(315,135+rows*27),(to%8)*4)));
   if(cascade.falls.length)this.sound.play('fall');
 }
}
