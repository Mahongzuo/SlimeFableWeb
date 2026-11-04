import {clamp,mix,Vec} from './types';
export type Mood='Idle'|'Move'|'Jump'|'Attack'|'Hurt'|'Happy'|'Spit'|'Focus'|'Squash'|'Bliss'|'Sleep'|'Wicked';
// SlimeMoodTypes.cpp authored poses: eye height, width, brow, mouth, curve, blush.
const poses:Record<Mood,number[]>={Idle:[3.8,3.2,0,0,10.5,0],Move:[3.6,3.1,.15,0,10,0],Jump:[2,2.4,0,7,2,0],Attack:[2.4,3.2,-.8,4,3,.15],Hurt:[1.4,3.4,-.4,3,2,.4],Happy:[1.1,3.2,.7,4,10,.35],Spit:[4.8,2.4,.3,2,1,0],Focus:[3.2,2.8,-.3,1,5,0],Squash:[1,3.4,.1,5,5,0],Bliss:[.7,2.8,0,6,2,0],Sleep:[.65,3.1,0,6,2,.45],Wicked:[1.6,2.3,-1.15,1,3,0]};
export class FaceDirector {
 mood:Mood='Idle';pose=[...poses.Idle];blink=0;look=0;private remaining=0;private priority=0;private still=0;private blinkIn=3;private blinkAge=1;
 pulse(mood:Mood,duration=.5,priority=50){if(this.remaining>0&&priority<this.priority)return;this.mood=mood;this.remaining=duration;this.priority=priority;}
 update(dt:number,velocity:Vec,grounded:boolean,aiming:boolean,attacking:boolean){this.remaining-=dt;const speed=Math.hypot(velocity[0],velocity[2]);this.still=grounded&&speed<.4&&!aiming&&!attacking?this.still+dt:0;if(this.remaining<=0){this.priority=0;this.mood=attacking?'Attack':aiming?'Focus':!grounded?'Jump':speed>.4?'Move':this.still>=10?'Sleep':'Idle';}const target=poses[this.mood],blend=1-Math.exp(-dt*18);for(let i=0;i<6;i++)this.pose[i]=i===3?target[i]:mix(this.pose[i],target[i],blend);this.blinkIn-=dt;if(this.blinkIn<=0){this.blinkAge=0;this.blinkIn=2+Math.random()*3;}this.blinkAge+=dt;this.blink=this.blinkAge<.12?Math.sin(this.blinkAge/.12*Math.PI):0;}
 reset(){this.mood='Idle';this.pose=[...poses.Idle];this.remaining=0;this.priority=0;this.still=0;this.blink=0;this.blinkIn=3;}
}
