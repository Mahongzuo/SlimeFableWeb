type Finish = 'boards' | 'cladding' | 'shingles' | 'tiles' | 'timber';
const maps = new Map<Finish, any>();

export function architectureMap(T: any, finish: Finish) {
  // Terrain/collision baking can also run without a browser image decoder.
  if (typeof document === 'undefined' || !document.createElementNS) return null;
  let map = maps.get(finish);
  if (!map) {
    map = new T.TextureLoader().load(`/models/architecture/${finish}.jpg`);
    map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.anisotropy = 4;
    maps.set(finish, map);
  }
  return map;
}

const nativeFinishes: Record<string, Finish> = {
  'treehouse-platform': 'timber', 'treehouse-cabin': 'cladding', 'treehouse-supports': 'timber',
  'ranger-cabin-timbers': 'cladding', 'blue-tile-roofs': 'tiles',
  'north-pavilion-hip-roof': 'tiles', 'lake-village-timber': 'timber', 'pier-deck-planks': 'timber', 'pier-half-railings': 'timber',
};

/** Preserve the walkable shell and independent ladder/railing instances on native landmarks. */
export function nativeBuildingMaterial(z: any, name: string, color: number, options = {}) {
  const finish = nativeFinishes[name];
  if (!finish) return z.toon(color, options);
  return z.toon(0xf3e9dc, {noCache: true, map: architectureMap(z.T, finish)});
}

