// ---------- 5-card evaluator -> comparable array [category, ...tiebreakers] ----------
export function eval5(cards){
  const ranks = cards.map(c=>c.rank).sort((a,b)=>b-a);
  const suits = cards.map(c=>c.suit);
  const flush = suits.every(s=>s===suits[0]);
  const counts = {};
  for(const r of ranks) counts[r]=(counts[r]||0)+1;
  const groups = Object.keys(counts).map(Number).sort((a,b)=> counts[b]-counts[a] || b-a);
  const cvals = groups.map(r=>counts[r]);
  const uniq = [...new Set(ranks)];
  let sHigh = 0;
  if(uniq.length===5){
    if(ranks[0]-ranks[4]===4) sHigh = ranks[0];
    else if(ranks[0]===14 && ranks[1]===5 && ranks[4]===2) sHigh = 5; // wheel
  }
  const straight = sHigh>0;
  if(straight && flush) return [8, sHigh];
  if(cvals[0]===4)               return [7, groups[0], groups[1]];
  if(cvals[0]===3 && cvals[1]===2) return [6, groups[0], groups[1]];
  if(flush)                      return [5, ...ranks];
  if(straight)                   return [4, sHigh];
  if(cvals[0]===3)               return [3, ...groups];         // trip, k1, k2
  if(cvals[0]===2 && cvals[1]===2) return [2, groups[0], groups[1], groups[2]];
  if(cvals[0]===2)               return [1, ...groups];         // pair, k1,k2,k3
  return [0, ...ranks];
}
export function cmp(a,b){
  const n=Math.max(a.length,b.length);
  for(let i=0;i<n;i++){ const x=a[i]||0, y=b[i]||0; if(x!==y) return x-y; }
  return 0;
}
// best 5 out of any >=5 cards
export function bestHand(cards){
  let best=null; const n=cards.length; const chosen=[];
  (function pick(start){
    if(chosen.length===5){ const s=eval5(chosen); if(!best||cmp(s,best)>0) best=s; return; }
    for(let i=start;i<n;i++){ chosen.push(cards[i]); pick(i+1); chosen.pop(); }
  })(0);
  return best;
}
