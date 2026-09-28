// Account e salvataggi. Con Supabase configurato (js/config.js) stanno online e si ritrovano
// su ogni dispositivo; localStorage resta come copia locale e per giocare offline.
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

const KEY = 'cdv_accounts_v1';
export const SLOTS = 3;
const CLOUD = !!(SUPABASE_URL && SUPABASE_KEY);
let session = null;   // { key, pin } dell'account connesso: serve per inviare i salvataggi

function loadAll(){
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}
function storeAll(d){ try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} }

// hash non crittografico: basta a non lasciare il PIN in chiaro nella copia locale
function hashPin(pin, salt){
  let h = 0x811c9dc5;
  const str = salt + '|' + pin;
  for (let i=0; i<str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

// chiamata a una funzione SQL di Supabase; null se la rete non risponde
async function rpc(fn, args){
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method:'POST',
      headers:{ apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`, 'Content-Type':'application/json' },
      body:JSON.stringify(args),
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

function check(name, pin){
  if (name.length < 2) return 'Nome troppo corto (min 2 caratteri).';
  if ((pin||'').length < 4) return 'PIN troppo corto (almeno 4 caratteri, lettere o numeri).';
}

// tiene lo slot più recente tra copia locale e online
function merge(local, remote){
  return Array.from({ length:SLOTS }, (_, i)=>{
    const a = local?.[i], b = remote?.[i];
    return (a?.time || 0) >= (b?.time || 0) ? (a || b || null) : b;
  });
}

function remember(name, pin, saves){
  const all = loadAll(), key = name.toLowerCase();
  all[key] = { name, pin:hashPin(pin, key), saves:merge(all[key]?.saves, saves) };
  storeAll(all);
  session = { key, pin };
  return all[key];
}

export async function register(name, pin){
  name = (name||'').trim();
  const bad = check(name, pin);
  if (bad) return { ok:false, msg:bad };
  const key = name.toLowerCase();
  if (CLOUD){
    const r = await rpc('rpg_register', { p_name:name, p_pin:pin, p_saves:null });
    if (!r) return { ok:false, msg:'Server non raggiungibile: controlla la connessione.' };
    if (!r.ok) return r;
  } else if (loadAll()[key]) return { ok:false, msg:'Questo nome esiste già.' };
  remember(name, pin, null);
  return { ok:true, name };
}

export async function login(name, pin){
  name = (name||'').trim();
  const key = name.toLowerCase();
  const local = loadAll()[key];
  const localOk = local && local.pin === hashPin(pin, key);
  if (CLOUD){
    let r = await rpc('rpg_login', { p_name:name, p_pin:pin });
    // account creato quando i salvataggi erano solo sul dispositivo: lo porta online
    if (r?.missing && localOk){
      r = await rpc('rpg_register', { p_name:local.name, p_pin:pin, p_saves:local.saves });
      if (r?.ok) r = { ok:true, name:local.name, saves:local.saves };
    }
    if (r?.ok){
      const acc = remember(r.name, pin, r.saves);
      // se qui c'erano partite più recenti, aggiorna anche la copia online
      acc.saves.forEach((sv, i)=>{ if (sv && sv.time > (r.saves?.[i]?.time || 0)) push(i, sv); });
      return { ok:true, name:r.name };
    }
    if (r) return { ok:false, msg:r.msg };
    // offline: si entra con la copia locale, i salvataggi partiranno al prossimo accesso
  }
  if (!local) return { ok:false, msg:'Account inesistente.' };
  if (!localOk) return { ok:false, msg:'PIN errato.' };
  session = { key, pin };
  return { ok:true, name:local.name };
}

export function logout(){ session = null; }

function push(slot, sv){
  if (CLOUD && session) rpc('rpg_save', { p_name:session.key, p_pin:session.pin, p_slot:slot, p_data:sv });
}

export function listSaves(name){
  const acc = loadAll()[(name||'').toLowerCase()];
  return acc ? acc.saves : new Array(SLOTS).fill(null);
}

export function saveGame(name, slot, state, meta){
  const all = loadAll();
  const acc = all[(name||'').toLowerCase()];
  if (!acc) return false;
  acc.saves[slot] = { meta, state, time: Date.now() };
  storeAll(all);
  push(slot, acc.saves[slot]);
  return true;
}

export function loadGame(name, slot){
  return loadAll()[(name||'').toLowerCase()]?.saves?.[slot] || null;
}
