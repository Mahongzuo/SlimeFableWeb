import {DayId} from './calendar';
export interface SaveData {v: 1; selectedDay: DayId | null; shards: string[]; souvenirs: string[]; visited: string[]; quality: 'high' | 'balanced'; seenHints: string[]}
const KEY = 'slimefable.web.save.v1';
const fresh = (): SaveData => ({v: 1, selectedDay: null, shards: [], souvenirs: [], visited: [], quality: 'high', seenHints: []});
/** localStorage can be missing, full or blocked; the game must run either way. */
export class Save {
  data: SaveData;
  constructor() {
    let loaded: Partial<SaveData> | null = null;
    try { loaded = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch {}
    this.data = {...fresh(), ...(loaded && loaded.v === 1 ? loaded : {})};
  }
  write() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch {} }
  add(list: 'shards' | 'souvenirs' | 'visited' | 'seenHints', id: string) {
    if (this.data[list].includes(id)) return false;
    this.data[list].push(id); this.write(); return true;
  }
}
