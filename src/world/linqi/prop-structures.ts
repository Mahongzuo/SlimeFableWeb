// Local metres of Y-up DreamWorld GLBs & 1:1 procedural Home POIs.
// For GLBs, `span` equals the mesh's max(size.x, size.z) so `k = targetWidth / span`
// matches `model-pack.ts`'s uniformScale identically.
// For procedural POIs, `span` equals max(def.width, def.depth) so `k = prop.scale`.
type Part = [x:number,z:number,width:number,depth:number,lo:number,hi:number,label:string];
type Structure = {span:number;parts:Part[]};

const bridge:Part[]=[];
for(let i=0;i<24;i++){
  const x=(i+.5)*.3-3.6, top=.17+.47*(1-(x/3.6)**2);
  bridge.push([x,0,.3,2.15,top-.15,top,'deck']);
  if(i%3===0)for(const z of [-1.075,1.075])bridge.push([x,z,.12,.12,top,top+.82,'post']);
}
for(const z of [-1.02,1.02]){
  for(const x of [-2.4,0,2.4])bridge.push([x,z,.16,.16,.53,2.73,'column']);
  for(let i=0;i<8;i++){
    const x=(i+.5)*.84-3.36, top=.90+.47*(1-(x/3.6)**2);
    bridge.push([x,z,.84,.07,top-.035,top+.035,'rail']);
  }
}
bridge.push([0,0,6.80,2.82,2.55,3.15,'roof'],[0,0,6.80,1.20,3.13,3.52,'roof-top']);

const gate:Part[]=[[0,0,6.01,.88,2.45,2.98,'roof'],[0,0,5.7,.64,2.10,2.48,'lintel'],[0,0,5.7,.64,0,.12,'sill']];
// 3 coarse vertical bands per side follow the round opening while keeping box count minimal.
for(const [lo,hi,inner] of [[.12,.70,.72],[.70,1.50,1.02],[1.50,2.10,.72]] as const){
  for(const side of [-1,1])gate.push([side*(2.85+inner)/2,0,2.85-inner,.64,lo,hi,'wall']);
}

const pavilion:Part[]=[
  [0,.04,3.56,3.85,0,.365,'floor'],
  // 2-tier hipped roof matching GLB cross-sections (eave y=2.60..3.30, upper cone y=3.28..3.85)
  [0,0,4.76,4.22,2.60,3.30,'roof'],
  [0,0,2.30,2.02,3.28,3.85,'roof-top'],
];
for(let i=0;i<6;i++){
  const a=i*Math.PI/3;pavilion.push([1.65*Math.cos(a),-1.65*Math.sin(a)+.05,.19,.19,.35,2.62,'post']);
}

// In the shelter, the middle bay at the front opens onto the ground.
const shelter:Part[]=[[0,-1.12,3.82,.16,0,1.7,'wall'],[-1.83,0,.16,2.4,0,1.6,'wall'],
  [0,0,4.36,3.10,1.95,2.48,'roof'],[0,0,4.36,1.80,2.46,3.02,'roof-top'],
  [-.46,-.58,2.06,.78,0,1.0,'bales'],[1.13,.76,1.05,.48,0,.62,'trough']];
for(const x of [-1.83,0,1.83])for(const z of [-1.13,1.13])shelter.push([x,z,.16,.16,0,2.05,'post']);

const stilt:Part[]=[
  [0,.04,4.36,3.05,.71,.91,'floor'],
  [0,-.12,3.80,2.10,.90,2.38,'room'],
  // 2-tier gable roof (eave y=2.35..3.00, ridge y=2.98..3.68)
  [0,0,4.76,3.56,2.35,3.00,'roof'],
  [0,0,4.76,1.80,2.98,3.68,'roof-top'],
];
for(const x of [-1.9,1.9])for(const z of [-1.26,1.34])stilt.push([x,z,.17,.17,0,.9,'post']);

