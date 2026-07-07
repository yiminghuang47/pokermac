// ---------- Deck ----------
export const RANKS = {2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'T',11:'J',12:'Q',13:'K',14:'A'};
export const SUITS = ['♠','♥','♦','♣']; // spade heart diamond club

// Top ~40% preflop range (530/1326 combos) — matches the standard chart.
const RANGE = new Set([
  // pairs
  'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
  // suited
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
  'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
  'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s','Q3s','Q2s',
  'JTs','J9s','J8s','J7s',
  'T9s','T8s','T7s',
  '98s','97s','87s','76s',
  // offsuit
  'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o','A2o',
  'KQo','KJo','KTo','K9o','K8o',
  'QJo','QTo','Q9o',
  'JTo','J9o','T9o',
]);
function handCode(a,b){
  const hi = a.rank>=b.rank ? a : b, lo = a.rank>=b.rank ? b : a;
  const code = RANKS[hi.rank] + RANKS[lo.rank];
  return hi.rank===lo.rank ? code : code + (a.suit===b.suit ? 's' : 'o');
}
export const inRange = h => RANGE.has(handCode(h[0], h[1]));

export function makeDeck(){
  const d = [];
  for(let r=2;r<=14;r++) for(let s=0;s<4;s++) d.push({rank:r, suit:s});
  return d;
}
export function shuffle(a){
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
export const cardKey = c => c.rank*4 + c.suit;
