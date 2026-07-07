// ---------- App entry: rendering, game loop, wiring ----------
import { RANKS, SUITS } from './deck.js';
import { generate, setOutsSkew } from './generate.js';

// ---------- Rendering ----------
function cardEl(c){
  const el = document.createElement('div');
  el.className = 'card s' + c.suit;
  el.textContent = RANKS[c.rank];
  return el;
}
function slotEl(){
  const el = document.createElement('div');
  el.className = 'card slot';
  el.textContent = 'river';
  return el;
}
function renderRow(id, cards, withSlot){
  const row = document.getElementById(id);
  row.innerHTML='';
  cards.forEach(c=>row.appendChild(cardEl(c)));
  if(withSlot) row.appendChild(slotEl());
}
function cardStr(c){ return RANKS[c.rank]+SUITS[c.suit]; }

// ---------- Game loop ----------
let state = {score:0, correct:0, attempts:0, time:120, timer:null, current:null, locked:false};

function newProblem(){
  state.current = generate();
  renderRow('heroCards', state.current.hero, false);
  renderRow('villainCards', state.current.vill, false);
  renderRow('boardCards', state.current.board, true);
  const inp = document.getElementById('outs');
  inp.value=''; inp.focus();
  document.getElementById('feedback').textContent='';
  document.getElementById('feedback').className='feedback';
  state.locked=false;
}

function checkInput(){
  if(state.locked || !state.current) return;
  const inp = document.getElementById('outs');
  if(inp.value==='') return;
  if(parseInt(inp.value,10) === state.current.outs){
    state.score++; state.correct++; state.attempts++;
    document.getElementById('score').textContent = state.score;
    newProblem();
  }
}
function tick(){
  state.time--;
  document.getElementById('timer').textContent = state.time;
  if(state.time<=0){ endGame(); }
}
function startGame(){
  state.score=0; state.correct=0; state.attempts=0;
  state.time = parseInt(document.getElementById('timeSel').value,10);
  setOutsSkew('high');   // lean toward draws with more outs
  document.getElementById('score').textContent='0';
  document.getElementById('timer').textContent=state.time;
  document.getElementById('startOverlay').classList.add('hidden');
  document.getElementById('endOverlay').classList.add('hidden');
  newProblem();
  clearInterval(state.timer);
  state.timer = setInterval(tick, 1000);
}
function endGame(){
  clearInterval(state.timer);
  state.locked=true;
  document.getElementById('endStats').innerHTML = `Score: <b>${state.score}</b>`;
  document.getElementById('endOverlay').classList.remove('hidden');
}

// ---------- Wiring ----------
document.getElementById('outs').addEventListener('input', checkInput);
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('againBtn').addEventListener('click', startGame);
