/** A critically damped vertical follower. Horizontal look and airborne control bypass this filter. */
export class GroundCameraHeight {
 private height:number|null=null;
 private velocity=0;
 private lastFoot=0;

 reset(){this.height=null;this.velocity=0;}

 update(foot:number,dt:number,followGround:boolean){
  const previousFoot=this.lastFoot;this.lastFoot=foot;
  if(this.height===null){
   this.height=foot;this.velocity=0;
   return foot;
  }
  if(!followGround){
   // Follow every metre of the airborne capsule immediately while the residual from
   // the last tread fades away. Switching modes must not pop the camera onto the foot.
   this.height=foot+(this.height-previousFoot)*Math.exp(-dt*18);
   this.velocity=0;
   return this.height;
  }
  const frequency=17,decay=Math.exp(-frequency*dt);
  const offset=this.height-foot,coefficient=this.velocity+frequency*offset;
  this.height=foot+(offset+coefficient*dt)*decay;
  this.velocity=(this.velocity-frequency*coefficient*dt)*decay;
  return this.height;
 }
}
