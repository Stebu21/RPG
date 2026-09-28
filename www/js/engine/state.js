// Stato di gioco e regole di crescita.
import { CHARACTERS, MAX_LEVEL, PARTY_MAX } from '../data/characters.js';
import { ABILITIES } from '../data/abilities.js';
import { EQUIP, ATTRS, POINTS_PER_LEVEL, SLOTS_EQ } from '../data/equipment.js';

export const G = {
  account: null,   // nome account loggato
  slot: 0,         // slot di salvataggio attivo
  s: null,         // stato della partita corrente
};

export function expToNext(level){ return Math.floor(20 * level * level); }

export function statsOf(cs){
  const def = CHARACTERS[cs.id];
  const lv = cs.level - 1;
  const st = {
    hp:  Math.floor(def.base.hp  + def.growth.hp  * lv),
    mp:  Math.floor(def.base.mp  + def.growth.mp  * lv),
    atk: Math.floor(def.base.atk + def.growth.atk * lv),
    def: Math.floor(def.base.def + def.growth.def * lv),
    mag: Math.floor(def.base.mag + def.growth.mag * lv),
    spr: Math.floor(def.base.spr + def.growth.spr * lv),
    spd: Math.floor(def.base.spd + def.growth.spd * lv),
    crit: 0,
  };
  // caratteristiche D&D assegnate dal giocatore
  for (const [k, n] of Object.entries(cs.attr || {})) for (const [stat, v] of Object.entries(ATTRS[k].bonus)) st[stat] += v * n;
  // equipaggiamento
  for (const slot of SLOTS_EQ){
    const e = EQUIP[cs.eq?.[slot]];
    if (e) for (const [stat, v] of Object.entries(e.stats)) st[stat] += v;
  }
  return st;
}

export function knownAbilities(cs){
  const lv = CHARACTERS[cs.id].learnset.filter(l => l.lv <= cs.level).map(l => l.ab);
  const extra = (cs.tomes || []).filter(ab => !lv.includes(ab));   // apprese dai tomi
  return [...lv, ...extra];
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
    cs.pts = (cs.pts || 0) + POINTS_PER_LEVEL;
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
  const cs = { id, level, exp:0, hp:0, mp:0, pts:POINTS_PER_LEVEL * (level - 1), attr:{}, eq:{}, tomes:[] };
  const st = statsOf(cs);
  cs.hp = st.hp; cs.mp = st.mp;
  return cs;
}

// Ste e Riki: il duo protagonista, sempre in squadra. `hero` è quello
// controllato dal giocatore, l'altro lo segue sulla mappa.
export const DUO = ['ste', 'riki'];
export const partnerOf = hero => hero === 'riki' ? 'ste' : 'riki';

// salvataggi vecchi o party manomessi: il duo torna ai primi due posti
export function ensureDuo(s){
  if (!DUO.includes(s.hero)) s.hero = DUO.includes(s.party[0]) ? s.party[0] : 'ste';
  const others = [...s.party, ...s.reserve].filter(id=>!DUO.includes(id));
  const inParty = s.party.filter(id=>!DUO.includes(id));
  s.party = [s.hero, partnerOf(s.hero), ...inParty].slice(0, PARTY_MAX);
  s.reserve = others.filter(id=>!s.party.includes(id));
}

// porta i salvataggi vecchi al formato attuale (caratteristiche, equipaggiamento)
export function migrate(s){
  s.gear ||= {};
  for (const cs of Object.values(s.chars)){
    if (!cs.attr){ cs.attr = {}; cs.pts = POINTS_PER_LEVEL * (cs.level - 1); }
    cs.eq ||= {}; cs.tomes ||= [];
  }
  ensureDuo(s);
}

export function newGame(hero='ste'){
  const s = newGameState(hero);
  // equipaggiamento iniziale del duo
  s.chars.ste.eq = { arma:'bastone_betulla', abito:'tunica_allievo' };
  s.chars.riki.eq = { arma:'katana_acciaio', abito:'gi_rinforzato' };
  for (const cs of Object.values(s.chars)){ const st = statsOf(cs); cs.hp = st.hp; cs.mp = st.mp; }
  return s;
}

function newGameState(hero){
  return {
    version: 4,
    gear: {},
    hero,
    party: [hero, partnerOf(hero)],
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

// Recupero naturale fuori dalla battaglia: una piccola percentuale dei
// massimi al secondo (chi è KO resta KO fino a una locanda o una Coda di Fenice).
export const REGEN = { hp:0.012, mp:0.015 };   // frazione dei massimi al secondo
const regenAcc = new Map();
export function regen(s, seconds){
  for (const cs of Object.values(s.chars)){
    if (cs.hp <= 0) continue;
    const st = statsOf(cs);
    const acc = regenAcc.get(cs) || { hp:0, mp:0 };
    acc.hp += st.hp * REGEN.hp * seconds; acc.mp += st.mp * REGEN.mp * seconds;
    const dh = Math.floor(acc.hp), dm = Math.floor(acc.mp);
    acc.hp -= dh; acc.mp -= dm;
    cs.hp = Math.min(st.hp, cs.hp + dh); cs.mp = Math.min(st.mp, cs.mp + dm);
    regenAcc.set(cs, acc);
  }
}

export function addItem(id, qty=1){
  G.s.items[id] = (G.s.items[id] || 0) + qty;
}

export function partyAlive(){
  return G.s.party.some(id => G.s.chars[id].hp > 0);
}

export function abilityName(id){ return ABILITIES[id]?.name || id; }
