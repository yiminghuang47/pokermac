// ---------- Problem generation ----------
import { makeDeck, shuffle, cardKey, inRange } from './deck.js';
import { bestHand, cmp } from './evaluator.js';
import { qualifies, villainHasTopPairPlus, heroLowEndGutshotOnly } from './rules.js';

// ---------- Optional outs-distribution skew ----------
// Measured natural frequency (%) of hero's out count under the current constraints
// (min 1 out; sampled ~40k spots). Low counts are common — 2-out alone is ~26% —
// so the skew below leans hard on them to favour bigger draws.
const NAT_OUTS = {1:1.6,2:25.7,3:8.5,4:9.6,5:15.1,6:2.5,7:6,8:8.2,9:4.8,10:3.6,11:5.3,12:2.7,13:1.8,14:2.5,15:1,16:0.4,17:0.4,18:0.1,19:0.1,20:0.1};
// Target relative weights by out count (null = leave the natural distribution alone).
const OUTS_TARGETS = {
  high: o => (o>=1) ? o : 0,                   // rising weight — lean toward bigger draws; 0-out spots excluded
};
let outsSkew = null; // {fn, maxRatio} or null
export function setOutsSkew(name){
  const fn = OUTS_TARGETS[name];
  if(!fn){ outsSkew = null; return; }
  // normalize only over the dense 4..14 region; rarer 15+ counts get accept-rate clamped to 1
  // (below), so they're never suppressed and appear at ~their natural frequency.
  let mx = 0;
  for(let o=4; o<=14; o++){ const r = fn(o)/NAT_OUTS[o]; if(r>mx) mx=r; }
  outsSkew = {fn, maxRatio: mx || 1};
}
// accept a spot with prob ∝ target(o)/natural(o), normalized so the peak accept-rate is 1
function acceptByOuts(o, rng){
  if(!outsSkew) return true;
  const w = outsSkew.fn(o);
  if(w<=0) return false;
  const nat = NAT_OUTS[o] || 0.3;              // assume rare tail counts are ~0.3%
  return rng() < (w/nat)/outsSkew.maxRatio;
}

// rng defaults to Math.random (solo); a seeded rng makes the whole sequence reproducible.
export function generate(rng = Math.random){
  let fallback = null;                         // a valid spot to fall back on if skew rejects everything
  for(let attempt=0; attempt<8000; attempt++){
    const deck = shuffle(makeDeck(), rng);
    const hero = deck.slice(0,2);
    const vill = deck.slice(2,4);
    if(!inRange(hero) || !inRange(vill)) continue;   // both from top-40% range
    const board = deck.slice(4,8);            // turn = 4 cards
    if(!qualifies(hero,board)) continue;              // hero needs a pair+ or a real draw
    if(heroLowEndGutshotOnly(hero,board)) continue;   // drop pure low-end-gutshot spots
    if(!villainHasTopPairPlus(vill,board)) continue; // villain needs at least top pair
    const used = new Set([...hero,...vill,...board].map(cardKey));
    const remaining = deck.filter(c=>!used.has(cardKey(c)));

    const heroNow = bestHand([...hero,...board]);
    const villNow = bestHand([...vill,...board]);
    if(cmp(villNow, heroNow) <= 0) continue;  // require hero currently behind

    const outCards = [];
    for(const r of remaining){
      const h = bestHand([...hero,...board,r]);
      const v = bestHand([...vill,...board,r]);
      if(cmp(h,v) > 0) outCards.push(r);       // strictly wins
    }
    if(outCards.length < 1) continue;           // hero needs at least 1 out — no drawing-dead (0-out) spots
    const spot = {hero, vill, board, outs:outCards.length, outCards};
    fallback = spot;                            // keep the most recent valid spot
    if(acceptByOuts(outCards.length, rng)) return spot;
  }
  return fallback; // exhausted attempts — skew is best-effort, return last valid spot
}
