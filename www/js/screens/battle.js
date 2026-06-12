// Battaglia ATB in stile Final Fantasy: scena su canvas con party e mostri
// visibili insieme, animazioni (affondo, colpo, magia, KO), comandi e Limit.

import { MONSTERS } from '../data/monsters.js';
import { ABILITIES, STATUS_NAMES } from '../data/abilities.js';
import { CHARACTERS } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { G, statsOf, knownAbilities, gainExp, abilityName } from '../engine/state.js';
import { drawMonster, drawActor, TILE } from '../engine/sprites.js';
import { playMusic, sfx } from '../engine/audio.js';
import { registerScreen, show, currentScreen } from '../engine/ui.js';

const el = document.getElementById('screen-battle');
const zone = document.getElementById('battle-zone');
const canvas = document.getElementById('battle-canvas');
const sceneCtx = canvas.getContext('2d');
const popsEl = document.getElementById('battle-pops');
const logEl = document.getElementById('battle-log');
const cmdPanel = document.getElementById('battle-commands');
const cmdTitle = document.getElementById('cmd-title');
const cmdList = document.getElementById('cmd-list');
const partyEl = document.getElementById('battle-party');
const fxEl = document.getElementById('battle-fx');

let B = null;      // stato battaglia
let raf = 0;
let lastTs = 0;

const ATB_MAX = 100;
const TICK_MS = 60;

function rand(a, b){ return a + Math.random() * (b - a); }

// ---------- setup ----------
function makeEnemy(id, idx){
  const def = MONSTERS[id];
  return {
    kind:'enemy', idx, id,
    name: def.name, def,
    hp: def.hp, maxhp: def.hp,
    atk: def.atk, defn: def.def, mag: def.mag, spr: def.spr, spd: def.spd,
    atb: rand(0, 40), statuses:{}, buffs:{},
    pal: def.pal, moves: def.moves,
    phase2: def.phase2 || null, phased:false,
    // scena
    sprite:null, sx:0, sy:0, size:0,
    ox:0, oy:0, shakeT:0, flashT:0, castT:0, lungeT:0, lungeDir:1, deadT:0,
    dom:null,
  };
}

function makeAlly(charId){
  const cs = G.s.chars[charId];
  const st = statsOf(cs);
  return {
    kind:'ally', id: charId, cs, st,
    def: CHARACTERS[charId],
    name: CHARACTERS[charId].name,
    atb: rand(0, 50), statuses:{}, buffs:{},
    sx:0, sy:0, size:0,
    ox:0, oy:0, shakeT:0, flashT:0, castT:0, lungeT:0, lungeDir:-1, deadT:0,
    dom:null,
  };
}

function aliveEnemies(){ return B.enemies.filter(e=>e.hp > 0); }
function aliveAllies(){ return B.allies.filter(a=>a.cs.hp > 0); }

// ---------- log ----------
function log(msg){ logEl.textContent = msg; }

// ---------- scena ----------
const E_LAYOUT = {
  1: [[0.22, 0.60]],
  2: [[0.17, 0.44], [0.27, 0.74]],
  3: [[0.15, 0.36], [0.25, 0.60], [0.15, 0.82]],
  4: [[0.13, 0.36], [0.27, 0.52], [0.13, 0.68], [0.27, 0.84]],
};
const A_LAYOUT = {
  1: [[0.80, 0.62]],
  2: [[0.78, 0.46], [0.82, 0.74]],
  3: [[0.77, 0.40], [0.80, 0.62], [0.83, 0.84]],
};

function buildScene(){
  const W = zone.clientWidth || 800, H = zone.clientHeight || 360;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  sceneCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  B.W = W; B.H = H;

  const eLay = E_LAYOUT[Math.min(4, B.enemies.length)] || E_LAYOUT[4];
  B.enemies.forEach((e, i)=>{
    const [fx, fy] = e.def.boss ? [0.24, 0.72] : eLay[i % eLay.length];
    e.sx = W * fx; e.sy = H * fy;
    e.size = e.def.boss ? Math.min(H * 0.72, 280) : Math.min(H * 0.42, 170);
    refreshEnemySprite(e);
  });
  const aLay = A_LAYOUT[Math.min(3, B.allies.length)] || A_LAYOUT[3];
  B.allies.forEach((a, i)=>{
    const [fx, fy] = aLay[i % aLay.length];
    a.sx = W * fx; a.sy = H * fy;
    a.size = Math.min(H * 0.34, 120);
  });
}

function refreshEnemySprite(e){
  const cv = document.createElement('canvas');
  drawMonster(cv, { sprite: e.def.sprite, pal: e.pal }, Math.ceil(e.size / 18) + 2);
  e.sprite = cv;
}

function animate(u, kind){
  if (kind === 'lunge'){ u.lungeT = 0.42; }
  else if (kind === 'hit'){ u.shakeT = 0.34; u.flashT = 0.26; }
  else if (kind === 'cast'){ u.castT = 0.55; }
}

