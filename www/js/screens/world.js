// Esplorazione: mappa, movimento, dialoghi, eventi, negozi, incontri.

import { MAPS, SIGILLI } from '../data/maps.js';
import { NPCS, EVENTS } from '../data/story.js';
import { QUESTS, questState, questAccept, questReadyToComplete } from '../data/quests.js';
import { ZONES, MONSTERS } from '../data/monsters.js';
import { ITEMS, SHOPS, INN_PRICES } from '../data/items.js';
import { EQUIP, TOMES } from '../data/equipment.js';
import { ABILITIES } from '../data/abilities.js';
import { CHARACTERS } from '../data/characters.js';
import { G, fullHeal, addCharacter, addItem, migrate, partnerOf, knownAbilities, statsOf, regen } from '../engine/state.js';
import { saveGame } from '../engine/save.js';
import { BLOCKED } from '../engine/sprites.js';
import { World3D } from '../engine/world3d.js';
import { Input } from '../engine/input.js';
import { playMusic, sfx } from '../engine/audio.js';
import { registerScreen, show, currentScreen } from '../engine/ui.js';

const el = document.getElementById('screen-world');
const canvas = document.getElementById('world-canvas');
let W3 = null;   // motore 3D, creato al primo ingresso nel mondo
let builtMap = null;
const hudLoc = document.getElementById('hud-location');
const dlgBox = document.getElementById('dialog-box');
const dlgName = document.getElementById('dialog-name');
const dlgText = document.getElementById('dialog-text');
const choiceBox = document.getElementById('choice-box');

let raf = 0;
let map = null;
let player = null;   // creato da loadMap/enter
let dialogQueue = null;   // { lines, idx, onDone }
let busy = false;         // dialogo/scelta/evento in corso
let stepFrame = 0;

// Il giocatore si muove in modo continuo: (px, pz) è la posizione in caselle
// (centro casella = x+0.5), (x, y) è la casella occupata usata da trigger e salvataggi.
function newPlayer(x, y){
  resetFollower(x + 0.5, y + 0.5);
  return { x, y, px:x+0.5, pz:y+0.5, vx:0, vz:0, dir:'down', walk:0, lean:0, bump:0, hop:0, hopV:0 };
}

