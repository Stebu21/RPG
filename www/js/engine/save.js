// Account locali e salvataggi (localStorage). Nessun server: tutto sul dispositivo.

const KEY = 'cdv_accounts_v1';
export const SLOTS = 3;

function loadAll(){
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}
function storeAll(d){ localStorage.setItem(KEY, JSON.stringify(d)); }

// hash non crittografico: basta a non lasciare il PIN in chiaro
function hashPin(pin, salt){
  let h = 0x811c9dc5;
  const str = salt + '|' + pin;
  for (let i=0; i<str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

export function register(name, pin){
  name = (name||'').trim();
  if (name.length < 2) return { ok:false, msg:'Nome troppo corto (min 2 caratteri).' };
  if ((pin||'').length < 4) return { ok:false, msg:'PIN troppo corto (min 4 cifre).' };
  const all = loadAll();
  const key = name.toLowerCase();
  if (all[key]) return { ok:false, msg:'Questo nome esiste già.' };
  all[key] = { name, pin: hashPin(pin, key), saves: new Array(SLOTS).fill(null) };
  storeAll(all);
  return { ok:true, name };
}

export function login(name, pin){
  const all = loadAll();
  const key = (name||'').trim().toLowerCase();
  const acc = all[key];
  if (!acc) return { ok:false, msg:'Account inesistente.' };
  if (acc.pin !== hashPin(pin, key)) return { ok:false, msg:'PIN errato.' };
  return { ok:true, name: acc.name };
}

export function listSaves(name){
  const all = loadAll();
  const acc = all[(name||'').toLowerCase()];
  return acc ? acc.saves : new Array(SLOTS).fill(null);
}

export function saveGame(name, slot, state, meta){
  const all = loadAll();
  const acc = all[(name||'').toLowerCase()];
  if (!acc) return false;
  acc.saves[slot] = { meta, state, time: Date.now() };
  storeAll(all);
  return true;
}

export function loadGame(name, slot){
  const all = loadAll();
  const acc = all[(name||'').toLowerCase()];
  return acc?.saves?.[slot] || null;
}
