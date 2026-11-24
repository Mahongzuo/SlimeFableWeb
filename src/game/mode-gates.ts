import {dailyModes,modeKinds,modeNames,modeById,modesFor,type DailyMode,type ModeKind} from '../../content/daily-modes';
import type {ChapterMeta,DayMeta} from '../../content/types';
import {days} from '../../content/registry';

export type StoryGate={type:'story';stories:ChapterMeta[];archive:DailyMode[]};
export type ModeGate={type:'mode';kind:ModeKind;challenge:DailyMode|undefined;additional?:DailyMode[];day:string};
export type Gate=StoryGate|ModeGate;
export const modePalette:Record<ModeKind,[string,string]>={
  defense:['#237767','#49684a'],match:['#318b78','#423b76'],shot:['#c57d4a','#654353'],trial:['#a48350','#4e665c'],skirmish:['#d6aa70','#427b89'],rpg:['#af6a55','#4a6460']
};
export function gatesFor(day:DayMeta):(Gate|null)[]{
  const stories=day.chapters.filter(c=>c.status==='web');
  const left=[stories.slice(0,1),stories.slice(1)];
  const challenges=modesFor(day.day);
  const fixed:ModeGate[]=modeKinds.map(kind=>({type:'mode',kind,day:day.day,challenge:challenges.find(m=>m.kind===kind&&!m.additional),additional:challenges.filter(m=>m.kind===kind&&m.additional)}));
  const legacy=challenges.filter(m=>m.kind==='shot'||m.kind==='trial');
  return [...left.map((stories,i):StoryGate|null=>{
    const archive=i===1?legacy:[];
    return stories.length||archive.length?{type:'story',stories,archive}:null;
  }),...fixed];
}
export function gateContains(g:Gate|null,id:string){
  return g?.type==='story'?(g.stories.some(c=>c.id===id)||g.archive.some(m=>m.id===id)):(g?.challenge?.id===id||!!g?.additional?.some(m=>m.id===id));
}
export function gateTitle(g:Gate){
  if(g.type==='mode')return modeNames[g.kind];
  if(g.archive.length)return '故事与试炼';
  return g.stories.length>1?'更多年份':String(g.stories[0].year);
}
export function gatePalette(g:Gate):[string,string]{
  return g.type==='mode'?modePalette[g.kind]:(g.stories[0]?.palette??modePalette.trial);
}
export function gateSummary(g:Gate){
  if(g.type==='mode')return g.challenge?.title??'选择试玩日期';
  if(g.archive.length)return [...g.stories.map(c=>c.quest),...g.archive.map(m=>m.title)].join(' · ');
  return g.stories.length>1?g.stories.map(c=>c.year).join(' · '):g.stories[0].quest;
}
export function defaultEntry(g:Gate|null){
  return g?.type==='mode'?g.challenge?.id:g&&g.stories.length+g.archive.length===1?(g.stories[0]??g.archive[0]).id:undefined;
}
export function journeyFor(id:string){
  const mode=modeById(id);
  if(mode)return {day:mode.day,path:mode.playPath};
  const day=id.split('-')[0];
  if(days[day]?.chapters.some(c=>c.id===id&&c.status==='web'))return {day,path:'level.html?id='+encodeURIComponent(id)};
}
export const pilotChoices=(kind:ModeKind)=>dailyModes.filter(m=>m.kind===kind&&!m.additional);