// ---------- il compagno che ti segue (come Pikachu con Ash) ----------
// Ripercorre la scia del giocatore a distanza fissa: così aggira muri e porte
// esattamente come te, senza bisogno di un pathfinding.
const FOLLOW_GAP = 0.85;          // caselle di distanza lungo la scia
let trail = [];                   // punti {x,z} dal più recente al più vecchio
let follower = { x:0, z:0, walk:0, face:0, speed:0, idle:0 };
function resetFollower(x, z){
  trail = [{ x, z }];
  // parte al tuo fianco, così si vede subito
  follower = { x, z, walk:0, face:0, speed:0, idle:0 };   // si affianca appena c'è posto
}
// il cerchio (cx, cz, r) sta tutto su caselle calpestabili?
function freeCircle(cx, cz, r){
  for (let ty = Math.floor(cz - r); ty <= Math.floor(cz + r); ty++) for (let tx = Math.floor(cx - r); tx <= Math.floor(cx + r); tx++){
    if (walkable(tx, ty)) continue;
    const nx = Math.max(tx, Math.min(cx, tx + 1)), nz = Math.max(ty, Math.min(cz, ty + 1));
    if ((cx - nx) ** 2 + (cz - nz) ** 2 < r * r) return false;
  }
  return true;
}
const MATE_R = 0.26;              // ingombro del compagno
function sideSpot(){
  // da fermi si affianca al giocatore (a destra o a sinistra, dove c'è posto per tutto il corpo)
  for (const sx of [0.75, -0.75]){
    if (freeCircle(player.px + sx, player.pz, MATE_R) && freeCircle(player.px + sx / 2, player.pz, MATE_R)) return { x: player.px + sx, z: player.pz };
  }
  return null;
}
function updateFollower(dt){
  const head = trail[0];
  if (Math.hypot(player.px - head.x, player.pz - head.z) > 0.08) trail.unshift({ x:player.px, z:player.pz });
  // punto della scia a FOLLOW_GAP dal giocatore
  let dist = Math.hypot(player.px - trail[0].x, player.pz - trail[0].z);
  let target = null;
  for (let i = 1; i < trail.length; i++){
    const a = trail[i-1], b = trail[i];
    const seg = Math.hypot(a.x - b.x, a.z - b.z);
    if (dist + seg >= FOLLOW_GAP){
      const k = (FOLLOW_GAP - dist) / (seg || 1);
      target = { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
      trail.length = i + 1;          // la scia più vecchia non serve più
      break;
    }
    dist += seg;
  }
  const still = Math.hypot(player.vx, player.vz) < 0.1;
  follower.idle = still ? follower.idle + dt : 0;
  if (follower.idle > 0.5) target = sideSpot() || target;
  if (!target){ follower.speed = 0; return; }
  // si muove verso il bersaglio senza scatti, anche quando cambia modalità
  const dx = target.x - follower.x, dz = target.z - follower.z;
  const d = Math.hypot(dx, dz);
  const maxStep = Math.max(4, Math.hypot(player.vx, player.vz) * 1.4) * dt;
  const step = Math.min(d, maxStep);
  if (d > 0.01){
    const nx = follower.x + dx / d * step, nz = follower.z + dz / d * step;
    // mai dentro un muro: se la linea retta taglia uno spigolo, salta sul bersaglio (che è libero)
    if (freeCircle(nx, nz, MATE_R)){ follower.x = nx; follower.z = nz; }
    else if (freeCircle(target.x, target.z, MATE_R)){ follower.x = target.x; follower.z = target.z; }
    follower.face = Math.atan2(dx, dz); follower.walk += step * 1.6;
  } else if (follower.idle > 0.5){
    follower.face = Math.atan2(player.px - follower.x, player.pz - follower.z) * 0.5;   // si gira verso di te e la camera
  }
  follower.speed = step / Math.max(dt, 1e-3);
}

// battute del compagno quando gli parli (Ctrl rivolto verso di lui)
const PARTNER_LINES = {
  riki: [
    [{ not:['intro_done'] }, 'Il Rettore ci aspetta. Non vorrai arrivare tardi all’unico esame che conta.'],
    [{ not:['sigillo_alba'] }, 'Vedano, la chiesa del Lazzaretto, una statua che cammina. Io taglio, tu fai le lucine. Il solito.'],
    [{ not:['sigillo_meriggio'] }, 'Castiglione, la Collegiata. Dicono ci sia un ladro dentro. Il sigillo è nostro prima che suo.'],
    [{ not:['sigillo_vespro'] }, 'Un cavaliere di ottocento anni. Finalmente qualcuno che sa tenere una spada.'],
    [{ not:['sigillo_notte'] }, 'Un drago di lamiera a Samarate. E c’è Sofy: prova a non inciampare nei tuoi stessi incantesimi.'],
    [{ not:['game_done'] }, 'Quattro sigilli. Il Sacro Monte ci aspetta. Nessun rimpianto, fratello.'],
    [null, 'Il tempo scorre di nuovo. Andiamo a mangiare, stavolta il pranzo non lo saltiamo.'],
  ],
  ste: [
    [{ not:['intro_done'] }, 'L’aula magna è di qua. Riki, prova a non addormentarti durante il discorso.'],
    [{ not:['sigillo_alba'] }, 'Il Lazzaretto di Vedano, a sud-est. Tu apri la strada, io ti copro con la magia.'],
    [{ not:['sigillo_meriggio'] }, 'Castiglione Olona. Un ladro nella Collegiata, un’ombra sull’altare: giornata piena.'],
    [{ not:['sigillo_vespro'] }, 'Il castello di Jerago. Ho letto che i fantasmi odiano il fuoco. O amano il fuoco. Vedremo.'],
    [{ not:['sigillo_notte'] }, 'Samarate... sì, Sofy dovrebbe essere lì. No, non sto arrossendo. È il riflesso del drago.'],
    [{ not:['game_done'] }, 'Abbiamo i quattro sigilli. Qualunque cosa succeda lassù, ci siamo arrivati insieme.'],
    [null, 'Ce l’abbiamo fatta. Adesso però gli esami li correggi tu.'],
  ],
};
function talkToPartner(){
  const pid = partnerOf(G.s.hero);
  const line = PARTNER_LINES[pid].find(([c])=>condOk(c))[1];
  showDialog([[CHARACTERS[pid].name, line]]);
}

// ---------- util ----------
function condOk(c){
  if (!c) return true;
  const f = G.s.flags;
  if (c.has && !c.has.every(x=>f[x])) return false;
  if (c.not && !c.not.every(x=>!f[x])) return false;
  return true;
}

function tileAt(x, y){
  const row = map.tiles[y];
  if (!row || x < 0 || x >= row.length) return ' ';
  return row[x];
}

function activeTriggers(){
  return (map.triggers||[]).filter(t=>{
    if (t.hideFlag && G.s.flags[t.hideFlag]) return false;
    return true;
  });
}

// indice per casella: i paesi OSM hanno migliaia di porte e il controllo delle collisioni
// chiede i trigger decine di volte per fotogramma
function triggerIndex(){
  const list = map.triggers || [];
  if (map._tix && map._tixN === list.length) return map._tix;
  const ix = new Map();
  for (const t of list){ const k = t.x + ',' + t.y; if (!ix.has(k)) ix.set(k, []); ix.get(k).push(t); }
  map._tix = ix; map._tixN = list.length;
  return ix;
}
function triggerAt(x, y){
  return triggerIndex().get(x + ',' + y)?.find(t=>!(t.hideFlag && G.s.flags[t.hideFlag])) || null;
}

function walkable(x, y){
  const ch = tileAt(x, y);
  if (BLOCKED.has(ch)) return false;
  const t = triggerAt(x, y);
  if (t && (t.type === 'npc' || t.type === 'quest')) return false;
  return true;
}

function zoneAt(x, y){
  if (map.zone) return map.zone;
  if (!map.zones) return null;
  for (const z of map.zones){
    if (x >= z.x && x < z.x+z.w && y >= z.y && y < z.y+z.h) return z.zone;
  }
  return 'varese';
}

// ---------- dialoghi ----------
export function showDialog(lines, onDone){
  busy = true;
  dialogQueue = { lines, idx:0, onDone };
  renderDialogLine();
  dlgBox.classList.remove('hidden');
}

function renderDialogLine(){
  const [name, text] = dialogQueue.lines[dialogQueue.idx];
  dlgName.textContent = name || '';
  dlgName.style.display = name ? 'block' : 'none';
  dlgText.textContent = text;
}

function advanceDialog(){
  if (!dialogQueue) return;
  sfx('select');
  dialogQueue.idx++;
  if (dialogQueue.idx >= dialogQueue.lines.length){
    const cb = dialogQueue.onDone;
    dialogQueue = null;
    dlgBox.classList.add('hidden');
    busy = false;
    cb?.();
  } else {
    renderDialogLine();
  }
}

dlgBox.addEventListener('click', advanceDialog);

let choiceIdx = 0;
function choiceButtons(){ return [...choiceBox.querySelectorAll('button:not(:disabled)')]; }
function highlightChoice(){
  choiceButtons().forEach((b, i)=>b.classList.toggle('key-sel', i === choiceIdx));
}
function showChoice(options){
  busy = true;
  choiceBox.innerHTML = '';
  for (const opt of options){
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = opt.label;
    if (opt.disabled) b.disabled = true;
    b.onclick = ()=>{ if (!opt.keep){ choiceBox.classList.add('hidden'); busy = false; } opt.cb?.(); };
    choiceBox.appendChild(b);
  }
  choiceIdx = 0;
  highlightChoice();
  choiceBox.classList.remove('hidden');
}
function closeChoice(){ choiceBox.classList.add('hidden'); busy = false; }
const choiceOpen = ()=>!choiceBox.classList.contains('hidden');

// navigazione tastiera/pad delle scelte (negozio, locanda, ...)
window.addEventListener('pad-dir', e=>{
  if (currentScreen() !== 'world' || !choiceOpen()) return;
  const btns = choiceButtons();
  if (!btns.length) return;
  if (e.detail === 'up') choiceIdx = (choiceIdx - 1 + btns.length) % btns.length;
  else if (e.detail === 'down') choiceIdx = (choiceIdx + 1) % btns.length;
  else return;
  sfx('select');
  highlightChoice();
});
window.addEventListener('pad-confirm', ()=>{
  if (currentScreen() !== 'world' || !choiceOpen()) return;
  choiceButtons()[choiceIdx]?.click();
});
window.addEventListener('pad-back', ()=>{
  if (currentScreen() !== 'world') return;
  if (choiceOpen()){
    // come il tasto B: chiude la scelta (l'ultima voce è sempre Chiudi/No)
    const btns = choiceButtons();
    sfx('cancel');
    btns[btns.length - 1]?.click();
    if (choiceOpen()) return;   // «◀ Reparti»: si resta nel negozio
    dlgBox.classList.add('hidden');
    if (!dialogQueue) busy = false;
  } else if (dialogQueue){
    advanceDialog(); // B scorre comunque i dialoghi, come in molti JRPG
  }
});

// ---------- eventi ----------
function runSteps(steps, i=0){
  if (i >= steps.length){ busy = false; return; }
  busy = true;
  const st = steps[i];
  const next = ()=>runSteps(steps, i+1);
  if (st.d){ showDialog(st.d, next); return; }
  if (st.flag){ G.s.flags[st.flag] = true; next(); return; }
  if (st.join){ addCharacter(st.join); sfx('levelup'); next(); return; }
  if (st.item){ addItem(st.item, st.qty||1); sfx('chest'); next(); return; }
  if (st.heal){ fullHeal(); sfx('heal'); next(); return; }
  if (st.battle){
    show('battle', {
      monsterIds:[st.battle], boss:true, area: G.s.map,
      onWin: ()=>{ show('world', { resume:true }); runSteps(steps, i+1); },
    });
    return;
  }
  if (st.ending){ show('ending'); return; }
  next();
}

function runEvent(ev){
  if (condOk(ev.if)) runSteps(ev.steps);
  else if (ev.doneSteps) runSteps(ev.doneSteps);
}

function checkEnterEvents(){
  for (const id of Object.keys(EVENTS)){
    const ev = EVENTS[id];
    if (ev.map === G.s.map && ev.when === 'enter' && condOk(ev.if)){
      runSteps(ev.steps);
      return;
    }
  }
}

// ---------- trigger ----------
function sigilliCount(){ return SIGILLI.filter(s=>G.s.flags[s]).length; }

function fireStepTrigger(t){
  switch(t.type){
    case 'portal':
      if (t.needSigilli && sigilliCount() < t.needSigilli){
        // respingi il giocatore di una casella e mostra il messaggio
        G.s.x = player.x; G.s.y = player.y + 1;
        player = { ...newPlayer(player.x, player.y + 1), dir:'down' };
        showDialog([['', t.lockedMsg||'È chiuso.']]);
        return;
      }
      loadMap(t.to.map, t.to.x, t.to.y);
      return;
    case 'door_event': {
      const ev = EVENTS[t.event];
      if (ev) runEvent(ev);
      return;
    }
    case 'event': {
      const ev = EVENTS[t.event];
      if (ev && condOk(ev.if)) runSteps(ev.steps);
      return;
    }
    case 'shop': openShop(t.shop); return;
    case 'inn': openInn(t.town); return;
    case 'heal':
      fullHeal(); sfx('heal');
      showDialog([['','Una sorgente di luce vi avvolge. HP e MP completamente ripristinati!']]);
      return;
  }
}

// dialogo delle missioni secondarie: offerta -> in corso -> consegna -> dopo
function runQuestNpc(t){
  const q = QUESTS[t.quest];
  if (!q){ showDialog([['???','...']]); return; }
  const st = questState(G.s, t.quest);
  if (!st){
    showDialog(q.offer, ()=>{
      showChoice([
        { label:`Accetto! <small>${q.name}</small>`, cb:()=>{
            questAccept(G.s, t.quest);
            sfx('confirm');
            showDialog(q.accepted);
          } },
        { label:'Magari più tardi', cb:()=>{} },
      ]);
    });
    return;
  }
  if (st.done){ showDialog(q.after); return; }
  if (questReadyToComplete(G.s, t.quest)){
    // consegna: per le missioni di raccolta si consegnano gli oggetti
    if (q.kind === 'item'){
      G.s.items[q.item] -= q.need;
      if (G.s.items[q.item] <= 0) delete G.s.items[q.item];
    }
    st.done = true;
    if (q.reward.gold) G.s.gold += q.reward.gold;
    if (q.reward.item) addItem(q.reward.item, q.reward.qty || 1);
    sfx('levelup');
    const rewards = [];
    if (q.reward.gold) rewards.push(`${q.reward.gold} oro`);
    if (q.reward.item) rewards.push(`${ITEMS[q.reward.item].name} x${q.reward.qty||1}`);
    showDialog([...q.complete, ['', `Missione «${q.name}» completata! Ricompensa: ${rewards.join(', ')}.`]]);
    return;
  }
  showDialog(q.progress);
}

function fireActionTrigger(t){
  switch(t.type){
    case 'quest': runQuestNpc(t); return;
    case 'npc': {
      const variants = NPCS[t.npc] || [{ name:'???', lines:['...'] }];
      const v = variants.find(x=>condOk(x.if)) || variants[variants.length-1];
      showDialog(v.lines.map(l=>[v.name, l]));
      return;
    }
    case 'vehicle': {
      if (G.s.items[t.vehicle] > 0) return;
      addItem(t.vehicle, 1);
      G.s.vehicle = t.vehicle;
      sfx('levelup');
      showDialog([['', VEHICLES[t.vehicle].mount
        ? `${VEHICLES[t.vehicle].name} ti annusa la mano e si lascia accarezzare: ora è tuo! Ci sali in groppa. Premi V (o il tasto 🚲) per scendere o cambiare cavalcatura.`
        : `Hai trovato: ${VEHICLES[t.vehicle].name}! Ci sali subito. Premi V (o il tasto 🚲) per scendere o cambiare mezzo.`]]);
      return;
    }
    case 'chest': {
      if (G.s.chests[t.id]) { showDialog([['','Il forziere è vuoto.']]); return; }
      G.s.chests[t.id] = true;
      sfx('chest');
      if (t.item){
        addItem(t.item, t.qty||1);
        showDialog([['',`Hai trovato: ${ITEMS[t.item].name} x${t.qty||1}!`]]);
      } else if (t.gold){
        G.s.gold += t.gold;
        showDialog([['',`Hai trovato ${t.gold} oro!`]]);
      }
      return;
    }
  }
}

// ---------- negozio e locanda ----------
// Negozio in stile FF: prima il reparto, poi la merce. Gli abiti e le armi
// vanno nello zaino dell'equipaggiamento, i tomi insegnano subito la tecnica.
const SHOP_DEPTS = [['oggetti','Oggetti'], ['armi','Armi'], ['abiti','Abiti e accessori'], ['magie','Magie e tecniche']];
function statTxt(stats){
  const N = { atk:'ATK', def:'DEF', mag:'MAG', spr:'SPR', spd:'VEL', hp:'HP', mp:'MP', crit:'CRIT' };
  return Object.entries(stats).map(([k, v])=>`+${k === 'crit' ? Math.round(v*100) + '%' : v} ${N[k]}`).join(' ');
}
function shopHeader(title, msg){
  dlgName.textContent = title; dlgName.style.display = 'block';
  dlgText.textContent = msg ?? `Oro: ${G.s.gold}`;
  dlgBox.classList.remove('hidden');
}
function openShop(shopId){
  const shop = SHOPS[shopId] || { oggetti:[] };
  shopHeader('Negozio', `Benvenuti! Cosa cercate? Oro: ${G.s.gold}`);
  const opts = SHOP_DEPTS.filter(([k])=>shop[k]?.length).map(([k, label])=>({ label, keep:true, cb:()=>openDept(shopId, k) }));
  opts.push({ label:'Chiudi', cb:()=>{ dlgBox.classList.add('hidden'); } });
  showChoice(opts);
}
function buy(price, give){
  if (G.s.gold < price){ sfx('cancel'); dlgText.textContent = 'Oro insufficiente!'; return; }
  G.s.gold -= price; sfx('confirm'); dlgText.textContent = give() + ` Oro: ${G.s.gold}`;
}
function openDept(shopId, dept){
  const ids = SHOPS[shopId][dept];
  shopHeader(SHOP_DEPTS.find(d=>d[0] === dept)[1]);
  const opts = ids.map(id=>{
    if (dept === 'oggetti'){
      const it = ITEMS[id];
      const owned = it.type === 'key' && G.s.items[id] > 0;
      return { label:`${it.name} — ${it.price} oro<small>${it.desc}</small>`, keep:true, disabled:owned,
               cb:()=>buy(it.price, ()=>{ addItem(id, 1); return `${it.name} acquistato!`; }) };
    }
    if (dept === 'magie'){
      const t = TOMES[id], cs = G.s.chars[t.who];
      const known = cs && knownAbilities(cs).includes(t.ab);
      const who = CHARACTERS[t.who].name;
      return { label:`${t.name} — ${t.price} oro<small>${who}: ${ABILITIES[t.ab].desc || ''}${!cs ? ' (non ancora in squadra)' : known ? ' (già appresa)' : ''}</small>`,
               keep:true, disabled:!cs || known,
               cb:()=>buy(t.price, ()=>{ cs.tomes.push(t.ab); sfx('levelup'); return `${who} impara ${ABILITIES[t.ab].name}!`; }) };
    }
    const e = EQUIP[id];
    const who = e.who ? e.who.map(w=>CHARACTERS[w].name).join(', ') : 'tutti';
    const have = G.s.gear[id] || 0;
    return { label:`${e.name} — ${e.price} oro<small>${statTxt(e.stats)} · ${who}${have ? ` · ne hai ${have}` : ''}</small>`, keep:true,
             cb:()=>buy(e.price, ()=>{ G.s.gear[id] = (G.s.gear[id] || 0) + 1; return `${e.name} acquistato! Equipaggialo dal menu Squadra.`; }) };
  });
  opts.push({ label:'◀ Reparti', keep:true, cb:()=>openShop(shopId) });
  showChoice(opts);
}

function openInn(town){
  const price = INN_PRICES[town] || 20;
  showChoice([
    { label:`Riposare (${price} oro)`, cb:()=>{
        if (G.s.gold >= price){
          G.s.gold -= price; fullHeal(); sfx('heal');
          showDialog([['Locandiere','Dormite bene! ...Ecco fatto: freschi come rose. HP e MP al massimo!']]);
        } else {
          showDialog([['Locandiere','Niente oro, niente letto. Mi spiace!']]);
        }
      } },
    { label:'No, grazie', cb:()=>{} },
  ]);
}

// se la posizione salvata non è più calpestabile (es. mappa rigenerata da
// OpenStreetMap) si sposta il giocatore sulla casella libera più vicina
function fixSpawn(){
  if (walkable(player.x, player.y) && !triggerAt(player.x, player.y)) return;
  const seen = new Set(), q = [[player.x, player.y]];
  while (q.length){
    const [x, y] = q.shift();
    if (walkable(x, y) && !triggerAt(x, y)){ player = newPlayer(x, y); G.s.x = x; G.s.y = y; return; }
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const k = (x + dx) + ',' + (y + dy);
      if (!seen.has(k) && Math.abs(x + dx - player.x) < 60 && Math.abs(y + dy - player.y) < 60){ seen.add(k); q.push([x + dx, y + dy]); }
    }
  }
  if (map.spawn){ player = newPlayer(map.spawn.x, map.spawn.y); G.s.x = map.spawn.x; G.s.y = map.spawn.y; }
}

