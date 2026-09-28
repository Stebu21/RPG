// Musica e SFX procedurali via WebAudio in stile chiptune da console portatile:
// lead a onda quadra con vibrato, basso a triangolo, arpeggi rapidi e batteria
// a rumore. Composizioni originali. Nessun file audio.

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

// Brani (composizioni originali in stile chiptune da JRPG portatile).
// Ogni voce è una sequenza di ottavi (nota o null), loop infinito.
// drums: k = cassa, s = rullante, h = charleston.
const SONGS = {
  title: { bpm: 76,
    lead:['B4',null,'D5',null,'F#5',null,'E5','D5','E5',null,'D5',null,'B4',null,null,null,
          'A4',null,'C#5',null,'E5',null,'F#5','E5','D5',null,'C#5',null,'D5',null,null,null],
    harm:['D4',null,'F#4',null,'A4',null,null,null,'G4',null,null,null,'F#4',null,null,null,
          'E4',null,'G4',null,'A4',null,null,null,'F#4',null,null,null,'F#4',null,null,null],
    bass:['B2',null,'F#2',null,'B2',null,'F#2',null,'G2',null,'D3',null,'B2',null,'F#2',null,
          'A2',null,'E2',null,'A2',null,'E2',null,'D2',null,'A2',null,'D3',null,null,null],
    drums:[null,null,'h',null,null,null,'h',null,null,null,'h',null,null,null,'h',null,
           null,null,'h',null,null,null,'h',null,null,null,'h',null,null,null,'h',null] },
  world: { bpm: 116,
    lead:['G4','B4','D5',null,'B4',null,'G4',null,'A4','C5','E5',null,'C5',null,'A4',null,
          'B4','D5','G5',null,'F#5','D5','B4',null,'A4','B4','C5','A4','B4',null,null,null],
    harm:['B3',null,'G4',null,'D4',null,null,null,'C4',null,'A4',null,'E4',null,null,null,
          'D4',null,'B4',null,'G4',null,null,null,'C4',null,'E4',null,'D4',null,null,null],
    bass:['G2',null,'D3',null,'G2','G2','D3',null,'A2',null,'E3',null,'A2','A2','E3',null,
          'B2',null,'F#3',null,'B2','B2','F#3',null,'C3',null,'G3',null,'D3','D3','D2',null],
    drums:['k',null,'h',null,'s',null,'h','h','k',null,'h',null,'s',null,'h',null,
           'k',null,'h',null,'s',null,'h','h','k','k','h',null,'s',null,'h','h'] },
  town: { bpm: 96,
    lead:['E5',null,'C5',null,'D5','E5','D5',null,'C5',null,'A4',null,'G4',null,null,null,
          'F4','A4','C5',null,'E5','D5','C5','D5','E5',null,'C5',null,'C5',null,null,null],
    harm:['G4',null,'E4',null,'F4',null,null,null,'E4',null,'F4',null,'E4',null,null,null,
          'D4',null,'F4',null,'G4',null,null,null,'G4',null,'E4',null,'E4',null,null,null],
    bass:['C3',null,'G2',null,'C3',null,'G2',null,'A2',null,'E2',null,'C3',null,'G2',null,
          'F2',null,'C3',null,'G2',null,'D3',null,'C3',null,'G2',null,'C2',null,null,null],
    drums:[null,null,'h',null,null,null,'h',null,null,null,'h',null,null,null,'h',null,
           null,null,'h',null,null,null,'h',null,'k',null,'h',null,null,null,'h',null] },
  dungeon: { bpm: 84,
    lead:['A4',null,null,'B4','A4',null,'E4',null,'F4',null,null,'G4','F4',null,'D4',null,
          'E4',null,null,'F4','E4',null,'C4',null,'B3',null,'G#3',null,'A3',null,null,null],
    harm:[null,null,'E4',null,null,null,'C4',null,null,null,'D4',null,null,null,'B3',null,
          null,null,'C4',null,null,null,'A3',null,null,null,'E3',null,'E3',null,null,null],
    bass:['A1',null,'E2',null,'A1',null,'E2',null,'D2',null,'A2',null,'D2',null,'A2',null,
          'C2',null,'G2',null,'C2',null,'G2',null,'E1',null,'B1',null,'E2',null,'E1',null],
    drums:['k',null,null,null,'h',null,null,null,'k',null,null,null,'h',null,null,null,
           'k',null,null,null,'h',null,null,null,'k',null,'h',null,'k',null,null,null] },
  battle: { bpm: 150,
    lead:['E5','E5',null,'E5','D5','C5','B4','C5','D5',null,'B4',null,'G4',null,'B4',null,
          'C5','C5',null,'C5','B4','A4','G#4','A4','B4',null,'E5',null,'E4','G#4','B4','D5'],
    harm:['C5',null,'A4',null,'B4',null,'G#4',null,'A4',null,'E4',null,'E4',null,'G4',null,
          'A4',null,'F4',null,'E4',null,'E4',null,'G#4',null,'B4',null,'E4',null,'E4',null],
    bass:['A2','A2','E2','A2','G2','G2','D2','G2','F2','F2','C2','F2','E2','E2','B1','E2',
          'A2','A2','E2','A2','G2','G2','D2','G2','F2','F2','C2','F2','E2','E2','E2','E2'],
    drums:['k',null,'h','h','s',null,'h',null,'k','k','h',null,'s',null,'h','h',
           'k',null,'h','h','s',null,'h',null,'k','k','h',null,'s','s','h','h'] },
  boss: { bpm: 160,
    lead:['D5','D5','F5','D5','A5','G5','F5','E5','D5',null,'F5',null,'A#4',null,'A4','G4',
          'C5','C5','E5','C5','G5','F5','E5','D5','C#5','E5','G5','A#5','A5','G5','F5','E5'],
    harm:['A4',null,'D5',null,'F5',null,null,null,'A#4',null,'D5',null,'G4',null,'F4',null,
          'G4',null,'C5',null,'E5',null,null,null,'A4',null,'C#5',null,'E5',null,'C#5',null],
    bass:['D2','D2','A1','D2','D2','D2','A1','D2','A#1','A#1','F1','A#1','A#1','A#1','F1','A#1',
          'C2','C2','G1','C2','C2','C2','G1','C2','A1','A1','E1','A1','A1','A1','A1','A1'],
    drums:['k','k','h',null,'s',null,'h','h','k',null,'h','h','s',null,'h','h',
           'k','k','h',null,'s',null,'h','h','k','k','s',null,'s','s','h','h'] },
  final: { bpm: 66,
    lead:['C5',null,null,null,'B4',null,'G4',null,'A4',null,'E4',null,'G4',null,null,null,
          'F4',null,'A4',null,'C5',null,'E5',null,'D5',null,'C5',null,'C5',null,null,null],
    harm:['E4',null,null,null,'D4',null,'E4',null,'C4',null,null,null,'E4',null,null,null,
          'A3',null,'C4',null,'E4',null,'G4',null,'F4',null,'E4',null,'E4',null,null,null],
    bass:['C3',null,'G2',null,'E2',null,'G2',null,'A2',null,'E2',null,'C2',null,null,null,
          'F2',null,'C3',null,'A2',null,'C3',null,'G2',null,'D3',null,'C2',null,null,null],
    drums:[] },
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

// ---------- voci musicali (chiptune) ----------
// Onda pulse al 25% (le console portatili la usavano per il canale melodia)
let pulseWave = null;
function getPulseWave(){
  if (!pulseWave){
    const n = 32;
    const real = new Float32Array(n), imag = new Float32Array(n);
    for (let k=1; k<n; k++){
      // serie di Fourier di un'onda quadra con duty cycle 25%
      real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
    }
    pulseWave = ctx.createPeriodicWave(real, imag, { disableNormalization:false });
  }
  return pulseWave;
}

function leadNote(f, t, dur, vol){
  if (!f) return;
  const g = ctx.createGain();
  // inviluppo chiptune: attacco istantaneo, decadimento a gradino
  g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(vol * 0.7, t + dur * 0.5);
  g.gain.setValueAtTime(vol * 0.4, t + dur * 0.8);
  g.gain.setTargetAtTime(0.0001, t + dur * 0.95, 0.01);
  g.connect(musicGain);
  const o = ctx.createOscillator();
  o.setPeriodicWave(getPulseWave());
  o.frequency.value = f;
  // vibrato leggero che parte a metà nota
  const vib = ctx.createOscillator();
  vib.frequency.value = 6;
  const vibG = ctx.createGain();
  vibG.gain.setValueAtTime(0, t);
  vibG.gain.linearRampToValueAtTime(f * 0.008, t + dur * 0.5);
  vib.connect(vibG); vibG.connect(o.frequency);
  o.connect(g);
  o.start(t); o.stop(t + dur + 0.05);
  vib.start(t); vib.stop(t + dur + 0.05);
}

// seconda voce (armonia): quadra al 50%, più defilata
function harmNote(f, t, dur, vol){
  if (!f) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(vol * 0.55, t + dur * 0.6);
  g.gain.setTargetAtTime(0.0001, t + dur * 0.9, 0.012);
  g.connect(musicGain);
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.value = f;
  o.connect(g);
  o.start(t); o.stop(t + dur + 0.05);
}

// basso a triangolo secco, come il canale triangle delle console a 8 bit
function bassNote(f, t, dur, vol){
  if (!f) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(vol * 0.8, t + dur * 0.7);
  g.gain.setTargetAtTime(0.0001, t + dur * 0.92, 0.012);
  g.connect(musicGain);
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.value = f;
  o.connect(g);
  o.start(t); o.stop(t + dur + 0.05);
}

// arpeggio veloce sull'accordo (il classico "brillio" chiptune)
function arpNote(f, t, dur, vol){
  if (!f) return;
  const step = dur / 3;
  for (let i=0; i<3; i++){
    const mul = [2, 3, 4][i];
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t + i*step);
    g.gain.setTargetAtTime(0.0001, t + i*step + step*0.8, 0.008);
    g.connect(musicGain);
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = f * mul;
    o.connect(g);
    o.start(t + i*step); o.stop(t + (i+1)*step + 0.03);
  }
}

