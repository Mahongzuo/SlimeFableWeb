import {fishingSpot} from './fishing-spot';
import type {ZoneBuilder} from './types';
/**
 * The harbour itself is the original scene; this builder only adds loop hooks there (no solid props: the harbour's
 * collision tile is baked from the original scene). Fishing off the pier end and from the floating pontoon.
 */
export const harbor: ZoneBuilder = z => {
  const root = new z.T.Group();
  const pier = fishingSpot(z, 'fish-harbor-pier', [4, .35, -23.6], [0, 1], 'harbor');
  const pontoon = fishingSpot(z, 'fish-harbor-pontoon', [20.75, -.75, 6.3], [0, -1], 'harbor');
  return {root, update: (t, dt, p) => { pier(t, dt, p); pontoon(t, dt, p); }};
};
