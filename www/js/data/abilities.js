// Abilità: type = 'phys' | 'mag' | 'heal' | 'healall' | 'revive' | 'buff' | 'status' | 'steal'
// target = 'enemy' | 'enemies' | 'ally' | 'allies' | 'self'
// element: fuoco, ghiaccio, tuono, vento, terra, acqua, sacro, oscurita, neutro
// hits: numero di colpi (default 1). buff: {stat:'atk'|'def', mult, turns}
// status: {id:'veleno'|'sonno', chance}

export const ABILITIES = {
  // ------- attacco base -------
  attacco: { name:'Attacca', mp:0, type:'phys', power:0, element:'neutro', target:'enemy' },

  // ------- STE (Mago) -------
  dardo_arcano:    { name:'Dardo Arcano', mp:3, type:'mag', power:14, element:'neutro', target:'enemy', desc:'Proiettile di pura energia.' },
  fiamma:          { name:'Fiamma', mp:5, type:'mag', power:24, element:'fuoco', target:'enemy', desc:'Una lingua di fuoco avvolge il nemico.' },
  gelo:            { name:'Gelo', mp:5, type:'mag', power:24, element:'ghiaccio', target:'enemy', desc:'Schegge di ghiaccio tagliente.' },
  folgore:         { name:'Folgore', mp:5, type:'mag', power:24, element:'tuono', target:'enemy', desc:'Un fulmine cala dal cielo.' },
  incendio:        { name:'Incendio', mp:11, type:'mag', power:30, element:'fuoco', target:'enemies', desc:'Un mare di fiamme travolge i nemici.' },
  tormenta:        { name:'Tormenta', mp:11, type:'mag', power:30, element:'ghiaccio', target:'enemies', desc:'Bufera glaciale su tutti i nemici.' },
  tempesta_ionica: { name:'Tempesta Ionica', mp:14, type:'mag', power:38, element:'tuono', target:'enemies', desc:'Pioggia di fulmini.' },
  frattura_astrale:{ name:'Frattura Astrale', mp:18, type:'mag', power:62, element:'neutro', target:'enemy', desc:'Spacca lo spazio attorno al bersaglio.' },
  meteora:         { name:'Meteora', mp:26, type:'mag', power:55, element:'neutro', target:'enemies', desc:'Frammenti di stelle cadono sul campo.' },
  zero_assoluto:   { name:'Zero Assoluto', mp:30, type:'mag', power:95, element:'ghiaccio', target:'enemy', desc:'Il gelo che ferma persino il tempo.' },
  apocalisse:      { name:'Apocalisse', mp:44, type:'mag', power:85, element:'oscurita', target:'enemies', desc:'L’incantesimo proibito dell’Accademia.' },
  fine_del_tempo:  { name:'LIMITE: Fine del Tempo', mp:0, type:'mag', power:120, element:'neutro', target:'enemies', limit:true, desc:'Ste piega le ore: tutto si spezza.' },

  // ------- RIKI (Samurai) -------
  fendente:        { name:'Fendente', mp:2, type:'phys', power:12, element:'neutro', target:'enemy', desc:'Taglio netto di katana.' },
  iaijutsu:        { name:'Iaijutsu', mp:5, type:'phys', power:22, element:'neutro', target:'enemy', crit:0.35, desc:'Estrazione fulminea: alta probabilità di critico.' },
  lama_del_vento:  { name:'Lama del Vento', mp:7, type:'phys', power:28, element:'vento', target:'enemy', desc:'Un fendente che viaggia col vento.' },
  danza_lune:      { name:'Danza delle Quattro Lune', mp:12, type:'phys', power:13, hits:4, element:'neutro', target:'enemy', desc:'Quattro tagli in un respiro.' },
  taglio_sismico:  { name:'Taglio Sismico', mp:14, type:'phys', power:34, element:'terra', target:'enemies', desc:'La lama incide la terra stessa.' },
  zantetsuken:     { name:'Zantetsuken', mp:18, type:'phys', power:70, element:'neutro', target:'enemy', crit:0.25, desc:'Il taglio che divide il ferro.' },
  getsuga:         { name:'Getsuga del Crepuscolo', mp:24, type:'phys', power:88, element:'oscurita', target:'enemy', desc:'Una mezzaluna di energia oscura.' },
  mille_petali:    { name:'Mille Petali di Ciliegio', mp:30, type:'phys', power:30, hits:3, element:'neutro', target:'enemies', desc:'Una tempesta di lame come petali.' },
  lama_divina:     { name:'Stile Shura: Lama Divina', mp:42, type:'phys', power:130, element:'sacro', target:'enemy', desc:'La tecnica segreta dello stile Shura.' },
  tsurugi_eclissi: { name:'LIMITE: Tsurugi dell’Eclissi', mp:0, type:'phys', power:115, hits:2, element:'oscurita', target:'enemy', limit:true, desc:'Riki sfodera la lama che oscura il sole.' },

  // ------- SOFY (Chierica) -------
  cura:            { name:'Cura', mp:4, type:'heal', power:30, target:'ally', desc:'Ripristina un po’ di HP.' },
  luce_punitiva:   { name:'Luce Punitiva', mp:5, type:'mag', power:22, element:'sacro', target:'enemy', desc:'Raggio di luce consacrata.' },
  benedizione:     { name:'Benedizione', mp:8, type:'buff', buff:{stat:'def', mult:1.5, turns:4}, target:'allies', desc:'Aumenta la difesa della squadra.' },
  curara:          { name:'Curara', mp:9, type:'heal', power:80, target:'ally', desc:'Ripristina molti HP.' },
  sacra:           { name:'Sacra', mp:16, type:'mag', power:60, element:'sacro', target:'enemy', desc:'La collera serena del cielo.' },
  preghiera:       { name:'Preghiera del Mattino', mp:18, type:'healall', power:55, target:'allies', desc:'Cura tutta la squadra.' },
  curaga:          { name:'Curaga', mp:20, type:'heal', power:190, target:'ally', desc:'Ripristina moltissimi HP.' },
  rinascita:       { name:'Rinascita', mp:24, type:'revive', power:0.5, target:'ally', desc:'Rianima un alleato KO.' },
  giudizio:        { name:'Giudizio Celeste', mp:32, type:'mag', power:75, element:'sacro', target:'enemies', desc:'La luce giudica ogni nemico.' },
  grazia_eterna:   { name:'Grazia Eterna', mp:48, type:'healall', power:280, target:'allies', desc:'Una cascata di luce risana tutti.' },
  aurora_divina:   { name:'LIMITE: Aurora Divina', mp:0, type:'healall', power:400, revive:true, target:'allies', limit:true, desc:'Sofy invoca l’alba che guarisce ogni ferita.' },

  // ------- FABRI (Pistolero) -------
  colpo_rapido:    { name:'Colpo Rapido', mp:2, type:'phys', power:12, element:'neutro', target:'enemy', desc:'Un colpo dalla fondina.' },
  proiettile_mirato:{ name:'Proiettile Mirato', mp:6, type:'phys', power:24, element:'neutro', target:'enemy', crit:0.4, desc:'Mira al punto debole.' },
  mano_lesta:      { name:'Mano Lesta', mp:4, type:'steal', power:8, element:'neutro', target:'enemy', desc:'Colpisce e ruba oro.' },
  raffica:         { name:'Raffica', mp:12, type:'phys', power:12, hits:4, element:'neutro', target:'enemy', desc:'Quattro colpi a ripetizione.' },
  polvere_nera:    { name:'Polvere Nera', mp:15, type:'phys', power:36, element:'fuoco', target:'enemies', desc:'Un’esplosione di polvere da sparo.' },
  colpo_ombra:     { name:'Colpo dell’Ombra', mp:20, type:'phys', power:68, element:'oscurita', target:'enemy', desc:'Il proiettile che nessuno vede partire.' },
  roulette:        { name:'Roulette Infernale', mp:26, type:'phys', power:55, vary:1.8, element:'neutro', target:'enemy', desc:'Danno imprevedibile, a volte devastante.' },
  requiem_piombo:  { name:'Requiem di Piombo', mp:36, type:'phys', power:72, element:'neutro', target:'enemies', desc:'L’ultima sinfonia del revolver.' },
  sette_pallottole:{ name:'LIMITE: Sette Pallottole del Destino', mp:0, type:'phys', power:34, hits:7, element:'neutro', target:'enemy', limit:true, desc:'Sette colpi, nessun errore.' },

  // ------- PASQ (Monaco) -------
  pugno:           { name:'Pugno', mp:2, type:'phys', power:13, element:'neutro', target:'enemy', desc:'Un pugno ben assestato.' },
  calcio_rotante:  { name:'Calcio Rotante', mp:7, type:'phys', power:18, element:'neutro', target:'enemies', desc:'Colpisce tutti i nemici vicini.' },
  palmo_onda:      { name:'Palmo dell’Onda', mp:9, type:'phys', power:30, element:'acqua', target:'enemy', desc:'Il ki scorre come acqua.' },
  concentrazione:  { name:'Concentrazione', mp:6, type:'buff', buff:{stat:'atk', mult:1.5, turns:4}, target:'self', desc:'Aumenta il proprio attacco.' },
  raffica_pugni:   { name:'Raffica di Pugni', mp:14, type:'phys', power:14, hits:4, element:'neutro', target:'enemy', desc:'Una gragnola di colpi.' },
  pugno_drago:     { name:'Pugno del Drago', mp:20, type:'phys', power:70, element:'fuoco', target:'enemy', desc:'Il pugno che brucia come drago.' },
  centopugni:      { name:'Centopugni', mp:28, type:'phys', power:22, hits:5, element:'neutro', target:'enemy', desc:'Le mani scompaiono alla vista.' },
  colpo_nirvana:   { name:'Colpo del Nirvana', mp:40, type:'phys', power:125, element:'sacro', target:'enemy', desc:'Un colpo, l’illuminazione.' },
  asura:           { name:'LIMITE: Asura Scatenato', mp:0, type:'phys', power:60, hits:3, element:'neutro', target:'enemies', limit:true, desc:'Pasq libera i sei bracci dell’Asura.' },

  // ------- ELLY (Arciera druida) -------
  freccia:         { name:'Freccia', mp:2, type:'phys', power:12, element:'neutro', target:'enemy', desc:'Tiro preciso.' },
  spine:           { name:'Spine Rampicanti', mp:5, type:'mag', power:20, element:'terra', target:'enemy', desc:'Rovi emergono dal suolo.' },
  freccia_veleno:  { name:'Freccia Avvelenata', mp:8, type:'phys', power:18, element:'neutro', target:'enemy', status:{id:'veleno', chance:0.8}, desc:'Avvelena il bersaglio.' },
  pioggia_frecce:  { name:'Pioggia di Frecce', mp:13, type:'phys', power:30, element:'neutro', target:'enemies', desc:'Il cielo si riempie di dardi.' },
  abbraccio_gaia:  { name:'Abbraccio di Gaia', mp:12, type:'heal', power:90, target:'ally', desc:'La natura risana le ferite.' },
  freccia_quercia: { name:'Freccia di Quercia', mp:18, type:'phys', power:65, element:'terra', target:'enemy', desc:'Un dardo benedetto dal bosco antico.' },
  tempesta_silvana:{ name:'Tempesta Silvana', mp:26, type:'mag', power:62, element:'vento', target:'enemies', desc:'La furia della foresta.' },
  giudizio_foresta:{ name:'Giudizio della Foresta', mp:36, type:'mag', power:118, element:'terra', target:'enemy', desc:'Le radici del mondo reclamano il nemico.' },
  canto_foresta:   { name:'LIMITE: Canto della Foresta Antica', mp:0, type:'mag', power:95, element:'terra', target:'enemies', limit:true, desc:'Elly intona il canto che muove gli alberi.' },

  // ------- MIRKO (Berserker) -------
  colpo_ascia:     { name:'Colpo d’Ascia', mp:2, type:'phys', power:14, element:'neutro', target:'enemy', desc:'Un colpo pesante.' },
  urlo_guerra:     { name:'Urlo di Guerra', mp:5, type:'buff', buff:{stat:'atk', mult:1.6, turns:4}, target:'self', desc:'Aumenta molto il proprio attacco.' },
  spaccaossa:      { name:'Spaccaossa', mp:9, type:'phys', power:34, element:'neutro', target:'enemy', desc:'Mira alle giunture.' },
  vortice_acciaio: { name:'Vortice d’Acciaio', mp:14, type:'phys', power:32, element:'neutro', target:'enemies', desc:'L’ascia gira come un ciclone.' },
  frenesia:        { name:'Frenesia', mp:18, type:'phys', power:24, hits:3, element:'neutro', target:'enemy', vary:1.4, desc:'Colpi selvaggi e imprevedibili.' },
  terremoto:       { name:'Terremoto', mp:24, type:'phys', power:58, element:'terra', target:'enemies', desc:'Il suolo si spacca sotto i nemici.' },
  colpo_titano:    { name:'Colpo del Titano', mp:32, type:'phys', power:120, element:'neutro', target:'enemy', desc:'La forza di un gigante.' },
  ira_primordiale: { name:'Ira Primordiale', mp:44, type:'phys', power:88, element:'fuoco', target:'enemies', desc:'Rabbia antica quanto la montagna.' },
  furia_vulcano:   { name:'LIMITE: Furia del Vulcano', mp:0, type:'phys', power:135, element:'fuoco', target:'enemies', limit:true, desc:'Mirko erutta come il Campo dei Fiori in collera.' },

  // ------- VERO (Evocatrice) -------
  nota_stonata:    { name:'Nota Stonata', mp:3, type:'mag', power:14, element:'neutro', target:'enemy', desc:'Un acuto che ferisce.' },
  ninnananna:      { name:'Ninnananna', mp:7, type:'status', power:0, element:'neutro', target:'enemy', status:{id:'sonno', chance:0.7}, desc:'Addormenta il nemico.' },
  sinfonia_curativa:{ name:'Sinfonia Curativa', mp:12, type:'healall', power:40, target:'allies', desc:'Una melodia che rimargina.' },
  evoca_salamandra:{ name:'Evoca: Salamandra', mp:16, type:'mag', power:42, element:'fuoco', target:'enemies', desc:'Lo spirito del fuoco danza sul campo.' },
  evoca_ondina:    { name:'Evoca: Ondina', mp:20, type:'mag', power:52, element:'acqua', target:'enemies', desc:'La dama delle acque del lago.' },
  evoca_silfide:   { name:'Evoca: Silfide', mp:26, type:'mag', power:64, element:'vento', target:'enemies', desc:'Il sospiro del vento delle Prealpi.' },
  inno_vittoria:   { name:'Inno della Vittoria', mp:18, type:'buff', buff:{stat:'atk', mult:1.4, turns:4}, target:'allies', desc:'Aumenta l’attacco della squadra.' },
  evoca_leviatano: { name:'Evoca: Leviatano del Lago', mp:42, type:'mag', power:100, element:'acqua', target:'enemies', desc:'Il signore del Lago di Varese emerge.' },
  rapsodia_astrali:{ name:'LIMITE: Rapsodia degli Astrali', mp:0, type:'mag', power:110, element:'neutro', target:'enemies', limit:true, desc:'Vero chiama tutti gli spiriti in un solo accordo.' },
};

export const STATUS_NAMES = { veleno:'Veleno', sonno:'Sonno' };
