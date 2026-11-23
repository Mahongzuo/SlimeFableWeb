import {rng} from './random';

// Coloured pieces occupy four bands of six. The rainbow has no match colour.
export const HOLE=-1, COIN=-2, RAINBOW=24;
export type SpecialKind='normal'|'row'|'column'|'blast'|'rainbow';
const kinds:SpecialKind[]=['normal','row','column','blast','rainbow'];
export const specialKind=(value:number):SpecialKind=>value<0?'normal':kinds[Math.floor(value/6)];
export const colour=(value:number)=>value===RAINBOW?-1:value<0?value:value%6;
export type Swap=[number,number];
export interface Board {
  bonus?:{tile:number;drops:number};day:string;seed:string;stage:number;cells:number[];targets:number[];moves:number;turn:number;shuffles:number;score:number;
}
export interface TileFall {to:number; rows:number; spawn:boolean}
export interface Created {at:number; value:number}
export interface Cascade {
 after:number[];falls:TileFall[];sweepRows:number[];sweepCols:number[];
 blasts:number[];rainbows:number[];clones:number[];created:Created[];
}
export interface Result {groups:number[][];frames:number[][];cascades:Cascade[];madeClone:boolean;advanced:boolean;reshuffled:boolean}
const at=(x:number,y:number)=>y*8+x;
export const budgets:Record<string,number>={'1123':15,'0101':14,'0815':12};
function open(day:string,stage:number,x:number,y:number){
 if(day==='1123'){
   if(x===3)return y===3||stage===2&&y===4;
   if(x===4)return y===4||stage===2&&y===3;
 }
 if(day==='0815'){
   // The channel rises through successive lock chambers.
   const length=stage===0?5:stage===1?6:7;
   return x>=1&&x<=length&&(y>=2&&y<=5||x>=2&&x<=length-1&&(y===1||y===6));
 }
 return true;
}
function goals(day:string,stage:number):number[]{
 if(day==='0101')return [at([2,5,3][stage],7)];
 if(day==='0815')return [[at(2,3)],[at(2,4),at(5,3)],[at(3,2),at(5,5)]][stage];
 return [[at(2,3),at(5,4)],[at(5,4)],[at(3,3),at(4,3)]][stage];
}
function lines(cells:number[]):number[][]{
 const found:number[][]=[];
 for(const stride of [1,8])for(let row=0;row<8;row++){
   let run:number[]=[];
   for(let j=0;j<=8;j++){
     const i=stride===1?at(j,row):at(row,j);
     if(j===8||!run.length||colour(cells[i])!==colour(cells[run[0]])||colour(cells[i])<0){
       if(run.length>=3)found.push(run);run=[];
     }
     if(j<8&&colour(cells[i])>=0)run.push(i);
   }
 }
 return found;
}
function adjacent(a:number,b:number){return a>=0&&b>=0&&a<64&&b<64&&Math.abs((a%8)-(b%8))+Math.abs((a>>3)-(b>>3))===1;}
function exchange(cells:number[],a:number,b:number){[cells[a],cells[b]]=[cells[b],cells[a]];}
function restoreClones(cells:number[],clones:number[]){
 for(const clone of clones){
   const tone=colour(clone);
   if(clone===RAINBOW){
     const free=cells.findIndex(v=>v>=0&&v<6);
     if(free<0)throw Error('虹彩棋没有可落的格子');
     cells[free]=RAINBOW;continue;
   }
   let landing=cells.findIndex((v,i)=>v===tone&&(i>>3)===3);
   if(landing<0)landing=cells.findIndex((v,i)=>{
     if(v<0||v>=6||(i>>3)!==3||i%8>=2&&i%8<=5)return false;
     cells[i]=tone;const clear=lines(cells).length===0;cells[i]=v;return clear;
   });
   if(landing<0)landing=cells.findIndex(v=>v===tone);
   if(landing<0){
     // Try each ordinary drop; the restored colour should leave a stable board.
     landing=cells.findIndex((v,i)=>{
       if(v<0||v>=6)return false;
       cells[i]=tone;const clear=lines(cells).length===0;cells[i]=v;
       return clear;
     });
   }
   if(landing>=0)cells[landing]=clone;
   else{
     // A crowded reserve can change its colour to settle; its row sweep is retained.
     const free=cells.findIndex(v=>v>=0&&v<6);
     if(free<0)throw Error('分身棋没有可落的格子');
     cells[free]+=clone-tone;
   }
 }
}
function fill(b:Board, reflow=false){
 const random=rng(b.seed+'/'+b.stage+'/'+b.shuffles);
 const goalsNow=b.targets;
 const keptClones=b.cells.filter(v=>v>=6);
 // Give every new tableau a genuine match one swap away. Fill around the motifs while avoiding pre-matches.
 const locks=new Map<number,number>();
 const vertical=(x:number,y:number)=>{
   const tone=random.int(0,5);
   locks.set(at(x,y-1),tone);locks.set(at(x,y+1),tone);
   locks.set(at(x,y),(tone+1)%6);locks.set(at(x===5?x-1:x+1,y),tone);
 };
 const coinPos=reflow?b.cells.indexOf(COIN):-1;
 if(!b.bonus&&b.day==='0101'){
   const x=goalsNow[0]%8;
   const oldRow=coinPos>=0?coinPos>>3:4;
   // Recoveries keep the coin's column and depth. A horizontal swap can line it up with the outlet.
   const startColumn=x+[0,-1,1][b.stage];
   locks.set(coinPos>=0?coinPos:at(startColumn,4),COIN);
   if(oldRow<=4)vertical(x,6);
   else if(oldRow<7){
     const y=7,t=random.int(0,5);
     locks.set(at(x-1,y),t);locks.set(at(x+1,y),t);locks.set(at(x,y),(t+1)%6);
     locks.set(at(x-2,y),t);
   }
 }else if(b.day==='1123'&&b.stage===2){
   const t=random.int(0,5);for(const x of [2,3,5])locks.set(at(x,3),t);
   locks.set(at(4,3),(t+1)%6);locks.set(at(4,4),t);
 }else for(const i of goalsNow)vertical(i%8,i>>3);
 for(let attempt=0;attempt<64;attempt++){
   b.cells=Array.from({length:64},(_,i)=>open(b.day,Math.min(2,b.stage),i%8,i>>3)?(locks.get(i)??-3):HOLE);
   if(coinPos>=0)b.cells[coinPos]=COIN;
   for(let i=0;i<64;i++)if(b.cells[i]===-3){
     const offset=random.int(0,5);
     for(let n=0;n<6;n++){
       b.cells[i]=(offset+n)%6;
       // Only assigned cells can form a line while generating.
       if(!lines(b.cells).some(line=>line.includes(i)))break;
     }
   }
   if(lines(b.cells).length)continue;
   if(!b.bonus&&b.day==='0101'&&coinPos<0){
     const original=b.cells.indexOf(COIN),aligned=at(goalsNow[0]%8,4);
     exchange(b.cells,original,aligned);
     const immediateCascade=lines(b.cells).length>0;
     const x=aligned%8,center=at(x,6),side=at(x===5?x-1:x+1,6);
     exchange(b.cells,center,side);
     const release=lines(b.cells);
     exchange(b.cells,center,side);
     exchange(b.cells,original,aligned);
     // Minting a special under the coin here would keep one of its three supports.
     if(immediateCascade||release.length!==1||release[0].length!==3)continue;
   }
   restoreClones(b.cells,keptClones);
   if(availableSwaps(b).length)return;
 }
 throw Error('无法生成棋盘 '+b.day+'/'+b.stage);
}
export function createBoard(day:string,seed:string):Board{
 if(!budgets[day])throw Error('未知棋盘日期 '+day);
 const b:Board={day,seed,stage:0,cells:[],targets:goals(day,0),moves:budgets[day],turn:0,shuffles:0,score:0};
 fill(b);return b;
}
function canSwap(b:Board,a:number,c:number){
 if(!adjacent(a,c)||b.cells[a]===HOLE||b.cells[c]===HOLE)return false;
 if(b.cells[a]===COIN||b.cells[c]===COIN)return (a>>3)===(c>>3);
 if(b.cells[a]===RAINBOW||b.cells[c]===RAINBOW||b.cells[a]>=6&&b.cells[c]>=6)return true;
 if(colour(b.cells[a])===colour(b.cells[c]))return false;
 exchange(b.cells,a,c);const allowed=lines(b.cells).some(l=>l.includes(a)||l.includes(c));exchange(b.cells,a,c);return allowed;
}
export function legalMoves(b:Board):Swap[]{
 return b.moves>0&&(b.stage<3||b.bonus)?availableSwaps(b):[];
}
function availableSwaps(b:Board):Swap[]{
 const result:Swap[]=[];
 for(let i=0;i<64;i++)for(const j of [i+1,i+8])if(canSwap(b,i,j))result.push([i,j]);
 return result;
}
function drop(b:Board,removed:Set<number>,random:ReturnType<typeof rng>,falls?:TileFall[]){
 for(let x=0;x<8;x++){
   let slots:number[]=[];
   const settle=()=>{
     const sources=slots.filter(i=>!removed.has(i));
     const values=sources.map(i=>b.cells[i]);
     for(let n=0;n<slots.length;n++){
       const to=slots[n],spawn=n>=sources.length;
       b.cells[to]=spawn?random.int(0,5):values[n];
       const rows=spawn?slots.length-sources.length:(to-sources[n])/8;
       if(rows>0)falls?.push({to,rows,spawn});
     }
     slots=[];
   };
   for(let y=7;y>=0;y--){const i=at(x,y);if(b.cells[i]===HOLE)settle();else slots.push(i);}settle();
 }
}
/** Intersecting runs are one shape; disjoint matches earn their own special. */
function createSpecials(cells:number[],runs:number[][],move?:Swap):Created[]{
  const pending=new Set(runs),created:Created[]=[];
  for(const first of pending){
    pending.delete(first);
    const group=[first],members=new Set(first);
    for(let n=0;n<group.length;n++)for(const line of pending){
      if(!line.some(i=>group[n].includes(i)))continue;
      pending.delete(line);group.push(line);for(const i of line)members.add(i);
    }
    const longest=group.reduce((a,b)=>a.length>=b.length?a:b);
    if(longest.length<4&&group.length===1)continue;
    const gesture=move&&move.some(i=>members.has(i))?move:undefined;
    const crossing=[...members].find(i=>group.filter(line=>line.includes(i)).length>1);
    // Prefer the destination, then the source. Existing specials must remain free to detonate.
    const choices=[...(gesture?[gesture[1],gesture[0]]:[]),crossing,longest[Math.floor(longest.length/2)],...members];
    const anchor=choices.find(i=>i!==undefined&&members.has(i)&&cells[i]<6);
    if(anchor===undefined)continue;
    const horizontal=gesture?(gesture[0]>>3)===(gesture[1]>>3):longest[1]===longest[0]+1;
    const tone=colour(cells[anchor]);
    const value=longest.length>=5?RAINBOW:group.length>1?18+tone:(horizontal?6:12)+tone;
    created.push({at:anchor,value});
  }
  return created;
}

