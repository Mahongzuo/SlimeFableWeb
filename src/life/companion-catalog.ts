import type {RanchSpeciesDef} from './ranch';

type Entry = [string,string,string,number,string,string];
const domestic: Entry[] = [
  ['orange-tabby','橘猫','🐈',.76,'fish-crucian','prod-wool'],
  ['golden-retriever','金毛犬','🐕',1.24,'fish-carp','prod-truffle'],
  ['chick','小鸡','🐥',.5,'crop-wheat','prod-egg'],
  ['duckling','小鸭','🐤',.56,'crop-wheat','prod-feather'],
  ['lop-eared-rabbit','垂耳兔','🐰',.64,'crop-carrot','prod-wool'],
  ['hamster','仓鼠','🐹',.43,'crop-wheat','prod-wool'],
  ['guinea-pig','豚鼠','🐹',.48,'crop-carrot','prod-wool'],
  ['hedgehog','刺猬','🦔',.5,'crop-strawberry','prod-truffle'],
  ['budgerigar','虎皮鹦鹉','🦜',.5,'crop-wheat','prod-feather'],
];
const wild: Entry[] = [
  ['bear','棕熊','🐻',2.55,'fish-carp','prod-truffle'],['bull-moose','驼鹿','🫎',2.65,'crop-corn','prod-milk'],
  ['great-horned-owl','大角鸮','🦉',.78,'fish-crucian','prod-feather'],['zebra','斑马','🦓',2.05,'crop-wheat','prod-wool'],
  ['thomsons-gazelle','汤氏瞪羚','🦌',1.48,'crop-carrot','prod-milk'],['warthog','疣猪','🐗',1.45,'crop-pumpkin','prod-truffle'],
  ['grey-heron','苍鹭','🪶',1.18,'fish-crucian','prod-feather'],['great-crested-grebe','凤头䴙䴘','🐦',.79,'fish-crucian','prod-egg'],
  ['mute-swan','疣鼻天鹅','🦢',1.48,'fish-carp','prod-feather'],['chipmunk','花栗鼠','🐿️',.49,'crop-corn','prod-wool'],
  ['house-sparrow','家麻雀','🐦',.37,'crop-wheat','prod-feather'],['golden-eagle','金雕','🦅',1.18,'fish-carp','prod-feather'],
  ['goat','山羊','🐐',1.32,'crop-carrot','prod-milk'],
];
export const starterIds = ['orange-tabby','golden-retriever','capybara',...domestic.slice(2).map(row => row[0])].map(id=>'ranch-'+id);
export const importedAnimals = new Set([...domestic,...wild].map(row=>row[0]).concat('hen','pekin-duck'));
export const companionSpecies: RanchSpeciesDef[] = [...domestic,...wild].map(([slug,name,icon,size,favoriteItem,productId],i) => ({
  id:'ranch-'+slug,asset:'ranch-'+slug,name,icon,size,favoriteItem,productId,
  housing:size>1?'barn':'coop',tier:i<domestic.length?'common':'rare',adoptCost:i<domestic.length?24:48,
  zones:[],resonateElement:1,shyness:.4,desc:i<domestic.length?'临水小院可迎接的伙伴。':'可在北部自然区找到，赠送喜爱的食物即可结识。',
}));

