import type {ThemeKit} from './kit';
import {plainKit} from './plain';
/** Ellis Island 1954: red brick with limestone trim, copper-green roofs, grey November harbour light. Details: card 1111-03. */
export const ellisKit: ThemeKit = plainKit('ellis-1954',
  {skyTop: '#b7c6d1', skyHorizon: '#e6e4dc', fog: [30, 100], sun: '#f4efe4', sunIntensity: 2.2, hemiSky: '#dfe6ea', hemiGround: '#8f8a80', ink: '#2a2826', wash: '#efece4'},
  {ground: '#a9a59a', lane: '#b6b2a6', plaza: '#c2bdb0', yard: '#8f9a84', walls: ['#a5553f', '#b06347', '#9c4e3b', '#b9a990'], roof: '#6f9a8a', trim: '#e2dccb', door: '#3d3a36', glass: '#3c4b55', wood: '#7a5a3f', metal: '#4a4744', brick: '#a5553f', accent: '#2f5f7a', lamp: '#f2e2b0'});
