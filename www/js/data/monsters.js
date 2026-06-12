// Mostri. sprite = forma in sprites.js, pal = palette override.
// moves: mosse scelte a caso pesate da w. weak/resist: moltiplicatori elementali.

export const MONSTERS = {
  // ----- Zona 1: dintorni di Varese (lv 2-5) -----
  lumacone: {
    name:'Lumacone del Lago', sprite:'slime', pal:{ a:'#4aa3df', b:'#2471a3', c:'#d6eaf8' },
    level:2, hp:28, atk:7, def:4, mag:3, spr:3, spd:4, exp:14, gold:8,
    weak:['tuono'], resist:['acqua'],
    moves:[ {name:'Schianto viscido', type:'phys', power:6, element:'neutro', target:'enemy', w:3} ],
  },
  corvo: {
    name:'Corvo di Biumo', sprite:'bird', pal:{ a:'#2c3e50', b:'#1b2631', c:'#e74c3c' },
    level:3, hp:24, atk:9, def:3, mag:4, spr:4, spd:9, exp:16, gold:10,
    weak:['vento'], resist:['terra'],
    moves:[ {name:'Beccata', type:'phys', power:8, element:'neutro', target:'enemy', w:3},
            {name:'Stormo di piume', type:'phys', power:5, element:'vento', target:'enemies', w:1} ],
  },
  ratto: {
    name:'Ratto della Brughiera', sprite:'beast', pal:{ a:'#7f8c8d', b:'#566573', c:'#f0b27a' },
    level:3, hp:30, atk:8, def:5, mag:2, spr:3, spd:7, exp:15, gold:9,
    weak:['fuoco'], resist:[],
    moves:[ {name:'Morso', type:'phys', power:8, element:'neutro', target:'enemy', w:3} ],
  },

  // ----- Zona 2: Vedano e bosco dell'Olona (lv 5-9) -----
  lupo: {
    name:'Lupo dell’Olona', sprite:'beast', pal:{ a:'#85929e', b:'#34495e', c:'#f4f6f7' },
    level:6, hp:52, atk:14, def:7, mag:4, spr:5, spd:11, exp:34, gold:18,
    weak:['fuoco'], resist:['ghiaccio'],
    moves:[ {name:'Zanne', type:'phys', power:12, element:'neutro', target:'enemy', w:3},
            {name:'Ululato gelido', type:'mag', power:10, element:'ghiaccio', target:'enemy', w:1} ],
  },
  fungo: {
    name:'Fungo Stregato', sprite:'mushroom', pal:{ a:'#a569bd', b:'#6c3483', c:'#f5eef8' },
    level:6, hp:60, atk:10, def:9, mag:9, spr:8, spd:5, exp:36, gold:20,
    weak:['fuoco'], resist:['terra','acqua'],
    moves:[ {name:'Spore tossiche', type:'phys', power:8, element:'neutro', target:'enemy', status:{id:'veleno', chance:0.5}, w:2},
            {name:'Testata', type:'phys', power:11, element:'neutro', target:'enemy', w:2} ],
  },
  bandito: {
    name:'Bandito di Strada', sprite:'human', pal:{ a:'#935116', b:'#6e2c00', c:'#fadbd8' },
    level:7, hp:64, atk:15, def:8, mag:3, spr:5, spd:9, exp:40, gold:35,
    weak:[], resist:[],
    moves:[ {name:'Pugnalata', type:'phys', power:13, element:'neutro', target:'enemy', w:3},
            {name:'Sabbia negli occhi', type:'phys', power:7, element:'terra', target:'enemy', w:1} ],
  },
  boss_golem: {
    name:'Golem della Filanda', sprite:'golem', pal:{ a:'#a04000', b:'#6e2c00', c:'#f5b041' }, boss:true,
    level:9, hp:340, atk:18, def:13, mag:8, spr:8, spd:5, exp:220, gold:180,
    weak:['acqua','tuono'], resist:['fuoco','terra'],
    moves:[ {name:'Pugno di mattoni', type:'phys', power:16, element:'terra', target:'enemy', w:3},
            {name:'Vapore rovente', type:'mag', power:12, element:'fuoco', target:'enemies', w:2},
            {name:'Ingranaggio impazzito', type:'phys', power:22, element:'neutro', target:'enemy', w:1} ],
  },

  // ----- Zona 3: Castiglione Olona (lv 10-15) -----
  spettro: {
    name:'Spettro del Borgo', sprite:'ghost', pal:{ a:'#aab7b8', b:'#566573', c:'#85c1e9' },
    level:11, hp:78, atk:12, def:8, mag:16, spr:12, spd:10, exp:62, gold:30,
    weak:['sacro'], resist:['neutro','oscurita'],
    moves:[ {name:'Tocco gelido', type:'mag', power:14, element:'ghiaccio', target:'enemy', w:3},
            {name:'Lamento', type:'mag', power:10, element:'oscurita', target:'enemies', w:1} ],
  },
  gargoyle: {
    name:'Gargoyle della Collegiata', sprite:'gargoyle', pal:{ a:'#839192', b:'#515a5a', c:'#f7dc6f' },
    level:12, hp:96, atk:17, def:14, mag:8, spr:9, spd:8, exp:70, gold:38,
    weak:['tuono'], resist:['terra','neutro'],
    moves:[ {name:'Artiglio di pietra', type:'phys', power:15, element:'terra', target:'enemy', w:3},
            {name:'Picchiata', type:'phys', power:19, element:'vento', target:'enemy', w:1} ],
  },
  serpe: {
    name:'Serpe del Fiume', sprite:'snake', pal:{ a:'#229954', b:'#145a32', c:'#f9e79f' },
    level:12, hp:84, atk:16, def:9, mag:10, spr:8, spd:12, exp:66, gold:32,
    weak:['ghiaccio'], resist:['acqua'],
    moves:[ {name:'Morso velenoso', type:'phys', power:13, element:'neutro', target:'enemy', status:{id:'veleno', chance:0.5}, w:2},
            {name:'Frustata', type:'phys', power:16, element:'acqua', target:'enemy', w:2} ],
  },
  boss_cardinale: {
    name:'Ombra del Cardinale', sprite:'ghost', pal:{ a:'#922b21', b:'#641e16', c:'#f1c40f' }, boss:true,
    level:15, hp:620, atk:22, def:14, mag:24, spr:16, spd:11, exp:520, gold:420,
    weak:['sacro'], resist:['oscurita','neutro'],
    moves:[ {name:'Anatema', type:'mag', power:20, element:'oscurita', target:'enemy', w:3},
            {name:'Processione spettrale', type:'mag', power:15, element:'oscurita', target:'enemies', w:2},
            {name:'Sonno eterno', type:'status', power:0, element:'neutro', target:'enemy', status:{id:'sonno', chance:0.6}, w:1} ],
  },

  // ----- Zona 4: colline verso Jerago (lv 15-21) -----
  cavaliere: {
    name:'Cavaliere Errante', sprite:'knight', pal:{ a:'#85929e', b:'#2e4053', c:'#cb4335' },
    level:17, hp:130, atk:24, def:18, mag:8, spr:10, spd:9, exp:110, gold:64,
    weak:['tuono'], resist:['neutro'],
    moves:[ {name:'Spadone', type:'phys', power:20, element:'neutro', target:'enemy', w:3},
            {name:'Carica', type:'phys', power:26, element:'neutro', target:'enemy', w:1} ],
  },
  arpia: {
    name:'Arpia delle Colline', sprite:'bird', pal:{ a:'#af7ac5', b:'#6c3483', c:'#f9e79f' },
    level:17, hp:110, atk:21, def:11, mag:16, spr:12, spd:16, exp:104, gold:58,
    weak:['vento','tuono'], resist:['terra'],
    moves:[ {name:'Artigli', type:'phys', power:18, element:'neutro', target:'enemy', w:3},
            {name:'Canto stregato', type:'status', power:0, element:'neutro', target:'enemy', status:{id:'sonno', chance:0.5}, w:1},
            {name:'Raffica tagliente', type:'mag', power:14, element:'vento', target:'enemies', w:1} ],
  },
  cinghiale: {
    name:'Cinghiale Corazzato', sprite:'beast', pal:{ a:'#6e2c00', b:'#4a1e00', c:'#d5dbdb' },
    level:18, hp:150, atk:26, def:16, mag:5, spr:7, spd:8, exp:116, gold:60,
    weak:['fuoco'], resist:['terra'],
    moves:[ {name:'Zanne d’acciaio', type:'phys', power:22, element:'neutro', target:'enemy', w:3},
            {name:'Travolgimento', type:'phys', power:16, element:'terra', target:'enemies', w:1} ],
  },
  boss_cavaliere: {
    name:'Cavaliere Senza Tempo', sprite:'knight', pal:{ a:'#1b2631', b:'#0b0f19', c:'#8e44ad' }, boss:true,
    level:21, hp:1050, atk:30, def:22, mag:18, spr:16, spd:12, exp:980, gold:760,
    weak:['sacro','tuono'], resist:['oscurita','neutro'],
    moves:[ {name:'Lama delle Ere', type:'phys', power:26, element:'oscurita', target:'enemy', w:3},
            {name:'Assedio fantasma', type:'phys', power:18, element:'neutro', target:'enemies', w:2},
            {name:'Ora ferma', type:'status', power:0, element:'neutro', target:'enemy', status:{id:'sonno', chance:0.6}, w:1} ],
  },

  // ----- Zona 5: brughiera di Samarate (lv 21-27) -----
  automa: {
    name:'Automa della Cava', sprite:'golem', pal:{ a:'#7f8c8d', b:'#4d5656', c:'#e74c3c' },
    level:23, hp:190, atk:30, def:24, mag:12, spr:12, spd:9, exp:170, gold:96,
    weak:['tuono','acqua'], resist:['neutro','terra'],
    moves:[ {name:'Maglio idraulico', type:'phys', power:26, element:'neutro', target:'enemy', w:3},
            {name:'Scarica di bulloni', type:'phys', power:18, element:'neutro', target:'enemies', w:1} ],
  },
  falco_acciaio: {
    name:'Falco d’Acciaio', sprite:'bird', pal:{ a:'#aab7b8', b:'#717d7e', c:'#5dade2' },
    level:23, hp:160, atk:28, def:16, mag:18, spr:14, spd:20, exp:160, gold:88,
    weak:['tuono'], resist:['vento'],
    moves:[ {name:'Eliche rotanti', type:'phys', power:24, element:'vento', target:'enemy', w:3},
            {name:'Picchiata supersonica', type:'phys', power:32, element:'neutro', target:'enemy', w:1} ],
  },
  vespa: {
    name:'Vespa Gigante', sprite:'bug', pal:{ a:'#f1c40f', b:'#7d6608', c:'#17202a' },
    level:24, hp:150, atk:29, def:14, mag:10, spr:10, spd:18, exp:158, gold:84,
    weak:['fuoco','vento'], resist:[],
    moves:[ {name:'Pungiglione', type:'phys', power:24, element:'neutro', target:'enemy', status:{id:'veleno', chance:0.6}, w:3},
            {name:'Sciame', type:'phys', power:16, element:'neutro', target:'enemies', w:1} ],
  },
  boss_drago_acciaio: {
    name:'Drago d’Acciaio', sprite:'dragon', pal:{ a:'#85929e', b:'#34495e', c:'#e74c3c' }, boss:true,
    level:27, hp:1900, atk:38, def:28, mag:26, spr:20, spd:14, exp:2100, gold:1500,
    weak:['tuono'], resist:['neutro','fuoco','vento'],
    moves:[ {name:'Soffio di turbina', type:'mag', power:24, element:'fuoco', target:'enemies', w:2},
            {name:'Coda a frusta', type:'phys', power:32, element:'neutro', target:'enemy', w:3},
            {name:'Missile perduto', type:'phys', power:44, element:'fuoco', target:'enemy', w:1} ],
  },

  // ----- Zona 6: Sacro Monte (lv 28-36) -----
  guardiano: {
    name:'Guardiano di Pietra', sprite:'gargoyle', pal:{ a:'#935116', b:'#5b2c06', c:'#f4d03f' },
    level:30, hp:260, atk:38, def:32, mag:18, spr:18, spd:10, exp:300, gold:140,
    weak:['acqua','tuono'], resist:['terra','neutro'],
    moves:[ {name:'Macigno', type:'phys', power:34, element:'terra', target:'enemy', w:3},
            {name:'Frana', type:'phys', power:24, element:'terra', target:'enemies', w:1} ],
  },
  anima: {
    name:'Anima Penitente', sprite:'ghost', pal:{ a:'#d7bde2', b:'#7d3c98', c:'#f4f6f7' },
    level:31, hp:220, atk:26, def:18, mag:40, spr:28, spd:14, exp:290, gold:130,
    weak:['sacro'], resist:['oscurita','neutro','ghiaccio'],
    moves:[ {name:'Sussurro delle ore', type:'mag', power:30, element:'oscurita', target:'enemy', w:3},
            {name:'Coro dolente', type:'mag', power:22, element:'oscurita', target:'enemies', w:2} ],
  },
  chimera: {
    name:'Chimera del Crepuscolo', sprite:'dragon', pal:{ a:'#7d3c98', b:'#4a235a', c:'#f5b041' },
    level:33, hp:320, atk:42, def:26, mag:34, spr:22, spd:16, exp:360, gold:170,
    weak:['sacro'], resist:['fuoco','ghiaccio','tuono'],
    moves:[ {name:'Triplo soffio', type:'mag', power:26, element:'fuoco', target:'enemies', w:2},
            {name:'Artiglio del tramonto', type:'phys', power:38, element:'oscurita', target:'enemy', w:3} ],
  },
  // ----- BOSS FINALE -----
  boss_eterna: {
    name:'Eterna, Strega del Tempo', sprite:'witch', pal:{ a:'#4a235a', b:'#1a0b25', c:'#f1c40f' }, boss:true, final:true,
    level:38, hp:4200, atk:46, def:30, mag:52, spr:34, spd:18, exp:0, gold:0,
    weak:[], resist:['fuoco','ghiaccio','tuono','oscurita'],
    moves:[ {name:'Frecce del Tempo', type:'mag', power:34, element:'neutro', target:'enemy', w:3},
            {name:'Maelstrom delle Ere', type:'mag', power:26, element:'oscurita', target:'enemies', w:2},
            {name:'Clessidra Infranta', type:'mag', power:48, element:'neutro', target:'enemy', w:1},
            {name:'Sonno dei Secoli', type:'status', power:0, element:'neutro', target:'enemy', status:{id:'sonno', chance:0.5}, w:1} ],
    // fase 2 sotto il 50%: attivata in battle.js
    phase2:{ name:'Eterna Scatenata', pal:{ a:'#922b21', b:'#1a0b25', c:'#85c1e9' },
      moves:[ {name:'Compressione del Tempo', type:'mag', power:36, element:'oscurita', target:'enemies', w:3},
              {name:'Giudizio dell’Eternità', type:'mag', power:58, element:'neutro', target:'enemy', w:2},
              {name:'Vento del Nulla', type:'mag', power:30, element:'vento', target:'enemies', w:1} ] },
  },
};

// Zone di incontri casuali: liste pesate + dimensione gruppo
export const ZONES = {
  varese:      { monsters:['lumacone','corvo','ratto'], min:1, max:2, rate:0.10 },
  vedano:      { monsters:['lupo','fungo','bandito'], min:1, max:2, rate:0.11 },
  castiglione: { monsters:['spettro','gargoyle','serpe'], min:1, max:3, rate:0.11 },
  jerago:      { monsters:['cavaliere','arpia','cinghiale'], min:1, max:3, rate:0.11 },
  samarate:    { monsters:['automa','falco_acciaio','vespa'], min:1, max:3, rate:0.12 },
  sacromonte:  { monsters:['guardiano','anima','chimera'], min:1, max:3, rate:0.14 },
};
