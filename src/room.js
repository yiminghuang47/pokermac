// ---------- Realtime game room (Supabase) ----------
// A room is a Realtime channel. We use PRESENCE only for membership (join/leave)
// and drive all mutable state — name, ready, score, finished — over BROADCAST,
// keeping a local roster keyed by player id. (Presence *updates* proved unreliable
// to propagate to already-subscribed peers; broadcast is rock-solid.) The host is
// the single source of the synchronized `start` event (with the shared seed + time).
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
  const roster = new Map([[id, self]]);   // id -> player state, incl. self
  let started = false;

  const channel = supabase.channel('room:' + code, {
    config: { broadcast: { self: true }, presence: { key: id } },
  });

  const emit = () => onState([...roster.values()]);
  const broadcastSelf = () => channel.send({ type: 'broadcast', event: 'state', payload: { ...self } });

  // Host fires the start exactly once, when everyone present is ready.
  function maybeStart(){
    if(!isHost || started) return;
    const list = [...roster.values()];
    if(list.length >= MIN_PLAYERS && list.every(p => p.ready)){
      started = true;
      const seed = uid() + uid();
      channel.send({ type: 'broadcast', event: 'start', payload: { seed, time: self.time } });
    }
  }

  channel.on('broadcast', { event: 'state' }, ({ payload }) => {
    roster.set(payload.id, payload);
    emit();
    maybeStart();
  });
  channel.on('broadcast', { event: 'start' }, ({ payload }) => onStart(payload));
  // Someone new joined — (re)announce myself so their roster learns about me.
  channel.on('presence', { event: 'join' }, () => { broadcastSelf(); });
  channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
    for(const p of leftPresences){ if(p.id) roster.delete(p.id); }
    emit();
  });

  // Mutate self, reflect locally, then announce to the room.
  const update = (patch) => {
    Object.assign(self, patch);
    roster.set(id, self);
    emit();
    return broadcastSelf().then(maybeStart);
  };

  const ctrl = {
    code, id, isHost,
    setReady(v){ return update({ ready: v }); },
    setTime(t){ self.time = t; return Promise.resolve(); },   // host-only; sent in the start payload
    setName(n){ return update({ name: n }); },
    updateScore(n){ return update({ score: n }); },
    finish(n){ return update({ score: n, finished: true }); },
    resetForRematch(){ started = false; return update({ ready:false, score:0, finished:false }); },
    leave(){ channel.unsubscribe(); supabase.removeChannel(channel); },
  };

  return new Promise((resolve, reject) => {
    channel.subscribe(async (status) => {
      if(status === 'SUBSCRIBED'){
        await channel.track({ id });   // presence carries only membership
        await broadcastSelf();
        resolve(ctrl);
      } else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){
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
