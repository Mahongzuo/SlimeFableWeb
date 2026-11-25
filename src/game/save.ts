import {beijingDay,completedGate,GATE_SHELLS,SHARD_SHELLS,type HomeDaily} from './home-rewards';
import type {WeatherMode} from '../home/climate';
import {DayId} from './calendar';
import type {QualitySetting} from './graphics';
import {ensureHome, freshLife, type LifeData} from '../life/state';
export interface SaveData {homeWeather?: WeatherMode;homeClockMinute?:number|null;homeDaily?:HomeDaily; v: 1; selectedDay: DayId | null; shards: string[]; souvenirs: string[]; visited: string[]; quality: QualitySetting; seenHints: string[]; completed: string[]; life: LifeData}
const KEY = 'slimefable.web.save.v1';
const fresh = (): SaveData => ({v: 1, selectedDay: null, shards: [], souvenirs: [], visited: [], quality: 'auto', seenHints: [], completed: [], life: freshLife()});
/** localStorage can be missing, full or blocked; the game must run either way. */
export class Save {
  data: SaveData;
  constructor() {
    let loaded: Partial<SaveData> | null = null;
    try { loaded = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch {}
    this.data = {...fresh(), ...(loaded && loaded.v === 1 ? loaded : {})};
    this.data.life = {...freshLife(), ...(this.data.life ?? {})};
    ensureHome(this.data.life);
    // older saves had only high / balanced
    if ((this.data.quality as string) === 'balanced') this.data.quality = 'medium'; else if (!['auto', 'low', 'medium', 'high', 'ultra'].includes(this.data.quality)) this.data.quality = 'auto';
  }
  write() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch {} }
  daily(date=beijingDay()):HomeDaily {
    if(this.data.homeDaily?.date!==date)this.data.homeDaily={date,gates:[],shards:[],spots:[]};
    return this.data.homeDaily;
  }
  collectShard(id:string,date=beijingDay()){
    const daily=this.daily(date);
    if(!daily.spots.some(p=>p.id===id)||daily.shards.includes(id))return false;
    daily.shards.push(id);this.data.life.coins+=SHARD_SHELLS;this.write();return true;
  }
  add(list: 'shards' | 'souvenirs' | 'visited' | 'seenHints' | 'completed', id: string) {
    let paid=false;
    if(list==='completed'){
      const gate=completedGate(id);
      if(gate){
        const daily=this.daily();
        if(!daily.gates.includes(gate)){daily.gates.push(gate);daily.lastWin=id;this.data.life.coins+=GATE_SHELLS;paid=true;}
      }
    }
    if (this.data[list].includes(id)){if(paid)this.write();return false;}
    this.data[list].push(id); this.write(); return true;
  }
}
