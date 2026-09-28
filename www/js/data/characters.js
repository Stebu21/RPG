// Personaggi giocabili. base = statistiche a livello 1, growth = incremento per livello.
// learnset: abilità apprese a livelli fissi (stile Pokémon). limit: mossa Limite (HP < 30%).
// look: aspetto per gli sprite — h: tall|mid|short, build: slim|wide,
//       beard: 0|1|2, bald, baldTop (stempiato), longHair, tattoo, hair/eyes: colori.

export const CHARACTERS = {
  ste: {
    name:'Ste', className:'Mago', color:'#7e57ff',
    look:{ h:'tall', build:'slim', hair:'#2c2118', eyes:'#1a1a2a', beard:1, hairStyle:'quiff', outfit:'mage' },
    desc:'Alto, magro e atletico, barbetta curata e sguardo che non perde un dettaglio. Allievo prodigio dell’Accademia del Sacro Monte, migliore amico di Riki da sempre, innamorato di Sofy. Calmo, ironico, letale con la magia.',
    base:{ hp:46, mp:28, atk:7, def:7, mag:16, spr:11, spd:8 },
    growth:{ hp:8.0, mp:4.2, atk:1.2, def:1.3, mag:3.2, spr:2.2, spd:1.4 },
    learnset:[
      { lv:1,  ab:'dardo_arcano' }, { lv:5,  ab:'fiamma' }, { lv:9,  ab:'gelo' },
      { lv:13, ab:'folgore' },      { lv:18, ab:'incendio' }, { lv:24, ab:'tormenta' },
      { lv:30, ab:'tempesta_ionica' }, { lv:38, ab:'frattura_astrale' },
      { lv:48, ab:'meteora' }, { lv:60, ab:'zero_assoluto' }, { lv:75, ab:'apocalisse' },
    ],
    limit:'fine_del_tempo',
  },
  riki: {
    name:'Riki', className:'Samurai', color:'#e74c3c',
    look:{ h:'short', build:'wide', hair:'#101010', eyes:'#1a1a2a', beard:3, tattoo:true, hairStyle:'tied', outfit:'samurai' },
    desc:'Un metro e settanta di muscoli, più basso e massiccio di Ste, capelli lunghi legati indietro, braccia tatuate e barba lunga. Migliore amico di Ste: dove va uno, va l’altro. La sua katana dello stile Shura non conosce esitazione.',
    base:{ hp:62, mp:16, atk:15, def:11, mag:4, spr:7, spd:10 },
    growth:{ hp:10.8, mp:2.2, atk:3.1, def:2.2, mag:0.8, spr:1.4, spd:1.7 },
    learnset:[
      { lv:1,  ab:'fendente' }, { lv:6,  ab:'iaijutsu' }, { lv:12, ab:'lama_del_vento' },
      { lv:20, ab:'danza_lune' }, { lv:28, ab:'taglio_sismico' }, { lv:36, ab:'zantetsuken' },
      { lv:46, ab:'getsuga' }, { lv:58, ab:'mille_petali' }, { lv:72, ab:'lama_divina' },
    ],
    limit:'tsurugi_eclissi',
  },
  fabri: {
    name:'Fabri', className:'Pistolero', color:'#27ae60',
    look:{ h:'mid', build:'slim', hair:'#1a1a1a', eyes:'#1a1a2a', beard:1 },
    desc:'Moro, magro, barbetta sempre in ordine. Ladro gentiluomo della valle dell’Olona, sorpreso a «prendere in custodia» il sigillo della Collegiata; fidanzato di Elly (che lo tiene a bada). Dice di non aver mai perso una scommessa. Mente.',
    base:{ hp:52, mp:18, atk:13, def:8, mag:6, spr:8, spd:14 },
    growth:{ hp:8.8, mp:2.6, atk:2.6, def:1.7, mag:1.2, spr:1.6, spd:2.4 },
    learnset:[
      { lv:1,  ab:'colpo_rapido' }, { lv:8,  ab:'proiettile_mirato' }, { lv:14, ab:'mano_lesta' },
      { lv:22, ab:'raffica' }, { lv:30, ab:'polvere_nera' }, { lv:42, ab:'colpo_ombra' },
      { lv:56, ab:'roulette' }, { lv:70, ab:'requiem_piombo' },
    ],
    limit:'sette_pallottole',
  },
  pasq: {
    name:'Pasq', className:'Monaco', color:'#e67e22',
    look:{ h:'mid', build:'slim', bald:true, hair:'#222222', eyes:'#3b7dd8' },
    desc:'Fisico asciutto come Fabri, testa rasata a specchio e due occhi azzurri che leggono dentro. Monaco errante di Castiglione: parla poco, colpisce molto.',
    base:{ hp:66, mp:14, atk:14, def:12, mag:5, spr:9, spd:9 },
    growth:{ hp:11.2, mp:2.0, atk:2.9, def:2.4, mag:1.0, spr:1.8, spd:1.6 },
    learnset:[
      { lv:1,  ab:'pugno' }, { lv:7,  ab:'calcio_rotante' }, { lv:15, ab:'palmo_onda' },
      { lv:23, ab:'concentrazione' }, { lv:31, ab:'raffica_pugni' }, { lv:44, ab:'pugno_drago' },
      { lv:58, ab:'centopugni' }, { lv:72, ab:'colpo_nirvana' },
    ],
    limit:'asura',
  },
  sofy: {
    name:'Sofy', className:'Chierica', color:'#f1c40f',
    look:{ h:'short', build:'slim', hair:'#c0392b', eyes:'#2e9e5b', longHair:true },
    desc:'Un metro e sessanta di grinta, capelli rossi e occhi verdi che incantano — Ste può confermare: è la sua ragazza. Chierica della Collegiata di Castiglione, mandata a Samarate a proteggere gli operai delle officine: la sua luce guarisce gli amici e brucia le ombre.',
    base:{ hp:48, mp:30, atk:6, def:8, mag:14, spr:14, spd:8 },
    growth:{ hp:7.8, mp:4.4, atk:1.0, def:1.5, mag:2.7, spr:2.9, spd:1.3 },
    learnset:[
      { lv:1,  ab:'cura' }, { lv:7,  ab:'luce_punitiva' }, { lv:12, ab:'benedizione' },
      { lv:18, ab:'curara' }, { lv:24, ab:'sacra' }, { lv:32, ab:'preghiera' },
      { lv:40, ab:'curaga' }, { lv:45, ab:'rinascita' }, { lv:55, ab:'giudizio' },
      { lv:70, ab:'grazia_eterna' },
    ],
    limit:'aurora_divina',
  },
  elly: {
    name:'Elly', className:'Arciera Druida', color:'#2ecc71',
    look:{ h:'mid', build:'slim', hair:'#2a1a10', eyes:'#7a4a21', longHair:true },
    desc:'Mora, capelli lunghi e occhi castani; un metro e sessantasette di curve e mira infallibile. Custode dei boschi dell’Olona a Castiglione e fidanzata di Fabri, che richiama all’ordine con un solo sguardo.',
    base:{ hp:50, mp:22, atk:12, def:8, mag:11, spr:10, spd:13 },
    growth:{ hp:8.4, mp:3.3, atk:2.3, def:1.6, mag:2.2, spr:1.9, spd:2.2 },
    learnset:[
      { lv:1,  ab:'freccia' }, { lv:6,  ab:'spine' }, { lv:13, ab:'freccia_veleno' },
      { lv:21, ab:'pioggia_frecce' }, { lv:29, ab:'abbraccio_gaia' }, { lv:40, ab:'freccia_quercia' },
      { lv:54, ab:'tempesta_silvana' }, { lv:68, ab:'giudizio_foresta' },
    ],
    limit:'canto_foresta',
  },
  mirko: {
    name:'Mirko', className:'Berserker', color:'#c0392b',
    look:{ h:'mid', build:'wide', hair:'#1a1a1a', eyes:'#1a1a2a', beard:2, baldTop:true },
    desc:'Somiglia a Fabri, ma stempiato e con la barba ben più lunga. Ex cavatore di Jerago, braccia come tronchi, cuore d’oro: quello l’ha già dato a Vero. Quando si arrabbia, è meglio essere altrove.',
    base:{ hp:74, mp:12, atk:18, def:9, mag:3, spr:6, spd:7 },
    growth:{ hp:12.2, mp:1.8, atk:3.5, def:1.8, mag:0.6, spr:1.2, spd:1.3 },
    learnset:[
      { lv:1,  ab:'colpo_ascia' }, { lv:9,  ab:'urlo_guerra' }, { lv:16, ab:'spaccaossa' },
      { lv:25, ab:'vortice_acciaio' }, { lv:34, ab:'frenesia' }, { lv:47, ab:'terremoto' },
      { lv:60, ab:'colpo_titano' }, { lv:74, ab:'ira_primordiale' },
    ],
    limit:'furia_vulcano',
  },
  vero: {
    name:'Vero', className:'Evocatrice', color:'#9b59b6',
    look:{ h:'short', build:'wide', hair:'#0a0a0a', eyes:'#2a1a10', longHair:true },
    desc:'Un metro e cinquantacinque, morbida e solare, lunghi capelli neri e occhi scuri. Custode del Castello di Jerago e compagna di Mirko. La sua voce apre porte che le chiavi non conoscono.',
    base:{ hp:46, mp:32, atk:6, def:7, mag:15, spr:12, spd:9 },
    growth:{ hp:7.6, mp:4.6, atk:1.0, def:1.4, mag:2.9, spr:2.4, spd:1.5 },
    learnset:[
      { lv:1,  ab:'nota_stonata' }, { lv:8,  ab:'ninnananna' }, { lv:15, ab:'sinfonia_curativa' },
      { lv:23, ab:'evoca_salamandra' }, { lv:33, ab:'evoca_ondina' }, { lv:45, ab:'evoca_silfide' },
      { lv:57, ab:'inno_vittoria' }, { lv:70, ab:'evoca_leviatano' },
    ],
    limit:'rapsodia_astrali',
  },
};

export const MAX_LEVEL = 100;
export const PARTY_MAX = 3;
