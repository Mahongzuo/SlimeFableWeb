import {villageLayouts, coastLayouts} from './regional-layouts.js';
export {villageLayouts, coastLayouts};

// Layouts use ordinary editable objects and brush strokes in local plot coordinates.
// Object tuples: type, x, z, uniform scale, yaw (radians).
// Coordinates use metres. The gaps at bridge entrances keep automatic path planks off the deck.
const canal={
  objects:[
    ['build-huizhou',-7.2,-6.4,.87,.02],['water-stilt',5.7,-5.5,.91,-.09],
    ['water-stilt',5.4,6.7,.84,.05],['build-teahall',-8.6,5.8,.83,0],
    ['build-covered-bridge',0,.6,1,0],['build-moon-gate',-7,1.2,.93,Math.PI/2],
    ['nature-willow',2.5,3.1,.83,0],['nature-bamboo',-12,-6,.78,.22],
    ['reeds',-1.88,-3.4,1,.12],['reeds',1.82,7.9,.86,-.2],
    ['water-lily',-.45,-5.4,.95,0],['nature-wisteria',-11.5,1.9,.8,0],
    ['nature-willow',-2.85,-5.3,1.05,1.15],['willow',-3.25,7.5,1.4,.38],
    ['nature-bamboo',-9.8,-2.2,.94,.75],['reeds',2,4.85,.88,.42],
    ['water-lily',.72,6.1,1,.8],
    ['shore-stones',2.4,-1.7,.82,.3],['lantern',-3.9,1.7,.93,0],
    ['lantern',3.94,1.7,.93,0],['rock',-2.3,6.3,.87,.3],
    ['mallard',0,-6.7,1,0],['mallard',.24,6.7,.92,1.3]
  ],
  strokes:[
    ['jade',[[0,-11.4],[-.42,-6],[-.12,-2],[0,2],[.28,6],[0,11.4]],3.1],
    ['lotus',[[-.48,-6.4],[-.18,-4.5]],3.35],
    ['stonepath',[[-15,.6],[-7,1.2],[-3.55,.6]],1.15],
    ['stonepath',[[3.55,.6],[7,.6],[15,.6]],1.15],
    ['stonepath',[[-4.5,-10],[-4.4,-5],[-4.4,.8],[-4.5,6],[-4.6,11.4]],1.12],
    ['dirtpath',[[3.65,-9],[3.55,-2],[4.4,.6],[3.75,4],[3.5,10]],.83],
    ['moss',[[-11,-2],[-9,2],[-10,6]],2.35],['flowers',[[9.8,8],[7,8.4]],1.5]
  ]
};
const court={
  objects:[
    ['build-moon-gate',0,7.2,1,0],['pack-pavilion',0,-5.6,.81,0],
    ['build-huizhou',-9.1,-6.7,.88,.05],['build-teahall',8.2,-5,.86,-.14],
    ['build-covered-bridge',4.8,2.85,.91,-.35],['build-red-pagoda',10.4,6.1,.73,0],
    ['nature-bamboo',-11,4,.77,.25],['nature-willow',-4.65,-.1,.84,0],
    ['nature-bonsai',7.1,7.8,.64,-.2],['reeds',-.6,2.65,.9,0],
    ['reeds',-3.5,1.7,.9,.2],['water-lily',0,.22,1,0],
    ['sakura',-6.9,5.7,1.15,.7],['nature-willow',3.8,-2.2,.9,.83],
    ['water-lily',1.65,-.7,.92,.5],['nature-bamboo',7.6,-8.1,.86,1],
    ['shore-stones',-3.4,-2.2,.88,-.3],['lantern',-2.75,6.6,.92,0],
    ['lantern',2.7,6.7,.92,0],['rock',-9,1,.95,0],['mallard',-.9,0,1,.5],['mallard',1.4,-.3,.9,1.1]
  ],
  strokes:[
    ['lotus',[[-1.6,-.4],[.1,.1],[2.4,.35]],5.3],
    ['jade',[[2.1,.4],[4.9,1.3],[4.7,4.4],[6.9,6.8],[8.5,11.4]],2.1],
    ['stonepath',[[-15,3],[-7,3],[-4.9,4.7],[0,5.25],[1.65,2.0]],1.2],
    ['stonepath',[[7.98,3.9],[8.5,1.8],[7.1,-1.8],[3.9,-3.3],[0,-3.45],[-4.3,-3.2],[-6.1,-.4],[-5.65,2.9],[-4.9,4.7]],1.13],
    ['stonepath',[[0,11.4],[0,7.2],[0,5.25]],1.16],['dirtpath',[[8.5,1.8],[11,1.9],[15,2.8]],1.08],
    ['moss',[[-11,-1],[-9.3,2]],3.5],['flowers',[[5.6,-8],[9.8,-8]],2]
  ]
};
export const gardenLayouts={canal,court};

export const sceneDesigns={
  garden:{name:'江南水乡',ecology:'水巷 · 柳岸 · 池蛙 · 翠鸟',theme:'ink',seed:'WATERLANE',description:'沿着水巷接出一座廊桥，或绕荷塘围出一方庭院。栽下芦苇，在柳岸等一位来客。',
    preview:['water-stilt','build-covered-bridge','kingfisher'], ...canal},
  village:{name:'欧式村庄',ecology:'溪岸 · 林缘草甸 · 白喉河乌 · 欧洲野兔',theme:'keep',seed:'VILLAGE-1109',
    description:'沿石桥到溪畔磨坊寻找河乌，或走进疏林与木栅围起的牧场。',
    preview:['watermill','pasture-shelter','build-thatch'], ...villageLayouts.mill},
  coast:{name:'热带海岸',ecology:'海岬 · 岩礁浅池 · 海鸥 · 岸蟹',theme:'coast',seed:'COAST-1109',
    description:'从岬角灯塔望向海湾，沿着沙岸小径探访海蚀拱门下的潮池。',
    preview:['build-lighthouse','tidal-rocks','nature-sea-arch'], ...coastLayouts.beacon}
};
