import {gatesFor,gateContains} from '../src/game/mode-gates';
import {dailyModes as modeRegistry,modesFor} from '../content/daily-modes';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {legacySources} from '../content/legacy-sources';
import {days} from '../content/registry';
import {levels} from '../content/levels/registry';
import {abilityLevels,elementNames,mechanics} from '../content/ability';
import {chronicleLevels,chronicleModeLabels} from '../content/chronicle';
import {monthLength} from '../src/game/calendar';

const path='docs/level-catalog.json',checking=process.argv.includes('--check');
const target={min:3,max:5}, seen=new Set<string>(),errors:string[]=[];
const seenModes=new Set<string>();
const pilotResults=JSON.parse(readFileSync('tasks/reports/1123-mode-revision-results.json','utf8'));
function modeVerification(m:typeof modeRegistry[number]){
 if(m.january && m.day.startsWith('10'))return {verification:{checkedOn:'2026-11-24',storyId:m.storyId,completion:'逐日四门、史料配比与存档校验，生产版浏览器验收见报告',playerReview:'待玩家试玩'},verificationReport:'tasks/reports/october-four-gates.md'};
 if(m.january && m.day.startsWith('08'))return {verification:{checkedOn:'2026-11-24',storyId:m.storyId,completion:'四十种子自动检查，生产版逐关加载及港口逐门验证',playerReview:'待玩家试玩'},verificationReport:'tasks/reports/august-four-gates.md'};
 if(m.january && m.day.startsWith('06'))return {verification:{checkedOn:'2026-11-24',storyId:m.storyId,completion:'四十种子自动检查，生产版按模式抽验',playerReview:'待玩家试玩'},verificationReport:'tasks/reports/june-four-gates.md'};
 if(m.january)return {verification:{checkedOn:'2026-11-24',storyId:m.storyId,completion:'全年 366 天四门均已通过 40 种子模拟与多主题实机抽验',saveAndReturn:'正式与练习分账、回港通过',playerReview:'待玩家试玩'},verificationReport:m.day.startsWith('12')?'docs/days/december-four-gates.md':m.day.startsWith('11')?'docs/days/november-four-gates.md':m.day.startsWith('09')?'docs/days/september-four-gates.md':m.day.startsWith('07')?'docs/days/july-four-gates.md':m.day.startsWith('05')?'docs/days/may-four-gates.md':m.day.startsWith('04')?'docs/days/april-four-gates.md':m.day.startsWith('03')?'docs/days/march-four-gates.md':m.day.startsWith('02')?'docs/days/february-four-gates.md':'tasks/reports/january-four-gates.md'};
 if(m.id==='1116-defense')return {verification:{storyId:m.storyId,completion:'两套阵容经史书或三号门进入，完成八波并手动发信',seedCoverage:'40 个种子各用两套阵容通关',saveAndReturn:'正式与练习独立记录，回到三号门',playerReview:'待玩家试玩'},verificationReport:'tasks/reports/1116-defense.md'};
 if(m.id==='1021-skirmish'||m.id==='1021-rpg'){
  return {verification:{storyId:m.storyId,completion:'两条路线实机通关',saveAndReturn:'检查点、纪念品与回港通过',playerReview:'待玩家试玩'},
   verificationReport:'tasks/reports/1021-campaign.md'};
 }
 return {verification:pilotResults[m.saveId]??null,verificationReport:pilotResults[m.saveId]?'tasks/reports/1123-mode-revision.md':null};
}
const annual:Record<string,unknown>={};
const chronicleMonths:Record<string,string>={'01':'january','02':'february','03':'march','04':'april','05':'may','06':'june','07':'july','08':'august','09':'september','10':'october','11':'november','12':'december'};
const locations:Record<string,string>={atlas:'content/atlas-records.ts',ability:'content/ability-records.ts',almanac:'content/november.ts',folio:'content/october.ts',solstice:'content/december.ts',chronicle:'content/chronicle.ts'};
const skills=new Map(abilityLevels.map(s=>[s.id,s]));
const chronicles=new Map(chronicleLevels.map(s=>[s.id,s]));
const router=readFileSync('src/level/main.ts','utf8');
for(let m=1;m<=12;m++)for(let d=1;d<=monthLength(m);d++){
 const day=[m,d].map(v=>String(v).padStart(2,'0')).join('');
 const entry=days[day];if(!entry){errors.push('缺日期 '+day);continue;}
 if(entry.chapters.length===0)errors.push('日期没有章节 '+day);
 if(m<=9 && entry.chapters.filter(c=>c.status==='web').length<2)errors.push('缺可玩章节 '+day);
 const chapters=entry.chapters.map(c=>{
   const {id,status,year,template}=c,s=levels[id],a=skills.get(id),ch=chronicles.get(id);
   if(seen.has(id)||id!==day+'-'+year||c.day!==day)errors.push('重复或日期不符 '+id);
   if((status==='web')!==!!s||s&&s.template!==template)errors.push('注册表与入口不符 '+id);
   seen.add(id);
   const runtime=template==='explore-quest'?'explore':template;
   if(s&&(!existsSync('src/level/'+runtime+'.ts')||!router.includes("import('./"+runtime+"')")))errors.push('缺少关卡入口 '+id);
   const implementation=s?(template==='chronicle'?'content/chronicle-'+chronicleMonths[day.slice(0,2)]+'.ts':locations[template]??'content/levels/'+id+'.ts'):'content/days/'+day+'.ts';
   if(!existsSync(implementation))errors.push('实现文件不存在 '+id+' '+implementation);
   let source=s&&'source' in s?s.source:legacySources[id]??null;
   const design='docs/days/'+day+'.md';
   if(!source&&existsSync(design)){
      let prose=readFileSync(design,'utf8');
      if(day==='1112')prose=prose.split('## '+id+' ·')[1]?.split('\n## ')[0]??'';
      source=prose.match(/https?:\/\/[^\s)，）]+/)?.[0]??null;
   }
   if(!source||!/^https?:\/\//.test(source))errors.push('缺历史来源 '+id);
   const record=source??implementation;
   const required=a?[...mechanics[a.mode].required]:ch?[...chronicleModeLabels[ch.mode].required]:null;
   return {id,year,event:c.event,source:record,sourceStatus:source?'已附史料':'原项目记录，外部史料待补',
    title:s?.title??c.quest,status,template,mechanic:a?.mode??ch?.mode??null,playerGoal:c.steps.join(' → '),
    requiredAbilities:required,optionalAbilities:a?(a.mode==='climb'?['弹跳']:[]):ch?[]:null,abilityReview:a||ch?'机关校验':'待核实',
    ...(a&&a.mode!=='duet'?{elements:a.mode==='tide'?['风','水']:a.mode==='circuit'?[elementNames[(a.element+1)%6],elementNames[a.element]]:[elementNames[a.element]]}:ch&&ch.mode==='relay'?{elements:[elementNames[ch.element],elementNames[(ch.element+1)%6]]}:{}),
    souvenir:c.souvenir,implementation,playPath:s?'level.html?id='+id:null};
 });
 const dailyModes=modesFor(day);
 const gates=gatesFor(entry);
 if(new Set(dailyModes.map(m=>m.storyId)).size!==dailyModes.length || new Set(dailyModes.map(m=>m.fact)).size!==dailyModes.length)errors.push('固定玩法重复历史事件 '+day);
 for(const m of dailyModes){
   if(!/^https:\/\//.test(m.source)||!m.souvenir||!m.memory||!m.saveId)errors.push('缺少固定玩法史料或收藏 '+m.id);
   if(seenModes.has(m.id)||seen.has(m.id)||(m.id!==day+'-'+m.kind&&m.id!==day+'-'+m.kind+'-'+m.storyId)||(m.chapterId!==null&&!entry.chapters.some(c=>c.id===m.chapterId))||m.playPath!=='level.html?id='+m.id)errors.push('模式绑定错误 '+m.id);
   seenModes.add(m.id);
   const runtime=m.january&&m.kind!=='match'?'january-'+m.kind:m.kind==='defense'?'defense':m.kind==='match'?'mode-match':m.kind==='skirmish'||m.kind==='rpg'?'battle-preview':'mode-world';
   if(!existsSync('src/level/'+runtime+'.ts')||!router.includes("import('./"+runtime+"')"))errors.push('缺模式入口 '+m.id);
   if(gates.filter(g=>gateContains(g,m.id)).length!==1)errors.push('模式门位不唯一 '+m.id);
 }
 annual[day]={...(dailyModes.length?{dailyModes:dailyModes.map(m=>({...m,gateSlot:gates.findIndex(g=>gateContains(g,m.id))+1,...modeVerification(m)}))}:{}),targetWebCount:target,webCount:chapters.filter(c=>c.status==='web').length,chapters};
}
for(const m of modeRegistry)if(!seenModes.has(m.id)||seen.has(m.id))errors.push('缺失或冲突的模式 '+m.id);
for(const id of Object.keys(levels))if(!seen.has(id))errors.push('孤立关卡 '+id);
for(const day of Object.keys(days))if(!(day in annual))errors.push('无效日期 '+day);
const catalog={schemaVersion:2,targetWebCount:target,days:annual};
// Four-digit keys without leading zeroes are integer keys in JS. Write them in calendar order.
const dayText=Object.keys(annual).sort().map(day=>{
 const value=JSON.stringify(annual[day],null,2).replace(/\n/g,'\n    ');
 return '    "'+day+'": '+value;
}).join(',\n');
const header=JSON.stringify({...catalog,days:{}},null,2);
const json=header.replace('"days": {}','"days": {\n'+dayText+'\n  }')+'\n';
if(checking){
 const old=existsSync(path)?readFileSync(path,'utf8').replace(/\r\n/g,'\n'):'';
 if(old!==json){
   let previous:Record<string,any>={};try{previous=JSON.parse(old).days??{}}catch{}
   const changed=Object.keys({...previous,...annual}).filter(k=>JSON.stringify(previous[k])!==JSON.stringify(annual[k]));
   errors.push('目录过期，请运行 npm run catalog。'+changed.map(k=>k+' '+(days[k]?.chapters??[]).map(c=>c.id).join(',')).join(' / '));
 }
}else if(!errors.length)writeFileSync(path,json);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(Object.keys(annual).length+' 天，'+Object.keys(levels).length+' 个 Web 章节，'+seen.size+' 条历史记录，'+seenModes.size+' 个固定模式挑战');
