// Battaglia a turni con barra ATB (omaggio a FF8): comandi, abilità, Limite, oggetti.

import { MONSTERS } from '../data/monsters.js';
import { ABILITIES, STATUS_NAMES } from '../data/abilities.js';
import { CHARACTERS } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { G, statsOf, knownAbilities, gainExp, abilityName } from '../engine/state.js';
import { drawMonster } from '../engine/sprites.js';
import { playMusic, sfx } from '../engine/audio.js';
import { registerScreen, show } from '../engine/ui.js';

const el = document.getElementById('screen-battle');
const enemiesEl = document.getElementById('battle-enemies');
const logEl = document.getElementById('battle-log');
const cmdPanel = document.getElementById('battle-commands');
const cmdTitle = document.getElementById('cmd-title');
const cmdList = document.getElementById('cmd-list');
const partyEl = document.getElementById('battle-party');
const fxEl = document.getElementById('battle-fx');

let B = null; // stato battaglia

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
    dom: null,
  };
}

function makeAlly(charId){
  const cs = G.s.chars[charId];
  const st = statsOf(cs);
  return {
    kind:'ally', id: charId, cs, st,
    name: CHARACTERS[charId].name,
    atb: rand(0, 50), statuses:{}, buffs:{},
    dom: null,
  };
}

function aliveEnemies(){ return B.enemies.filter(e=>e.hp > 0); }
function aliveAllies(){ return B.allies.filter(a=>a.cs.hp > 0); }

// ---------- log ----------
function log(msg){ logEl.textContent = msg; }

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
  return { dmg: Math.max(1, Math.round(dmg)), crit, em };
}

// ---------- effetti visivi ----------
function popDamage(targetEl, text, cls=''){
  if (!targetEl) return;
  const d = document.createElement('div');
  d.className = 'dmg-pop ' + cls;
  d.textContent = text;
  targetEl.appendChild(d);
  setTimeout(()=>d.remove(), 900);
}

function flash(color){
  const f = document.createElement('div');
  f.className = 'flash';
  f.style.background = color;
  fxEl.appendChild(f);
  setTimeout(()=>f.remove(), 360);
}

// ---------- rendering ----------
function renderEnemies(){
  enemiesEl.innerHTML = '';
  for (const e of B.enemies){
    const d = document.createElement('div');
    d.className = 'enemy' + (e.hp<=0 ? ' dead' : '');
    const cv = document.createElement('canvas');
    drawMonster(cv, { sprite:e.def.sprite, pal:e.pal }, e.def.boss ? 9 : 6);
    d.appendChild(cv);
    const nm = document.createElement('div');
    nm.className = 'e-name'; nm.textContent = e.name;
    d.appendChild(nm);
    const hb = document.createElement('div');
    hb.className = 'e-hpbar';
    hb.innerHTML = `<div class="e-hpfill" style="width:${Math.max(0, e.hp/e.maxhp*100)}%"></div>`;
    d.appendChild(hb);
    d.onclick = ()=>{ if (B.targetMode?.type === 'enemy' && e.hp > 0) pickTarget(e); };
    e.dom = d;
    enemiesEl.appendChild(d);
  }
}

function updateEnemyBars(){
  for (const e of B.enemies){
    if (!e.dom) continue;
    e.dom.classList.toggle('dead', e.hp <= 0);
    const f = e.dom.querySelector('.e-hpfill');
    if (f) f.style.width = Math.max(0, e.hp/e.maxhp*100) + '%';
  }
}

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
function showCommands(a){
  cmdPanel.classList.remove('hidden');
  cmdTitle.textContent = `${a.name} — scegli`;
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
}

function showAbilityMenu(a){
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
  back.className = 'btn btn-dim';
  back.textContent = '◀ Indietro';
  back.onclick = ()=>showCommands(a);
  cmdList.appendChild(back);
}

