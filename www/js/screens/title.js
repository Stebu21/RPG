// Titolo: account (registrazione/login) e slot di salvataggio.

import { register, login, listSaves, loadGame, SLOTS } from '../engine/save.js';
import { G, newGame } from '../engine/state.js';
import { playMusic, sfx } from '../engine/audio.js';
import { registerScreen, show } from '../engine/ui.js';

const el = document.getElementById('screen-title');
const authBox = document.getElementById('auth-box');
const saveBox = document.getElementById('save-box');
const msgEl = document.getElementById('auth-msg');
const nameIn = document.getElementById('auth-name');
const pinIn = document.getElementById('auth-pin');
const welcomeEl = document.getElementById('save-welcome');
const slotsEl = document.getElementById('save-slots');

function msg(t, err=false){
  msgEl.textContent = t;
  msgEl.style.color = err ? '#ff8a8a' : '#a9b4e0';
}

function fmtTime(ts){
  const d = new Date(ts);
  return d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
}

function renderSlots(){
  welcomeEl.textContent = `Bentornato, ${G.account}! Scegli uno slot:`;
  slotsEl.innerHTML = '';
  const saves = listSaves(G.account);
  for (let i=0; i<SLOTS; i++){
    const s = saves[i];
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:center';
    const info = document.createElement('div');
    info.className = 'save-slot';
    info.style.flex = '1';
    if (s){
      info.innerHTML = `<b>Slot ${i+1}</b> — ${s.meta.label}<small>${fmtTime(s.time)}</small>`;
      const bLoad = document.createElement('button');
      bLoad.className = 'btn'; bLoad.textContent = 'CARICA';
      bLoad.onclick = ()=>{ sfx('confirm'); startLoaded(i); };
      const bNew = document.createElement('button');
      bNew.className = 'btn btn-dim'; bNew.textContent = 'NUOVA';
      bNew.onclick = ()=>{ sfx('confirm'); startNew(i); };
      row.append(info, bLoad, bNew);
    } else {
      info.innerHTML = `<b>Slot ${i+1}</b> — vuoto`;
      const bNew = document.createElement('button');
      bNew.className = 'btn'; bNew.textContent = 'NUOVA PARTITA';
      bNew.onclick = ()=>{ sfx('confirm'); startNew(i); };
      row.append(info, bNew);
    }
    slotsEl.appendChild(row);
  }
}

function startNew(slot){
  G.slot = slot;
  G.s = newGame();
  show('world');
}

function startLoaded(slot){
  const sv = loadGame(G.account, slot);
  if (!sv){ return; }
  G.slot = slot;
  G.s = sv.state;
  show('world');
}

export function initTitle(){
  document.getElementById('btn-register').addEventListener('click', ()=>{
    const r = register(nameIn.value, pinIn.value);
    if (!r.ok){ sfx('cancel'); msg(r.msg, true); return; }
    sfx('confirm');
    G.account = r.name;
    authBox.classList.add('hidden');
    saveBox.classList.remove('hidden');
    renderSlots();
  });
  document.getElementById('btn-login').addEventListener('click', ()=>{
    const r = login(nameIn.value, pinIn.value);
    if (!r.ok){ sfx('cancel'); msg(r.msg, true); return; }
    sfx('confirm');
    G.account = r.name;
    authBox.classList.add('hidden');
    saveBox.classList.remove('hidden');
    renderSlots();
  });
  document.getElementById('btn-logout').addEventListener('click', ()=>{
    sfx('cancel');
    G.account = null;
    saveBox.classList.add('hidden');
    authBox.classList.remove('hidden');
    msg('Accedi o crea un account');
  });
}

registerScreen('title', {
  el,
  enter(){
    playMusic('title');
    if (G.account){
      authBox.classList.add('hidden');
      saveBox.classList.remove('hidden');
      renderSlots();
    } else {
      authBox.classList.remove('hidden');
      saveBox.classList.add('hidden');
    }
  },
});
