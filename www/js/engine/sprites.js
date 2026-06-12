// Rendering pixel-art procedurale: tile, eroi, mostri. Nessun asset esterno.

export const TILE = 16;

// ---------- forme dei mostri (a/b/c = palette, . = trasparente) ----------
export const SHAPES = {
  slime: [
    '....aaaa....',
    '..aaaaaaaa..',
    '.aaaaaaaaaa.',
    '.aabbaabbaa.',
    'aaabbaabbaaa',
    'aaaaaaaaaaaa',
    'aaaaaccaaaaa',
    'aaaaaaaaaaaa',
    '.aaaaaaaaaa.',
    '..a..aa..a..',
  ],
  bird: [
    '....bb......',
    '...bbbb.....',
    '..bbcbb.....',
    '...bbbbb....',
    '..aabbbbaa..',
    '.aaabbbbaaa.',
    'aaaabbbbaaaa',
    '..aabbbbaa..',
    '....bbbb....',
    '...cc..cc...',
  ],
  beast: [
    '.bb........bb.',
    '.baa......aab.',
    '..aaaaaaaaaa..',
    '.aacbaaaabcaa.',
    '.aaaaaaaaaaaa.',
    '..aaabbbbaaa..',
    '..aaabccbaaa..',
    '...aaaaaaaa...',
    '...bb....bb...',
  ],
  mushroom: [
    '...aaaaaa...',
    '.aaaaaaaaaa.',
    'aaacaaaacaaa',
    'aaaaaaaaaaaa',
    '.aaaaaaaaaa.',
    '...cccccc...',
    '...cbccbc...',
    '...cccccc...',
    '....cccc....',
  ],
  human: [
    '...cccc...',
    '..cccccc..',
    '..cbccbc..',
    '..cccccc..',
    '...aaaa...',
    '.aaaaaaaa.',
    '.acaaaaca.',
    '.aaaaaaaa.',
    '..aa..aa..',
    '..bb..bb..',
  ],
  golem: [
    '..aaaaaaaaaa..',
    '.aaaaaaaaaaaa.',
    '.aacbaaaabcaa.',
    '.aaaaaaaaaaaa.',
    'aaabaaaaaabaaa',
    'aaaaaabbaaaaaa',
    '.bb.aaaaaa.bb.',
    '.bb.aaaaaa.bb.',
    '....aaaaaa....',
    '....aa..aa....',
    '...baa..aab...',
    '...bbb..bbb...',
  ],
  ghost: [
    '....aaaa....',
    '..aaaaaaaa..',
    '.aaaaaaaaaa.',
    '.aabbaabbaa.',
    '.aaaaaaaaaa.',
    '.aaaabbaaaa.',
    '.aaaaaaaaaa.',
    '.aaaaaaaaaa.',
    '.aaaaaaaaaa.',
    '.aa.aaa.aa..',
    'aa..aa...aa.',
  ],
  gargoyle: [
    '.bb........bb.',
    '.bbb..aa..bbb.',
    '.bbbaaaaaabbb.',
    '..bbacaacabb..',
    '..baaaaaaaab..',
    '...aaabbaaa...',
    '...aaaaaaaa...',
    '..aaa.aa.aaa..',
    '..aa..aa..aa..',
    '..cc..cc..cc..',
  ],
  snake: [
    '....aaaa......',
    '...aaaaaa.....',
    '...abaaba.....',
    '...aaaaaa.....',
    '....ccaa......',
    '......aaa.....',
    '.......aaa....',
    '....aaaaaa....',
    '..aaaaaaaa....',
    '..aaaa........',
    '...aaaaaaaa...',
    '.....aaaaaa...',
  ],
  knight: [
    '....aaaa....',
    '...aaaaaa...',
    '...abbbba...',
    '...aaaaaa...',
    '..aaaaaaaa..',
    '.caaaaaaaac.',
    '.caaabbaaac.',
    '..aaabbaaa..',
    '..aaaaaaaa..',
    '...aa..aa...',
    '...aa..aa...',
    '..bbb..bbb..',
  ],
  bug: [
    '..cc....cc..',
    '...c....c...',
    '..aaaaaaaa..',
    '.aabaaaabaa.',
    '..aaaaaaaa..',
    'c.abbaabba.c',
    'cc.aabbaa.cc',
    '...abbba....',
    '....bbb.....',
    '.....b......',
  ],
  dragon: [
    '.bb.........bb..',
    '.bbb..aaa..bbb..',
    '.bbbaaaaaaabbb..',
    '..bbacaaacabb...',
    '..baaaaaaaaab...',
    '...aaabbbaaa....',
    '...aaaaaaaaa....',
    '..aaaaaaaaaaa...',
    '.aaaaaaaaaaaaa..',
    '.aaa.aaaaa.aaa..',
    '.cc..aaaaa..cc..',
    '.....aa.aa......',
    '.....cc.cc......',
  ],
  witch: [
    '......aa......',
    '.....aaaa.....',
    '....aaaaaa....',
    '..aaaaaaaaaa..',
    '....cccccc....',
    '...ccbccbcc...',
    '...cccccccc...',
    '....cbbbbc....',
    '...aaaaaaaa...',
    '..aaacaacaaa..',
    '.aaaaaaaaaaaa.',
    '.aaacaaaacaaa.',
    'aaaaaaaaaaaaaa',
    'aaacaaaaaacaaa',
    '.aaaaaaaaaaaa.',
  ],
};

