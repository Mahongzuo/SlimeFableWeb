import type {ThemeKit} from './kit';
import {plainKit} from './plain';
/** Theme registry. Codex adds richer kits here; every kit must also run without its own textures. */
export const themes: Record<string, ThemeKit> = {
  'minguo-shanghai': plainKit('minguo-shanghai',
    {skyTop: '#bcd6e2', skyHorizon: '#efe6d2', fog: [26, 90], sun: '#fff1d6', sunIntensity: 2.6, hemiSky: '#e6eef2', hemiGround: '#a69a86', ink: '#2c2620', wash: '#f4ecdc'},
    {ground: '#b8ad98', lane: '#a9a395', plaza: '#c9bea6', yard: '#bfb39b', walls: ['#a7a59c', '#b9b1a1', '#9aa09b', '#c2b59c'], roof: '#4a4a4f', trim: '#e5dccb', door: '#4b2c22', glass: '#3c4b55', wood: '#a98458', metal: '#4a4744', brick: '#8f6b5c', accent: '#b8483a', lamp: '#f2c46a'}),
};
export const fallbackTheme = themes['minguo-shanghai'];
