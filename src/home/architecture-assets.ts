/** Building ids are shared by native scenery, placed props and older saves. */
export const architectureIds = new Set([
  'build-thatch', 'build-moon-gate', 'pack-pavilion', 'build-huizhou', 'build-teahall',
  'pasture-shelter', 'pack-greenhouse', 'waterside-stilt-house', 'build-covered-bridge',
  'watermill', 'pack-windmill', 'build-lighthouse', 'build-red-pagoda',
]);

export function landscapeAssetUrl(id: string, extension: 'glb' | 'png') {
  const directory = architectureIds.has(id) ? 'architecture' : 'dreamworld';
  return `/models/${directory}/${id}.${extension}`;
}

