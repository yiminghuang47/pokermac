// ---------- Realtime game room (Supabase) ----------
// A room is a Realtime channel. Presence tracks each player's live state
// {id,name,ready,score,finished,isHost,time}; Broadcast carries the host's
// synchronized `start` event (with the shared seed + time). No DB table needed.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 ambiguity
function randCode(){
  let s = '';
  for(let i=0;i<4;i++) s += CODE_ALPHABET[Math.floor(Math.random()*CODE_ALPHABET.length)];
  return s;
}
function uid(){ return Math.random().toString(36).slice(2, 10); }

// Minimum players before an all-ready lobby auto-starts.
const MIN_PLAYERS = 2;

function connect({ code, name, isHost, time, onState, onStart }){
  const id = uid();
  const self = { id, name, ready:false, score:0, finished:false, isHost, time: time || 120 };
  let started = false;

  const channel = supabase.channel('room:' + code, {
    config: { presence: { key: id }, broadcast: { self: true } },
  });

  function players(){
    const state = channel.presenceState();
    const list = [];
    for(const k in state){ const metas = state[k]; if(metas && metas[0]) list.push(metas[0]); }
    return list;
  }
  const track = () => channel.track(self);

  channel.on('presence', { event: 'sync' }, () => {
    const list = players();
    onState(list);
    // Host is the single source of the start signal: fire once when everyone's ready.
    if(isHost && !started && list.length >= MIN_PLAYERS && list.every(p => p.ready)){
      started = true;
      const seed = uid() + uid();
      channel.send({ type: 'broadcast', event: 'start', payload: { seed, time: self.time } });
    }
  });
  channel.on('broadcast', { event: 'start' }, ({ payload }) => onStart(payload));

  const ctrl = {
    code, id, isHost,
    setReady(v){ self.ready = v; return track(); },
    setTime(t){ self.time = t; return track(); },
    setName(n){ self.name = n; return track(); },
    updateScore(n){ self.score = n; return track(); },
    finish(n){ self.score = n; self.finished = true; return track(); },
    resetForRematch(){ self.ready = false; self.score = 0; self.finished = false; started = false; return track(); },
    leave(){ channel.unsubscribe(); supabase.removeChannel(channel); },
  };

  return new Promise((resolve, reject) => {
    channel.subscribe(async (status) => {
      if(status === 'SUBSCRIBED'){ await track(); resolve(ctrl); }
      else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){
        reject(new Error('Realtime connection failed (' + status + ')'));
      }
    });
  });
}

export function createRoom(opts){
  return connect({ ...opts, code: randCode(), isHost: true });
}
export function joinRoom(opts){
  return connect({ ...opts, code: opts.code, isHost: false });
}
