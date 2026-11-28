import type {LifeData} from './state';
import {changeShells} from './shell-wallet';
import {RANCH_SPECIES_MAP} from './ranch';

export const disciplines=['football','basketball','tennis','badminton','swim'] as const;
export type Sport=typeof disciplines[number];
export const sportsNames:Record<Sport,string>={football:'足球',basketball:'篮球',tennis:'网球',badminton:'羽毛球',swim:'游泳'};
export const sportHelp:Record<Sport,string>={
  football:'5 对 5，每队一名门将。沿 +X 方向攻门，带球时轻点 F 向队友传球，按住再松开射门。空格短冲刺，靠近对手可夺球。整球越线得分，出界后由场面提示的一方重开。三分钟打平后下一球决胜。',
  basketball:'3 对 3 攻同一个东篮。轻点 F 传球，长按 F 起跳，在蓄力条约七成时松开投篮。空格抢板或封盖。弧外投中得两分，弧内一分，换手后先退到弧外。先得十一分获胜。',
  tennis:'单打抢七。F 对角发球，第一次失误可以重发。看落点移动，球到身旁按 F，方向键调整落点，空格打高吊。落地一次仍可救球。先得七分并领先两分获胜。',
  badminton:'单打或双打。F 对角发球，移动到球下按 F 回击。空格在网前轻吊，在高点扣杀。球第一次落地即判分，单双打边线不同。十一分领先两分胜，十五分封顶。',
  swim:'珊瑚红泳帽是你的史莱姆。空格从出发台跃入，连续按 F 划水，按住可匀速游。到另一端看到触壁提示时按空格蹬壁，游回出发端亲自触壁完赛。体力不足可改用匀速。'
};
export interface SportsLog {site?:number; ability:number; day:string; trained:number; matches:number}
export function sportsLog(life:LifeData):SportsLog {
  return life.sports??={ability:50,day:'',trained:0,matches:0};
}
export const trainingToday=(log:SportsLog,day:string)=>day===log.day?log.trained:0;
export function reward(sport:Sport,rank:number) {
  if(sport==='swim')return [8,5,4,3,3,3][Math.max(0,Math.min(5,rank-1))];
  const pair={football:[18,6],basketball:[14,5],tennis:[10,3],badminton:[10,3]}[sport];
  return pair[rank===1?0:1];
}
export function settleSport(life:LifeData,sequence:number,sport:Sport,rank:number,day:string){
  const log=sportsLog(life);
  if(sequence!==log.matches+1 || !Number.isInteger(rank)||rank<1||rank>(sport==='swim'?6:2))return null;
  const shells=reward(sport,rank),before=log.ability;
  if(!changeShells(life,shells,'earn'))return null;
  if(log.day!==day){log.day=day;log.trained=0;}
  if(log.trained<4){log.trained++;log.ability=Math.min(95,log.ability+1);}
  log.matches=sequence;
  return {before,after:log.ability,shells,rank};
}
export type Traits=[number,number,number,number,number,number];
export const traitNames=['速度','耐力','力量','反应','控球','水性'];
// Speed, endurance, power, reaction, control, swimming. Ratings by playing discipline.
type Entry=[Traits,number[],string];
const visitorIds=['hare','golden-retriever','fox','goat','otter','capybara','duckling','red-panda','snow-fox','deer','mute-swan','great-crested-grebe'];
const profiles:Record<string,Entry>={
  hare:[[5,2,2,4,3,1],[74,60,70,78,49],'第一步快，适合前插抢网。'],
  'golden-retriever':[[4,5,3,4,5,4],[89,78,75,75,76],'耐跑，会拉开角度接应。'],
  fox:[[4,3,2,5,5,2],[76,69,89,83,51],'反应敏锐，擅长截球变线。'],
  goat:[[3,4,5,3,3,1],[71,89,68,67,48],'起跳有力，抢板与后场球出色。'],
  otter:[[3,4,3,5,3,5],[59,57,68,69,89],'入水和转身爆发最快。'],
  capybara:[[2,5,4,2,2,4],[49,53,48,46,79],'起步慢，后半程保持配速。'],
  duckling:[[2,2,1,2,2,4],[47,46,48,48,57],'入门对手，擅长浮水。'],
  'red-panda':[[3,3,3,4,4,2],[64,67,67,72,53],'攻守均衡，落点稳定。'],
  'snow-fox':[[5,4,3,5,4,2],[83,76,84,89,58],'抢网后擅长连续快攻。'],
  deer:[[4,4,4,3,2,2],[68,67,62,63,56],'跑动覆盖范围大。'],
  'mute-swan':[[3,4,3,3,2,5],[54,58,55,53,81],'长距离划水平顺。'],
  'great-crested-grebe':[[3,3,2,4,3,5],[52,50,59,58,72],'转身灵活，擅长追赶。'],
  pheasant:[[4,2,2,4,3,2],[63,57,68,73,48],'反应快，短回合占优。'],
  crane:[[3,4,3,4,4,3],[66,72,77,79,64],'回球稳，擅长照顾网前。'],
  'white-deer':[[5,4,4,3,3,2],[84,74,74,70,54],'长距离冲刺能保留体力。'],
  'nine-deer':[[4,5,4,4,4,2],[85,83,82,84,55],'连续跑动时仍能稳定出球。'],
  'orange-tabby':[[3,2,2,5,4,1],[61,66,76,79,45],'善于预判短球。'],
  chick:[[2,2,1,3,2,1],[46,45,49,51,42],'轻巧灵活，适合初次练习。'],
  'lop-eared-rabbit':[[4,2,2,4,3,1],[68,57,66,72,47],'短距离启动灵敏。'],
  hamster:[[3,2,1,4,2,1],[53,48,54,60,45],'转向灵活，击球力量较小。'],
  'guinea-pig':[[2,3,2,2,2,1],[50,50,51,49,45],'适合慢节奏传接。'],
  hedgehog:[[2,3,2,3,3,1],[52,54,58,56,45],'习惯留在后方稳稳接球。'],
  budgerigar:[[4,2,1,5,3,1],[58,54,70,74,45],'反应敏锐，擅长接短球。'],
  bear:[[2,4,5,2,3,4],[70,85,67,61,70],'力气大，在篮下和泳池都很稳。'],
  'bull-moose':[[3,4,5,2,3,3],[73,84,64,59,62],'长程传球有力，变向稍慢。'],
  'great-horned-owl':[[3,3,3,5,4,1],[62,69,81,82,48],'擅长预判下一拍。'],
  zebra:[[5,4,4,3,2,2],[81,70,65,66,56],'能快速拉开阵型。'],
  'thomsons-gazelle':[[5,3,3,4,3,2],[83,73,72,77,54],'加速抢点很快。'],
  warthog:[[4,3,5,2,2,2],[75,74,59,57,55],'擅长带球推进与强力远射。'],
  'grey-heron':[[3,3,2,4,4,3],[59,67,74,76,62],'网前伸展和截球出色。'],
  chipmunk:[[4,2,1,4,3,1],[60,53,65,68,46],'变向快，远距离击球较弱。'],
  'house-sparrow':[[4,2,1,4,2,1],[56,49,61,65,45],'善于抢短球。'],
  'golden-eagle':[[4,3,4,5,3,1],[78,80,79,85,47],'高点击球有力。'],
};
export interface Athlete {id:string;species:string;name:string;asset:string;size:number;traits:Traits;rating:number;tip:string}
export function entrants(life:LifeData,sport:Sport):Athlete[]{
  const ranch=life.home?.ranch;
  const rows=[...visitorIds.map(s=>'ranch-'+s),...(ranch?.discovered??[])];
  const choices=Array.from(new Set(rows)).map(species=>({species,id:species,name:''}));
  for(const a of ranch?.animals??[])choices.unshift({species:a.speciesId,id:a.id,name:a.name});
  const index=disciplines.indexOf(sport);
  return choices.flatMap(c=>{
    const def=RANCH_SPECIES_MAP[c.species];if(!def)return [];
    const fallback:Entry=[[3,3,3,3,3,2],[61,60,61,60,55],'节奏平稳，攻守均衡。'];
    const [traits,ratings,tip]=profiles[c.species.replace('ranch-','')]??fallback;
    if(sport==='swim'&&traits[5]<4)return [];
    return [{...c,name:c.name||def.name,asset:def.asset,size:def.size,traits,rating:ratings[index],tip}];
  });
}
export function trainingFactors(rating:number){
  const gain=(rating-50)/10;
  return {speed:1+.03*gain,power:1+.04*gain,fatigue:1-.05*gain,window:1+.05*gain};
}
