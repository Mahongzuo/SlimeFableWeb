import {comboData} from './combo-data';
// UE USlimeElementDataAsset::MakeDefaultProfile authored sRGB colours, unchanged.
export const elements=[
 {name:'水',tag:'WATER',color:'#5B86D9',rim:'#A8C4F0',icon:'◉',trail:'涟漪水痕',life:8},
 {name:'风',tag:'WIND',color:'#3D9B5C',rim:'#A8E6B8',icon:'彡',trail:'风色水膜',life:8},
 {name:'火',tag:'FIRE',color:'#E67A1A',rim:'#FFC857',icon:'♨',trail:'火色水膜',life:8},
 {name:'雷',tag:'VOLT',color:'#7B4DDB',rim:'#C4B5FD',icon:'ϟ',trail:'雷色水膜',life:8},
 {name:'暗',tag:'DARK',color:'#2A2A2E',rim:'#5A5A62',icon:'◐',trail:'墨色黏液',life:8},
 {name:'物',tag:'STONE',color:'#8A7351',rim:'#A08A66',icon:'◇',trail:'物色水膜',life:8},
] as const;
export const combos=comboData;
