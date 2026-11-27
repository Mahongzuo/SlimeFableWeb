/** These calendar exhibits use the existing chapter IDs, collections and historical sources. */
export const workshops = {
  '1127-2011': {kind:'shadow', name:'灯幕后的一匹马', steps:['投分身守住灯座','挪动操杆配准两个影样','扬起马蹄谢幕'], abilities:['分身守灯','移动操偶'], sky:'#394051', horizon:'#daa56f', accent:'#9c463c'},
  '1128-2018': {kind:'spring', name:'让两条水槽说话', steps:['分身压住泉闸','调节冷热两股水流','为石池开闸'], abilities:['分身压闸','移动调流'], sky:'#75adc1', horizon:'#f0ddbd', accent:'#376f70'},
  '1129-2022': {kind:'tea', name:'一匾茶青翻过来', steps:['将青叶拨到匾心','往返压动竹匾两缘','在叶片离匾时收进茶篓'], abilities:['身体压匾','弹跳收青'], sky:'#7aa998', horizon:'#f3dfad', accent:'#537a44'},
  '1130-1992': {kind:'dove', name:'给纸鸽留一扇窗', steps:['分身牵住窗绳','伴纸鸽沿廊前行','打开尽头的天空之窗'], abilities:['分身牵绳','伴飞引路'], sky:'#7599b7', horizon:'#f7e6cd', accent:'#547c93'},
  '1201-1948': {kind:'press', name:'印辊那头的石桥', steps:['投分身夹住纸边','将两套十字规对齐','从左到右滚印桥景'], abilities:['分身夹纸','推动印辊'], sky:'#8e9b94', horizon:'#f0d2af', accent:'#9d5442'}
} as const;
export type WorkshopId=keyof typeof workshops;
export type WorkshopKind=typeof workshops[WorkshopId]['kind'];
export function isWorkshop(id:string):id is WorkshopId {return Object.hasOwn(workshops,id);}