// ---------- mappa ----------
export function loadMap(name, x, y){
  map = MAPS[name];
  G.s.map = name;
  G.s.x = x; G.s.y = y;
  player = newPlayer(x, y);
  fixSpawn();
  hudLoc.textContent = map.name;
  playMusic(map.music || 'world');
  checkEnterEvents();
  setTimeout(autosave, 300);            // anche a ogni cambio di mappa (dopo eventuali dialoghi d'ingresso: salta se occupato)
}

// ---------- incontri ----------
function tryEncounter(){
  if (map.town) return;
  const ch = tileAt(player.x, player.y);
  if (ch !== ',') return;
  const zname = zoneAt(player.x, player.y);
  const zone = ZONES[zname];
  if (!zone) return;
  if (Math.random() < zone.rate){
    const n = zone.min + Math.floor(Math.random() * (zone.max - zone.min + 1));
    const ids = [];
    for (let i=0; i<n; i++) ids.push(zone.monsters[Math.floor(Math.random()*zone.monsters.length)]);
    show('battle', {
      monsterIds: ids, boss:false, area: zname,
      onWin: ()=>show('world', { resume:true }),
      onFlee: ()=>show('world', { resume:true }),
    });
  }
}

// ---------- fisica del movimento ----------
// Velocità in caselle/secondo. A piedi si accelera e si frena in fretta;
// in bici si prende velocità lentamente e si va per inerzia (attrito basso),
// si piega in curva e si rimbalza contro gli ostacoli.
const PHYS = {
  walk: { max:3.4, accel:28, fric:16 },
  run:  { max:6.4, accel:32, fric:14 },        // con le Scarpe da Corsa: tieni premuto Alt / B (o Shift)
};
// mezzi: la bici va di inerzia, il monopattino scatta e curva stretto, la Vespa è la più veloce
export const VEHICLES = {
  bici:        { name:'Bicicletta', max:9.0,  accel:9,  fric:1.8, turn:5, seat:0.28, pedal:true },
  monopattino: { name:'Monopattino Elettrico', max:7.5, accel:15, fric:3.0, turn:8, seat:0.12, stand:true },
  vespa:       { name:'Vespa', max:12.5, accel:7, fric:1.1, turn:3.8, seat:0.36 },
  // cavalcature: partono subito, curvano bene e al galoppo sono veloci quasi come la Vespa
  cavallo:     { name:'Cavallo', max:11,  accel:11, fric:3.5, turn:6, seat:0.56, mount:true },
  asino:       { name:'Asinello', max:6.8, accel:12, fric:5,   turn:7, seat:0.4,  mount:true },
};
const RADIUS = 0.3;       // raggio di collisione del giocatore (caselle)
let running = false;
let lastTs = 0;

