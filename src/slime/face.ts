import {mix,type Vec} from './types';

export type Mood='Idle'|'Move'|'Jump'|'Glide'|'Attack'|'Hurt'|'Happy'|'Spit'|'Focus'|'Squash'|'Bliss'|'Sleep'|'Wicked'|'Surprised';

const neutral={
  eyeWidth:1,eyeOpen:.92,eyeArc:.05,gazeY:0,
  mouthWidth:.115,mouthOpen:.04,smile:.085,doubleSmile:0,
  blush:.46,tear:0,wink:0,
};
type Pose=typeof neutral;
const poses:Record<Mood,Partial<Pose>>={
  Idle:{},
  Move:{eyeOpen:1,gazeY:.02,mouthOpen:.30,smile:.12,blush:.55},
  Jump:{eyeOpen:1.18,eyeWidth:1.04,gazeY:.065,mouthWidth:.10,mouthOpen:.63,smile:.055,blush:.68},
  Glide:{eyeOpen:.89,eyeArc:.18,gazeY:.035,mouthWidth:.15,mouthOpen:.26,smile:.13,blush:.78},
  Attack:{eyeOpen:.76,eyeArc:.26,mouthWidth:.135,mouthOpen:.40,smile:.08,doubleSmile:.55,blush:.68},
  Hurt:{eyeOpen:.83,gazeY:-.045,mouthWidth:.085,mouthOpen:.12,smile:-.085,tear:1,blush:.56},
  Happy:{eyeOpen:.13,eyeWidth:1.12,eyeArc:1,mouthWidth:.17,mouthOpen:.87,smile:.13,blush:1},
  Spit:{eyeOpen:.94,gazeY:.02,mouthWidth:.072,mouthOpen:.83,smile:.015,blush:.82},
  Focus:{eyeOpen:.81,eyeWidth:.89,gazeY:.023,mouthWidth:.077,mouthOpen:.02,smile:.045,blush:.40},
  Squash:{eyeOpen:.09,eyeWidth:1.18,eyeArc:.72,mouthWidth:.094,mouthOpen:.39,smile:.04,blush:.92},
  Bliss:{eyeOpen:.10,eyeArc:.85,mouthWidth:.13,smile:.11,doubleSmile:.60,blush:.85},
  Sleep:{eyeOpen:.055,eyeArc:-.55,gazeY:-.025,mouthWidth:.065,mouthOpen:.26,smile:.02,blush:.43},
  Wicked:{eyeOpen:1,eyeArc:.20,wink:.98,mouthWidth:.14,mouthOpen:.16,smile:.075,doubleSmile:1,blush:.73},
  Surprised:{eyeOpen:1.28,eyeWidth:1.13,gazeY:.05,mouthWidth:.080,mouthOpen:.87,smile:0,blush:.6},
};
const keys=Object.keys(neutral) as (keyof Pose)[];

export class FaceDirector {
  mood:Mood='Idle';
  pose={...neutral};
  blink=0;
  private remaining=0;
  private priority=0;
  private still=0;
  private blinkIn=3;
  private blinkAge=1;

  pulse(mood:Mood,duration=.5,priority=50){
    if(this.remaining>0 && priority<this.priority)return;
    this.mood=mood;this.remaining=duration;this.priority=priority;
  }
  update(dt:number,velocity:Vec,grounded:boolean,aiming:boolean,attacking:boolean,gliding=false){
    this.remaining-=dt;
    const moving=Math.hypot(velocity[0],velocity[2])>.4;
    this.still=grounded&&!moving&&!aiming&&!attacking?this.still+dt:0;
    if(this.remaining<=0){
      this.priority=0;
      this.mood=attacking?'Attack':aiming?'Focus':!grounded?(gliding?'Glide':'Jump'):
        moving?'Move':this.still>=10?'Sleep':'Idle';
    }
    const target=poses[this.mood],blend=-Math.expm1(-dt*16);
    for(const key of keys)this.pose[key]=mix(this.pose[key],target[key]??neutral[key],blend);
    this.blinkIn-=dt;
    if(this.blinkIn<=0){this.blinkAge=0;this.blinkIn=2.6+Math.random()*2.8;}
    this.blinkAge+=dt;
    this.blink=this.blinkAge<.16?Math.sin(this.blinkAge/.16*Math.PI)**2:0;
  }
  reset(){
    this.mood='Idle';Object.assign(this.pose,neutral);this.remaining=0;this.priority=0;
    this.still=0;this.blink=0;this.blinkIn=3;this.blinkAge=1;
  }
}
