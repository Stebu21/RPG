// Menu di gioco: squadra (con scambio party/riserva), oggetti, missione, salvataggio.

import { CHARACTERS, PARTY_MAX } from '../data/characters.js';
import { ABILITIES } from '../data/abilities.js';
import { ITEMS } from '../data/items.js';
import { MAPS, SIGILLI } from '../data/maps.js';
import { missionText } from '../data/story.js';
import { QUESTS, questProgressText } from '../data/quests.js';
import { G, statsOf, expToNext, DUO } from '../engine/state.js';
import { saveGame, SLOTS, listSaves } from '../engine/save.js';
import { drawPortrait } from '../engine/sprites.js';
import { sfx } from '../engine/audio.js';
import { registerScreen, show, currentScreen } from '../engine/ui.js';

const el = document.getElementById('screen-menu');
const infoEl = document.getElementById('menu-info');
const contentEl = document.getElementById('menu-content');

function renderInfo(){
  const sig = SIGILLI.filter(s=>G.s.flags[s]).length;
  infoEl.innerHTML = `<span>📍 ${MAPS[G.s.map].name}</span><span>Sigilli: ${sig}/4</span><span>💰 ${G.s.gold} oro</span>`;
}

// ---------- SQUADRA ----------
function charRow(id, inParty){
  const cs = G.s.chars[id];
  const def = CHARACTERS[id];
  const st = statsOf(cs);
  const row = document.createElement('div');
  row.className = 'char-row' + (inParty ? ' in-party' : '');
  row.innerHTML = `
    <div class="cr-dot" style="background:${def.color}"></div>
    <div class="cr-main"><b>${def.name}</b> — ${def.className} Lv.${cs.level}
      <small>${inParty ? '⭐ in squadra' : 'riserva'}</small><br>
      <small>HP ${cs.hp}/${st.hp} · MP ${cs.mp}/${st.mp}</small></div>`;
  row.onclick = ()=>{ sfx('select'); renderCharDetail(id); };
  return row;
}

function renderPartyTab(){
  contentEl.innerHTML = '';
  const hint = document.createElement('p');
  hint.style.cssText = 'font-size:11px;color:#9ab;padding:4px';
  hint.textContent = `Party massimo ${PARTY_MAX}. Tocca un personaggio per dettagli e scambio.`;
  contentEl.appendChild(hint);
  for (const id of G.s.party) contentEl.appendChild(charRow(id, true));
  for (const id of G.s.reserve) contentEl.appendChild(charRow(id, false));
}

