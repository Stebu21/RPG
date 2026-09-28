// Battaglia ATB in stile Final Fantasy: scena su canvas con party e mostri
// visibili insieme, animazioni (affondo, colpo, magia, KO), comandi e Limit.

import { MONSTERS } from '../data/monsters.js';
import { QUESTS, registerKill } from '../data/quests.js';
import { ABILITIES, STATUS_NAMES, COMBOS } from '../data/abilities.js';
import { CHARACTERS } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { G, statsOf, knownAbilities, gainExp, abilityName, DUO } from '../engine/state.js';
import { BattleStage } from '../engine/battle3d.js';
import { playMusic, stopMusic, sfx } from '../engine/audio.js';
import { registerScreen, show, currentScreen } from '../engine/ui.js';

const el = document.getElementById('screen-battle');
const zone = document.getElementById('battle-zone');
const canvas = document.getElementById('battle-canvas');
let stage = null;   // palco 3D, creato alla prima battaglia
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
  B.W = W; B.H = H;
  if (!stage) stage = new BattleStage(canvas);
  stage.resize(W, H);
  stage.setup(B);
}

function animate(u, kind, target){
  if (kind === 'lunge'){ u.lungeT = 0.42; }
  else if (kind === 'dash' && target){
    // corsa verso il bersaglio in stile FF9: vai, colpisci, torna
    u.dashT = 0.72; u.dashDur = 0.72; u.dashTarget = target;
    stage?.focus(u, target, 1, 0.9);
  }
  else if (kind === 'hit'){ u.shakeT = 0.34; u.flashT = 0.26; if (stage) stage.cam.shake = Math.max(stage.cam.shake, 0.35); }
  else if (kind === 'cast'){ u.castT = 0.55; }
}

function drawScene(ts, dt){
  if (!B || !stage?.B) return;
  const t = ts / 1000;
  for (const u of [...B.enemies, ...B.allies]){
    u.lungeT = Math.max(0, u.lungeT - dt);
    u.shakeT = Math.max(0, u.shakeT - dt);
    u.flashT = Math.max(0, u.flashT - dt);
    u.castT = Math.max(0, u.castT - dt);
    u.dashT = Math.max(0, (u.dashT || 0) - dt);
    if (u.kind === 'enemy') u.deadT = u.hp <= 0 ? Math.min(1, u.deadT + dt * 1.2) : 0;
  }
  const selT = B.targetMode ? targetPool()[B.targetIdx % Math.max(1, targetPool().length)] : null;
  stage.frame(dt, t, selT);
}

// ---------- effetti speciali delle mosse ----------
const ELEM_FX = {
  fuoco:'#ff8a3c', ghiaccio:'#9fdcff', tuono:'#ffe95a', acqua:'#57b0f0',
  vento:'#a8f0c0', terra:'#d0a05a', sacro:'#fff2b0', oscurita:'#b06ae8', neutro:'#cfd8ff',
};

// gli effetti vivono nel palco 3D: qui solo lo smistamento per tipo
function spawnFx(fx){
  if (!stage || !fx.unit) return;
  if (fx.kind === 'slash') stage.slash(fx.unit, fx.color);
  else if (fx.kind === 'heal') stage.heal(fx.unit, fx.color);
}

function fxForSpell(user, target, element){
  stage?.spell(user, target, element);
  if (user.kind === 'ally') stage?.focus(user, target, 0.6, 0.8);
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
    crit = Math.random() < (move.crit || 0.06) + (user.kind === 'ally' ? user.st.crit || 0 : 0);
    dmg = (uAtk * buffMult(user,'atk') * 2.2 + (move.power||0) * 1.8) * v * em * (crit ? 1.8 : 1) - tDef * 1.4;
  } else {
    dmg = (uMag * buffMult(user,'atk') * 2.2 + (move.power||0) * 1.8) * v * em - tSpr * 1.2;
  }
  // bilanciamento a favore del party: gli eroi colpiscono più forte, i mostri meno
  dmg *= user.kind === 'ally' ? 1.45 : 0.55;
  return { dmg: Math.max(1, Math.round(dmg)), crit, em };
}