function drawScene(ts, dt){
  if (!B) return;
  const x = sceneCtx, W = B.W, H = B.H;
  const t = ts / 1000;

  // sfondo: cielo + colline + terreno
  x.fillStyle = (g=>{ g.addColorStop(0, B.boss ? '#2a1030' : '#1a1840'); g.addColorStop(1, B.boss ? '#451b33' : '#34306b'); return g; })(x.createLinearGradient(0, 0, 0, H*0.62));
  x.fillRect(0, 0, W, H*0.62);
  x.fillStyle = 'rgba(12,10,34,.8)';
  x.beginPath();
  x.moveTo(0, H*0.62);
  for (let i=0; i<=8; i++){
    x.lineTo(W*i/8, H*0.62 - (i%2 ? H*0.10 : H*0.04) - Math.sin(i*2.3)*H*0.02);
  }
  x.lineTo(W, H*0.62);
  x.closePath(); x.fill();
  // luna
  x.save(); x.shadowColor = '#cdd6ff'; x.shadowBlur = 18;
  x.fillStyle = '#cdd6ff';
  x.beginPath(); x.arc(W*0.62, H*0.14, H*0.05, 0, Math.PI*2); x.fill();
  x.restore();
  // terreno
  x.fillStyle = (g=>{ g.addColorStop(0, B.boss ? '#3c2330' : '#284730'); g.addColorStop(1, B.boss ? '#1f1018' : '#142718'); return g; })(x.createLinearGradient(0, H*0.62, 0, H));
  x.fillRect(0, H*0.62, W, H*0.38);
  x.fillStyle = 'rgba(255,255,255,.05)';
  x.beginPath(); x.ellipse(W*0.5, H*0.78, W*0.42, H*0.16, 0, 0, Math.PI*2); x.fill();

  // aggiorna animazioni
  for (const u of [...B.enemies, ...B.allies]){
    u.lungeT = Math.max(0, u.lungeT - dt);
    u.shakeT = Math.max(0, u.shakeT - dt);
    u.flashT = Math.max(0, u.flashT - dt);
    u.castT = Math.max(0, u.castT - dt);
    const dead = u.kind === 'enemy' ? u.hp <= 0 : u.cs.hp <= 0;
    if (u.kind === 'enemy'){
      u.deadT = dead ? Math.min(1, u.deadT + dt * 1.6) : 0;
    }
    const lp = u.lungeT > 0 ? Math.sin((1 - u.lungeT/0.42) * Math.PI) : 0;
    u.ox = u.lungeDir * lp * Math.min(60, B.W*0.07)
         + (u.shakeT > 0 ? (Math.random()*2-1) * u.shakeT * 22 : 0);
    u.oy = 0;
  }

  // selezione bersaglio attiva?
  const selT = B.targetMode ? targetPool()[B.targetIdx % Math.max(1, targetPool().length)] : null;

  // nemici (ordinati per y per una prospettiva corretta)
  const units = [...B.enemies, ...B.allies].sort((a,b)=>a.sy - b.sy);
  for (const u of units){
    if (u.kind === 'enemy') drawEnemyUnit(x, u, t, selT === u);
    else drawAllyUnit(x, u, t, selT === u);
  }

  // scintille degli incantesimi sopra a tutto
  for (const u of units){
    if (u.castT > 0) drawCast(x, u, t);
  }
}

function drawTargetRing(x, u, t){
  const w = u.kind === 'enemy' ? u.size*0.45 : u.size*0.42;
  x.save();
  x.strokeStyle = '#ffd76a';
  x.lineWidth = 3;
  x.shadowColor = '#ffd76a'; x.shadowBlur = 10;
  x.globalAlpha = 0.7 + Math.sin(t*7)*0.3;
  x.beginPath(); x.ellipse(u.sx + u.ox, u.sy + 4, w, w*0.3, 0, 0, Math.PI*2); x.stroke();
  // freccia
  const ay = u.sy - u.size - 14 + Math.sin(t*6)*4;
  x.fillStyle = '#ffd76a';
  x.beginPath(); x.moveTo(u.sx-8, ay); x.lineTo(u.sx+8, ay); x.lineTo(u.sx, ay+10); x.closePath(); x.fill();
  x.restore();
}

function drawEnemyUnit(x, e, t, selected){
  if (e.deadT >= 1) return;
  const bob = e.hp > 0 ? Math.sin(t*1.8 + e.idx*1.4) * 3 : 0;
  if (selected) drawTargetRing(x, e, t);
  x.save();
  x.globalAlpha = 1 - e.deadT;
  const dy = e.deadT * 24;
  x.drawImage(e.sprite, e.sx + e.ox - e.size/2, e.sy + bob + dy - e.size*0.92, e.size, e.size);
  if (e.flashT > 0){
    x.globalCompositeOperation = 'lighter';
    x.globalAlpha = e.flashT * 2.4;
    x.fillStyle = '#fff';
    x.beginPath(); x.ellipse(e.sx + e.ox, e.sy + bob - e.size*0.45, e.size*0.4, e.size*0.42, 0, 0, Math.PI*2); x.fill();
  }
  x.restore();
  if (e.hp > 0){
    // nome + barra HP
    const bw = Math.max(64, e.size*0.6);
    const bx = e.sx - bw/2, by = e.sy + 12;
    x.fillStyle = 'rgba(8,8,24,.65)';
    x.beginPath(); x.roundRect(bx-6, by-15, bw+12, 26, 8); x.fill();
    x.fillStyle = '#dfe3f5';
    x.font = '11px system-ui, sans-serif';
    x.textAlign = 'center';
    x.fillText(e.name, e.sx, by-4);
    x.fillStyle = 'rgba(255,255,255,.16)';
    x.beginPath(); x.roundRect(bx, by, bw, 5, 3); x.fill();
    const pct = Math.max(0, e.hp/e.maxhp);
    x.fillStyle = pct < 0.25 ? '#e74c3c' : pct < 0.5 ? '#f1b13c' : '#46c46e';
    x.beginPath(); x.roundRect(bx, by, bw*pct, 5, 3); x.fill();
  }
}

