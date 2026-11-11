import {defineFlyby} from './types';
/**
 * Facts: docs/days/1112.md, 1112-1980 fact card and its two sources.
 * 虚构：轨道、比例、质量、快门位置、木星告别照与卫星合影的连续航程、史莱姆喷气和缓冲、金唱片信号。
 * These are gameplay staging, not an ephemeris or a reconstruction of the mission's photographs.
 */
export default defineFlyby({
  id: '1112-1980', template: 'flyby', theme: 'space', seed: 'voyager-1980',
  title: '借土卫六转个弯',
  intro: '1980年11月12日，旅行者1号飞掠土星：借引力转弯，拍下光环与卫星。',
  outro: '旅行者1号拍下土星环的细节，并近距离飞掠泰坦。选择泰坦使它离开黄道面，飞向太阳系外；后来它飞出日球层，成为飞得最远的人造物体。',
  souvenir: '土星光环照片', hiddenSouvenir: '金唱片',
  spawn: [-65, -20], velocity: [.48, 0],
  bodies: [
    {id: 'saturn', name: '土星', position: [0, 0], radius: 9, mass: 1.8, color: '#e8c27a'},
    {id: 'jupiter', name: '木星', position: [-77, -38], radius: 6, mass: 0, color: '#d8aa87'},
    {id: 'phoebe', name: '土卫九', position: [-37, -27], radius: 1.5, mass: .025, color: '#8b8e9d'},
    {id: 'mimas', name: '土卫一', position: [2, -24], radius: 1.4, mass: .025, color: '#c7d3d9'},
    {id: 'rhea', name: '土卫五', position: [15, -19], radius: 1.7, mass: .03, color: '#b9c6ce'},
    {id: 'titan', name: '泰坦 · 土卫六', position: [27, 5], radius: 3.2, mass: .45, color: '#df9e48'},
  ],
  photos: [
    {id: 'farewell', name: '木星告别照', body: 'jupiter', center: [-57, -20], radius: 4},
    {id: 'phoebe', name: '土卫九', body: 'phoebe', center: [-36, -20], radius: 4.5},
    {id: 'rings', name: '土星光环', body: 'saturn', center: [-12, -19], radius: 4},
    {id: 'mimas', name: '土卫一的大坑', body: 'mimas', center: [1, -16], radius: 4},
    {id: 'rhea', name: '土卫五', body: 'rhea', center: [14, -12], radius: 4},
    {id: 'titan', name: '泰坦的橙色雾霾', body: 'titan', center: [29, -2], radius: 6},
  ],
  rings: {body: 'saturn', inner: 13, outer: 23, gap: [17, 19]},
  titan: 'titan', encounterRadius: 8, escapeRadius: 26, timeLimit: 420,
  medals: {gold: 9, silver: 5}, hidden: {position: [-5, -17.5], radius: 2.5},
});
