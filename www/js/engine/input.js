// Input unificato: tastiera + D-pad touch.
// Frecce = movimento/navigazione · Ctrl (o Invio) = conferma · Alt (o Esc) = indietro · Spazio = menu.

export const Input = {
  dirs: { up:false, down:false, left:false, right:false },
  actionQueued: false,
  enabled: true,
  backHeld: false,       // B / Alt tenuto premuto: nel mondo si corre

  heldDir(){
    if (this.dirs.up) return 'up';
    if (this.dirs.down) return 'down';
    if (this.dirs.left) return 'left';
    if (this.dirs.right) return 'right';
    return null;
  },
  // vettore analogico (diagonali comprese) per il movimento libero
  axis(){
    return { x:(this.dirs.right?1:0) - (this.dirs.left?1:0), y:(this.dirs.down?1:0) - (this.dirs.up?1:0) };
  },
  takeAction(){
    if (this.actionQueued){ this.actionQueued = false; return true; }
    return false;
  },
};

const KEYMAP = {
  ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
};

// Le schermate ascoltano questi eventi per navigare i propri menu.
function emit(name, detail){ window.dispatchEvent(new CustomEvent(name, { detail })); }

function isTyping(e){
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
}

export function initInput(onAction, onMenu){
  window.addEventListener('keydown', e=>{
    if (isTyping(e)) return; // mai intercettare mentre si scrive in un campo
    if (!Input.enabled) return;
    const d = KEYMAP[e.key];
    if (d){
      Input.dirs[d] = true;
      emit('pad-dir', d);
      e.preventDefault();
    } else if (e.key === 'Control' || e.key === 'Enter'){
      if (e.repeat) return;
      Input.actionQueued = true;
      emit('pad-confirm');
      onAction?.();
      e.preventDefault();
    } else if (e.key === 'Alt' || e.key === 'Escape'){
      if (e.key === 'Alt'){ Input.backHeld = true; e.preventDefault(); }
      if (e.repeat) return;
      emit('pad-back');
      e.preventDefault();
    } else if (e.key === ' '){
      if (e.repeat) return;
      emit('pad-menu');
      onMenu?.();
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', e=>{
    const d = KEYMAP[e.key];
    if (d) Input.dirs[d] = false;
    if (e.key === 'Alt'){ Input.backHeld = false; e.preventDefault(); }   // niente barra menu del browser
  });
  // Alt+Tab o cambio finestra: nessun tasto resta "incastrato"
  window.addEventListener('blur', ()=>{ Input.backHeld = false; for (const k in Input.dirs) Input.dirs[k] = false; });

  for (const btn of document.querySelectorAll('.dpad-btn')){
    const dir = btn.dataset.dir;
    const on = e=>{ e.preventDefault(); Input.dirs[dir] = true; };
    const off = e=>{ e.preventDefault(); Input.dirs[dir] = false; };
    btn.addEventListener('touchstart', on, {passive:false});
    btn.addEventListener('touchend', off, {passive:false});
    btn.addEventListener('touchcancel', off, {passive:false});
    btn.addEventListener('mousedown', on);
    btn.addEventListener('mouseup', off);
    btn.addEventListener('mouseleave', off);
  }
  const act = document.getElementById('btn-action');
  const fire = e=>{ e.preventDefault(); Input.actionQueued = true; emit('pad-confirm'); onAction?.(); };
  act.addEventListener('touchstart', fire, {passive:false});
  act.addEventListener('mousedown', fire);

  // pulsante B = indietro (come il tasto B del Game Boy)
  const back = document.getElementById('btn-back');
  // tenerlo premuto fa correre (con le Scarpe da Corsa)
  const fireBack = e=>{ e.preventDefault(); Input.backHeld = true; back.classList.add('on'); emit('pad-back'); };
  const releaseBack = e=>{ e.preventDefault(); Input.backHeld = false; back.classList.remove('on'); };
  back.addEventListener('touchstart', fireBack, {passive:false});
  back.addEventListener('mousedown', fireBack);
  for (const ev of ['touchend', 'touchcancel', 'mouseup', 'mouseleave']) back.addEventListener(ev, releaseBack, {passive:false});
}