function drawAllyUnit(x, a, t, selected){
  const ko = a.cs.hp <= 0;
  const limitOk = !ko && a.cs.hp / a.st.hp < 0.3;
  const active = B.readyQueue[0] === a;
  if (selected) drawTargetRing(x, a, t);
  // aura Limit
  if (limitOk){
    x.save();
    x.globalAlpha = 0.35 + Math.sin(t*6)*0.15;
    x.fillStyle = '#ff6b81';
    x.beginPath(); x.ellipse(a.sx + a.ox, a.sy + 3, a.size*0.34, a.size*0.12, 0, 0, Math.PI*2); x.fill();
    x.restore();
  }
  const breathe = ko ? 0 : Math.sin(t*2.2 + a.sy) * 1.6;
  const s = a.size / 64; // drawActor è alto ~64px in scala TILE
  x.save();
  x.translate(a.sx + a.ox, a.sy + breathe);
  if (a.flashT > 0) x.globalAlpha = 0.5 + Math.sin(t*60)*0.5;
  if (ko){
    x.globalAlpha = 0.45;
    x.rotate(-Math.PI/2);
    x.translate(0, 6);
  }
  x.scale(s, s);
  drawActor(x, -TILE/2, -46, a.def, 'left', ko ? 0 : (a.lungeT > 0 ? (t*3)%1 : 0));
  x.restore();
  // indicatore del turno attivo
  if (active && !ko){
    const ay = a.sy - a.size - 10 + Math.sin(t*5)*3;
    x.fillStyle = '#7ec8ff';
    x.beginPath(); x.moveTo(a.sx-7, ay); x.lineTo(a.sx+7, ay); x.lineTo(a.sx, ay+9); x.closePath(); x.fill();
  }
}

function drawCast(x, u, t){
  const n = 7;
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i=0; i<n; i++){
    const a = t*5 + i * (Math.PI*2/n);
    const r = u.size*0.4 * (1 - u.castT/0.55) + 8;
    const px = u.sx + Math.cos(a) * r;
    const py = u.sy - u.size*0.5 + Math.sin(a) * r * 0.5 - (1 - u.castT/0.55) * 22;
    x.fillStyle = `rgba(160,200,255,${u.castT})`;
    x.shadowColor = '#9ec8ff'; x.shadowBlur = 8;
    x.beginPath(); x.arc(px, py, 3, 0, Math.PI*2); x.fill();
  }
  x.restore();
}

function sceneLoop(ts){
  const dt = Math.min(0.05, (ts - lastTs)/1000 || 0.016);
  lastTs = ts;
  drawScene(ts, dt);
  raf = requestAnimationFrame(sceneLoop);
}

// ---------- danno ----------
function elemMult(def, element){
  if (!element || element === 'neutro') return 1;
  if (def.weak?.includes(element)) return 1.6;
  if (def.resist?.includes(element)) return 0.5;
  return 1;
}

function buffMult(unit, stat){
  const b = unit.buffs[stat];
  return b ? b.mult : 1;
}

function computeDamage(user, target, move){
  const vary = move.vary || 1;
  const v = rand(1 - 0.1*vary, 1 + 0.1*vary);
  const uAtk = user.kind==='ally' ? user.st.atk : user.atk;
  const uMag = user.kind==='ally' ? user.st.mag : user.mag;
  const tDef = (target.kind==='ally' ? target.st.def : target.defn) * buffMult(target,'def');
  const tSpr = target.kind==='ally' ? target.st.spr : target.spr;
  const em = target.kind==='enemy' ? elemMult(target.def, move.element) : 1;
  let dmg, crit = false;
  if (move.type === 'phys'){
    crit = Math.random() < (move.crit || 0.06);
    dmg = (uAtk * buffMult(user,'atk') * 2.2 + (move.power||0) * 1.8) * v * em * (crit ? 1.8 : 1) - tDef * 1.4;
  } else {
    dmg = (uMag * buffMult(user,'atk') * 2.2 + (move.power||0) * 1.8) * v * em - tSpr * 1.2;
  }
  // bilanciamento a favore del party: gli eroi colpiscono più forte, i mostri meno
  dmg *= user.kind === 'ally' ? 1.25 : 0.7;
  return { dmg: Math.max(1, Math.round(dmg)), crit, em };
}

