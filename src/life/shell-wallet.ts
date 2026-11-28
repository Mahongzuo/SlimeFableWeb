import type {LifeData} from './state';

const tiers = [[0,1],[100,2],[350,3],[900,5],[2200,8],[5000,12]] as const;

export function initializeWallet(life: LifeData) {
  if (life.earnedShells === undefined) {
    life.earnedShells = Math.max(0, Math.floor(life.coins));
    life.capacityFloor = life.home?.ranch?.animals.length ?? 0;
  }
  return life.earnedShells;
}

export function changeShells(life: LifeData, delta: number, kind: 'earn'|'spend'|'refund'|'grant') {
  const earned = initializeWallet(life);
  if (!Number.isSafeInteger(delta) || delta + life.coins < 0) return false;
  if ((kind==='earn'||kind==='grant') && delta<0 || kind==='spend' && delta>0) return false;
  life.coins += delta;
  if (kind === 'earn' && delta > 0) life.earnedShells = earned + delta;
  return true;
}

export function capacityProgress(life: LifeData) {
  const earned = initializeWallet(life);
  let total = Math.max(1,life.capacityFloor ?? 0);
  for (const [threshold,count] of tiers) if (earned >= threshold) total = Math.max(total,count);
  const next = tiers.find(([,count]) => count > total);
  const left = next ? next[0] - earned : 0;
  return {total, earned, left, next: next?.[1], hint: next ? '再赚 '+left+' 贝壳可养第 '+next[1]+' 只' : '已解锁全部名额'};
}

