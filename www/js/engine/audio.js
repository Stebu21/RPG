// Musica chiptune e SFX procedurali via WebAudio. Nessun file audio.

let ctx = null;
let masterGain = null;
let current = null;   // { name, timer, nextTime, step }
let enabled = true;

const NOTE_BASE = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
function freq(n){
  if (!n) return 0;
  const m = /^([A-G])(#?)(\d)$/.exec(n);
  if (!m) return 0;
  const semi = NOTE_BASE[m[1]] + (m[2] ? 1 : 0) + (parseInt(m[3])+1) * 12;
  return 440 * Math.pow(2, (semi - 69) / 12);
}

// Brani: ogni voce è una sequenza di ottavi (nota o null). Loop infinito.
const SONGS = {
  title: { bpm: 72,
    lead:['E4',null,'G4',null,'B4',null,'A4','G4','A4',null,null,null,'G4',null,'E4',null,
          'D4',null,'F4',null,'A4',null,'G4','F4','G4',null,null,null,null,null,null,null],
    bass:['E2',null,null,null,'C2',null,null,null,'D2',null,null,null,'G2',null,null,null,
          'D2',null,null,null,'B1',null,null,null,'C2',null,null,null,'G1',null,null,null] },
  world: { bpm: 100,
    lead:['G4','A4','B4',null,'D5',null,'B4',null,'C5','B4','A4',null,'B4',null,null,null,
          'E4','G4','A4',null,'B4',null,'G4',null,'A4','G4','F#4',null,'G4',null,null,null],
    bass:['G2',null,'D3',null,'G2',null,'D3',null,'C3',null,'G2',null,'D3',null,'A2',null,
          'E2',null,'B2',null,'E2',null,'B2',null,'C3',null,'D3',null,'G2',null,null,null] },
  town: { bpm: 88,
    lead:['C5',null,'E5','D5','C5',null,'G4',null,'A4','C5','A4',null,'G4',null,null,null,
          'F4','A4','C5',null,'B4','G4','D5',null,'C5',null,null,null,null,null,null,null],
    bass:['C3',null,'G3',null,'A2',null,'E3',null,'F2',null,'C3',null,'G2',null,'B2',null,
          'F2',null,'C3',null,'G2',null,'G3',null,'C3',null,'G3',null,'C3',null,null,null] },
  dungeon: { bpm: 80,
    lead:['E4',null,null,'F4','E4',null,'C4',null,'D4',null,null,'E4','D4',null,'B3',null,
          'C4',null,null,'D4','C4',null,'A3',null,'B3',null,'G#3',null,'A3',null,null,null],
    bass:['A1',null,'E2',null,'A1',null,'E2',null,'G1',null,'D2',null,'G1',null,'D2',null,
          'F1',null,'C2',null,'F1',null,'C2',null,'E1',null,'B1',null,'E1',null,'E2',null] },
  battle: { bpm: 140,
    lead:['A4','A4','C5','A4','E5',null,'D5','C5','B4','B4','D5','B4','F5',null,'E5','D5',
          'C5','C5','E5','C5','G5',null,'F5','E5','D5','E5','F5','E5','D5','C5','B4','G#4'],
    bass:['A2','A2','A2','A2','A2','A2','A2','A2','G2','G2','G2','G2','G2','G2','G2','G2',
          'F2','F2','F2','F2','F2','F2','F2','F2','E2','E2','E2','E2','E2','E2','E2','E2'] },
  boss: { bpm: 152,
    lead:['D4','D4','F4','D4','A4','G4','F4','E4','D4','D4','F4','D4','Bb4',null,'A4','G4',
          'C4','C4','E4','C4','G4','F4','E4','D4','C#4','E4','G4','Bb4','A4','G4','F4','E4'],
    bass:['D2','D2','D2','D2','D2','D2','D2','D2','Bb1','Bb1','Bb1','Bb1','Bb1','Bb1','Bb1','Bb1',
          'C2','C2','C2','C2','C2','C2','C2','C2','A1','A1','A1','A1','A1','A1','A1','A1'] },
  final: { bpm: 64,
    lead:['C5',null,null,null,'B4',null,'G4',null,'A4',null,'E4',null,'G4',null,null,null,
          'F4',null,'A4',null,'C5',null,'E5',null,'D5',null,null,null,null,null,null,null],
    bass:['C3',null,'G2',null,'E2',null,'G2',null,'A2',null,'E2',null,'C2',null,null,null,
          'F2',null,'C3',null,'A2',null,'C3',null,'G2',null,'D3',null,'G2',null,null,null] },
};

function ensureCtx(){
  if (!ctx){
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.16;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function playNote(f, t, dur, type, vol){
  if (!f) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.95);
  o.connect(g); g.connect(masterGain);
  o.start(t); o.stop(t + dur);
}

export function playMusic(name){
  if (!enabled) { current = { name }; return; }
  if (current && current.name === name && current.timer) return;
  stopMusic();
  const song = SONGS[name];
  if (!song) return;
  ensureCtx();
  const stepDur = 60 / song.bpm / 2; // ottavi
  const st = { name, step:0, nextTime: ctx.currentTime + 0.05 };
  st.timer = setInterval(()=>{
    if (!enabled) return;
    while (st.nextTime < ctx.currentTime + 0.25){
      const i = st.step % song.lead.length;
      const ln = song.lead[i], bn = song.bass[i];
      if (ln) playNote(freq(ln.replace('Bb','A#')), st.nextTime, stepDur*1.7, 'square', 0.5);
      if (bn) playNote(freq(bn.replace('Bb','A#')), st.nextTime, stepDur*1.9, 'triangle', 0.9);
      st.nextTime += stepDur;
      st.step++;
    }
  }, 100);
  current = st;
}

export function stopMusic(){
  if (current?.timer) clearInterval(current.timer);
  current = null;
}

export function sfx(kind){
  if (!enabled) return;
  ensureCtx();
  const t = ctx.currentTime;
  switch(kind){
    case 'select': playNote(880, t, 0.07, 'square', 0.4); break;
    case 'confirm': playNote(660, t, 0.06, 'square', 0.4); playNote(990, t+0.07, 0.1, 'square', 0.4); break;
    case 'cancel': playNote(440, t, 0.06, 'square', 0.4); playNote(330, t+0.06, 0.1, 'square', 0.4); break;
    case 'hit': playNote(160, t, 0.12, 'sawtooth', 0.8); playNote(110, t+0.05, 0.12, 'sawtooth', 0.6); break;
    case 'magic': playNote(523, t, 0.08, 'sine', 0.6); playNote(784, t+0.08, 0.08, 'sine', 0.6); playNote(1046, t+0.16, 0.14, 'sine', 0.6); break;
    case 'heal': playNote(523, t, 0.1, 'sine', 0.5); playNote(659, t+0.1, 0.1, 'sine', 0.5); playNote(880, t+0.2, 0.2, 'sine', 0.5); break;
    case 'levelup': [523,659,784,1046].forEach((f,i)=>playNote(f, t+i*0.09, 0.12, 'square', 0.5)); break;
    case 'chest': playNote(392, t, 0.1, 'square', 0.5); playNote(523, t+0.1, 0.1, 'square', 0.5); playNote(659, t+0.2, 0.18, 'square', 0.5); break;
    case 'limit': [220,277,330,440,554,660].forEach((f,i)=>playNote(f, t+i*0.05, 0.1, 'sawtooth', 0.5)); break;
    case 'die': playNote(220, t, 0.2, 'sawtooth', 0.7); playNote(165, t+0.18, 0.25, 'sawtooth', 0.7); playNote(110, t+0.4, 0.4, 'sawtooth', 0.7); break;
  }
}

// Va chiamata al primo gesto utente: le politiche di autoplay sospendono il contesto.
export function resumeAudio(){ ensureCtx(); }

export function toggleAudio(){
  enabled = !enabled;
  if (!enabled) stopMusic();
  else if (current?.name) playMusic(current.name);
  return enabled;
}
