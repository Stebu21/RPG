// Esplorazione: mappa, movimento, dialoghi, eventi, negozi, incontri.

import { MAPS, SIGILLI } from '../data/maps.js';
import { NPCS, EVENTS } from '../data/story.js';
import { ZONES, MONSTERS } from '../data/monsters.js';
import { ITEMS, SHOPS, INN_PRICES } from '../data/items.js';
import { CHARACTERS } from '../data/characters.js';
import { G, fullHeal, addCharacter, addItem } from '../engine/state.js';
import { TILE, drawGround, drawObject, TALL, drawActor, drawChest, BLOCKED } from '../engine/sprites.js';
import { Input } from '../engine/input.js';
import { playMusic, sfx } from '../engine/audio.js';
import { registerScreen, show, currentScreen } from '../engine/ui.js';

const el = document.getElementById('screen-world');
const canvas = document.getElementById('world-canvas');
const ctx = canvas.getContext('2d');
const hudLoc = document.getElementById('hud-location');
const dlgBox = document.getElementById('dialog-box');
const dlgName = document.getElementById('dialog-name');
const dlgText = document.getElementById('dialog-text');
const choiceBox = document.getElementById('choice-box');

let raf = 0;
let map = null;
let player = { x:0, y:0, dir:'down', moving:false, prog:0, fromX:0, fromY:0 };
let dialogQueue = null;   // { lines, idx, onDone }
let busy = false;         // dialogo/scelta/evento in corso
let stepFrame = 0;

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

function triggerAt(x, y){
  return activeTriggers().find(t=>t.x===x && t.y===y) || null;
}