window.addEventListener('keydown', e=>{
  if (e.key === 'Shift') running = true;
  if ((e.key === 'v' || e.key === 'V') && currentScreen() === 'world' && !e.repeat) toggleRide();
});
window.addEventListener('keyup',   e=>{ if (e.key === 'Shift') running = false; });
window.addEventListener('blur', ()=>{ running = false; });
// la corsa: B / Alt tenuto premuto (come nei Pokémon) oppure Shift
const runHeld = ()=>running || Input.backHeld;
document.getElementById('btn-ride').addEventListener('click', ()=>toggleRide());

// mezzo in uso (solo all'aperto e se lo si possiede)
const riding = ()=>{
  const v = G.s.vehicle;
  return v && G.s.items[v] > 0 && !map.indoor ? v : null;
};
const onBike = ()=>!!riding();
function ownedVehicles(){ return Object.keys(VEHICLES).filter(v=>G.s.items[v] > 0); }
// V: sali sul mezzo, cambia mezzo o scendi
function toggleRide(){
  if (busy || !G.s) return;
  const own = ownedVehicles();
  if (!own.length){ showDialog([['', 'Non hai ancora un mezzo. Cercane uno in giro per i paesi: bici, monopattini, persino una Vespa!']]); return; }
  if (map.indoor){ sfx('cancel'); return; }
  const i = own.indexOf(G.s.vehicle);
  G.s.vehicle = i < 0 ? own[0] : own[i + 1] || null;      // giro: primo mezzo, il successivo, poi a piedi
  sfx(G.s.vehicle ? 'confirm' : 'cancel');
  player.lean = 0;
}