// ---------- effetti visivi ----------
function popDamage(unit, text, cls=''){
  if (!unit || unit.sx === undefined) return;
  const d = document.createElement('div');
  d.className = 'dmg-pop ' + cls;
  d.textContent = text;
  d.style.left = (unit.sx + rand(-12, 12)) + 'px';
  d.style.top = (unit.sy - unit.size*0.8) + 'px';
  popsEl.appendChild(d);
  setTimeout(()=>d.remove(), 950);
}

function flash(color){
  const f = document.createElement('div');
  f.className = 'flash';
  f.style.background = color;
  fxEl.appendChild(f);
  setTimeout(()=>f.remove(), 360);
}

// ---------- pannello del party (in basso, stile FF) ----------
function renderParty(){
  partyEl.innerHTML = '';
  for (const a of B.allies){
    const cs = a.cs, st = a.st;
    const row = document.createElement('div');
    row.className = 'pmember' + (cs.hp<=0 ? ' ko' : '') + (B.readyQueue[0]===a ? ' active' : '');
    const hpPct = Math.max(0, cs.hp/st.hp*100);
    const hpCls = hpPct < 15 ? 'crit' : hpPct < 35 ? 'low' : '';
    const limitOk = cs.hp > 0 && cs.hp/st.hp < 0.3;
    const stTxt = Object.keys(a.statuses).map(s=>STATUS_NAMES[s]).join(' ');
    row.innerHTML = `
      <div class="pm-name">${a.name}${limitOk ? ' <span class="limit-ready">!</span>' : ''}</div>
      <div class="pm-bars">
        <div class="bar hp ${hpCls}"><div style="width:${hpPct}%"></div></div>
        <div class="bar mp"><div style="width:${Math.max(0, cs.mp/st.mp*100)}%"></div></div>
        <div class="bar atb ${a.atb>=ATB_MAX?'full':''}"><div style="width:${Math.min(100, a.atb)}%"></div></div>
      </div>
      <div class="pm-nums">HP ${cs.hp}/${st.hp}<br>MP ${cs.mp}/${st.mp}${stTxt ? '<br>'+stTxt : ''}</div>`;
    row.onclick = ()=>{ if (B.targetMode?.type === 'ally') pickTarget(a); };
    a.dom = row;
    partyEl.appendChild(row);
  }
}

// Aggiorna solo barre e numeri senza ricostruire il DOM (i tap restano stabili)
function updatePartyBars(){
  for (const a of B.allies){
    const row = a.dom;
    if (!row) continue;
    const cs = a.cs, st = a.st;
    row.classList.toggle('ko', cs.hp <= 0);
    row.classList.toggle('active', B.readyQueue[0] === a);
    const hpPct = Math.max(0, cs.hp/st.hp*100);
    const hpBar = row.querySelector('.bar.hp');
    hpBar.classList.toggle('crit', hpPct < 15);
    hpBar.classList.toggle('low', hpPct >= 15 && hpPct < 35);
    hpBar.firstElementChild.style.width = hpPct + '%';
    row.querySelector('.bar.mp').firstElementChild.style.width = Math.max(0, cs.mp/st.mp*100) + '%';
    const atbBar = row.querySelector('.bar.atb');
    atbBar.classList.toggle('full', a.atb >= ATB_MAX);
    atbBar.firstElementChild.style.width = Math.min(100, a.atb) + '%';
    const stTxt = Object.keys(a.statuses).map(s=>STATUS_NAMES[s]).join(' ');
    row.querySelector('.pm-nums').innerHTML = `HP ${cs.hp}/${st.hp}<br>MP ${cs.mp}/${st.mp}${stTxt ? '<br>'+stTxt : ''}`;
    const limitOk = cs.hp > 0 && cs.hp/st.hp < 0.3;
    row.querySelector('.pm-name').innerHTML = `${a.name}${limitOk ? ' <span class="limit-ready">!</span>' : ''}`;
  }
}

// ---------- comandi ----------
let navIdx = 0;
function navButtons(){ return [...cmdList.querySelectorAll('button:not(:disabled)')]; }
function highlightNav(){
  navButtons().forEach((b, i)=>b.classList.toggle('key-sel', i === navIdx));
}
function resetNav(){ navIdx = 0; highlightNav(); }

function showCommands(a){
  B.menuLevel = 'root';
  cmdPanel.classList.remove('hidden');
  cmdTitle.textContent = a.name;
  cmdList.innerHTML = '';
  const mk = (label, cb, dis=false, sub='')=>{
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = label + (sub ? `<small>${sub}</small>` : '');
    b.disabled = dis;
    b.onclick = cb;
    cmdList.appendChild(b);
    return b;
  };
  const limitOk = a.cs.hp / a.st.hp < 0.3;
  if (limitOk){
    const lim = ABILITIES[CHARACTERS[a.id].limit];
    mk(`⚡ ${lim.name}`, ()=>chooseAbility(a, CHARACTERS[a.id].limit)).classList.add('limit-ready');
  }
  mk('Attacca', ()=>chooseAbility(a, 'attacco'));
  mk('Abilità', ()=>showAbilityMenu(a));
  mk('Oggetti', ()=>showItemMenu(a));
  mk('Fuggi', ()=>tryFlee(a), B.boss);
  resetNav();
}