function resolveWave(cells:number[],runs:number[][],move:Swap|undefined,combo:boolean,random:ReturnType<typeof rng>){
  const hit=new Set(runs.flat()),handled=new Set<number>();
  const rows=new Set<number>(),cols=new Set<number>(),blasts=new Set<number>(),rainbows=new Set<number>();
  const add=(i:number)=>{if(cells[i]>=0)hit.add(i);};
  const row=(y:number)=>{rows.add(y);for(let x=0;x<8;x++)add(at(x,y));};
  const column=(x:number)=>{cols.add(x);for(let y=0;y<8;y++)add(at(x,y));};
  const blast=(i:number,double=false)=>{
    blasts.add(i);
    for(let y=Math.max(0,(i>>3)-2);y<=Math.min(7,(i>>3)+2);y++)
      for(let x=Math.max(0,i%8-2);x<=Math.min(7,i%8+2);x++)
        if(double||Math.abs(x-i%8)+Math.abs(y-(i>>3))<=2)add(at(x,y));
  };
  const collectColour=(tone:number)=>{
    for(let i=0;i<cells.length;i++)if(colour(cells[i])===tone)add(i);
  };
  const created=combo?[]:createSpecials(cells,runs,move);
  if(combo&&move){
    const [from,to]=move,left=specialKind(cells[from]),right=specialKind(cells[to]);
    add(from);add(to);handled.add(from);handled.add(to);
    if(left==='rainbow'||right==='rainbow'){
      const prism=left==='rainbow'?from:to,partner=prism===from?to:from;
      rainbows.add(prism);
      if(cells[partner]===RAINBOW){
        rainbows.add(partner);for(let i=0;i<cells.length;i++)add(i);
      }else{
        const value=cells[partner],tone=colour(value);
        if(value>=6)for(let i=0;i<cells.length;i++)if(colour(cells[i])===tone){
          cells[i]=specialKind(value)==='blast'?value:tone+(random.int(0,1)===0?6:12);
        }
        collectColour(tone);
        // The swapped partner is one of the converted pieces.
        if(value>=6)handled.delete(partner);
      }
    }else if(left==='blast'&&right==='blast')blast(to,true);
    else if(left==='blast'||right==='blast'){
      const horizontal=(left==='blast'?right:left)==='row';
      const first=Math.max(0,Math.min(4,(horizontal?to>>3:to%8)-1));
      blasts.add(to);
      for(let i=first;i<first+4;i++)if(horizontal)row(i);else column(i);
    }else{row(to>>3);column(to%8);}
  }
  // JS Set iteration also visits newly added squares, propagating every hit special once.
  for(const i of hit){
    if(handled.has(i))continue;
    handled.add(i);
    switch(specialKind(cells[i])){
      case 'row':row(i>>3);break;
      case 'column':column(i%8);break;
      case 'blast':blast(i);break;
      case 'rainbow':{
        rainbows.add(i);
        const counts=[0,0,0,0,0,0];for(const value of cells){const tone=colour(value);if(tone>=0)counts[tone]++;}
        collectColour(counts.indexOf(Math.max(...counts)));break;
      }
    }
  }
  return {hit,created,sweepRows:[...rows],sweepCols:[...cols],blasts:[...blasts],rainbows:[...rainbows]};
}