// Disegna un mostro dentro un canvas, scalato.
export function drawMonster(canvas, mon, scale){
  const shape = SHAPES[mon.sprite] || SHAPES.slime;
  const pal = mon.pal || { a:'#888', b:'#444', c:'#ccc' };
  const w = shape[0].length, h = shape.length;
  canvas.width = w * scale; canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (let y=0; y<h; y++){
    for (let x=0; x<w; x++){
      const ch = shape[y][x];
      if (ch === '.' || ch === undefined) continue;
      ctx.fillStyle = pal[ch] || '#f0f';
      ctx.fillRect(x*scale, y*scale, scale, scale);
    }
  }
}

// ---------- tile della mappa ----------
function px(ctx, x, y, w, h, c){ ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

export function drawTile(ctx, ch, x, y, t){
  switch(ch){
    case '.': // erba
      px(ctx,x,y,TILE,TILE,'#4e8c3a');
      px(ctx,x+3,y+4,1,1,'#3c6e2c'); px(ctx,x+10,y+9,1,1,'#3c6e2c'); px(ctx,x+6,y+12,1,1,'#5fa34a');
      break;
    case ',': // erba alta
      px(ctx,x,y,TILE,TILE,'#3f7a2e');
      px(ctx,x+2,y+8,1,5,'#2e5c20'); px(ctx,x+6,y+6,1,7,'#2e5c20');
      px(ctx,x+10,y+9,1,5,'#2e5c20'); px(ctx,x+13,y+7,1,6,'#356a26');
      break;
    case '=': // strada
      px(ctx,x,y,TILE,TILE,'#b89a6a');
      px(ctx,x+4,y+3,2,1,'#a3865a'); px(ctx,x+11,y+10,2,1,'#a3865a'); px(ctx,x+7,y+13,1,1,'#caa97a');
      break;
    case ':': // pavé
      px(ctx,x,y,TILE,TILE,'#9a9aa8');
      px(ctx,x,y+7,TILE,1,'#83838f'); px(ctx,x+7,y,1,7,'#83838f'); px(ctx,x+11,y+8,1,8,'#83838f');
      break;
    case '~': { // acqua animata
      const ph = Math.floor(t/400) % 2;
      px(ctx,x,y,TILE,TILE,'#2a6db5');
      px(ctx,x+ (ph?2:7), y+5, 5,1, '#4f93d8');
      px(ctx,x+ (ph?9:3), y+11, 4,1, '#4f93d8');
      break;
    }
    case 'B': // ponte
      px(ctx,x,y,TILE,TILE,'#2a6db5');
      px(ctx,x,y+2,TILE,12,'#8a5a2b');
      px(ctx,x,y+2,TILE,1,'#6e4720'); px(ctx,x,y+13,TILE,1,'#6e4720');
      px(ctx,x+5,y+2,1,12,'#6e4720'); px(ctx,x+10,y+2,1,12,'#6e4720');
      break;
    case '^': // montagna
      px(ctx,x,y,TILE,TILE,'#5d5648');
      ctx.fillStyle = '#7a7160';
      ctx.beginPath(); ctx.moveTo(x+2,y+14); ctx.lineTo(x+8,y+2); ctx.lineTo(x+14,y+14); ctx.closePath(); ctx.fill();
      px(ctx,x+7,y+2,2,3,'#cfc8ba');
      break;
    case 'T': // albero
      px(ctx,x,y,TILE,TILE,'#4e8c3a');
      px(ctx,x+6,y+9,4,6,'#6e4720');
      ctx.fillStyle = '#2c6622';
      ctx.beginPath(); ctx.arc(x+8,y+6,6,0,7); ctx.fill();
      px(ctx,x+5,y+3,2,2,'#3f8a30');
      break;
    case '#': // muro
      px(ctx,x,y,TILE,TILE,'#8a6d54');
      px(ctx,x,y,TILE,2,'#a3866a');
      px(ctx,x,y+8,TILE,1,'#6e553f'); px(ctx,x,y+15,TILE,1,'#6e553f');
      px(ctx,x+5,y+2,1,6,'#6e553f'); px(ctx,x+11,y+9,1,6,'#6e553f');
      break;
    case 'D': // porta
      px(ctx,x,y,TILE,TILE,'#8a6d54');
      px(ctx,x+3,y+3,10,13,'#5a3a1d');
      px(ctx,x+4,y+4,8,11,'#7a4f27');
      px(ctx,x+10,y+9,2,2,'#e8c558');
      break;
    case 'F': // fiori
      px(ctx,x,y,TILE,TILE,'#4e8c3a');
      px(ctx,x+3,y+3,2,2,'#e86a8a'); px(ctx,x+10,y+5,2,2,'#e8d558');
      px(ctx,x+5,y+10,2,2,'#9a6ae8'); px(ctx,x+12,y+11,2,2,'#e8e8e8');
      break;
    case '1': case '2': case '3': case '4': case '5': // paese
      px(ctx,x,y,TILE,TILE,'#4e8c3a');
      px(ctx,x+1,y+7,6,7,'#cbb393'); px(ctx,x+9,y+8,6,6,'#cbb393');
      px(ctx,x,y+4,8,3,'#b5432e'); px(ctx,x+8,y+5,8,3,'#b5432e');
      px(ctx,x+3,y+10,2,4,'#5a3a1d'); px(ctx,x+11,y+10,2,2,'#3a5a8a');
      break;
    case 'S': // porta del Sacro Monte
      px(ctx,x,y,TILE,TILE,'#5d5648');
      px(ctx,x+3,y+2,10,14,'#e8c558');
      px(ctx,x+5,y+4,6,12,'#1a1430');
      px(ctx,x+7,y+1,2,2,'#fff0a0');
      break;
    case 'A': // porta dell'Accademia
      px(ctx,x,y,TILE,TILE,'#8a6d54');
      px(ctx,x+2,y+2,12,14,'#3a4a7a');
      px(ctx,x+4,y+4,8,12,'#23304f');
      px(ctx,x+6,y+1,4,2,'#e8c558');
      break;
    default:
      px(ctx,x,y,TILE,TILE,'#000');
  }
}

export const BLOCKED = new Set(['~','^','T','#',' ']);

// ---------- eroi e NPC sulla mappa ----------
// `who` può essere un colore (NPC generici) oppure { color, look } di un personaggio.
export function drawActor(ctx, x, y, who, dir, step){
  const color = typeof who === 'string' ? who : who.color;
  const look = (typeof who === 'object' && who.look) ? who.look : {};
  const hair = look.hair || '#3b2c20';
  const eyes = look.eyes || '#1a1a2a';
  const skin = '#e8c49a';
  const ox = x+2;
  // altezza: i piedi restano a fondo tile, la testa parte più o meno in alto
  const top = y + (look.h === 'tall' ? -1 : look.h === 'short' ? 3 : 1);
  const bodyW = look.build === 'wide' ? 12 : 10;
  const bodyX = look.build === 'wide' ? ox : ox+1;
  const leg = step % 2;
  // gambe (fino a fondo tile)
  px(ctx, ox+2, y+12, 3, 3+(leg?0:1), '#2a2a3a');
  px(ctx, ox+7, y+12, 3, 3+(leg?1:0), '#2a2a3a');
  // corpo
  px(ctx, bodyX, top+7, bodyW, y+12-(top+7), color);
  // braccia (tatuate: pelle con segni scuri, altrimenti manica)
  const armC = look.tattoo ? skin : color;
  px(ctx, ox-1, top+8, 2, 4, armC);
  px(ctx, ox+11, top+8, 2, 4, armC);
  if (look.tattoo){
    px(ctx, ox-1, top+9, 2, 1, '#3a5a7a');
    px(ctx, ox+11, top+10, 2, 1, '#3a5a7a');
  }
  // testa
  px(ctx, ox+2, top, 8, 7, skin);
  // capelli
  if (look.bald){
    // rasato: nessun capello
  } else if (look.baldTop){
    // stempiato: solo i lati
    px(ctx, ox+1, top+2, 2, 3, hair);
    px(ctx, ox+9, top+2, 2, 3, hair);
  } else {
    px(ctx, ox+2, top, 8, 2, hair);
    px(ctx, ox+1, top+1, 2, 3, hair);
    px(ctx, ox+9, top+1, 2, 3, hair);
    if (look.longHair){
      px(ctx, ox+1, top+1, 2, 8, hair);
      px(ctx, ox+9, top+1, 2, 8, hair);
    }
  }
  // barba
  if (look.beard){
    px(ctx, ox+3, top+5, 6, 1, hair);
    if (look.beard >= 2) px(ctx, ox+4, top+6, 4, 2, hair);
  }
  // occhi secondo direzione
  ctx.fillStyle = eyes;
  if (dir === 'down'){ ctx.fillRect(ox+4, top+3, 1, 2); ctx.fillRect(ox+7, top+3, 1, 2); }
  else if (dir === 'left'){ ctx.fillRect(ox+3, top+3, 1, 2); ctx.fillRect(ox+6, top+3, 1, 2); }
  else if (dir === 'right'){ ctx.fillRect(ox+5, top+3, 1, 2); ctx.fillRect(ox+8, top+3, 1, 2); }
  // up: di spalle, niente occhi (capelli anche dietro)
  else if (!look.bald) px(ctx, ox+2, top+2, 8, 2, hair);
}

// Ritratto grande per il menu (scala il disegno della mappa)
export function drawPortrait(canvas, character){
  const s = 5;
  canvas.width = 16*s; canvas.height = 17*s;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(s, s);
  drawActor(ctx, 0, 1, character, 'down', 0);
}

export function drawChest(ctx, x, y, opened){
  px(ctx, x+2, y+5, 12, 9, opened ? '#6e553f' : '#8a5a2b');
  px(ctx, x+2, y+5, 12, 3, opened ? '#5a4633' : '#a3743c');
  px(ctx, x+7, y+8, 2, 3, '#e8c558');
}
