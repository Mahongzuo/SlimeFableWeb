import {Box,Vec} from '../slime/types';
/** Home plaza on the harbour's front quay (metres, Y up). Pure data: collision and meshes both read it. */
export const SEA_LEVEL = -1.8;
export const plazaCenter: Vec = [13, 0, 21];
export const homeSpawn: Vec = [4.5, 0, 21];
export const spawnYaw = -Math.PI / 2; // facing +X, towards the lectern
export const portalRadius = 8;
export const portalAngles = [-78, -47, -16, 16, 47, 78];
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
    const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    for (const side of [-1, 1]) {
      const x = p.position[0] + rx * pillarOffset * side, z = p.position[2] + rz * pillarOffset * side;
      boxes.push({name: `prop:portal-${p.slot}-${side < 0 ? 'l' : 'r'}`, min: [x - .27, 0, z - .27], max: [x + .27, 3.1, z + .27], camera: true});
    }
  }
  const [cx, , cz] = plazaCenter;
  boxes.push({name: 'prop:lectern', min: [cx - .5, 0, cz - .5], max: [cx + .5, 1.12, cz + .5], camera: false});
  return boxes;
}
/** Time shards: a reason to explore every corner, roof and the water. y is resolved against the scene at build time. */
export interface ShardSpot {id: string; x: number; z: number; sea?: boolean; lift?: number; hint: string}
export const shardSpots: ShardSpot[] = [
  {id: 'plaza-back', x: 8, z: 27.5, hint: '广场后面'},
  {id: 'office-steps', x: -17, z: 15.2, lift: .3, hint: '办公楼台阶'},
  {id: 'office-back', x: -25.5, z: 26, hint: '办公楼背后'},
  {id: 'pontoon', x: 20.8, z: 8, hint: '浮码头'},
  {id: 'ramp-water', x: 27, z: 3.2, sea: true, hint: '船坡下的水面'},
  {id: 'basin-mid', x: 4, z: -8, sea: true, hint: '港池中央'},
  {id: 'basin-boats', x: 13, z: -15, sea: true, hint: '港池深处'},
  {id: 'left-quay', x: -13, z: -19.5, hint: '仓库南边'},
  {id: 'hill-top', x: -25.5, z: -25.5, hint: '山坡顶上'},
  {id: 'pier-mid', x: -1, z: -25, hint: '防波堤中段'},
  {id: 'pier-light', x: 8.6, z: -25, hint: '灯塔脚下'},
  {id: 'breakwater', x: 22, z: -29, hint: '外侧防波堤'},
];
