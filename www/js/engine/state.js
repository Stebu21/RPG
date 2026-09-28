// Stato di gioco e regole di crescita.
import { CHARACTERS, MAX_LEVEL, PARTY_MAX } from '../data/characters.js';
import { ABILITIES } from '../data/abilities.js';

export const G = {
  account: null,   // nome account loggato
  slot: 0,         // slot di salvataggio attivo
  s: null,         // stato della partita corrente
};

export function expToNext(level){ return Math.floor(20 * level * level); }

export function statsOf(cs){
  const def = CHARACTERS[cs.id];
  const lv = cs.level - 1;
  return {
    hp:  Math.floor(def.base.hp  + def.growth.hp  * lv),
    mp:  Math.floor(def.base.mp  + def.growth.mp  * lv),
    atk: Math.floor(def.base.atk + def.growth.atk * lv),
    def: Math.floor(def.base.def + def.growth.def * lv),
    mag: Math.floor(def.base.mag + def.growth.mag * lv),
    spr: Math.floor(def.base.spr + def.growth.spr * lv),
    spd: Math.floor(def.base.spd + def.growth.spd * lv),
  };
}

export function knownAbilities(cs){
  return CHARACTERS[cs.id].learnset.filter(l => l.lv <= cs.level).map(l => l.ab);
}

// Aggiunge exp; ritorna { levels:n, learned:[abilityId] }
export function gainExp(cs, amount){
  const res = { levels:0, learned:[] };
  if (cs.level >= MAX_LEVEL) return res;
  cs.exp += amount;
  while (cs.level < MAX_LEVEL && cs.exp >= expToNext(cs.level)){
    cs.exp -= expToNext(cs.level);
    cs.level++;
    res.levels++;
    for (const l of CHARACTERS[cs.id].learnset){
      if (l.lv === cs.level) res.learned.push(l.ab);
    }
  }
  if (cs.level >= MAX_LEVEL) cs.exp = 0;
  // i nuovi massimi si applicano subito (cura del livello)
  const st = statsOf(cs);
  if (res.levels > 0){ cs.hp = st.hp; cs.mp = st.mp; }
  return res;
}

function newChar(id, level=1){
  const cs = { id, level, exp:0, hp:0, mp:0 };
  const st = statsOf(cs);
  cs.hp = st.hp; cs.mp = st.mp;
  return cs;
}

export function newGame(){
  return {
    version: 2,
    party: ['ste','riki'],
    reserve: [],
    chars: { ste:newChar('ste',3), riki:newChar('riki',3) },
    map: 'accademia',
    x: 9, y: 8, dir: 'down',
    flags: {},
    chests: {},
    quests: {},
    gold: 350,
    items: { pozione: 8, etere: 3, antidoto: 2, coda_fenice: 1 },
    steps: 0,
    playMin: 0,
  };
}

export function addCharacter(id){
  const s = G.s;
  if (s.chars[id]) return;
  // i nuovi arrivati entrano al livello medio del gruppo
  const lvls = Object.values(s.chars).map(c=>c.level);
  const avg = Math.max(1, Math.round(lvls.reduce((a,b)=>a+b,0) / lvls.length));
  s.chars[id] = newChar(id, avg);
  if (s.party.length < PARTY_MAX) s.party.push(id);
  else s.reserve.push(id);
}

export function fullHeal(){
  const s = G.s;
  for (const id of Object.keys(s.chars)){
    const cs = s.chars[id];
    const st = statsOf(cs);
    cs.hp = st.hp; cs.mp = st.mp;
  }
}

export function addItem(id, qty=1){
  G.s.items[id] = (G.s.items[id] || 0) + qty;
}

export function partyAlive(){
  return G.s.party.some(id => G.s.chars[id].hp > 0);
}

export function abilityName(id){ return ABILITIES[id]?.name || id; }