// Procedural hot spring & fish pond: separated 4 rim walls + depressed inner basin so the slime can step inside.
const hotspring:Part[]=[
  [0,1.31,3.4,.38,0,.56,'rim'],[0,-1.31,3.4,.38,0,.56,'rim'],
  [-1.51,0,.38,2.24,0,.56,'rim'],[1.51,0,.38,2.24,0,.56,'rim'],
  [0,0,2.64,2.24,0,.38,'floor'],
];
const fishpond:Part[]=[
  [0,1.33,3.6,.34,0,.46,'rim'],[0,-1.33,3.6,.34,0,.46,'rim'],
  [-1.63,0,.34,2.32,0,.46,'rim'],[1.63,0,.34,2.32,0,.46,'rim'],
  [0,0,2.92,2.32,0,.32,'floor'],[-1.3,1.15,.55,.42,.46,.84,'post'],
];
const museum:Part[]=[
  [0,0,2.40,1.90,0,.28,'floor'],
  [0,0,2.55,2.05,1.76,2.14,'roof'],
  [0,0,1.60,1.25,2.12,2.44,'roof-top'],
];
for(const x of [-.95,.95])for(const z of [-.72,.72])museum.push([x,z,.20,.20,.28,1.76,'post']);

const barn:Part[]=[
  [0,0,4.10,3.10,0,.22,'floor'],
  [0,-1.35,3.50,.22,.22,1.87,'wall'],
  [0,0,4.35,3.35,2.14,2.66,'roof'],
  [0,0,4.35,1.85,2.64,3.16,'roof-top'],
];
for(const x of [-1.85,1.85])for(const z of [-1.35,1.35])barn.push([x,z,.24,.24,.22,2.14,'post']);