// il cerchio (cx, cz, r) tocca una casella bloccata?
function collides(cx, cz, r){
  const x0 = Math.floor(cx - r), x1 = Math.floor(cx + r);
  const z0 = Math.floor(cz - r), z1 = Math.floor(cz + r);
  for (let ty = z0; ty <= z1; ty++) for (let tx = x0; tx <= x1; tx++){
    if (tx === player.x && ty === player.y) continue; // mai incastrati nella propria casella
    if (walkable(tx, ty)) continue;
    // distanza cerchio-rettangolo
    const nx = Math.max(tx, Math.min(cx, tx + 1)), nz = Math.max(ty, Math.min(cz, ty + 1));
    const dx = cx - nx, dz = cz - nz;
    if (dx*dx + dz*dz < r*r) return true;
  }
  return false;
}

// muove lungo un asse; se urta prova a "scivolare" verso il centro della
// corsia libera (così si imboccano porte e ponti senza allinearsi al pixel)
function moveAxis(axis, d){
  if (!d) return true;
  const nx = player.px + (axis === 'x' ? d : 0), nz = player.pz + (axis === 'z' ? d : 0);
  if (!collides(nx, nz, RADIUS)){ player.px = nx; player.pz = nz; return true; }
  const other = axis === 'x' ? 'pz' : 'px';
  const center = Math.floor(player[other]) + 0.5;
  const off = center - player[other];
  if (Math.abs(off) > 0.02 && Math.abs(off) < 0.45){
    const step = Math.sign(off) * Math.min(Math.abs(off), Math.abs(d));
    const tx = axis === 'x' ? player.px : player.px + step, tz = axis === 'x' ? player.pz + step : player.pz;
    if (!collides(tx, tz, RADIUS)){ player.px = tx; player.pz = tz; }
  }
  return false;
}

