// ---------- App entry: rendering, game loop, solo + multiplayer wiring ----------
import { RANKS, SUITS } from './deck.js';
import { generate, setOutsSkew } from './generate.js';
import { makeRng } from './rng.js';
import { createRoom, joinRoom } from './room.js';

const $ = id => document.getElementById(id);
const OVERLAYS = ['startOverlay','joinOverlay','lobbyOverlay','countdownOverlay','endOverlay','resultsOverlay'];
function showOverlay(id){
  OVERLAYS.forEach(o => $(o).classList.toggle('hidden', o !== id));
}

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
  const row = $(id);
  row.innerHTML = '';
  cards.forEach(c => row.appendChild(cardEl(c)));
  if(withSlot) row.appendChild(slotEl());
}

// ---------- Game state ----------
let state = { mode:'solo', score:0, time:120, timer:null, current:null, locked:true, rng:Math.random, room:null };
let players = [];   // latest presence snapshot in multiplayer
let ready = false;

function newProblem(){
  state.current = generate(state.rng);
  renderRow('heroCards', state.current.hero, false);
  renderRow('villainCards', state.current.vill, false);
  renderRow('boardCards', state.current.board, true);
  const inp = $('outs');
  inp.value = ''; inp.focus();
  $('feedback').textContent = '';
  $('feedback').className = 'feedback';
  state.locked = false;
}

function checkInput(){
  if(state.locked || !state.current) return;
  const inp = $('outs');
  if(inp.value === '') return;
  if(parseInt(inp.value, 10) === state.current.outs){
    state.score++;
    $('score').textContent = state.score;
    if(state.mode === 'multi') state.room.updateScore(state.score);
    newProblem();
  }
}

function tick(){
  state.time--;
  $('timer').textContent = state.time;
  if(state.time <= 0) endGame();
}

function beginGame(time){
  state.score = 0; state.time = time; state.locked = false;
  $('score').textContent = '0';
  $('timer').textContent = time;
  $('liveScores').classList.toggle('hidden', state.mode !== 'multi');
  showOverlay(null);
  newProblem();
  clearInterval(state.timer);
  state.timer = setInterval(tick, 1000);
}

function endGame(){
  clearInterval(state.timer);
  state.locked = true;
  if(state.mode === 'multi'){
    state.room.finish(state.score);
    showOverlay('resultsOverlay');
    renderResults();
  } else {
    $('endStats').innerHTML = `Score: <b>${state.score}</b>`;
    showOverlay('endOverlay');
  }
}

// ---------- Solo ----------
function startSolo(){
  state.mode = 'solo';
  state.rng = Math.random;
  setOutsSkew('high');
  beginGame(parseInt($('timeSel').value, 10));
}

// Leave a multiplayer room from the lobby and start a solo game instead.
function leaveRoomToSolo(){
  if(state.room){ state.room.leave(); state.room = null; }
  players = [];
  history.replaceState(null, '', location.pathname);   // drop ?room= so a reload won't rejoin
  state.mode = 'solo';
  state.rng = Math.random;
  setOutsSkew('high');
  beginGame(parseInt($('lobbyTimeSel').value, 10));     // respect the time picked in the lobby
}

// ---------- Multiplayer ----------
function sortedByScore(list){
  return [...list].sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));
}
function renderPlayerRows(containerId, showReady){
  const el = $(containerId);
  el.innerHTML = '';
  for(const p of sortedByScore(players)){
    const row = document.createElement('div');
    row.className = 'player-row';
    const status = showReady
      ? (p.ready ? '<span class="tag ok">ready</span>' : '<span class="tag">…</span>')
      : (p.finished ? '<span class="tag ok">done</span>' : '<span class="tag">playing…</span>');
    row.innerHTML =
      `<span class="pname">${escapeHtml(p.name)}${p.isHost ? ' <span class="host-badge">host</span>' : ''}</span>` +
      (showReady ? status : `<span class="pscore">${p.score}</span>${status}`);
    el.appendChild(row);
  }
}
function renderLobby(){ renderPlayerRows('lobbyPlayers', true); }
function renderLiveScores(){
  const el = $('liveScores');
  el.innerHTML = sortedByScore(players)
    .map(p => `<span class="ls-item"><b>${escapeHtml(p.name)}</b> ${p.score}</span>`)
    .join('');
}
function renderResults(){ renderPlayerRows('resultsPlayers', false); }

