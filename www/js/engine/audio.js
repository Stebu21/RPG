// Musica e SFX procedurali via WebAudio — sintesi calda (saw detunate + filtri,
// pad d'accordo, eco) invece del vecchio suono 8-bit. Nessun file audio.

let ctx = null;
let masterGain = null, musicGain = null, sfxGain = null;
let delayNode = null;
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
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 6;
    comp.connect(ctx.destination);
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.55;
    masterGain.connect(comp);
    // eco morbida condivisa
    delayNode = ctx.createDelay(1);
    delayNode.delayTime.value = 0.27;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    delayNode.connect(fb); fb.connect(delayNode);
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    delayNode.connect(wet); wet.connect(masterGain);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.34;
    musicGain.connect(masterGain);
    musicGain.connect(delayNode);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(masterGain);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

// ---------- voci musicali ----------
function leadNote(f, t, dur, vol){
  if (!f) return;
  const flt = ctx.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.value = Math.min(4200, f * 4);
  flt.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.setTargetAtTime(vol * 0.55, t + 0.06, 0.10);
  g.gain.setTargetAtTime(0.0001, t + dur * 0.75, 0.06);
  flt.connect(g); g.connect(musicGain);
  for (const det of [-5, 4]){ // due oscillatori leggermente scordati = suono pieno
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.detune.value = det;
    o.connect(flt);
    o.start(t); o.stop(t + dur + 0.3);
  }
}

function bassNote(f, t, dur, vol){
  if (!f) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.025);
  g.gain.setTargetAtTime(0.0001, t + dur * 0.8, 0.08);
  g.connect(musicGain);
  const o1 = ctx.createOscillator();
  o1.type = 'sine'; o1.frequency.value = f;
  const o2 = ctx.createOscillator();
  o2.type = 'triangle'; o2.frequency.value = f * 2;
  const g2 = ctx.createGain(); g2.gain.value = 0.35;
  o1.connect(g); o2.connect(g2); g2.connect(g);
  o1.start(t); o1.stop(t + dur + 0.3);
  o2.start(t); o2.stop(t + dur + 0.3);
}

function padChord(f, t, dur, vol){
  if (!f) return;
  for (const mul of [2, 3, 4]){ // ottava, quinta sopra, doppia ottava
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = mul === 3 ? f * 3 : f * mul;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.4);
    g.gain.setTargetAtTime(0.0001, t + dur * 0.75, dur * 0.3);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + dur * 1.6);
  }
}

export function playMusic(name){
  if (!enabled) { current = { name }; return; }
  if (current && current.name === name && current.timer) return;
  stopMusic();
  const song = SONGS[name];
  if (!song) return;
  ensureCtx();
  musicGain.gain.cancelScheduledValues(ctx.currentTime);
  musicGain.gain.setTargetAtTime(0.34, ctx.currentTime, 0.15);
  const stepDur = 60 / song.bpm / 2; // ottavi
  const st = { name, step:0, nextTime: ctx.currentTime + 0.06 };
  st.timer = setInterval(()=>{
    if (!enabled) return;
    while (st.nextTime < ctx.currentTime + 0.3){
      const i = st.step % song.lead.length;
      const ln = song.lead[i], bn = song.bass[i];
      if (ln) leadNote(freq(ln.replace('Bb','A#')), st.nextTime, stepDur*1.9, 0.18);
      if (bn){
        const f = freq(bn.replace('Bb','A#'));
        bassNote(f, st.nextTime, stepDur*2.2, 0.30);
        padChord(f, st.nextTime, stepDur*4, 0.035);
      }
      st.nextTime += stepDur;
      st.step++;
    }
  }, 100);
  current = st;
}

export function stopMusic(){
  if (current?.timer) clearInterval(current.timer);
  if (ctx && musicGain){
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);
  }
  current = null;
}

// ---------- SFX ----------
let noiseBuf = null;
function getNoise(){
  if (!noiseBuf){
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i=0; i<d.length; i++) d[i] = Math.random()*2 - 1;
  }
  return noiseBuf;
}

function noise(t, dur, cutoff, vol){
  const src = ctx.createBufferSource();
  src.buffer = getNoise();
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = cutoff;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start(t); src.stop(t + dur);
}

function tone(f0, f1, t, dur, type, vol, echo=false){
  const o = ctx.createOscillator();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(Math.max(20, f0), t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(sfxGain);
  if (echo) g.connect(delayNode);
  o.start(t); o.stop(t + dur + 0.05);
}

export function sfx(kind){
  if (!enabled) return;
  ensureCtx();
  const t = ctx.currentTime;
  switch(kind){
    case 'select':
      tone(740, 880, t, 0.08, 'sine', 0.25); break;
    case 'confirm':
      tone(620, 620, t, 0.07, 'sine', 0.28);
      tone(930, 930, t+0.07, 0.12, 'sine', 0.28); break;
    case 'cancel':
      tone(520, 330, t, 0.16, 'sine', 0.28); break;
    case 'hit':
      noise(t, 0.16, 700, 0.5);
      tone(130, 55, t, 0.18, 'sine', 0.55); break;
    case 'magic':
      tone(660, 660, t, 0.12, 'sine', 0.22, true);
      tone(990, 990, t+0.07, 0.12, 'sine', 0.22, true);
      tone(1320, 1320, t+0.14, 0.2, 'sine', 0.22, true); break;
    case 'heal':
      tone(523, 523, t, 0.16, 'sine', 0.22, true);
      tone(659, 659, t+0.12, 0.16, 'sine', 0.22, true);
      tone(880, 880, t+0.24, 0.3, 'sine', 0.22, true); break;
    case 'levelup':
      [523,659,784,1046].forEach((f,i)=>tone(f, f, t+i*0.1, 0.18, 'triangle', 0.28, true)); break;
    case 'chest':
      tone(392, 392, t, 0.12, 'triangle', 0.28);
      tone(523, 523, t+0.1, 0.12, 'triangle', 0.28);
      tone(784, 784, t+0.2, 0.26, 'triangle', 0.28, true); break;
    case 'limit':
      tone(180, 760, t, 0.45, 'sawtooth', 0.22, true);
      noise(t+0.25, 0.3, 1800, 0.25); break;
    case 'die':
      tone(220, 60, t, 0.7, 'sine', 0.4);
      noise(t, 0.5, 400, 0.3); break;
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