// ---------- autosalvataggio ----------
const AUTOSAVE_EVERY = 120;   // secondi di gioco
let autosaveT = 0;
const toast = document.getElementById('autosave-toast');
export function autosave(){
  if (!G.account || !G.s || busy) return;
  const leader = G.s.hero;
  saveGame(G.account, G.slot, G.s, { label:`${CHARACTERS[leader].name} Lv.${G.s.chars[leader].level} — ${MAPS[G.s.map].name} (auto)` });
  autosaveT = 0;
  toast.classList.remove('hidden');
  toast.style.animation = 'none'; void toast.offsetWidth; toast.style.animation = '';
  clearTimeout(toast._t); toast._t = setTimeout(()=>toast.classList.add('hidden'), 2300);
}

function update(dt){
  if (!busy){
    regen(G.s, dt);                       // HP e MP tornano piano piano camminando
    autosaveT += dt;
    if (autosaveT > AUTOSAVE_EVERY) autosave();
  }
  // salto/sobbalzo (anche durante i dialoghi, per chiudere l'animazione)
  if (player.hop > 0 || player.hopV > 0){
    player.hopV -= 22 * dt; player.hop += player.hopV * dt;
    if (player.hop <= 0){ player.hop = 0; player.hopV = 0; }
  }
  if (busy){ player.vx = player.vz = 0; return; }
  const bike = onBike();
  const P = bike ? VEHICLES[riding()] : runHeld() && G.s.items.scarpe > 0 ? PHYS.run : PHYS.walk;
  const ax = Input.axis();
  let ix = ax.x, iz = ax.y;
  const len = Math.hypot(ix, iz);
  if (len){ ix /= len; iz /= len; }

  if (len){
    // accelera verso la direzione voluta; in bici la traiettoria curva gradualmente
    const tvx = ix * P.max, tvz = iz * P.max;
    const a = P.accel * dt;
    if (bike){
      const sp = Math.hypot(player.vx, player.vz);
      const k = Math.min(1, P.turn * dt);
      let dvx = player.vx + (ix * Math.max(sp, 1) - player.vx) * k;
      let dvz = player.vz + (iz * Math.max(sp, 1) - player.vz) * k;
      const s2 = Math.min(P.max, Math.hypot(dvx, dvz) + a);
      const l2 = Math.hypot(dvx, dvz) || 1;
      // piega: prodotto vettoriale tra velocità e sterzata
      const cross = (player.vx * iz - player.vz * ix) / (sp || 1);
      player.lean += (-cross * 0.35 - player.lean) * Math.min(1, dt * 6);
      player.vx = dvx / l2 * s2; player.vz = dvz / l2 * s2;
    } else {
      const dvx = tvx - player.vx, dvz = tvz - player.vz;
      const dl = Math.hypot(dvx, dvz);
      const f = dl > a ? a / dl : 1;
      player.vx += dvx * f; player.vz += dvz * f;
    }
    // la direzione del volto segue l'asse dominante dell'input
    player.dir = Math.abs(ix) > Math.abs(iz) ? (ix < 0 ? 'left' : 'right') : (iz < 0 ? 'up' : 'down');
  } else {
    const sp = Math.hypot(player.vx, player.vz);
    const ns = Math.max(0, sp - P.fric * dt * (bike ? 1 : 1 + sp * 0.3));
    if (sp > 0){ player.vx *= ns / sp; player.vz *= ns / sp; }
    player.lean *= Math.max(0, 1 - dt * 5);
  }

  // integrazione con collisioni separate per asse (scivolamento sui muri)
  const sp = Math.hypot(player.vx, player.vz);
  const steps = Math.max(1, Math.ceil(sp * dt / 0.1));  // sottopassi: niente tunneling in bici
  for (let i = 0; i < steps; i++){
    const okX = moveAxis('x', player.vx * dt / steps);
    const okZ = moveAxis('z', player.vz * dt / steps);
    if (!okX){
      if (bike && Math.abs(player.vx) > 3){ player.vx *= -0.35; bumped(); } else player.vx = 0;
    }
    if (!okZ){
      if (bike && Math.abs(player.vz) > 3){ player.vz *= -0.35; bumped(); } else player.vz = 0;
    }
  }
  player.walk += sp * dt * (bike ? 0.9 : 1.6);

  // cambio di casella: salvataggio, trigger a passo, incontri
  const tx = Math.floor(player.px), ty = Math.floor(player.pz);
  if (tx !== player.x || ty !== player.y){
    player.x = tx; player.y = ty;
    stepFrame++;
    G.s.x = tx; G.s.y = ty;
    G.s.steps++;
    const t = triggerAt(tx, ty);
    if (t && ['portal','door_event','event','shop','inn','heal'].includes(t.type)){
      player.vx = player.vz = 0;
      fireStepTrigger(t);
      return;
    }
    tryEncounter();
  }
}