// ---------- effetti visivi ----------
function popDamage(unit, text, cls=''){
  if (cls === 'crit') stage?.hitStop(0.14);
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
  if (DUO.includes(a.id)){
    const mate = duoMate(a);
    const why = !mate ? 'compagno KO' : mate.statuses.sonno ? 'compagno addormentato' : mate.atb < ATB_MAX/2 ? 'compagno in carica' : 'Ste + Riki';
    mk('✦ Combo', ()=>showComboMenu(a), !comboReady(a), why).classList.add('combo-cmd');
  }
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

// ---------- mosse combinate del duo ----------
function duoMate(a){
  const m = B.allies.find(x=>DUO.includes(x.id) && x !== a);
  return m && m.cs.hp > 0 ? m : null;
}
// il compagno deve essere vivo, sveglio e con la barra ATB almeno a metà
function comboReady(a){
  const m = duoMate(a);
  return !!m && !m.statuses.sonno && m.atb >= ATB_MAX / 2;
}
function comboUnlocked(c){ return Math.min(G.s.chars.ste.level, G.s.chars.riki.level) >= c.lv; }
function comboAffordable(c){ return G.s.chars.ste.mp >= c.mp.ste && G.s.chars.riki.mp >= c.mp.riki; }

function showComboMenu(a){
  B.menuLevel = 'sub';
  cmdTitle.textContent = 'Ste + Riki — combo';
  cmdList.innerHTML = '';
  for (const [id, c] of Object.entries(COMBOS)){
    const b = document.createElement('button');
    b.className = 'btn';
    const open = comboUnlocked(c);
    b.innerHTML = open ? `${c.name}<small>Ste ${c.mp.ste} · Riki ${c.mp.riki} MP</small>` : `???<small>Lv.${c.lv} del duo</small>`;
    b.disabled = !open || !comboAffordable(c);
    b.title = open ? c.desc : '';
    b.onclick = ()=>chooseCombo(a, id);
    cmdList.appendChild(b);
  }
  const back = document.createElement('button');
  back.className = 'btn btn-dim btn-back-row';
  back.textContent = '◀ Indietro';
  back.onclick = ()=>showCommands(a);
  cmdList.appendChild(back);
  resetNav();
}

function chooseCombo(a, comboId){
  const c = COMBOS[comboId];
  hideCommands();
  const go = targets=>{
    const mate = duoMate(a);
    B.readyQueue.shift();
    B.readyQueue = B.readyQueue.filter(u=>u !== mate);   // anche il compagno spende il turno
    a.atb = 0; mate.atb = 0;
    B.animLock = true;
    execCombo(a, mate, c, targets, ()=>{ B.animLock = false; processQueue(); });
  };
  if (c.target === 'enemy') needTarget('enemy', t=>go([t]));
  else go(aliveEnemies());
}

function execCombo(a, mate, c, targets, done){
  const ste = a.id === 'ste' ? a : mate, riki = a.id === 'riki' ? a : mate;
  ste.cs.mp -= c.mp.ste; riki.cs.mp -= c.mp.riki;
  tickStatusesOnAct(a);
  sfx('limit'); flash('rgba(160,120,255,.45)');
  stage?.focus(ste, targets[0], 1.5, 1.6);
  log(`COMBO! Ste e Riki: ${c.name}!`);
  animate(ste, 'cast');
  for (const t of targets) fxForSpell(ste, t, c.element);
  setTimeout(()=>{
    if (targets.length === 1) animate(riki, 'dash', targets[0]); else animate(riki, 'lunge');
  }, 250);
  setTimeout(()=>{
    sfx('hit'); flash('rgba(255,255,255,.35)');
    for (const t of targets){
      if (t.hp <= 0) continue;
      let total = 0, anyCrit = false;
      for (let h=0; h<(c.hits||1); h++){
        // metà magia di Ste, metà lama di Riki: +20% per la sinergia
        const m = computeDamage(ste, t, { type:'mag',  power:c.power*0.6, element:c.element });
        const p = computeDamage(riki, t, { type:'phys', power:c.power*0.6, element:c.element, crit:c.crit });
        total += m.dmg + p.dmg; anyCrit ||= p.crit;
      }
      applyDamage(t, total);
      animate(t, 'hit');
      spawnFx({ kind:'slash', unit:t, dur:0.35, color: ELEM_FX[c.element] || '#fff' });
      popDamage(t, total, anyCrit ? 'crit' : '');
    }
    updatePartyBars();
    setTimeout(()=>checkOutcome(done), 520);
  }, 700);
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
  if (Math.random() < 0.92){
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
  if (ab.limit){ sfx('limit'); flash('rgba(255,120,160,.5)'); stage?.focus(user, targets[0], 1.4, 1.4); }
  log(abId === 'attacco' ? `${userName} attacca!` : `${userName} usa ${ab.name}!`);
  const singleFoe = targets.length === 1 && targets[0] !== user;
  if (ab.type === 'phys' || ab.type === 'steal'){
    if (singleFoe) animate(user, 'dash', targets[0]);
    else animate(user, 'lunge');
  } else {
    animate(user, 'cast');
  }
  if (ab.type === 'mag'){
    for (const t of targets) fxForSpell(user, t, ab.element);
  } else if (['heal','healall','revive','buff'].includes(ab.type)){
    for (const t of targets){
      spawnFx({ kind:'heal', unit:t, dur:0.8,
                color: ab.type === 'buff' ? '#ffd76a' : '#a0ffb8' });
    }
  }

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
        if (ab.type !== 'mag'){
          spawnFx({ kind:'slash', unit:t, dur:0.30,
                    color: ELEM_FX[ab.element] || '#fff' });
        }
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
  const singleFoe = targets.length === 1;
  if (move.type === 'phys' && singleFoe) animate(e, 'dash', targets[0]);
  else animate(e, move.type === 'phys' ? 'lunge' : 'cast');
  if (move.type === 'mag'){
    for (const t of targets) fxForSpell(e, t, move.element);
  }
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
        if (move.type === 'phys'){
          spawnFx({ kind:'slash', unit:t, dur:0.30,
                    color: ELEM_FX[move.element] || '#fff' });
        }
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
    u.atb += (4 + spd * 0.35) * (TICK_MS/100) * (u.kind==='ally' ? 1.3 : 1);
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
  B.victory = true;   // gli eroi festeggiano saltellando
  B.targetMode = null;
  stopMusic();
  sfx('victory');
  hideCommands();
  let exp = 0, gold = 0;
  for (const e of B.enemies){ exp += e.def.exp; gold += e.def.gold; }
  G.s.gold += gold;
  const lines = [`VITTORIA! ${exp} EXP, ${gold} oro.`];
  // avanzamento delle missioni secondarie di caccia
  for (const e of B.enemies){
    for (const prog of registerKill(G.s, e.id)){
      lines.push(`📜 ${prog.name}: ${prog.count}/${prog.need}`);
      if (prog.count >= prog.need) lines.push(`📜 «${prog.name}»: obiettivo raggiunto! Torna dal committente.`);
    }
  }
  for (const id of G.s.party){
    const cs = G.s.chars[id];
    if (cs.hp <= 0) continue;
    const res = gainExp(cs, exp);
    if (res.levels > 0){
      lines.push(`${CHARACTERS[id].name} sale al livello ${cs.level}! ✦ +${res.levels * 2} punti caratteristica`);
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
      area: params.area || 'varese',
      onWin: params.onWin,
      onFlee: params.onFlee,
      readyQueue: [],
      fx: [],
      victory: false,
      animLock: false,
      targetMode: null,
      targetIdx: 0,
      menuLevel: 'root',
      over: false,
      W: 800, H: 360,
    };
    // transizione a vortice in stile FF
    const swirl = document.createElement('div');
    swirl.className = 'battle-swirl';
    el.appendChild(swirl);
    setTimeout(()=>swirl.remove(), 1000);
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
