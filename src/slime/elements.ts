import {comboData} from './combo-data';
// Element colours are sRGB. The glass shader handles absorption separately.
export const elements=[
 {name:'水',tag:'WATER',color:'#327DDE',rim:'#A8D8FF',icon:'◉',trail:'涟漪水痕',life:8},
 {name:'风',tag:'WIND',color:'#80C5A8',rim:'#A8C4F0',icon:'彡',trail:'风色水膜',life:8},
 {name:'火',tag:'FIRE',color:'#E67A1A',rim:'#FFC857',icon:'♨',trail:'火焰粒子',life:8},
 {name:'雷',tag:'VOLT',color:'#7B4DDB',rim:'#C4B5FD',icon:'ϟ',trail:'接地电弧',life:8},
 {name:'暗',tag:'DARK',color:'#2A2A2E',rim:'#5A5A62',icon:'◐',trail:'墨色黏液',life:8},
 {name:'物',tag:'STONE',color:'#8A7351',rim:'#A08A66',icon:'◇',trail:'物色水膜',life:8},
] as const;
export const combos=comboData;