function bumped(){
  if (player.bump > 0) return;
  player.bump = 0.25;
  player.hopV = 3.2;
  if (W3) W3.shake = 0.6;
  sfx('cancel');
}

function onAction(){
  if (dialogQueue){ advanceDialog(); return; }
  if (busy) return;
  const dx = player.dir==='left'?-1:player.dir==='right'?1:0;
  const dy = player.dir==='up'?-1:player.dir==='down'?1:0;
  // la casella davanti a sé, oppure quella che si sta per toccare
  const t = triggerAt(player.x+dx, player.y+dy)
         || triggerAt(Math.floor(player.px + dx*0.8), Math.floor(player.pz + dy*0.8));
  if (t){ fireActionTrigger(t); return; }
  // il compagno è lì davanti? due chiacchiere
  const fx = follower.x - player.px, fz = follower.z - player.pz;
  if (Math.hypot(fx, fz) < 1.3 && fx*dx + fz*dy > 0.2){ talkToPartner(); return; }
  // salto sul posto (a piedi): puro divertimento, ma fa scena
  if (!onBike() && player.hop === 0) player.hopV = 5;
}

// ---------- rendering (three.js) ----------
let hudT = 0;
function render(dt){
  if (builtMap !== map){
    W3.build(map, G.s.map, map.triggers);
    builtMap = map;
    W3.render(0, { x:player.px, z:player.pz }, { snap:true });
  }
  player.bump = Math.max(0, player.bump - dt);
  W3.beginActors();

  // NPC e personaggi delle missioni: si girano verso il giocatore quando è vicino
  // (niente filter() a ogni fotogramma: i paesi hanno migliaia di porte, qui servono solo gli oggetti visibili)
  for (const t of map.triggers || []){
    if (t.type === 'portal' || (t.hideFlag && G.s.flags[t.hideFlag])) continue;
    if (t.type === 'chest'){ W3.chest(t.id, t.x, t.y, !!G.s.chests[t.id]); continue; }
    if (t.type === 'vehicle'){
      if (G.s.items[t.vehicle] > 0) continue;              // già preso: lo porti con te
      const v = W3.vehicle('veh:' + t.x + ',' + t.y, t.vehicle);
      v.mesh.position.set(t.x + 0.5, 0, t.y + 0.5);
      if (VEHICLES[t.vehicle].mount){ v.mesh.rotation.set(0, 0.6 + Math.sin(performance.now() / 2400) * 0.3, 0); v.mesh.userData.gait?.(0, 0); }   // aspetta brucando
      else v.mesh.rotation.set(0, 0.6, -0.12);   // appoggiato sul cavalletto
      continue;
    }
    if (t.type !== 'npc' && t.type !== 'quest') continue;
    const id = 't:' + (t.npc || t.quest) + ':' + t.x + ',' + t.y;
    const p = W3.person(id, t.sprite || '#b08968');
    const ddx = player.px - (t.x + 0.5), ddz = player.pz - (t.y + 0.5);
    const near = ddx*ddx + ddz*ddz < 6;
    p.update(dt, near ? Math.atan2(ddx, ddz) : 0, 0, 0);
    p.place(t.x + 0.5, t.y + 0.5);
    if (t.type === 'quest'){
      const st = questState(G.s, t.quest);
      const mark = !st ? '!' : st.done ? '' : (questReadyToComplete(G.s, t.quest) ? '✓' : '…');
      W3.marker(id, mark, t.x + 0.5, t.y + 0.5, p.H * 1.25);
    }
  }

  // il compagno del duo, sempre dietro di te
  updateFollower(dt);
  const pid = partnerOf(G.s.hero);
  const mate = W3.person('partner:' + pid, CHARACTERS[pid]);
  mate.update(dt, follower.face, Math.min(6, follower.speed), follower.walk);
  mate.place(follower.x, follower.z);

  // giocatore: guarda nella direzione in cui si muove davvero (anche in diagonale)
  const leader = CHARACTERS[G.s.hero] || CHARACTERS.ste;
  const bike = onBike();
  const sp = Math.hypot(player.vx, player.vz);
  if (sp > 0.3) player.face = Math.atan2(player.vx, player.vz);
  const me = W3.person('player:' + G.s.hero, leader);
  const ride = riding(), V = ride && VEHICLES[ride];
  const seat = V ? V.seat : 0;
  me.update(dt, player.face ?? { down:0, right:Math.PI/2, up:Math.PI, left:-Math.PI/2 }[player.dir], bike ? 0 : sp, player.walk);
  if (ride){
    const b = W3.vehicle('ride', ride);
    b.mesh.position.set(player.px, player.hop, player.pz);
    b.mesh.rotation.set(0, me.angle, player.lean);
    for (const w of b.mesh.userData.wheels) w.rotation.x += sp * dt / (b.mesh.userData.wheelR || 0.17);
    b.mesh.userData.gait?.(player.walk, sp);
    if (V.mount){        // in groppa: gambe ai fianchi, mani alle redini
      me.legs.forEach((l, i)=>{ l.hip.rotation.x = -1.25; l.hip.rotation.z = i ? -0.35 : 0.35; l.knee.rotation.x = 1.1; });
      me.arms.forEach(a=>{ a.sh.rotation.x = -0.7; a.el.rotation.x = -0.6; });
    } else if (V.pedal){        // in sella: gambe sui pedali che girano
      me.legs.forEach((l, i)=>{ const a = player.walk * Math.PI * 4 + i * Math.PI; l.hip.rotation.x = -1.1 + Math.sin(a) * 0.35; l.knee.rotation.x = 1.3 + Math.cos(a) * 0.3; });
      me.arms.forEach(a=>{ a.sh.rotation.x = -0.9; a.el.rotation.x = -0.3; });
    } else if (V.stand){ // in piedi sulla pedana
      me.legs.forEach((l, i)=>{ l.hip.rotation.x = i ? 0.15 : -0.15; l.knee.rotation.x = 0.1; });
      me.arms.forEach(a=>{ a.sh.rotation.x = -0.8; a.el.rotation.x = -0.4; });
    } else {             // seduti sulla Vespa
      me.legs.forEach(l=>{ l.hip.rotation.x = -1.4; l.knee.rotation.x = 1.5; });
      me.arms.forEach(a=>{ a.sh.rotation.x = -1.1; a.el.rotation.x = -0.4; });
    }
  }
  if (me.staff) me.staff.rotation.x = -(me.weaponArm.sh.rotation.x + me.weaponArm.el.rotation.x);   // bastone sempre dritto
  document.getElementById('btn-ride').classList.toggle('hidden', !ownedVehicles().length);
  me.place(player.px, player.pz, bike ? player.lean : 0, player.hop + seat);

  // HUD: paese e via in cui ci si trova (nomi da OpenStreetMap)
  hudT -= dt;
  if (hudT <= 0 && map.streets){
    hudT = 0.3;
    const st = W3.streetAt(player.px, player.pz);
    const txt = st ? `${map.name} · ${st}` : map.name;
    if (hudLoc.textContent !== txt) hudLoc.textContent = txt;
  }

  W3.endActors();
  W3.render(dt, { x:player.px, z:player.pz }, {
    velocity: { x:player.vx, z:player.vz },
    zoomOut: bike ? Math.min(2, sp * 0.2) : 0,   // in velocità la camera si alza
  });
}

