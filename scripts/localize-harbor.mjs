/**
 * The harbour scene ships as one bundled file (vendor/sunharbor/harbor.ja.js, no sources), with Japanese signage.
 * This turns it into 凝露港: every Japanese string becomes Chinese, the fonts prefer Simplified Chinese faces,
 * and the boat flags come down. Exact-match only; every entry must hit, so a changed bundle fails loudly.
 *   node scripts/localize-harbor.mjs   →  public/harbor.js
 */
import {readFileSync, writeFileSync} from 'node:fs';
const src = 'vendor/sunharbor/harbor.ja.js', out = 'public/harbor.js';
/** [Japanese literal, Chinese] — matched with its quotes, so short words never hit longer strings. */
const TEXT = [
  ['第八 汐見丸', '凝露八号'], ['かもめ', '海鸥号'], ['しおかぜ', '海风号'], ['海光丸', '海光号'], ['KAMOME', 'HAIOU'], ['SHIOKAZE', 'HAIFENG'],
  ['徐', '慢'], ['汐', '露'], ['天気雨の港', '太阳雨之港'], ['SHIOMI FISHING PORT  ·  1:150', 'NINGLU FISHING PORT  ·  1:150'], ['SHIOMI PORT  WAITING ROOM', 'NINGLU PORT  FERRY TERMINAL'],
  ['立入禁止', '禁止入内'], ['本日のセリ値', '今日拍卖价'], ['(円/kg)', '(元/斤)'], ['10/21 (水)', '10月21日 周三'],
  ['アジ', '竹荚鱼'], ['サバ', '鲭鱼'], ['スルメイカ', '鱿鱼'], ['マダイ', '真鲷'], ['カワハギ', '马面鱼'], ['タコ', '章鱼'], ['イワシ', '沙丁鱼'], ['ホウボウ', '小黄鱼'],
  ['高!', '涨!'], ['入札 13:00〜　次回 10/23(金)', '竞拍 13:00起　下次 10月23日(周五)'], ['アジ 大漁!!', '竹荚鱼 大丰收!!'],
  ['汐見漁業協同組合', '凝露渔业合作社'], ['台はかり 60kg', '台秤 60公斤'], ['整理・整頓・清潔', '整理·整顿·清洁'], ['汐見漁協', '凝露渔社'], ['荷捌所', '交易所'],
  ['関係者以外立入禁止', '非工作人员禁止入内'], ['消火器', '灭火器'], ['汐見漁協 No.3', '凝露渔社 3号'], ['シャッター下に物を置かないで下さい', '卷帘门下请勿堆放物品'],
  ['定期船時刻表', '渡轮时刻表'], ['汐見港 ⇄ 小島（こじま）', '凝露港 ⇄ 汤圆岛'], ['発', '开'], ['着', '到'], ['汐見 発 → 小島 着', '凝露港 开 → 汤圆岛 到'], ['小島 発 → 汐見 着', '汤圆岛 开 → 凝露港 到'],
  ['※天候・海況により欠航する場合があります　　運賃 大人480円・小人240円', '※遇恶劣天气或海况可能停航　　票价 成人15元·儿童8元'],
  ['冬ダイヤ', '冬季班次'], ['11/1より', '11月1日起'], ['汐見港　待合所', '凝露港　候船室'], ['島めぐり', '环岛游'], ['定期船で小島へ', '坐渡轮去汤圆岛'], ['しおみ観光協会', '凝露镇旅游协会'],
  ['ライフジャケット', '救生衣'], ['着用しましょう！', '请穿好！'], ['海に落ちても', '万一落水'], ['浮いて待つ', '浮着等救援'], ['汐見港 安全協議会', '凝露港 安全委员会'],
  ['汐見港まつり', '凝露港渔火节'], ['8月15日(土) 花火大会', '8月15日(周六) 烟花晚会'], ['乗船券 発売所', '船票 售票处'], ['お知らせ', '通知'], ['漁協', '渔社'],
  ['つめた〜い', '冰镇'], ['あったか〜い', '热饮'], ['おいしい水', '矿泉水'], ['汐見の名水', '凝露山泉'], ['取出口', '取货口'], ['緑茶', '绿茶'], ['あったか〜いお茶', '热茶'],
  ['硬貨', '硬币'], ['千円札', '纸币'], ['おつり', '找零'], ['リサイクル', '回收'], ['かん', '易拉罐'], ['ペットボトル', '塑料瓶'],
  ['第一荷捌所', '第一交易所'], ['鮮魚', '鲜鱼'], ['活〆', '鲜活'], ['シオミ', '凝露'], ['汐見 三号', '凝露 三号'], ['汐見漁港', '凝露渔港'],
  ['注意落水', '小心落水'], ['転落注意', '注意防滑'], ['岸壁の端に近づかないでください', '请勿靠近码头边缘'], ['汐風楽団', '海风乐队'],
  ['海図 紀伊水道', '海图 青团湾'], ['10月  和歌山', '10月  凝露镇'], ['満潮', '涨潮'], ['干潮', '落潮'],
  ['1 日  満 05:12 182  干 11:40 34', '1日  涨 05:12 182  落 11:40 34'], ['2 日  満 05:48 176  干 12:15 41', '2日  涨 05:48 176  落 12:15 41'],
  ['3 日  満 06:25 168  干 12:52 50', '3日  涨 06:25 168  落 12:52 50'], ['4 日  満 07:05 157  干 13:33 61', '4日  涨 07:05 157  落 13:33 61'], ['5 日  満 07:51 146  干 14:22 72', '5日  涨 07:51 146  落 14:22 72'],
  ['海', '出'], ['上', '入'], ['安', '平'], ['全', '安'], ['漁協カレンダー', '渔社日历'], ['大漁', '丰收'], ['和歌山', '凝露镇'], ['海上安全', '出海平安'], ['大漁祈願', '渔获满舱'],
  ['海図 W-118', '海图 N-118'], ['和歌浦 及 付近', '青团湾及附近'], ['アジ◎', '竹荚鱼◎'], ['22m 根', '22m 礁'],
  ['18 土', '18 六'], ['19 日', '19 日'], ['20 月', '20 一'], ['21 火', '21 二'], ['22 水', '22 三'], ['23 木', '23 四'], ['24 金', '24 五'], ['25 土', '25 六'],
  ['ブリ 78cm!', '大黄鱼 78cm!'], ['真鯛 52cm!', '真鲷 52cm!'], ['   和歌山', '   凝露镇'],
];
/** Code edits: [exact snippet, replacement, why]. */
const CODE = [
  [`Ne='"Yu Gothic","YuGothic","Hiragino Kaku Gothic ProN","Noto Sans JP","Meiryo","MS Gothic",sans-serif'`, `Ne='"PingFang SC","Microsoft YaHei","Noto Sans SC","Source Han Sans SC","Noto Sans CJK SC",sans-serif'`, 'sans font → Simplified Chinese'],
  [`Wn='"Yu Mincho","YuMincho","Hiragino Mincho ProN","Noto Serif JP","MS Mincho",serif'`, `Wn='"Songti SC","STSong","Noto Serif SC","Source Han Serif SC","SimSun",serif'`, 'serif font → Simplified Chinese'],
  ['ie.castShadow=!0,ie.receiveShadow=!0,Ut.add(ie)', 'ie.castShadow=!0,ie.receiveShadow=!0,ie.visible=!1,Ut.add(ie)', 'no stern flag on the boats'],
  ['for(let D of g)xp(r,{...D,y0:d,topFn:()=>.05,groundFn:u,depth:.24,rand:o,colors:Xl,capColor:Ex,rowMin:.2,rowMax:.3});',
   'for(let D of g)xp(r,{...D,y0:d,topFn:()=>.05,groundFn:u,depth:.24,rand:o,colors:Xl,capColor:Ex,rowMin:.2,rowMax:.3});(globalThis.__harborLots||(globalThis.__harborLots=[])).push({lot:e,group:s});{let __jp=new me;__jp.name="jp-house-body";__jp.userData.dynamic=!0;s.add(__jp);s=__jp;r=new Ln(s,t.vc);a=new Ln(s,t.wet)}',
   'hill houses: keep the lot (platform, stone walls), build the Japanese house body into a removable, unmerged group; src/home/chinese-houses.ts builds the replacement'],
  ['function T(){n.setPixelRatio(e);let ct=Math.max(1,M?M[0]:window.innerWidth),vt=Math.max(1,M?M[1]:window.innerHeight);n.setSize(ct,vt),o.aspect=ct/vt,o.updateProjectionMatrix();let q=Math.max(1,Math.floor(ct*e)),K=Math.max(1,Math.floor(vt*e));',
   'function T(){globalThis.__harborResize=T;let e2=globalThis.__renderScale??e;n.setPixelRatio(e2);let ct=Math.max(1,M?M[0]:window.innerWidth),vt=Math.max(1,M?M[1]:window.innerHeight);n.setSize(ct,vt),o.aspect=ct/vt,o.updateProjectionMatrix();let q=Math.max(1,Math.floor(ct*e2)),K=Math.max(1,Math.floor(vt*e2));',
   'graphics presets: render scale (canvas and every pass target) + a resize hook'],
  ['let m=new Ii(4,4,{type:ws,samples:4})', 'let m=globalThis.__harborRT=new Ii(4,4,{type:ws,samples:globalThis.__msaa??4})', 'graphics presets: MSAA samples of the main colour target'],
  ['n.shadowMap.needsUpdate=!0;let vt=i.fog;', 'n.shadowMap.needsUpdate=globalThis.__shadowTick?globalThis.__shadowTick():!0;let vt=i.fog;', 'graphics presets: shadow map refresh rate'],
  ['let y=new Xp(x,a);t.add(y.mesh);', 'let y=new Xp(x,a);y.mesh.visible=!1,y.mesh.name="boat-flags-hidden",t.add(y.mesh);', 'no mast flags / pennants on the boats'],
];
let s = readFileSync(src, 'utf8'); const problems = [];
const count = (hay, needle) => hay.split(needle).length - 1;
for (const [from, to, why] of CODE) { const n = count(s, from); if (n !== 1) problems.push(`code "${why}": ${n} matches`); else s = s.replace(from, to); }
for (const [ja, zh] of TEXT) {
  let hits = 0;
  for (const q of ['"', "'", '`']) { const a = q + ja + q, n = count(s, a); if (n) { hits += n; s = s.split(a).join(q + zh + q); } }
  if (!hits) problems.push(`text not found: ${ja}`);
}
const left = [...new Set(s.match(/["'`][^"'`\n]{0,40}[぀-ヿ][^"'`\n]{0,40}["'`]/g) ?? [])];
if (left.length) problems.push('kana still present: ' + left.slice(0, 10).join(' | '));
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
writeFileSync(out, s); console.log(`${out}: ${TEXT.length} strings, ${CODE.length} code edits`);