function showAbilityMenu(a){
  B.menuLevel = 'sub';
  cmdTitle.textContent = `${a.name} — abilità`;
  cmdList.innerHTML = '';
  const abs = knownAbilities(a.cs);
  for (const id of abs){
    const ab = ABILITIES[id];
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = `${ab.name}<small>${ab.mp} MP</small>`;
    b.disabled = a.cs.mp < ab.mp;
    b.title = ab.desc || '';
    b.onclick = ()=>chooseAbility(a, id);
    cmdList.appendChild(b);
  }
  const back = document.createElement('button');
  back.className = 'btn btn-dim btn-back-row';
  back.textContent = '◀ Indietro';
  back.onclick = ()=>showCommands(a);
  cmdList.appendChild(back);
  resetNav();
}

function showItemMenu(a){
  B.menuLevel = 'sub';
  cmdTitle.textContent = `${a.name} — oggetti`;
  cmdList.innerHTML = '';
  const usable = Object.keys(G.s.items).filter(id=>G.s.items[id] > 0);
  if (!usable.length){
    const p = document.createElement('div');
    p.style.cssText = 'font-size:12px;color:#9ab;padding:4px';
    p.textContent = 'Nessun oggetto.';
    cmdList.appendChild(p);
  }
  for (const id of usable){
    const it = ITEMS[id];
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = `${it.name}<small>x${G.s.items[id]}</small>`;
    b.onclick = ()=>chooseItem(a, id);
    cmdList.appendChild(b);
  }
  const back = document.createElement('button');
  back.className = 'btn btn-dim btn-back-row';
  back.textContent = '◀ Indietro';
  back.onclick = ()=>showCommands(a);
  cmdList.appendChild(back);
  resetNav();
}

function hideCommands(){ cmdPanel.classList.add('hidden'); }

// ---------- selezione bersaglio ----------
function targetPool(){
  if (!B?.targetMode) return [];
  return B.targetMode.type === 'enemy' ? aliveEnemies() : B.allies;
}

function needTarget(type, cb){
  B.targetMode = { type, cb };
  B.targetIdx = 0;
  log(type === 'enemy' ? 'Scegli un nemico (frecce + Ctrl, o tocca)' : 'Scegli un alleato');
  if (type === 'enemy'){
    const en = aliveEnemies();
    if (en.length === 1){ pickTarget(en[0]); }
  }
}

function pickTarget(t){
  const cb = B.targetMode.cb;
  B.targetMode = null;
  cb(t);
}

function chooseAbility(a, abId){
  const ab = ABILITIES[abId];
  hideCommands();
  const exec = (targets)=>queuePlayerAction(a, abId, targets);
  if (ab.target === 'enemy') needTarget('enemy', t=>exec([t]));
  else if (ab.target === 'enemies') exec(aliveEnemies());
  else if (ab.target === 'ally'){
    if (ab.type === 'revive') {
      const ko = B.allies.filter(x=>x.cs.hp<=0);
      if (!ko.length){ log('Nessun alleato KO!'); showCommands(a); cmdPanel.classList.remove('hidden'); return; }
      needTarget('ally', t=>exec([t]));
    } else needTarget('ally', t=>exec([t]));
  }
  else if (ab.target === 'allies') exec(B.allies);
  else exec([a]); // self
}

function chooseItem(a, itemId){
  hideCommands();
  const it = ITEMS[itemId];
  if (it.type === 'revive'){
    const ko = B.allies.filter(x=>x.cs.hp<=0);
    if (!ko.length){ log('Nessun alleato KO!'); showCommands(a); return; }
  }
  needTarget('ally', t=>queuePlayerAction(a, null, [t], itemId));
}

function tryFlee(a){
  hideCommands();
  a.atb = 0;
  B.readyQueue.shift();
  if (Math.random() < 0.85){
    log('Siete fuggiti!');
    endBattle('flee');
  } else {
    log('Fuga fallita!');
    processQueue();
  }
}

// click/tap sulla scena per scegliere il bersaglio
canvas.addEventListener('pointerdown', e=>{
  if (!B?.targetMode) return;
  const r = canvas.getBoundingClientRect();
  const px = e.clientX - r.left, py = e.clientY - r.top;
  let best = null, bd = 1e9;
  for (const u of targetPool()){
    const d = Math.hypot(px - u.sx, py - (u.sy - u.size*0.45));
    if (d < bd && d < u.size){ bd = d; best = u; }
  }
  if (best) pickTarget(best);
});

// ---------- navigazione tastiera/pad ----------
window.addEventListener('pad-dir', e=>{
  if (currentScreen() !== 'battle' || !B || B.over) return;
  const d = e.detail;
  if (B.targetMode){
    const pool = targetPool();
    if (!pool.length) return;
    if (d === 'up' || d === 'left') B.targetIdx = (B.targetIdx - 1 + pool.length) % pool.length;
    else B.targetIdx = (B.targetIdx + 1) % pool.length;
    sfx('select');
    return;
  }
  if (!cmdPanel.classList.contains('hidden')){
    const btns = navButtons();
    if (!btns.length) return;
    if (d === 'up') navIdx = (navIdx - 1 + btns.length) % btns.length;
    else if (d === 'down') navIdx = (navIdx + 1) % btns.length;
    else return;
    sfx('select');
    highlightNav();
    btns[navIdx].scrollIntoView({ block:'nearest' });
  }
});

