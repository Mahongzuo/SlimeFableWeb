import type {ThemeKit} from './kit';
import {plainKit} from './plain';
/** 岭南乡村 1866: blue-grey brick, dark tile, packed-earth lanes, warm late-autumn light. Details: card 1111-02. */
export const lingnanKit: ThemeKit = plainKit('lingnan-1866',
  {skyTop: '#a9cfe6', skyHorizon: '#f2ead6', fog: [28, 95], sun: '#fff0d0', sunIntensity: 2.7, hemiSky: '#e3f0e8', hemiGround: '#9c8f72', ink: '#2c2620', wash: '#f4ecdc'},
  {ground: '#b9a986', lane: '#c4b08a', plaza: '#cbbd9a', yard: '#a9b07f', walls: ['#8d9294', '#9a9d98', '#848a8c', '#a3a39a'], roof: '#4d5050', trim: '#d9d2c2', door: '#5a3a26', glass: '#3f4a46', wood: '#8a6a48', metal: '#4a4744', brick: '#7f8587', accent: '#b8483a', lamp: '#f2c46a'});
