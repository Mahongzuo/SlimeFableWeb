/** Shared by live inputs and the guide. The existing pause menu keeps its own state. */
let openedAt:number|null=null,readTime=0;
let current:()=>string=()=>'';
const waiting=new Set<()=>void>();
export interface BoardExample{
 text:string;
 cells:{symbol:string;color:string;hole:boolean;target:boolean}[];
 pair:readonly number[];
}
type HelpExample=string|BoardExample;
let move:()=>HelpExample=()=>'';
export function bindHelpHint(reader:()=>string,example:()=>HelpExample=()=>''){current=reader;move=example;}
export const nextHelpMove=()=>move();
export const currentHelpHint=()=>current();
export const readingHelp=()=>openedAt!==null;
export function setReadingHelp(open:boolean){
  if(open&&openedAt===null)openedAt=performance.now();
  else if(!open&&openedAt!==null){
    readTime+=performance.now()-openedAt;openedAt=null;
    for(const resume of waiting)resume();waiting.clear();
  }
}
export const playingNow=()=>(openedAt??performance.now())-readTime;
export function resumeAfterHelp(){return readingHelp()?new Promise<void>(resolve=>waiting.add(resolve)):Promise.resolve();}