function showItemMenu(a){
  cmdTitle.textContent = `${a.name} — oggetti`;
  cmdList.innerHTML = '';
  const usable = Object.keys(G.s.items).filter(id=>G.s.items[id] > 0);
  if (!usable.length){
    const p = document.createElement('div');
    p.style.cssText = 'font-size:11px;color:#9ab;padding:4px';
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
  back.className = 'btn btn-dim';
  back.textContent = '◀ Indietro';
  back.onclick = ()=>showCommands(a);
  cmdList.appendChild(back);
}

function hideCommands(){ cmdPanel.classList.add('hidden'); }

// ---------- selezione bersaglio ----------
function needTarget(type, cb){
  B.targetMode = { type, cb };
  log(type === 'enemy' ? 'Scegli un nemico (tocca)' : 'Scegli un alleato (tocca)');
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
  if (Math.random() < 0.7){
    log('Siete fuggiti!');
    endBattle('flee');
  } else {
    log('Fuga fallita!');
    processQueue();
  }
}

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
    const d = Math.max(1, Math.floor(max/12));
    applyDamage(unit, d, false);
    popDamage(unit.dom, d, '');
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

  setTimeout(()=>{
    const hits = ab.hits || 1;
    if (ab.type === 'phys' || ab.type === 'mag' || ab.type === 'steal'){
      sfx(ab.type === 'mag' ? 'magic' : 'hit');
      if (ab.type === 'mag') flash('rgba(120,140,255,.35)');
      for (const t of targets){
        if ((t.kind==='enemy' && t.hp<=0) || (t.kind==='ally' && t.cs.hp<=0)) continue;
        let total = 0, anyCrit = false;
        for (let h=0; h<hits; h++){
          const { dmg, crit } = computeDamage(user, t, ab);
          total += dmg; anyCrit = anyCrit || crit;
        }
        applyDamage(t, total);
        t.dom?.classList.add('hit');
        setTimeout(()=>t.dom?.classList.remove('hit'), 320);
        popDamage(t.dom, total, anyCrit ? 'crit' : '');
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
      sfx('heal'); flash('rgba(120,255,160,.3)');
      const userMag = user.kind==='ally' ? user.st.mag : user.mag;
      for (const t of targets){
        if (t.kind==='ally' && t.cs.hp<=0){
          if (ab.revive){ t.cs.hp = Math.floor(t.st.hp * 0.5); popDamage(t.dom, 'Rinato!', 'heal'); }
          continue;
        }
        const amount = Math.round((ab.power||0) + userMag * 1.5);
        applyHeal(t, amount);
        popDamage(t.dom, amount, 'heal');
      }
    } else if (ab.type === 'revive'){
      sfx('heal'); flash('rgba(255,240,160,.4)');
      const t = targets[0];
      if (t.kind==='ally' && t.cs.hp<=0){
        t.cs.hp = Math.floor(t.st.hp * (ab.power || 0.5));
        popDamage(t.dom, 'Rinato!', 'heal');
      } else { log('Non ha effetto...'); }
    } else if (ab.type === 'buff'){
      sfx('magic'); flash('rgba(255,220,120,.3)');
      for (const t of targets){
        if (t.kind==='ally' && t.cs.hp<=0) continue;
        t.buffs[ab.buff.stat] = { mult: ab.buff.mult, turns: ab.buff.turns };
        popDamage(t.dom, (ab.buff.stat==='atk'?'ATK':'DEF')+' ↑', 'heal');
      }
    } else if (ab.type === 'status'){
      sfx('magic');
      for (const t of targets){
        if (ab.status && Math.random() < ab.status.chance){
          t.statuses[ab.status.id] = true;
          popDamage(t.dom, STATUS_NAMES[ab.status.id]+'!', '');
        } else popDamage(t.dom, 'Mancato', '');
      }
    }
    updateEnemyBars();
    updatePartyBars();
    setTimeout(()=>checkOutcome(done), 450);
  }, 350);
}

function execItem(user, itemId, target, done){
  const it = ITEMS[itemId];
  G.s.items[itemId]--;
  if (G.s.items[itemId] <= 0) delete G.s.items[itemId];
  tickStatusesOnAct(user);
  log(`${user.name} usa ${it.name}!`);
  setTimeout(()=>{
    const cs = target.cs;
    if (it.type === 'heal' && cs.hp > 0){ applyHeal(target, it.power); popDamage(target.dom, it.power, 'heal'); sfx('heal'); }
    else if (it.type === 'mp' && cs.hp > 0){ cs.mp = Math.min(target.st.mp, cs.mp + it.power); popDamage(target.dom, '+'+it.power+' MP', 'heal'); sfx('heal'); }
    else if (it.type === 'full' && cs.hp > 0){ cs.hp = target.st.hp; cs.mp = target.st.mp; popDamage(target.dom, 'MAX!', 'heal'); sfx('heal'); }
    else if (it.type === 'revive' && cs.hp <= 0){ cs.hp = Math.floor(target.st.hp * it.power); popDamage(target.dom, 'Rinato!', 'heal'); sfx('heal'); }
    else if (it.type === 'cure'){ delete target.statuses[it.status]; popDamage(target.dom, 'Curato', 'heal'); sfx('heal'); }
    else { log('Non ha effetto...'); }
    updatePartyBars();
    setTimeout(()=>checkOutcome(done), 350);
  }, 300);
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
    const nm = e.dom?.querySelector('.e-name'); if (nm) nm.textContent = e.name;
    const cv = e.dom?.querySelector('canvas'); if (cv) drawMonster(cv, { sprite:e.def.sprite, pal:e.pal }, 9);
    flash('rgba(200,60,80,.6)'); sfx('limit');
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
  setTimeout(()=>{
    if (move.type === 'status'){
      for (const t of targets){
        if (move.status && Math.random() < move.status.chance){
          t.statuses[move.status.id] = true;
          popDamage(t.dom, STATUS_NAMES[move.status.id]+'!', '');
        } else popDamage(t.dom, 'Mancato', '');
      }
    } else {
      sfx(move.type === 'mag' ? 'magic' : 'hit');
      for (const t of targets){
        if (t.cs.hp <= 0) continue;
        const { dmg, crit } = computeDamage(e, t, move);
        applyDamage(t, dmg);
        if (move.status && Math.random() < move.status.chance) t.statuses[move.status.id] = true;
        popDamage(t.dom, dmg, crit ? 'crit' : '');
      }
    }
    updatePartyBars();
    setTimeout(()=>checkOutcome(done), 450);
  }, 400);
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
    u.atb += (4 + spd * 0.35) * (TICK_MS/100);
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
  cmdPanel.classList.remove('hidden');
  cmdTitle.textContent = 'Risultato';
  cmdList.innerHTML = '';
  const p = document.createElement('div');
  p.style.cssText = 'font-size:11px;line-height:1.6;padding:2px';
  p.innerHTML = lines.join('<br>');
  cmdList.appendChild(p);
  const b = document.createElement('button');
  b.className = 'btn';
  b.textContent = 'Continua ▶';
  b.onclick = done;
  cmdList.appendChild(b);
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
      over: false,
    };
    hideCommands();
    logEl.textContent = B.boss ? '⚠ Nemico potente!' : 'Nemici in arrivo!';
    renderEnemies();
    renderParty();
    playMusic(B.boss ? 'boss' : 'battle');
    clearInterval(B.timer);
    B.timer = setInterval(tick, TICK_MS);
  },
  exit(){
    if (B?.timer) clearInterval(B.timer);
  },
});
