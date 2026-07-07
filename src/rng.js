// ---------- Seeded PRNG ----------
// Deterministic random from a string seed, so every player in a challenge room
// generates the identical sequence of spots. Solo play just uses Math.random.

// xmur3 string hash -> 32-bit seed generator
function xmur3(str){
  let h = 1779033703 ^ str.length;
  for(let i=0;i<str.length;i++){
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return function(){
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

// mulberry32 PRNG -> function returning floats in [0,1)
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// makeRng('some-seed') -> a Math.random-compatible function, deterministic per seed
export function makeRng(seedStr){
  const seed = xmur3(String(seedStr))();
  return mulberry32(seed);
}
