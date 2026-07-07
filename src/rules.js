// ---------- Hand-qualification rules ----------
import { bestHand } from './evaluator.js';

// Does this hand have a pair+ (using a hole card) or a real draw (flush/straight, using a hole card)?
// Overcards-only ("pair draw") does NOT qualify.
export function qualifies(hole, board){
  const bRanks = board.map(c=>c.rank);
  // pair or better involving a hole card: pocket pair, or a hole card pairs the board
  if(hole[0].rank===hole[1].rank) return true;
  if(bRanks.includes(hole[0].rank) || bRanks.includes(hole[1].rank)) return true;
  // flush draw (or made flush) using a hole card
  for(let s=0;s<4;s++){
    const cnt = [...hole,...board].filter(c=>c.suit===s).length;
    const hc  = hole.filter(c=>c.suit===s).length;
    if(cnt>=4 && hc>=1) return true;
  }
  // straight draw (or made straight) using a hole card — ace counts high and low
  const expand = r => r===14 ? [14,1] : [r];
  const have = new Set(), holeR = new Set();
  for(const c of [...hole,...board]) for(const v of expand(c.rank)) have.add(v);
  for(const c of hole)              for(const v of expand(c.rank)) holeR.add(v);
  for(let add=1; add<=14; add++){          // the one card that would complete a straight
    const s = new Set(have); s.add(add);
    for(let lo=1; lo<=10; lo++){            // low end of a 5-card run
      let run=true, usesHole=false;
      for(let k=0;k<5;k++){
        if(!s.has(lo+k)){ run=false; break; }
        if(holeR.has(lo+k)) usesHole=true;
      }
      if(run && usesHole) return true;
    }
  }
  return false;
}

// Villain must have AT LEAST TOP PAIR (meaningfully — not an underpair riding a paired board):
// top pair / overpair, a set, a genuine two pair (both hole cards pair the board), or a
// straight-or-better. An underpair whose only "two pair" comes from a board pair does NOT qualify.
export function villainHasTopPairPlus(hole, board){
  const bRanks = board.map(c=>c.rank);
  const topRank = Math.max(...bRanks);
  const bCount = r => bRanks.filter(x=>x===r).length;
  const [h1,h2] = hole;
  if(h1.rank===h2.rank){
    if(h1.rank >= topRank) return true;                 // overpair (or pocket pair of the top card)
    if(bRanks.includes(h1.rank)) return true;           // set (pocket pair hits the board)
  } else {
    // top pair / overpair via a hole card that pairs (or beats) the highest board card
    if((bRanks.includes(h1.rank) && h1.rank>=topRank) ||
       (bRanks.includes(h2.rank) && h2.rank>=topRank)) return true;
    // trips: a hole card matches a board card already paired on the board
    if((bRanks.includes(h1.rank) && bCount(h1.rank)>=2) ||
       (bRanks.includes(h2.rank) && bCount(h2.rank)>=2)) return true;
    // genuine two pair: both hole cards pair two different board cards
    if(bRanks.includes(h1.rank) && bRanks.includes(h2.rank) && h1.rank!==h2.rank) return true;
  }
  // straight / flush / full house / quads (always uses a hole card on a 4-card turn board)
  if(bestHand([...hole,...board])[0] >= 4) return true;
  return false;
}

// EXCLUDE spots where hero's only real draw is a low-end gutshot (bottom/"idiot" end of the
// straight). Pair outs (overcards) don't rescue it; a flush draw or any other straight draw does.
export function heroLowEndGutshotOnly(hole, board){
  const ex = r => r===14 ? [14,1] : [r];
  const setVals = cards => { const s=new Set(); for(const c of cards) for(const v of ex(c.rank)) s.add(v); return s; };
  const runsUsingHole = (vals, holeVals) => {
    const runs=[];
    for(let lo=1; lo<=10; lo++){
      let ok=true, usesHole=false;
      for(let k=0;k<5;k++){ if(!vals.has(lo+k)){ok=false;break;} if(holeVals.has(lo+k)) usesHole=true; }
      if(ok && usesHole) runs.push(lo);
    }
    return runs;
  };
  // a flush draw (or made flush) is a real draw — keep the spot
  for(let s=0;s<4;s++){
    const cnt=[...hole,...board].filter(c=>c.suit===s).length;
    if(cnt>=4 && hole.filter(c=>c.suit===s).length>=1) return false;
  }
  const holeVals = setVals(hole);
  const baseVals = setVals([...hole, ...board]);
  if(runsUsingHole(baseVals, holeVals).length) return false;   // already a made straight, not a draw
  const completing = [];
  for(let g=2; g<=14; g++){
    const s = new Set(baseVals); for(const v of ex(g)) s.add(v);
    const runs = runsUsingHole(s, holeVals).filter(lo => ex(g).some(v => v>=lo && v<=lo+4));
    if(runs.length) completing.push(Math.max(...runs.map(lo=>lo+4)));  // top card of the completed straight
  }
  if(completing.length !== 1) return false;   // 0 = no straight draw, >=2 = open-ended (real draw)
  return !holeVals.has(completing[0]);         // hero doesn't hold the top card => low end => EXCLUDE
}
