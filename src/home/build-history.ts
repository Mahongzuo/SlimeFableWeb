import {ensureHome, type LifeData} from '../life/state';

/** Only state owned by a build transaction is journalled. Crop clocks outside a removed bed keep running. */
function capture(life: LifeData) {
  const {placed,paving,expansions,xp,level,unlocks,daily,souvenirSlots,voxels,machines}=ensureHome(life);
  return structuredClone({placed,paving,expansions,xp,level,unlocks,daily,souvenirSlots,voxels,machines,coins:life.coins,plots:life.plots});
}
type Snapshot=ReturnType<typeof capture>;
type Change={before:Snapshot;after:Snapshot};
export class BuildHistory {
  private back:Change[]=[];
  private forward:Change[]=[];
  get canUndo(){return this.back.length>0;}
  get canRedo(){return this.forward.length>0;}
  clear(){this.back=[];this.forward=[];}
  begin=capture;
  commit(life:LifeData,before:Snapshot){
    this.back.push({before,after:capture(life)});this.forward=[];
    if(this.back.length>40)this.back.shift();
  }
  restore(life:LifeData,redo:boolean){
    const change=(redo?this.forward:this.back).pop();
    if(!change)return false;
    const target=redo?change.after:change.before,other=redo?change.before:change.after;
    const {plots,coins,...home}=structuredClone(target);
    Object.assign(ensureHome(life),home); life.coins+=coins-other.coins;
    for(const id of new Set([...Object.keys(plots),...Object.keys(other.plots)])){
      if(JSON.stringify(plots[id])===JSON.stringify(other.plots[id]))continue;
      if(id in plots)life.plots[id]=plots[id];else delete life.plots[id];
    }
    (redo?this.back:this.forward).push(change);
    return true;
  }
}
