import {Box,Vec} from '../slime/types';
import {createWorld,WorldDefinition} from '../slime/world';
import {clamp} from '../slime/types';
export const boxes:Box[]=[
 {name:'warehouse',min:[-28,-1,-13.5],max:[-17.5,5.2,-1.5],camera:true},
 {name:'office',min:[-28,-1,13],max:[-19,3.6,21],camera:true},
 {name:'office-steps',min:[-18.6,0,13],max:[-15.5,.30,17.5]},
 {name:'net-rack',min:[-9,0,23.7],max:[1,2.2,24.1],camera:true},
 {name:'fish-crates-a',min:[-5,0,15],max:[-3.8,.7,16.2]},
 {name:'fish-crates-b',min:[-6.8,0,17],max:[-5.6,1.1,18.2]},
 {name:'left-crates',min:[-14.7,0,-9],max:[-13.5,.8,-7.8]},
 {name:'corner-crates',min:[-14,0,3],max:[-12.5,1.0,4.5]},
 {name:'training-left',min:[6,0,18],max:[7.0,1.15,19.4]},
 {name:'training-right',min:[7.45,0,18],max:[8.45,1.15,19.4]},
];
export function hill(x:number,z:number){if(x>-13||z>-15)return 0;let a=clamp((-13-x)/17,0,1),b=clamp((-15-z)/15,0,1);a=a*a*(3-2*a);b=b*b*(3-2*b);const s=Math.pow(a*b,.65);return Math.max(0,6.5*s+.35*Math.sin(x*.55+1.3)*Math.sin(z*.47+.4)*s)}

const heights:number[]=[];for(let z=0;z<=60;z++)for(let x=0;x<=68;x++)heights.push(hill(-30+x*.25,-30+z*.25));
export const harborDefinition:WorldDefinition={boxes,bounds:{min:[-31,-2.7,-31],max:[31,20,31]},surfaces:[
 {min:[-30,10],max:[30,30],height:0},{min:[-30,-30],max:[-10,10],height:0},
 {min:[-30,-30],max:[-13,-15],height:0,grid:{width:69,height:61,values:heights}},
 {min:[24,2],max:[29.5,14],height:-3.2,slope:[0,3.2/12]},
 {min:[18.5,6],max:[23,10],height:-.75},{min:[-10,-26.7],max:[11,-23.3],height:.35}
]};
export const harborWorld=createWorld(harborDefinition);
export const harborSpawn:Vec=[3,0,19];
export const harborTargets:Vec[]=[[3,0,15],[11,0,17]];
export const {terrain,support,cast,moveCapsule}=harborWorld;