function walkable(x, y){
  const ch = tileAt(x, y);
  if (BLOCKED.has(ch)) return false;
  const t = triggerAt(x, y);
  if (t && t.type === 'npc') return false;
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
      monsterIds:[st.battle], boss:true,
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
        G.s.x = player.x; G.s.y = player.y + 1; player.y = player.y + 1;
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

function fireActionTrigger(t){
  switch(t.type){
    case 'npc': {
      const variants = NPCS[t.npc] || [{ name:'???', lines:['...'] }];
      const v = variants.find(x=>condOk(x.if)) || variants[variants.length-1];
      showDialog(v.lines.map(l=>[v.name, l]));
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
function openShop(shopId){
  const goods = SHOPS[shopId] || [];
  const opts = goods.map(id=>{
    const it = ITEMS[id];
    return {
      label:`${it.name} — ${it.price} oro`,
      keep:true,
      cb:()=>{
        if (G.s.gold >= it.price){
          G.s.gold -= it.price; addItem(id, 1); sfx('confirm');
          dlgText.textContent = `${it.name} acquistato! Oro: ${G.s.gold}`;
        } else {
          sfx('cancel');
          dlgText.textContent = 'Oro insufficiente!';
        }
      },
    };
  });
  opts.push({ label:'Chiudi', cb:()=>{ dlgBox.classList.add('hidden'); } });
  dlgName.textContent = 'Negozio';
  dlgName.style.display = 'block';
  dlgText.textContent = `Benvenuti! Oro: ${G.s.gold}`;
  dlgBox.classList.remove('hidden');
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

// ---------- mappa ----------
export function loadMap(name, x, y){
  map = MAPS[name];
  G.s.map = name;
  G.s.x = x; G.s.y = y;
  player = { x, y, dir:'down', moving:false, prog:0, fromX:x, fromY:y };
  hudLoc.textContent = map.name;
  playMusic(map.music || 'world');
  checkEnterEvents();
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
      monsterIds: ids, boss:false,
      onWin: ()=>show('world', { resume:true }),
      onFlee: ()=>show('world', { resume:true }),
    });
  }
}

// ---------- movimento ----------
const MOVE_TIME = 0.16; // secondi per casella
let lastTs = 0;

function update(dt){
  if (busy) return;
  if (player.moving){
    player.prog += dt / MOVE_TIME;
    if (player.prog >= 1){
      player.moving = false; player.prog = 0;
      stepFrame++;
      G.s.x = player.x; G.s.y = player.y;
      G.s.steps++;
      const t = triggerAt(player.x, player.y);
      if (t && ['portal','door_event','event','shop','inn','heal'].includes(t.type)){
        fireStepTrigger(t);
        return;
      }
      tryEncounter();
    }
    return;
  }
  const dir = Input.heldDir();
  if (!dir) return;
  player.dir = dir;
  const dx = dir==='left'?-1:dir==='right'?1:0;
  const dy = dir==='up'?-1:dir==='down'?1:0;
  const nx = player.x + dx, ny = player.y + dy;
  if (walkable(nx, ny)){
    player.fromX = player.x; player.fromY = player.y;
    player.x = nx; player.y = ny;
    player.moving = true; player.prog = 0;
  }
}

function onAction(){
  if (dialogQueue){ advanceDialog(); return; }
  if (busy) return;
  const dx = player.dir==='left'?-1:player.dir==='right'?1:0;
  const dy = player.dir==='up'?-1:player.dir==='down'?1:0;
  const t = triggerAt(player.x+dx, player.y+dy);
  if (t) fireActionTrigger(t);
}

// ---------- rendering ----------
function render(ts){
  const W = canvas.width, H = canvas.height;
  // posizione pixel del giocatore (interpolata)
  const ix = (player.fromX + (player.x - player.fromX) * (player.moving ? player.prog : 1)) * TILE;
  const iy = (player.fromY + (player.y - player.fromY) * (player.moving ? player.prog : 1)) * TILE;
  let camX = Math.round(ix - W/2 + TILE/2);
  let camY = Math.round(iy - H/2 + TILE/2);
  const mw = Math.max(...map.tiles.map(r=>r.length)) * TILE;
  const mh = map.tiles.length * TILE;
  // mappe più piccole della vista: centrale; altrimenti clamp ai bordi
  camX = mw <= W ? -((W - mw) >> 1) : Math.max(0, Math.min(camX, mw - W));
  camY = mh <= H ? -((H - mh) >> 1) : Math.max(0, Math.min(camY, mh - H));

  ctx.fillStyle = '#0a0c16';
  ctx.fillRect(0, 0, W, H);
  const getCh = (tx, ty)=>tileAt(tx, ty);
  const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
  const cols = Math.ceil(W/TILE), rows = Math.ceil(H/TILE);

  // passata 1: terreno (con transizioni e ombre proiettate)
  for (let ty = y0; ty <= y0 + rows; ty++){
    for (let tx = x0; tx <= x0 + cols; tx++){
      drawGround(ctx, tileAt(tx, ty), tx*TILE - camX, ty*TILE - camY, ts, tx, ty, getCh);
    }
  }

  // passata 2: oggetti alti + personaggi, ordinati per profondità (y)
  const items = [];
  for (let ty = y0; ty <= y0 + rows + 1; ty++){
    for (let tx = x0; tx <= x0 + cols; tx++){
      const ch = tileAt(tx, ty);
      if (!TALL.has(ch)) continue;
      const px = tx*TILE - camX, py = ty*TILE - camY;
      // gli oggetti calpestabili (portali, borghi) stanno dietro al giocatore
      const walkable = !BLOCKED.has(ch);
      items.push({ y: ty*TILE + (walkable ? 44 : 47), f: ()=>drawObject(ctx, ch, px, py, ts, tx, ty, getCh) });
    }
  }
  for (const t of activeTriggers()){
    const px = t.x*TILE - camX, py = t.y*TILE - camY;
    if (px < -TILE || px > W || py < -TILE*1.5 || py > H) continue;
    if (t.type === 'npc') items.push({ y: t.y*TILE + 46, f: ()=>drawActor(ctx, px, py, t.sprite || '#b08968', 'down', 0) });
    else if (t.type === 'chest') items.push({ y: t.y*TILE + 45, f: ()=>drawChest(ctx, px, py, !!G.s.chests[t.id]) });
  }
  const leader = CHARACTERS[G.s.party[0]] || CHARACTERS.ste;
  const pSX = Math.round(ix) - camX, pSY = Math.round(iy) - camY;
  items.push({ y: iy + 46.5, f: ()=>drawActor(ctx, pSX, pSY, leader, player.dir,
            player.moving ? (stepFrame + player.prog) * 0.5 : 0) });
  items.sort((a, b)=>a.y - b.y);
  for (const it of items) it.f();

  if (!map.indoor){
    // ombre delle nuvole che scorrono sul paesaggio
    const ct = ts / 1000;
    ctx.fillStyle = 'rgba(12,16,44,.10)';
    for (let i=0; i<3; i++){
      const span = mw + 700;
      const cx2 = ((ct * (9 + i*4) + i * 900) % span) - 350 - camX;
      const cy2 = ((i * 530 + ct * 3) % (mh + 300)) - 150 - camY;
      ctx.beginPath();
      ctx.ellipse(cx2, cy2, 200 + i*50, 90 + i*25, 0.3, 0, Math.PI*2);
      ctx.fill();
    }
    // particelle di luce che fluttuano
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i=0; i<12; i++){
      const px2 = ((i*173 + ts * (0.012 + (i%4)*0.004)) % (W + 60)) - 30;
      const py2 = ((i*271 - ts * (0.008 + (i%3)*0.005)) % (H + 60) + (H + 60)) % (H + 60) - 30;
      const a = 0.10 + Math.sin(ts/600 + i*1.7) * 0.08;
      if (a <= 0.02) continue;
      ctx.fillStyle = `rgba(255,240,190,${a})`;
      ctx.beginPath(); ctx.arc(px2, py2, 1.6 + (i%3)*0.7, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // luce ambientale calda attorno al giocatore
  const lg2 = ctx.createRadialGradient(pSX+TILE/2, pSY+TILE/2, 30, pSX+TILE/2, pSY+TILE/2, H*0.85);
  lg2.addColorStop(0, 'rgba(255,235,185,.12)');
  lg2.addColorStop(0.6, 'rgba(255,235,185,.04)');
  lg2.addColorStop(1, 'rgba(30,30,80,.14)');
  ctx.fillStyle = lg2;
  ctx.fillRect(0, 0, W, H);
}

function loop(ts){
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  update(dt);
  render(ts);
  raf = requestAnimationFrame(loop);
}

// ---------- registrazione schermata ----------
registerScreen('world', {
  el,
  enter(params){
    if (!params?.resume){
      map = MAPS[G.s.map];
      player = { x:G.s.x, y:G.s.y, dir:'down', moving:false, prog:0, fromX:G.s.x, fromY:G.s.y };
      hudLoc.textContent = map.name;
      playMusic(map.music || 'world');
      checkEnterEvents();
    } else {
      map = MAPS[G.s.map];
      playMusic(map.music || 'world');
    }
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