export function beginEncore(b:Board,seed:string){
 if(b.stage!==3||b.bonus)return;
 b.bonus={tile:-1,drops:0};b.moves+=3;b.seed=seed;
 const coin=b.cells.indexOf(COIN);
 if(coin>=0)b.cells[coin]=RAINBOW;
 if(!availableSwaps(b).length)fill(b);
}
export function swap(b:Board,a:number,c:number,recordFrames=false):Result|null{
 if(!b.moves||b.stage===3&&!b.bonus||!canSwap(b,a,c))return null;
 const goalsBefore=b.targets.length;
 const result:Result={groups:[],frames:[],cascades:[],madeClone:false,advanced:false,reshuffled:false};
 b.turn++;b.moves--;exchange(b.cells,a,c);
 const random=rng(b.seed+'/drop/'+b.turn+'/'+b.shuffles);
 let chain=lines(b.cells);
 let gesture:Swap|undefined=[a,c];
 let combo=b.cells[a]>=0&&b.cells[c]>=0&&(b.cells[a]===RAINBOW||b.cells[c]===RAINBOW||b.cells[a]>=6&&b.cells[c]>=6);
 while(chain.length||combo){
   const wave=resolveWave(b.cells,chain,gesture,combo,random);
   if(recordFrames)result.frames.push([...b.cells]);
   if(b.day!=='0101')b.targets=b.targets.filter(g=>!wave.hit.has(g));
   result.groups.push([...wave.hit]);b.score+=wave.hit.size*10*result.groups.length;
   const removed=wave.hit;
   for(const piece of wave.created){
     b.cells[piece.at]=piece.value;removed.delete(piece.at);result.madeClone=true;
   }
   const falls=recordFrames?[] as TileFall[]:undefined;
   drop(b,removed,random,falls);
   if(falls)result.cascades.push({after:[...b.cells],falls,created:wave.created,clones:wave.created.map(piece=>piece.at),
     sweepRows:wave.sweepRows,sweepCols:wave.sweepCols,blasts:wave.blasts,rainbows:wave.rainbows});
   gesture=undefined;combo=false;chain=lines(b.cells);
 }
 if(b.bonus){
   const bonus=b.bonus;
   if(bonus.tile>=0&&result.groups.some(group=>group.includes(bonus.tile))){
     b.moves+=2;bonus.tile=-1;
   }else if(b.moves>0&&bonus.tile<0&&bonus.drops<2&&random.int(0,99)<10){
     const choices=b.cells.flatMap((v,i)=>v>=0?[i]:[]);
     bonus.tile=choices[random.int(0,choices.length-1)];bonus.drops++;
   }
   if(b.moves>0&&!availableSwaps(b).length){b.shuffles++;fill(b);result.reshuffled=true;}
   return result;
 }
 if(b.day==='0101'&&b.cells[b.targets[0]]===COIN)b.targets=[];
 if(b.day==='1123'&&b.stage===0&&b.targets.length===1){b.stage=1;result.advanced=true;}
 else if(!b.targets.length){
   if(b.day==='1123'&&b.stage===0)b.stage=2;else b.stage++;
   result.advanced=true;
   if(b.stage<3){
     b.targets=goals(b.day,b.stage);fill(b);
   }
 }else if(b.day==='0815'&&b.targets.length<goalsBefore){b.shuffles++;fill(b,true);}
 else if(b.moves>0&&!legalMoves(b).length){b.shuffles++;fill(b,true);result.reshuffled=true;}
 return result;
}
export function shuffle(b:Board){if(b.stage<3&&b.moves>1){b.moves--;b.shuffles++;fill(b,true);}}
export function hint(b:Board):Swap|null{
 if(!b.moves||b.stage===3&&!b.bonus)return null;
 let best=-Infinity,choice:Swap|null=null;
 for(const m of legalMoves(b)){
   const after={...b,bonus:b.bonus?{...b.bonus}:undefined,cells:[...b.cells],targets:[...b.targets]};
   const r=swap(after,...m)!;
   const coin=after.cells.indexOf(COIN);
   const coinProgress=b.day==='0101'?(coin>>3)*20-Math.abs(coin%8-b.targets[0]%8)*200:0;
   const value=b.bonus?after.score+(after.moves-b.moves)*100:(after.stage-b.stage)*10000+(b.targets.length-after.targets.length)*500+coinProgress+r.groups.length;
   if(value>best){best=value;choice=m;}
 }
 return choice;
}

