import authored from './ninglu-collision.json';
import type {Box,Vec} from '../slime/types';

export const HOUSE={x:-21,y:.14,z:16,scale:.72};
export const houseLot={name:'凝露小院',width:24.65*HOUSE.scale,depth:22.65*HOUSE.scale};
const boxes=authored as [string,number,number,number,number,number,number][];
export const planWidth=24*HOUSE.scale,planDepth=20*HOUSE.scale;
export function housePoint(x:number,z:number,y=0):Vec{
  return [HOUSE.x+x*HOUSE.scale,HOUSE.y+y*HOUSE.scale,HOUSE.z+z*HOUSE.scale];
}
export function houseColliders():Box[]{
  return boxes.map(([name,x,y,z,xx,yy,zz])=>({name:'凝露小院 '+name,min:housePoint(x,z,y),max:housePoint(xx,zz,yy),camera:false}));
}
export function houseRoom(x:number,y:number,z:number){
  const lx=(x-HOUSE.x)/HOUSE.scale,lz=(z-HOUSE.z)/HOUSE.scale,ly=(y-HOUSE.y)/HOUSE.scale;
  if(Math.abs(lx)<10.2 && lz< -1.54 && lz> -9.15 && ly<6.45)return ly>3.23?'upper':'lower';
  if(Math.abs(lx)>4.96&&Math.abs(lx)<11.04 && lz>.5&&lz<5.55 && ly<2.86)return lx<0?'pet':'tea';
  return 'outside';
}
export function canFurnish(x:number,z:number,width:number,depth:number){
  const sc=HOUSE.scale,l=x/sc,r=z/sc,hx=width/(2*sc),hz=depth/(2*sc);
  const inRoom=Math.abs(l)-hx>2.06 && Math.abs(l)+hx<9.87 && r-hz> -8.91 && r+hz< -3.96;
  const wing=Math.abs(l)-hx>5.14 && Math.abs(l)+hx<10.84 && r-hz>.72 && r+hz<5.1;
  if(!inRoom&&!wing)return false;
  // Door swing and walking space on the inside of each entrance.
  if(wing && Math.abs(Math.abs(l)-8)<.65+hx && r+hz>3.72)return false;
  if(inRoom && Math.min(Math.abs(Math.abs(l)-4.05),Math.abs(Math.abs(l)-7.95))<.62+hx && r+hz> -5.08)return false;
  return !boxes.some(([_,x0,y0,z0,x1,y1,z1])=>y1>.13&&y0<2.15 &&
    l+hx>x0-.08 && l-hx<x1+.08 && r+hz>z0-.08 && r-hz<z1+.08);
}