export const propStructures:Record<string,Structure>={
  // ---- DreamWorld GLBs (calibrated from triangle cross-sections, lightweight 2-tier sloped roofs) ----
  'nature-willow':{span:2.47,parts:[[-.055,.02,.33,.26,0,2.22,'trunk']]},
  'pack-ginkgo':{span:2.95,parts:[[.065,0,.41,.28,0,2.72,'trunk']]},
  'build-moon-gate':{span:6.01,parts:gate},
  'build-covered-bridge':{span:7.20,parts:bridge},
  'pack-pavilion':{span:4.89,parts:pavilion},
  'pasture-shelter':{span:4.38,parts:shelter},
  'waterside-stilt-house':{span:4.79,parts:stilt},
  'build-huizhou':{span:5.20,parts:[
    [0,.12,5.16,4.40,0,.22,'floor'],
    [0,.10,4.76,3.86,.20,2.85,'walls'],
    [0,0,5.12,3.96,2.83,3.45,'roof'],
    [0,0,5.12,2.40,3.43,4.08,'roof-top'],
  ]},
  'build-teahall':{span:5.96,parts:[
    [0,.08,5.80,4.72,0,.22,'floor'],
    [0,-.48,5.50,3.40,.20,.48,'deck'],
    [0,-.58,4.68,2.72,.48,2.68,'walls'],
    [0,0,5.90,4.64,2.66,3.12,'roof'],
    [0,0,3.60,2.80,3.10,3.68,'roof-top'],
  ]},
  'build-thatch':{span:5.02,parts:[
    [0,.08,4.22,3.72,0,1.90,'walls'],
    [0,0,4.96,4.24,1.88,2.52,'roof'],
    [0,0,3.10,4.24,2.50,3.25,'roof-mid'],
    [0,0,1.50,4.24,3.23,3.88,'roof-top'],
  ]},
  'pack-greenhouse':{span:4.70,parts:[
    [0,.08,4.54,3.76,0,2.50,'walls'],
    [0,0,4.62,3.66,2.48,2.88,'roof'],
    [0,0,2.20,3.68,2.86,3.48,'roof-top'],
  ]},
  'watermill':{span:4.84,parts:[
    [-.38,.06,3.45,3.08,0,2.48,'walls'],
    [-.42,0,4.00,3.60,2.46,2.92,'roof'],
    [-.42,0,4.00,1.80,2.90,3.60,'roof-top'],
    [1.88,0,1.06,2.20,.20,2.65,'wheel'],
  ]},
  'pack-windmill':{span:5.03,parts:[
    [0,0,3.30,3.20,0,2.50,'base'],
    [0,0,2.55,2.55,2.48,4.25,'tower'],
  ]},
  'build-lighthouse':{span:3.48,parts:[
    [0,0,3.48,3.48,0,.65,'base'],
    [0,.06,2.26,2.32,.62,3.70,'tower'],
    [0,0,2.30,2.30,3.68,4.90,'gallery'],
    [0,0,1.65,1.65,4.88,5.75,'lantern'],
  ]},
  'build-red-pagoda':{span:4.10,parts:[
    [0,0,4.10,4.10,0,.60,'base'],
    [0,0,2.86,2.86,.58,1.22,'tier1'],
    [0,0,4.04,4.04,1.20,1.80,'eave1'],
    [0,0,2.42,2.42,1.78,2.42,'tier2'],
    [0,0,3.42,3.42,2.40,3.00,'eave2'],
    [0,0,1.98,1.98,2.98,3.60,'tier3'],
    [0,0,2.78,2.78,3.58,4.20,'eave3'],
    [0,0,2.16,2.16,4.18,5.38,'tier4'],
  ]},
  'waterside-shore-stones':{span:2.41,parts:[[-.01,0,2.40,1.28,0,.78,'rock']]},
  'tidal-rocks':{span:2.62,parts:[[.01,0,2.60,1.64,0,.54,'rock']]},
  'nature-sea-arch':{span:2.10,parts:[[-.78,0,.54,1.26,0,1.35,'pier'],[.78,0,.54,1.26,0,1.35,'pier'],[0,0,2.10,1.30,1.32,1.96,'arch']]},

  // ---- 1:1 Procedural Home POIs (exact poi-visuals.ts geometry) ----
  'facility-sprinkler':{span:1.8,parts:[[0,0,1.80,1.80,0,.45,'floor'],[0,0,.48,.48,.45,1.25,'post']]},
  'facility-pedestal':{span:1.5,parts:[[0,0,1.10,1.10,0,.24,'base'],[0,0,.74,.74,.24,1.04,'stem'],[0,0,.86,.86,1.04,1.16,'top']]},
  'poi-keg':{span:1.4,parts:[[0,0,.96,.96,0,1.14,'body']]},
  'poi-kiln':{span:2.4,parts:[[0,0,2.10,1.65,0,.72,'base'],[-.18,0,1.62,1.62,.72,1.54,'dome'],[.68,-.35,.48,.48,.72,1.94,'chimney']]},
  'poi-beehive':{span:1.3,parts:[[0,0,.98,.98,0,1.32,'body']]},
  'poi-preserver':{span:1.5,parts:[[0,0,1.34,1.34,0,.20,'base'],[0,0,.98,.98,.20,1.06,'jar']]},
  'poi-loom':{span:2.0,parts:[[0,0,1.75,1.15,0,.80,'frame'],[0,-.35,1.66,.20,.80,1.63,'upright']]},
  'poi-hotspring':{span:3.6,parts:hotspring},
  'poi-observatory':{span:2.8,parts:[[0,0,2.52,2.52,0,.32,'base'],[0,0,2.12,2.12,.32,2.98,'dome']]},
  'poi-glider-tower':{span:2.6,parts:[[0,0,2.48,2.48,0,.28,'floor'],[0,0,2.04,2.04,1.70,3.74,'balloon']]},
  'poi-waystone':{span:1.2,parts:[[0,0,.92,.92,0,.24,'base'],[0,0,.36,.36,.24,2.24,'pillar']]},
  'poi-museum-altar':{span:2.6,parts:museum},
  'poi-coop':{span:3.2,parts:[[0,0,2.90,2.30,0,.20,'floor'],[0,0,2.50,1.95,.20,1.45,'walls'],[0,0,2.90,2.40,1.45,1.88,'roof'],[0,0,2.90,1.20,1.86,2.25,'roof-top']]},
  'poi-barn':{span:4.4,parts:barn},
  'poi-fishpond':{span:3.8,parts:fishpond},
};