function renderCharDetail(id){
  const cs = G.s.chars[id];
  const def = CHARACTERS[id];
  const st = statsOf(cs);
  const inParty = G.s.party.includes(id);
  contentEl.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'detail-box';
  const next = cs.level >= 100 ? 'MAX' : `${cs.exp}/${expToNext(cs.level)}`;
  box.innerHTML = `
    <h3>${def.name} — ${def.className} Lv.${cs.level}</h3>
    <div style="display:flex;gap:10px;align-items:flex-start">
      <canvas class="portrait" style="flex-shrink:0"></canvas>
      <p style="font-size:11px;color:#bcd">${def.desc}</p>
    </div>
    <div class="statgrid">
      <div>HP ${cs.hp}/${st.hp}</div><div>MP ${cs.mp}/${st.mp}</div>
      <div>ATK ${st.atk}</div><div>DEF ${st.def}</div>
      <div>MAG ${st.mag}</div><div>SPR ${st.spr}</div>
      <div>VEL ${st.spd}</div><div>EXP ${next}</div>
    </div>`;
  drawPortrait(box.querySelector('.portrait'), def);
  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  const back = document.createElement('button');
  back.className = 'btn btn-dim'; back.textContent = '◀ Indietro';
  back.onclick = ()=>{ sfx('cancel'); renderPartyTab(); };
  btnRow.appendChild(back);
  if (DUO.includes(id)){
    const note = document.createElement('small');
    note.style.cssText = 'color:#ffd76a;padding:6px';
    note.textContent = 'Ste e Riki sono inseparabili: restano sempre in squadra.';
    btnRow.appendChild(note);
  } else if (inParty && G.s.party.length > 1){
    const b = document.createElement('button');
    b.className = 'btn'; b.textContent = 'Metti in riserva';
    b.onclick = ()=>{
      G.s.party = G.s.party.filter(x=>x!==id);
      G.s.reserve.push(id);
      sfx('confirm'); renderPartyTab();
    };
    btnRow.appendChild(b);
  } else if (!inParty){
    const b = document.createElement('button');
    b.className = 'btn'; b.textContent = 'Metti in squadra';
    b.disabled = G.s.party.length >= PARTY_MAX;
    b.onclick = ()=>{
      G.s.reserve = G.s.reserve.filter(x=>x!==id);
      G.s.party.push(id);
      sfx('confirm'); renderPartyTab();
    };
    btnRow.appendChild(b);
    if (G.s.party.length >= PARTY_MAX){
      const note = document.createElement('small');
      note.style.cssText = 'color:#e6a;padding:6px';
      note.textContent = 'Party pieno: togli prima qualcuno.';
      btnRow.appendChild(note);
    }
  }
  box.appendChild(btnRow);
  // abilità (apprese + future, stile Pokémon)
  const h = document.createElement('h3');
  h.textContent = 'Abilità';
  h.style.marginTop = '10px';
  box.appendChild(h);
  for (const l of def.learnset){
    const ab = ABILITIES[l.ab];
    const r = document.createElement('div');
    r.className = 'ab-row' + (l.lv > cs.level ? ' locked' : '');
    r.innerHTML = `<span class="ab-lv">Lv.${l.lv}</span> <b>${ab.name}</b> <small>(${ab.mp} MP)</small><br><small>${ab.desc||''}</small>`;
    box.appendChild(r);
  }
  const lim = ABILITIES[def.limit];
  const r = document.createElement('div');
  r.className = 'ab-row';
  r.innerHTML = `<span class="ab-lv" style="color:#ff6b81">LIMITE</span> <b>${lim.name}</b><br><small>${lim.desc||''} (HP sotto il 30%)</small>`;
  box.appendChild(r);
  contentEl.appendChild(box);
}

// ---------- OGGETTI ----------
function renderItemsTab(){
  contentEl.innerHTML = '';
  const ids = Object.keys(G.s.items).filter(id=>G.s.items[id] > 0);
  if (!ids.length){
    contentEl.innerHTML = '<p style="padding:10px;color:#9ab">Lo zaino è vuoto.</p>';
    return;
  }
  for (const id of ids){
    const it = ITEMS[id];
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `<div><b>${it.name}</b> x${G.s.items[id]}<br><small style="color:#9ab">${it.desc}</small></div>`;
    if (id === 'bici'){
      const use = document.createElement('button');
      use.className = 'btn';
      use.textContent = G.s.flags.bici_on ? 'SCENDI' : 'PEDALA';
      use.onclick = ()=>{
        G.s.flags.bici_on = !G.s.flags.bici_on;
        sfx('confirm');
        renderItemsTab();
      };
      row.appendChild(use);
    } else if (it.type === 'key'){
      const tag = document.createElement('small');
      tag.style.cssText = 'color:#7ec8ff;padding:4px';
      tag.textContent = '🔑 sempre attive';
      row.appendChild(tag);
    } else if (it.type !== 'quest'){
      const use = document.createElement('button');
      use.className = 'btn';
      use.textContent = 'USA';
      use.onclick = ()=>renderItemUse(id);
      row.appendChild(use);
    } else {
      const tag = document.createElement('small');
      tag.style.cssText = 'color:#ffd76a;padding:4px';
      tag.textContent = '📜 missione';
      row.appendChild(tag);
    }
    contentEl.appendChild(row);
  }
}