function loop(ts){
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  update(dt);
  render(dt);
  raf = requestAnimationFrame(loop);
}

// ---------- registrazione schermata ----------
registerScreen('world', {
  el,
  enter(params){
    G.s.quests ||= {};  // compatibilità con i salvataggi precedenti
    migrate(G.s);
    if (!params?.resume){
      map = MAPS[G.s.map];
      player = newPlayer(G.s.x, G.s.y);
      fixSpawn();
      hudLoc.textContent = map.name;
      playMusic(map.music || 'world');
      checkEnterEvents();
    } else {
      map = MAPS[G.s.map];
      playMusic(map.music || 'world');
    }
    if (!W3) W3 = new World3D(canvas);
    lastTs = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  },
  exit(){
    cancelAnimationFrame(raf);
    closeChoice(); // sicurezza
    busy = !!dialogQueue;
  },
});

export function initWorld(){
  document.getElementById('btn-menu').addEventListener('click', ()=>{
    if (!busy) show('menu');
  });
  // tocca il nome della località per aprire subito la mappa
  document.getElementById('world-hud').addEventListener('click', ()=>{
    if (!busy) show('menu', { tab:'map' });
  });
}

export { onAction as worldAction };
// per i test: posizione continua del giocatore e caselle calpestabili
export const debugWorld = { w3:()=>W3, player:()=>player, follower:()=>follower, walkable:(x, y)=>walkable(x, y), map:()=>map };
