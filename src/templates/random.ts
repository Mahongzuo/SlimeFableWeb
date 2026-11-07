/** Deterministic randomness: same seed, same level, so a reported bug can always be replayed. */
export function hashSeed(id: string) { let h = 0x811c9dc5; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
export function rng(seed: string) {
  let a = hashSeed(seed);
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return {next, range: (lo: number, hi: number) => lo + (hi - lo) * next(), int: (lo: number, hi: number) => Math.floor(lo + (hi - lo + 1) * next()), pick: <T>(list: T[]) => list[Math.floor(next() * list.length)], chance: (p: number) => next() < p};
}
export type Rng = ReturnType<typeof rng>;