function renderItemUse(itemId){
  const it = ITEMS[itemId];
  contentEl.innerHTML = `<p style="padding:6px">Usare <b>${it.name}</b> su chi?</p>`;
  for (const id of [...G.s.party, ...G.s.reserve]){
    const cs = G.s.chars[id];
    const def = CHARACTERS[id];
    const st = statsOf(cs);
    const row = document.createElement('div');
    row.className = 'char-row';
    row.innerHTML = `<div class="cr-dot" style="background:${def.color}"></div>
      <div class="cr-main"><b>${def.name}</b> <small>HP ${cs.hp}/${st.hp} · MP ${cs.mp}/${st.mp}</small></div>`;
    row.onclick = ()=>{
      let ok = false;
      if (it.type === 'heal' && cs.hp > 0 && cs.hp < st.hp){ cs.hp = Math.min(st.hp, cs.hp + it.power); ok = true; }
      else if (it.type === 'mp' && cs.hp > 0 && cs.mp < st.mp){ cs.mp = Math.min(st.mp, cs.mp + it.power); ok = true; }
      else if (it.type === 'full' && cs.hp > 0){ cs.hp = st.hp; cs.mp = st.mp; ok = true; }
      else if (it.type === 'revive' && cs.hp <= 0){ cs.hp = Math.floor(st.hp * it.power); ok = true; }
      else if (it.type === 'cure'){ ok = true; }
      if (ok){
        sfx('heal');
        G.s.items[itemId]--;
        if (G.s.items[itemId] <= 0) delete G.s.items[itemId];
      } else sfx('cancel');
      renderItemsTab();
    };
    contentEl.appendChild(row);
  }
  const back = document.createElement('button');
  back.className = 'btn btn-dim';
  back.textContent = '◀ Indietro';
  back.onclick = ()=>renderItemsTab();
  contentEl.appendChild(back);
}

// ---------- MAPPA ----------
const MAP_COLORS = {
  '.':'#4a8c3f', ',':'#3a7330', 'F':'#5a9c48',
  '=':'#c2a36f', ':':'#9aa0ae',
  '~':'#2e6fb2', 'B':'#8a5a2b',
  '^':'#6e6557', 'T':'#2c6a24',
  '#':'#8a6d54', 'D':'#b07c3e', 'C':'#f3eee2', 'W':'#9a9183',
  'w':'#a8784a', 'R':'#a8333a', 'M':'#3a3344', 'K':'#caa36a',
  'l':'#5b78d6', 'Z':'#6e4f2c', 'O':'#8a6334', 'H':'#e8e2d4', 'P':'#888a9a',
  'E':'#2f7a2a', 'Q':'#7ec8ff', 'b':'#8a6334', 'm':'#d9a05a', 'G':'#dfe6ef', 'U':'#8fa898',
  '1':'#d9534f', '2':'#d9534f', '3':'#d9534f', '4':'#d9534f', '5':'#d9534f',
  'S':'#ffd76a', 'A':'#5b78d6',
};