window.addEventListener('pad-confirm', ()=>{
  if (currentScreen() !== 'battle' || !B) return;
  if (B.targetMode){
    const pool = targetPool();
    if (pool.length) pickTarget(pool[B.targetIdx % pool.length]);
    return;
  }
  if (!cmdPanel.classList.contains('hidden')){
    navButtons()[navIdx]?.click();
  }
});

window.addEventListener('pad-back', ()=>{
  if (currentScreen() !== 'battle' || !B) return;
  if (B.targetMode){
    // B annulla la mira e torna ai comandi
    const a = B.readyQueue[0];
    B.targetMode = null;
    sfx('cancel');
    if (a?.kind === 'ally') showCommands(a);
    return;
  }
  if (!cmdPanel.classList.contains('hidden') && B.menuLevel === 'sub'){
    sfx('cancel');
    cmdList.querySelector('.btn-back-row')?.click();
  }
});

// ---------- esecuzione azioni ----------
function queuePlayerAction(a, abId, targets, itemId=null){
  B.readyQueue.shift();
  a.atb = 0;
  B.animLock = true;
  if (itemId) execItem(a, itemId, targets[0], ()=>{ B.animLock = false; processQueue(); });
  else execAbility(a, abId, targets, ()=>{ B.animLock = false; processQueue(); });
}

function tickStatusesOnAct(unit){
  // veleno: danno al proprio turno; buff: scala la durata
  if (unit.statuses.veleno){
    const max = unit.kind==='ally' ? unit.st.hp : unit.maxhp;
    const d = Math.max(1, Math.floor(max/16));
    applyDamage(unit, d, false);
    popDamage(unit, d, '');
    log(`${unit.name} soffre per il veleno!`);
  }
  for (const k of Object.keys(unit.buffs)){
    unit.buffs[k].turns--;
    if (unit.buffs[k].turns <= 0) delete unit.buffs[k];
  }
}

function applyDamage(unit, dmg, wake=true){
  if (unit.kind === 'ally'){ unit.cs.hp = Math.max(0, unit.cs.hp - dmg); }
  else { unit.hp = Math.max(0, unit.hp - dmg); }
  if (wake && unit.statuses.sonno){ delete unit.statuses.sonno; }
}

function applyHeal(unit, amount){
  if (unit.kind === 'ally'){ unit.cs.hp = Math.min(unit.st.hp, unit.cs.hp + amount); }
  else { unit.hp = Math.min(unit.maxhp, unit.hp + amount); }
}

function execAbility(user, abId, targets, done){
  const ab = ABILITIES[abId];
  if (user.kind === 'ally' && ab.mp){ user.cs.mp = Math.max(0, user.cs.mp - ab.mp); }
  tickStatusesOnAct(user);
  if (user.kind === 'ally' && user.cs.hp <= 0){ done(); return; } // morto di veleno
  const userName = user.name;
  if (ab.limit){ sfx('limit'); flash('rgba(255,120,160,.5)'); }
  log(abId === 'attacco' ? `${userName} attacca!` : `${userName} usa ${ab.name}!`);
  animate(user, (ab.type === 'phys' || ab.type === 'steal') ? 'lunge' : 'cast');

  setTimeout(()=>{
    const hits = ab.hits || 1;
    if (ab.type === 'phys' || ab.type === 'mag' || ab.type === 'steal'){
      sfx(ab.type === 'mag' ? 'magic' : 'hit');
      if (ab.type === 'mag') flash('rgba(120,140,255,.30)');
      for (const t of targets){
        if ((t.kind==='enemy' && t.hp<=0) || (t.kind==='ally' && t.cs.hp<=0)) continue;
        let total = 0, anyCrit = false;
        for (let h=0; h<hits; h++){
          const { dmg, crit } = computeDamage(user, t, ab);
          total += dmg; anyCrit = anyCrit || crit;
        }
        applyDamage(t, total);
        animate(t, 'hit');
        popDamage(t, total, anyCrit ? 'crit' : '');
        if (ab.status && Math.random() < ab.status.chance){
          t.statuses[ab.status.id] = true;
        }
        if (ab.type === 'steal' && t.kind === 'enemy'){
          const loot = Math.floor(t.def.gold * rand(0.3, 0.7));
          G.s.gold += loot;
          log(`${userName} ruba ${loot} oro!`);
        }
      }
    } else if (ab.type === 'heal' || ab.type === 'healall'){
      sfx('heal'); flash('rgba(120,255,160,.25)');
      const userMag = user.kind==='ally' ? user.st.mag : user.mag;
      for (const t of targets){
        if (t.kind==='ally' && t.cs.hp<=0){
          if (ab.revive){ t.cs.hp = Math.floor(t.st.hp * 0.5); popDamage(t, 'Rinato!', 'heal'); }
          continue;
        }
        const amount = Math.round((ab.power||0) + userMag * 1.5);
        applyHeal(t, amount);
        animate(t, 'cast');
        popDamage(t, amount, 'heal');
      }
    } else if (ab.type === 'revive'){
      sfx('heal'); flash('rgba(255,240,160,.35)');
      const t = targets[0];
      if (t.kind==='ally' && t.cs.hp<=0){
        t.cs.hp = Math.floor(t.st.hp * (ab.power || 0.5));
        popDamage(t, 'Rinato!', 'heal');
      } else { log('Non ha effetto...'); }
    } else if (ab.type === 'buff'){
      sfx('magic'); flash('rgba(255,220,120,.25)');
      for (const t of targets){
        if (t.kind==='ally' && t.cs.hp<=0) continue;
        t.buffs[ab.buff.stat] = { mult: ab.buff.mult, turns: ab.buff.turns };
        animate(t, 'cast');
        popDamage(t, (ab.buff.stat==='atk'?'ATK':'DEF')+' ↑', 'heal');
      }
    } else if (ab.type === 'status'){
      sfx('magic');
      for (const t of targets){
        if (ab.status && Math.random() < ab.status.chance){
          t.statuses[ab.status.id] = true;
          popDamage(t, STATUS_NAMES[ab.status.id]+'!', '');
        } else popDamage(t, 'Mancato', '');
      }
    }
    updatePartyBars();
    setTimeout(()=>checkOutcome(done), 480);
  }, 380);
}