function onRoomState(list){
  players = list;
  if(!$('lobbyOverlay').classList.contains('hidden')) renderLobby();
  if(!$('liveScores').classList.contains('hidden')) renderLiveScores();
  if(!$('resultsOverlay').classList.contains('hidden')) renderResults();
  updateLobbyStatus();
}

function updateLobbyStatus(){
  if($('lobbyOverlay').classList.contains('hidden')) return;
  const n = players.length;
  const allReady = n >= 2 && players.every(p => p.ready);
  $('lobbyStatus').textContent = n < 2
    ? 'Waiting for another player to join…'
    : (allReady ? 'All ready — starting!' : 'Waiting for everyone to ready up…');
}

function enterLobby(){
  state.mode = 'multi';
  ready = false;
  $('roomCodeLabel').textContent = state.room.code;
  $('hostTimeWrap').classList.toggle('hidden', !state.room.isHost);
  $('readyBtn').textContent = 'Ready';
  $('readyBtn').classList.remove('on');
  showOverlay('lobbyOverlay');
  renderLobby();
  updateLobbyStatus();
}

function onRoomStart({ seed, time }){
  state.rng = makeRng(seed);
  setOutsSkew('high');
  runCountdown(() => beginGame(time));
}

function runCountdown(done){
  showOverlay('countdownOverlay');
  let n = 3;
  $('countdownNum').textContent = n;
  const iv = setInterval(() => {
    n--;
    if(n <= 0){ clearInterval(iv); done(); }
    else $('countdownNum').textContent = n;
  }, 800);
}

async function onCreate(){
  const name = ($('nameInput').value || '').trim() || 'Host';
  const time = parseInt($('timeSel').value, 10);
  $('createBtn').disabled = true;
  try {
    state.room = await createRoom({ name, time, onState: onRoomState, onStart: onRoomStart });
    history.replaceState(null, '', '?room=' + state.room.code);
    enterLobby();
  } catch(e){
    alert('Could not create room: ' + e.message);
  } finally {
    $('createBtn').disabled = false;
  }
}

async function onJoin(){
  const code = ($('joinCode').textContent || '').trim();
  const name = ($('joinName').value || '').trim() || 'Player';
  $('joinBtn').disabled = true;
  try {
    state.room = await joinRoom({ code, name, onState: onRoomState, onStart: onRoomStart });
    enterLobby();
  } catch(e){
    alert('Could not join room: ' + e.message);
  } finally {
    $('joinBtn').disabled = false;
  }
}

// ---------- Utils ----------
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ---------- Wiring ----------
$('outs').addEventListener('input', checkInput);
$('startBtn').addEventListener('click', startSolo);
$('againBtn').addEventListener('click', startSolo);
$('createBtn').addEventListener('click', onCreate);
$('joinBtn').addEventListener('click', onJoin);

$('readyBtn').addEventListener('click', () => {
  ready = !ready;
  state.room.setReady(ready);
  $('readyBtn').textContent = ready ? 'Ready ✓' : 'Ready';
  $('readyBtn').classList.toggle('on', ready);
});
$('lobbyTimeSel').addEventListener('change', e => {
  if(state.room) state.room.setTime(parseInt(e.target.value, 10));
});
$('copyLinkBtn').addEventListener('click', async () => {
  const url = location.origin + location.pathname + '?room=' + state.room.code;
  try {
    await navigator.clipboard.writeText(url);
    $('copyLinkBtn').textContent = 'Copied!';
    setTimeout(() => { $('copyLinkBtn').textContent = 'Copy invite link'; }, 1500);
  } catch {
    prompt('Copy this invite link:', url);
  }
});
$('playAgainBtn').addEventListener('click', () => {
  state.room.resetForRematch();
  enterLobby();
});
$('lobbySoloBtn').addEventListener('click', leaveRoomToSolo);

// ---------- Boot: solo start, or join flow if arriving via ?room= ----------
const roomParam = new URLSearchParams(location.search).get('room');
if(roomParam){
  $('joinCode').textContent = roomParam.toUpperCase();
  showOverlay('joinOverlay');
} else {
  showOverlay('startOverlay');
}