function renderMapTab(){
  contentEl.innerHTML = '';
  const map = MAPS[G.s.map];
  const rows = map.tiles;
  const w = Math.max(...rows.map(r=>r.length)), h = rows.length;
  const s = Math.max(3, Math.min(Math.floor(600/w), Math.floor(330/h), 12));

  const head = document.createElement('p');
  head.style.cssText = 'padding:4px 6px;font-weight:700;color:#ffd76a';
  head.textContent = `🗺 ${map.name}`;
  contentEl.appendChild(head);

  const cv = document.createElement('canvas');
  cv.width = w*s; cv.height = h*s;
  cv.style.cssText = 'display:block;margin:4px auto;border-radius:14px;max-width:100%;box-shadow:0 8px 24px rgba(0,0,0,.45)';
  const x = cv.getContext('2d');
  x.fillStyle = '#0a0c16';
  x.fillRect(0, 0, cv.width, cv.height);
  for (let ty=0; ty<h; ty++){
    for (let tx=0; tx<rows[ty].length; tx++){
      const c = MAP_COLORS[rows[ty][tx]];
      if (!c) continue;
      x.fillStyle = c;
      x.fillRect(tx*s, ty*s, s, s);
    }
  }
  // portali evidenziati (con nome sulla mappa del mondo)
  x.textAlign = 'center';
  x.font = `bold ${Math.max(9, s*2.2)}px system-ui, sans-serif`;
  for (const tr of (map.triggers||[]).filter(t=>t.type === 'portal')){
    x.fillStyle = '#fff';
    x.beginPath(); x.arc(tr.x*s+s/2, tr.y*s+s/2, s*0.8, 0, Math.PI*2); x.fill();
    x.fillStyle = '#d9534f';
    x.beginPath(); x.arc(tr.x*s+s/2, tr.y*s+s/2, s*0.5, 0, Math.PI*2); x.fill();
    if (G.s.map === 'world' && MAPS[tr.to?.map]?.name){
      const label = MAPS[tr.to.map].name;
      x.fillStyle = 'rgba(8,8,22,.75)';
      const tw = x.measureText(label).width;
      x.fillRect(tr.x*s+s/2-tw/2-4, (tr.y-2.6)*s, tw+8, s*2.4);
      x.fillStyle = '#ffe9a8';
      x.fillText(label, tr.x*s+s/2, (tr.y-0.9)*s);
    }
  }
  // posizione del giocatore
  x.save();
  x.shadowColor = '#ffd76a'; x.shadowBlur = 10;
  x.fillStyle = '#fff';
  x.beginPath(); x.arc(G.s.x*s+s/2, G.s.y*s+s/2, Math.max(4, s*0.9), 0, Math.PI*2); x.fill();
  x.fillStyle = '#ffd76a';
  x.beginPath(); x.arc(G.s.x*s+s/2, G.s.y*s+s/2, Math.max(2.6, s*0.6), 0, Math.PI*2); x.fill();
  x.restore();
  contentEl.appendChild(cv);

  const legend = document.createElement('p');
  legend.style.cssText = 'text-align:center;font-size:11px;color:#9aa3c7;padding:4px';
  legend.innerHTML = '<span style="color:#ffd76a">●</span> Tu sei qui &nbsp;·&nbsp; <span style="color:#d9534f">●</span> Passaggi e ingressi';
  contentEl.appendChild(legend);
}

// ---------- MISSIONE ----------
function renderMissionTab(){
  const names = { sigillo_alba:'Sigillo dell’Alba', sigillo_meriggio:'Sigillo del Meriggio',
                  sigillo_vespro:'Sigillo del Vespro', sigillo_notte:'Sigillo della Notte' };
  let sig = '';
  for (const s of SIGILLI){
    sig += `<div class="item-row"><span>${G.s.flags[s] ? '🔆' : '⬜'} ${names[s]}</span></div>`;
  }
  // missioni secondarie: attive, completate e da scoprire
  const qs = G.s.quests || {};
  let side = '';
  for (const id of Object.keys(qs)){
    const q = QUESTS[id];
    if (!q) continue;
    const prog = questProgressText(G.s, id);
    const done = qs[id].done;
    side += `<div class="item-row"><div>
      <b>${done ? '✅' : '📜'} ${q.name}</b> <small style="color:#ffd76a">${q.town} — ${q.giver}</small><br>
      <small style="color:#9ab">${done ? 'Completata.' : q.desc}</small>
      ${!done ? `<br><small style="color:#7ee787">Progresso: ${prog}</small>` : ''}
    </div></div>`;
  }
  const known = Object.keys(qs).length;
  const total = Object.keys(QUESTS).length;
  if (!side) side = '<p style="padding:6px;font-size:11px;color:#9ab">Nessuna missione secondaria accettata. Parla con gli abitanti dei paesi: chi ha il simbolo <b style="color:#ffd76a">!</b> sopra la testa ha bisogno di te.</p>';
  contentEl.innerHTML = `
    <div class="detail-box">
      <h3>Missione principale</h3>
      <p style="line-height:1.6">${missionText(G.s.flags)}</p>
      <h3 style="margin-top:10px">Sigilli delle Ore</h3>${sig}
      <h3 style="margin-top:10px">Missioni secondarie (${known}/${total} scoperte)</h3>${side}
      <p style="margin-top:10px;font-size:11px;color:#9ab">Passi: ${G.s.steps} · Oro: ${G.s.gold}</p>
    </div>`;
}

