/** Metres, X/Z. DreamWorld's regional objects and brush strokes stay editable
 * as data; the SlimeFable renderer owns meshes, scale and collision. */
export type PlanPoint = [number,number];
export interface MapStroke {points:PlanPoint[]; width:number}

export function alongStroke(stroke:MapStroke,offset:number,out:PlanPoint=[0,0]):PlanPoint {
  const points=stroke.points;
  if(!points.length)throw Error('地图路线缺少控制点');
  let remaining=Math.max(0,offset);
  for(let i=1;i<points.length;i++){
    const [x,z]=points[i-1],dx=points[i][0]-x,dz=points[i][1]-z;
    const length=Math.hypot(dx,dz);
    if(length&&remaining<=length){out[0]=x+dx*remaining/length;out[1]=z+dz*remaining/length;return out;}
    remaining-=length;
  }
  out[0]=points[points.length-1][0];out[1]=points[points.length-1][1];return out;
}

/** DreamWorld bridge-fit.js's two bank samples, expressed in web-level axes. */
export function fitSpan(a:PlanPoint,b:PlanPoint,ground:(x:number,z:number)=>number){
  const ax=ground(...a),bx=ground(...b),span=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(!span)throw Error('桥端必须分开');
  return {base:(ax+bx)/2,slope:(bx-ax)/span,length:Math.hypot(span,bx-ax),
    yaw:Math.atan2(a[1]-b[1],b[0]-a[0]),pitch:Math.atan2(bx-ax,span)};
}
