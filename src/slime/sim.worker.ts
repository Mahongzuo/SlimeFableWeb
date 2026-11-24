import {SlimeSolver} from './solver';
import {SurfaceBuilder} from './surface';
import {Box,FrameInput,MeshFrame,Vec} from './types';
import {createWorld,GroundSurface,WorldDefinition} from './world';
let solver=new SlimeSolver();
let baseBoxCount=0;
let baseSurfaceCount=0;
const surface=new SurfaceBuilder();
let accumulator=0,lastGeneration=-1;
type WorkerMsg=
  | {input:FrameInput;world?:WorldDefinition;recycle?:Pick<MeshFrame,'positions'|'normals'|'slots'>}
  | {boxUpdate:{index:number;min:Vec;max:Vec}}
  | {dynamicBoxes:Box[]}
  | {dynamicSurfaces:{surfaces:GroundSurface[];bounds?:{min:Vec;max:Vec}}};
self.onmessage=(event:MessageEvent<WorkerMsg>)=>{
 try{
  if('boxUpdate' in event.data){
   const {index,min,max}=event.data.boxUpdate;
   const box=solver.world.boxes[index];
   if(box){box.min=min;box.max=max;}
   return;
  }
  if('dynamicBoxes' in event.data){
   solver.world.boxes.length=baseBoxCount;
   for(const b of event.data.dynamicBoxes)solver.world.boxes.push(b);
   return;
  }
  if('dynamicSurfaces' in event.data){
   const {surfaces,bounds}=event.data.dynamicSurfaces;
   solver.world.definition.surfaces.length=baseSurfaceCount;
   for(const s of surfaces)solver.world.definition.surfaces.push(s);
   if(bounds)solver.world.definition.bounds=bounds;
   return;
  }
  const {input,recycle,world}=event.data;
  if(world){
   const w=createWorld(world);
   baseBoxCount=w.boxes.length;
   baseSurfaceCount=w.definition.surfaces.length;
   solver=new SlimeSolver(input.anchor,w);
   lastGeneration=-1;
  }
  if(input.generation!==lastGeneration){solver.reset(input.anchor);accumulator=0;lastGeneration=input.generation}
  for(const c of input.commands){
   if(c.type==='launch'&&c.target)solver.launch(c.target,input.forward,c.cannon);
  }
  const start=performance.now();
  accumulator=Math.min(accumulator+input.dt,4/60);
  let steps=0;
  while(accumulator>=1/60&&steps<4){solver.step(1/60,input);accumulator-=1/60;steps++}
  const simMs=performance.now()-start;
  const frame=surface.build(solver,input.quality,recycle);
  // The event stream and geometry are delivered together, including when the last shot just disappeared.
  frame.impacts=solver.takeImpacts();
  frame.simMs=simMs;
  frame.generation=input.generation;
  (self as any).postMessage(frame,[frame.positions.buffer,frame.normals.buffer,frame.slots.buffer]);
 }catch(e){(self as any).postMessage({error:String(e)})}
};
