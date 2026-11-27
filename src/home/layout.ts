import {Box,Vec} from '../slime/types';
/** Home plaza on the harbour's front quay (metres, Y up). Pure data: collision and meshes both read it. */
export const SEA_LEVEL = -.38;
export const plazaCenter: Vec = [10, 0, 17];
export const homeSpawn: Vec = [1.5, 0, 17];
export const spawnYaw = -Math.PI / 2; // facing +X, towards the lectern
export const portalRadius = 8;
export const quayPavilion = {x: 3, z: 29, width: 3.6};
export const nativeLane = {x: 8, firstZ: 24, lastZ: 34};
export const portalAngles = [-87, -54, -20, 20, 54, 87];
export interface PortalSlot {slot: number; position: Vec; yaw: number}
/** Six doors on the east half-circle, numbered in story order from the sea side round to the back. */
export const portalSlots: PortalSlot[] = portalAngles.map((deg, i) => {
  const a = deg * Math.PI / 180;
  const position: Vec = [plazaCenter[0] + Math.cos(a) * portalRadius, 0, plazaCenter[2] + Math.sin(a) * portalRadius];
  // local +Z of each door faces the lectern
  const yaw = Math.atan2(plazaCenter[0] - position[0], plazaCenter[2] - position[2]);
  return {slot: i + 1, position, yaw};
});
export const pillarOffset = 1.15;
export function plazaBoxes(): Box[] {
  const boxes: Box[] = [];
  for (const p of portalSlots) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    const localBox = (name: string, lx: number, lz: number, w: number, d: number, y0: number, y1: number, camera = true) => {
      const wx = p.position[0] + lx * c + lz * s;
      const wz = p.position[2] - lx * s + lz * c;
      boxes.push({name, min: [wx - w / 2, y0, wz - d / 2], max: [wx + w / 2, y1, wz + d / 2], yaw: p.yaw, camera});
    };
    // Plinth & step (walkable low curb, leaves doorway passage open)
    localBox(`prop:portal-${p.slot}-plinth`, 0, 0, 2.95, 2.95, 0, .22, false);
    localBox(`prop:portal-${p.slot}-step`, 0, 0, 2.60, 2.60, .22, .28, false);
    // Left & right pillar assemblies (foot 0.54, shaft 0.36, cap 0.54)
    for (const side of [-1, 1]) {
      const tag = side < 0 ? 'l' : 'r';
      localBox(`prop:portal-${p.slot}-${tag}-foot`, side * pillarOffset, 0, .54, .54, .28, .44, true);
      localBox(`prop:portal-${p.slot}-${tag}`, side * pillarOffset, 0, .42, .42, .44, 2.99, true);
    }
    // Overhead beam, keystone & roof (clear above y = 3.85 so player walks freely underneath)
    localBox(`prop:portal-${p.slot}-beam`, 0, 0, 2.86, .58, 3.86, 4.18, true);
    localBox(`prop:portal-${p.slot}-roof`, 0, 0, 3.36, .98, 4.16, 4.54, true);
  }
  const [cx, , cz] = plazaCenter;
  boxes.push({name: 'prop:lectern-base', min: [cx - .50, 0, cz - .50], max: [cx + .50, .18, cz + .50], camera: false});
  boxes.push({name: 'prop:lectern', min: [cx - .44, .18, cz - .54], max: [cx + .44, 1.12, cz + .54], camera: false});
  return boxes;
}
/** Time shards: a reason to explore every corner, roof and the water. y is resolved against the scene at build time. */
export interface ShardSpot {id: string; x: number; z: number; sea?: boolean; lift?: number; hint: string}
export const shardSpots: ShardSpot[] = [
  {id:'plaza-back',x:8,z:27.5,hint:'书院北侧石径'}, {id:'office-steps',x:-15,z:-1,hint:'水巷茶舍门前'},
  {id:'office-back',x:-16,z:-12,hint:'粉墙山后'}, {id:'pontoon',x:-9,z:9,hint:'柳岸钓台'},
  {id:'ramp-water',x:-6,z:2,sea:true,hint:'廊桥下游'}, {id:'basin-mid',x:-6.4,z:-7,sea:true,hint:'水巷河心'},
  {id:'basin-boats',x:-7,z:-18,sea:true,hint:'南溪浅水'}, {id:'left-quay',x:-18,z:3,hint:'巷尾石路'},
  {id:'hill-top',x:-20,z:-21,hint:'观景坡顶'}, {id:'pier-mid',x:4,z:-20,hint:'银杏茶坡'},
  {id:'pier-light',x:13,z:-23,hint:'山亭旁'}, {id:'breakwater',x:24,z:-15,hint:'远山竹径'},
];