// batteria a rumore: k cassa, s rullante, h charleston
function drumHit(kind, t){
  if (kind === 'k'){
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + 0.12);
  } else {
    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    const f = ctx.createBiquadFilter();
    f.type = kind === 's' ? 'bandpass' : 'highpass';
    f.frequency.value = kind === 's' ? 1800 : 7000;
    const g = ctx.createGain();
    const vol = kind === 's' ? 0.30 : 0.10;
    const dur = kind === 's' ? 0.09 : 0.035;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(musicGain);
    src.start(t); src.stop(t + dur + 0.02);
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
      const hn = song.harm?.[i], dn = song.drums?.[i];
      if (ln) leadNote(freq(ln.replace('Bb','A#')), st.nextTime, stepDur*1.7, 0.16);
      if (hn) harmNote(freq(hn.replace('Bb','A#')), st.nextTime, stepDur*1.6, 0.06);
      if (bn){
        const f = freq(bn.replace('Bb','A#'));
        bassNote(f, st.nextTime, stepDur*1.8, 0.26);
        // arpeggio solo sui tempi forti, per non affollare il mix
        if (st.step % 8 === 0) arpNote(f, st.nextTime, stepDur*1.5, 0.030);
      }
      if (dn) drumHit(dn, st.nextTime);
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
      tone(740, 880, t, 0.06, 'square', 0.12); break;
    case 'confirm':
      tone(620, 620, t, 0.06, 'square', 0.14);
      tone(930, 930, t+0.06, 0.10, 'square', 0.14); break;
    case 'cancel':
      tone(520, 330, t, 0.12, 'square', 0.14); break;
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
    case 'victory':
      // fanfara chiptune originale di fine battaglia
      [392,523,659,784].forEach((f,i)=>tone(f, f, t+i*0.09, 0.11, 'square', 0.16, true));
      tone(659, 659, t+0.36, 0.10, 'square', 0.16, true);
      tone(784, 784, t+0.46, 0.34, 'square', 0.18, true);
      tone(196, 196, t+0.46, 0.34, 'triangle', 0.22); break;
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