// ---------- SALVA ----------
function renderSaveTab(){
  contentEl.innerHTML = '<p style="padding:6px">Scegli uno slot:</p>';
  const saves = listSaves(G.account);
  for (let i=0; i<SLOTS; i++){
    const s = saves[i];
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `<div><b>Slot ${i+1}</b><br><small style="color:#9ab">${s ? s.meta.label : 'vuoto'}</small></div>`;
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = 'SALVA';
    b.onclick = ()=>{
      const leader = G.s.party[0];
      const meta = { label:`${CHARACTERS[leader].name} Lv.${G.s.chars[leader].level} — ${MAPS[G.s.map].name}` };
      saveGame(G.account, i, G.s, meta);
      sfx('confirm');
      b.textContent = 'SALVATO ✓';
      setTimeout(()=>renderSaveTab(), 800);
    };
    row.appendChild(b);
    contentEl.appendChild(row);
  }
}

// ---------- tab switching ----------
const TABS = { party:renderPartyTab, items:renderItemsTab, map:renderMapTab, mission:renderMissionTab, save:renderSaveTab };
const TAB_ORDER = ['party','items','map','mission','save'];
let navIdx = -1;

function navItems(){
  return [...contentEl.querySelectorAll('.char-row, button.btn:not(:disabled)')];
}
function highlightNav(){
  navItems().forEach((e, i)=>e.classList.toggle('key-sel', i === navIdx));
}
function activeTab(){
  return document.querySelector('#menu-tabs .tab.btn-sel')?.dataset.tab || 'party';
}
function switchTab(tab){
  navIdx = -1;
  for (const b of document.querySelectorAll('#menu-tabs .tab')) b.classList.toggle('btn-sel', b.dataset.tab === tab);
  TABS[tab]?.();
}

window.addEventListener('pad-dir', e=>{
  if (currentScreen() !== 'menu') return;
  const d = e.detail;
  if (d === 'left' || d === 'right'){
    const i = TAB_ORDER.indexOf(activeTab());
    const ni = (i + (d === 'right' ? 1 : -1) + TAB_ORDER.length) % TAB_ORDER.length;
    sfx('select');
    switchTab(TAB_ORDER[ni]);
    return;
  }
  const items = navItems();
  if (!items.length) return;
  navIdx = d === 'down'
    ? (navIdx + 1) % items.length
    : navIdx <= 0 ? items.length - 1 : navIdx - 1;
  sfx('select');
  highlightNav();
  items[navIdx].scrollIntoView({ block:'nearest' });
});
window.addEventListener('pad-confirm', ()=>{
  if (currentScreen() !== 'menu') return;
  const items = navItems();
  if (navIdx >= 0 && navIdx < items.length) items[navIdx].click();
});
window.addEventListener('pad-back', ()=>{
  if (currentScreen() !== 'menu') return;
  // come il tasto B: prima torna indietro nelle viste, poi chiude il menu
  const back = [...contentEl.querySelectorAll('button.btn')].find(b=>b.textContent.includes('Indietro'));
  navIdx = -1;
  if (back){ sfx('cancel'); back.click(); }
  else { sfx('cancel'); show('world', { resume:true }); }
});

export function initMenu(){
  for (const btn of document.querySelectorAll('#menu-tabs .tab')){
    btn.addEventListener('click', ()=>{
      const tab = btn.dataset.tab;
      if (tab === 'close'){ sfx('cancel'); show('world', { resume:true }); return; }
      sfx('select');
      switchTab(tab);
    });
  }
}

registerScreen('menu', {
  el,
  enter(params){
    renderInfo();
    switchTab(params?.tab || 'party');
  },
});