function execItem(user, itemId, target, done){
  const it = ITEMS[itemId];
  G.s.items[itemId]--;
  if (G.s.items[itemId] <= 0) delete G.s.items[itemId];
  tickStatusesOnAct(user);
  log(`${user.name} usa ${it.name}!`);
  animate(user, 'cast');
  setTimeout(()=>{
    const cs = target.cs;
    if (it.type === 'heal' && cs.hp > 0){ applyHeal(target, it.power); popDamage(target, it.power, 'heal'); sfx('heal'); }
    else if (it.type === 'mp' && cs.hp > 0){ cs.mp = Math.min(target.st.mp, cs.mp + it.power); popDamage(target, '+'+it.power+' MP', 'heal'); sfx('heal'); }
    else if (it.type === 'full' && cs.hp > 0){ cs.hp = target.st.hp; cs.mp = target.st.mp; popDamage(target, 'MAX!', 'heal'); sfx('heal'); }
    else if (it.type === 'revive' && cs.hp <= 0){ cs.hp = Math.floor(target.st.hp * it.power); popDamage(target, 'Rinato!', 'heal'); sfx('heal'); }
    else if (it.type === 'cure'){ delete target.statuses[it.status]; popDamage(target, 'Curato', 'heal'); sfx('heal'); }
    else { log('Non ha effetto...'); }
    updatePartyBars();
    setTimeout(()=>checkOutcome(done), 380);
  }, 320);
}

// ---------- IA nemica ----------
function enemyAct(e, done){
  tickStatusesOnAct(e);
  if (e.hp <= 0){ done(); return; }
  if (e.statuses.sonno){
    if (Math.random() < 0.4) delete e.statuses.sonno;
    log(`${e.name} dorme...`);
    setTimeout(()=>checkOutcome(done), 500);
    return;
  }
  // fase 2 dei boss finali
  if (e.phase2 && !e.phased && e.hp < e.maxhp * 0.5){
    e.phased = true;
    e.name = e.phase2.name;
    e.pal = e.phase2.pal;
    e.moves = e.phase2.moves;
    refreshEnemySprite(e);
    flash('rgba(200,60,80,.6)'); sfx('limit');
    animate(e, 'cast');
    log(`${e.name} libera il suo vero potere!`);
    setTimeout(done, 900);
    return;
  }
  const pool = [];
  for (const m of e.moves) for (let i=0; i<(m.w||1); i++) pool.push(m);
  const move = pool[Math.floor(Math.random()*pool.length)];
  const targets = move.target === 'enemies' ? aliveAllies()
    : [aliveAllies()[Math.floor(Math.random()*aliveAllies().length)]];
  log(`${e.name}: ${move.name}!`);
  animate(e, move.type === 'phys' ? 'lunge' : 'cast');
  setTimeout(()=>{
    if (move.type === 'status'){
      for (const t of targets){
        if (move.status && Math.random() < move.status.chance){
          t.statuses[move.status.id] = true;
          popDamage(t, STATUS_NAMES[move.status.id]+'!', '');
        } else popDamage(t, 'Mancato', '');
      }
    } else {
      sfx(move.type === 'mag' ? 'magic' : 'hit');
      for (const t of targets){
        if (t.cs.hp <= 0) continue;
        const { dmg, crit } = computeDamage(e, t, move);
        applyDamage(t, dmg);
        animate(t, 'hit');
        if (move.status && Math.random() < move.status.chance) t.statuses[move.status.id] = true;
        popDamage(t, dmg, crit ? 'crit' : '');
      }
    }
    updatePartyBars();
    setTimeout(()=>checkOutcome(done), 480);
  }, 420);
}

// ---------- flusso ----------
function checkOutcome(elseCb){
  if (!aliveEnemies().length){ victory(); return; }
  if (!aliveAllies().length){ defeat(); return; }
  elseCb?.();
}

