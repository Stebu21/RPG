// Smoke test dei dati di gioco: coerenza tra abilità, personaggi, mostri, mappe, eventi.
import { ABILITIES } from '../www/js/data/abilities.js';
import { CHARACTERS } from '../www/js/data/characters.js';
import { MONSTERS, ZONES } from '../www/js/data/monsters.js';
import { ITEMS, SHOPS, INN_PRICES } from '../www/js/data/items.js';
import { MAPS } from '../www/js/data/maps.js';
import { NPCS, EVENTS } from '../www/js/data/story.js';

let errors = 0;
const err = m => { errors++; console.error('ERRORE:', m); };
const BLOCKED = new Set(['~','^','T','#',' ']);

// personaggi
for (const [id, c] of Object.entries(CHARACTERS)){
  for (const l of c.learnset){
    if (!ABILITIES[l.ab]) err(`${id}: abilità sconosciuta '${l.ab}'`);
    if (l.lv < 1 || l.lv > 100) err(`${id}: livello fuori range ${l.lv}`);
  }
  if (!ABILITIES[c.limit]) err(`${id}: limite sconosciuto '${c.limit}'`);
  const lvls = c.learnset.map(l=>l.lv);
  if (JSON.stringify(lvls) !== JSON.stringify([...lvls].sort((a,b)=>a-b)))
    err(`${id}: learnset non ordinato`);
}

// mostri e zone
for (const [id, m] of Object.entries(MONSTERS)){
  if (!m.moves?.length) err(`${id}: nessuna mossa`);
  for (const mv of m.moves || []){
    if (!['phys','mag','status'].includes(mv.type)) err(`${id}: tipo mossa '${mv.type}'`);
    if (!['enemy','enemies'].includes(mv.target)) err(`${id}: target mossa '${mv.target}'`);
  }
  if (m.phase2 && !m.phase2.moves?.length) err(`${id}: phase2 senza mosse`);
}
for (const [z, def] of Object.entries(ZONES)){
  for (const mid of def.monsters) if (!MONSTERS[mid]) err(`zona ${z}: mostro '${mid}' inesistente`);
}

// negozi
for (const [s, goods] of Object.entries(SHOPS)){
  for (const it of goods) if (!ITEMS[it]) err(`negozio ${s}: oggetto '${it}'`);
  if (!INN_PRICES[s]) err(`manca prezzo locanda per ${s}`);
}

// mappe
const walk = ch => !BLOCKED.has(ch);
for (const [name, map] of Object.entries(MAPS)){
  const w = Math.max(...map.tiles.map(r=>r.length));
  map.tiles.forEach((row, y)=>{
    if (row.length !== w) console.warn(`AVVISO: ${name} riga ${y} larghezza ${row.length} != ${w}`);
  });
  const at = (x,y)=> (map.tiles[y]||'')[x] ?? ' ';
  for (const t of map.triggers || []){
    const ch = at(t.x, t.y);
    if (ch === undefined) { err(`${name}: trigger fuori mappa (${t.x},${t.y})`); continue; }
    if (t.type === 'portal'){
      if (!MAPS[t.to.map]) err(`${name}: portale verso mappa '${t.to.map}'`);
      else {
        const dch = (MAPS[t.to.map].tiles[t.to.y]||'')[t.to.x] ?? ' ';
        if (BLOCKED.has(dch)) err(`${name}: destinazione portale (${t.to.map} ${t.to.x},${t.to.y}) bloccata: '${dch}'`);
      }
    }
    if (['portal','door_event','event','shop','inn','heal'].includes(t.type) && BLOCKED.has(ch) && !'D:SA12345'.includes(ch))
      err(`${name}: trigger calpestabile su tile bloccato '${ch}' (${t.x},${t.y})`);
    if (t.type === 'npc' && !NPCS[t.npc]) err(`${name}: npc '${t.npc}' senza dialogo`);
    if ((t.type === 'door_event' || t.type === 'event') && !EVENTS[t.event]) err(`${name}: evento '${t.event}' inesistente`);
    if (t.type === 'npc' && BLOCKED.has(ch)) err(`${name}: npc su tile bloccato (${t.x},${t.y})`);
    if (t.type === 'chest' && BLOCKED.has(ch)) err(`${name}: forziere su tile bloccato (${t.x},${t.y})`);
    if (t.type === 'chest' && t.item && !ITEMS[t.item]) err(`${name}: forziere con oggetto '${t.item}'`);
  }
}

// eventi: battle/join/item validi
for (const [id, ev] of Object.entries(EVENTS)){
  for (const st of [...(ev.steps||[]), ...(ev.doneSteps||[])]){
    if (st.battle && !MONSTERS[st.battle]) err(`evento ${id}: mostro '${st.battle}'`);
    if (st.join && !CHARACTERS[st.join]) err(`evento ${id}: personaggio '${st.join}'`);
    if (st.item && !ITEMS[st.item]) err(`evento ${id}: oggetto '${st.item}'`);
  }
}

// portali del mondo: i tile cittadina hanno trigger
const world = MAPS.world;
world.tiles.forEach((row, y)=>{
  [...row].forEach((ch, x)=>{
    if ('12345SA'.includes(ch) && ch !== 'A'){
      if (!world.triggers.some(t=>t.x===x && t.y===y && t.type==='portal'))
        err(`world: tile '${ch}' a (${x},${y}) senza portale`);
    }
  });
});

console.log(errors ? `\n${errors} errori.` : 'OK: tutti i controlli superati.');
process.exit(errors ? 1 : 0);
