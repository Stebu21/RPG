// Input unificato: tastiera + D-pad touch.

export const Input = {
  dirs: { up:false, down:false, left:false, right:false },
  actionQueued: false,
  enabled: true,

  heldDir(){
    if (this.dirs.up) return 'up';
    if (this.dirs.down) return 'down';
    if (this.dirs.left) return 'left';
    if (this.dirs.right) return 'right';
    return null;
  },
  takeAction(){
    if (this.actionQueued){ this.actionQueued = false; return true; }
    return false;
  },
};

const KEYMAP = {
  ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
  w:'up', s:'down', a:'left', d:'right',
  W:'up', S:'down', A:'left', D:'right',
};

export function initInput(onAction, onMenu){
  window.addEventListener('keydown', e=>{
    if (!Input.enabled) return;
    const d = KEYMAP[e.key];
    if (d){ Input.dirs[d] = true; e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' '){ Input.actionQueued = true; onAction?.(); e.preventDefault(); }
    else if (e.key === 'Escape'){ onMenu?.(); }
  });
  window.addEventListener('keyup', e=>{
    const d = KEYMAP[e.key];
    if (d) Input.dirs[d] = false;
  });

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
  const fire = e=>{ e.preventDefault(); Input.actionQueued = true; onAction?.(); };
  act.addEventListener('touchstart', fire, {passive:false});
  act.addEventListener('mousedown', fire);
}