function processQueue(){
  if (!B || B.over) return;
  updatePartyBars();
  if (B.animLock) return;
  const next = B.readyQueue[0];
  if (!next) return;
  if (next.kind === 'ally'){
    if (next.cs.hp <= 0){ B.readyQueue.shift(); next.atb = 0; processQueue(); return; }
    if (next.statuses.sonno){
      B.readyQueue.shift(); next.atb = 0;
      if (Math.random() < 0.4) delete next.statuses.sonno;
      log(`${next.name} dorme...`);
      return;
    }
    showCommands(next);
  } else {
    B.readyQueue.shift();
    next.atb = 0;
    B.animLock = true;
    enemyAct(next, ()=>{ B.animLock = false; processQueue(); });
  }
}

function tick(){
  if (!B || B.over) return;
  const choosing = B.readyQueue[0]?.kind === 'ally' && !B.animLock;
  for (const u of [...B.allies, ...B.enemies]){
    const dead = u.kind==='ally' ? u.cs.hp<=0 : u.hp<=0;
    if (dead || u.atb >= ATB_MAX) continue;
    if (B.animLock) continue;
    if (choosing && u.kind === 'enemy') { /* i nemici caricano comunque */ }
    const spd = u.kind==='ally' ? u.st.spd : u.spd;
    u.atb += (4 + spd * 0.35) * (TICK_MS/100) * (u.kind==='ally' ? 1.15 : 1);
    if (u.atb >= ATB_MAX){
      u.atb = ATB_MAX;
      if (!B.readyQueue.includes(u)) B.readyQueue.push(u);
    }
  }
  if (!B.animLock && B.readyQueue.length && cmdPanel.classList.contains('hidden') && !B.targetMode){
    processQueue();
  } else {
    updatePartyBars();
  }
}

// ---------- esiti ----------
function victory(){
  if (B.over) return;
  B.over = true;
  B.targetMode = null;
  hideCommands();
  let exp = 0, gold = 0;
  for (const e of B.enemies){ exp += e.def.exp; gold += e.def.gold; }
  G.s.gold += gold;
  const lines = [`VITTORIA! ${exp} EXP, ${gold} oro.`];
  for (const id of G.s.party){
    const cs = G.s.chars[id];
    if (cs.hp <= 0) continue;
    const res = gainExp(cs, exp);
    if (res.levels > 0){
      lines.push(`${CHARACTERS[id].name} sale al livello ${cs.level}!`);
      for (const ab of res.learned) lines.push(`✨ ${CHARACTERS[id].name} impara ${abilityName(ab)}!`);
      sfx('levelup');
    }
  }
  for (const id of G.s.reserve){
    const res = gainExp(G.s.chars[id], Math.floor(exp/2));
    if (res.levels > 0) lines.push(`${CHARACTERS[id].name} (riserva) sale al livello ${G.s.chars[id].level}!`);
  }
  // pulizia status di fine battaglia
  for (const id of Object.keys(G.s.chars)){
    const cs = G.s.chars[id];
    if (cs.hp <= 0) cs.hp = 1; // i KO si rialzano con 1 HP a fine scontro
  }
  showResults(lines, ()=>{ B.onWin?.(); });
}

function defeat(){
  if (B.over) return;
  B.over = true;
  hideCommands();
  sfx('die');
  setTimeout(()=>show('gameover'), 900);
}

function endBattle(kind){
  B.over = true;
  hideCommands();
  setTimeout(()=>{ kind==='flee' ? (B.onFlee?.() ?? B.onWin?.()) : B.onWin?.(); }, 500);
}

function showResults(lines, done){
  B.menuLevel = 'root';
  cmdPanel.classList.remove('hidden');
  cmdTitle.textContent = 'Risultato';
  cmdList.innerHTML = '';
  const p = document.createElement('div');
  p.style.cssText = 'font-size:12px;line-height:1.6;padding:2px';
  p.innerHTML = lines.join('<br>');
  cmdList.appendChild(p);
  const b = document.createElement('button');
  b.className = 'btn';
  b.textContent = 'Continua ▶';
  b.onclick = done;
  cmdList.appendChild(b);
  resetNav();
}

// ---------- schermata ----------
registerScreen('battle', {
  el,
  enter(params){
    B = {
      enemies: params.monsterIds.map((id,i)=>makeEnemy(id,i)),
      allies: G.s.party.map(makeAlly),
      boss: !!params.boss,
      onWin: params.onWin,
      onFlee: params.onFlee,
      readyQueue: [],
      animLock: false,
      targetMode: null,
      targetIdx: 0,
      menuLevel: 'root',
      over: false,
      W: 800, H: 360,
    };
    hideCommands();
    popsEl.innerHTML = '';
    logEl.textContent = B.boss ? '⚠ Nemico potente!' : 'Nemici in arrivo!';
    renderParty();
    // la scena va costruita quando la schermata è visibile (per le dimensioni)
    requestAnimationFrame(()=>{ buildScene(); });
    playMusic(B.boss ? 'boss' : 'battle');
    clearInterval(B.timer);
    B.timer = setInterval(tick, TICK_MS);
    lastTs = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(sceneLoop);
  },
  exit(){
    if (B?.timer) clearInterval(B.timer);
    cancelAnimationFrame(raf);
  },
});
