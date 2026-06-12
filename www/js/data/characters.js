// Personaggi giocabili. base = statistiche a livello 1, growth = incremento per livello.
// learnset: abilità apprese a livelli fissi (stile Pokémon). limit: mossa Limite (HP < 30%).
// look: aspetto per gli sprite — h: tall|mid|short, build: slim|wide,
//       beard: 0|1|2, bald, baldTop (stempiato), longHair, tattoo, hair/eyes: colori.

export const CHARACTERS = {
  ste: {
    name:'Ste', className:'Mago', color:'#7e57ff',
    look:{ h:'tall', build:'slim', hair:'#3b2c20', eyes:'#1a1a2a' },
    desc:'Alto, magro e atletico, allievo prodigio dell’Accademia del Sacro Monte. Migliore amico di Riki da sempre, innamorato di Sofy. Calmo, ironico, letale con la magia.',
    base:{ hp:34, mp:24, atk:6, def:5, mag:13, spr:9, spd:7 },
    growth:{ hp:6.2, mp:3.6, atk:1.0, def:1.0, mag:2.7, spr:1.9, spd:1.3 },
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
    look:{ h:'mid', build:'wide', hair:'#101010', eyes:'#1a1a2a', beard:1, tattoo:true },
    desc:'Un metro e settanta di muscoli, braccia tatuate e barba curata. Migliore amico di Ste: dove va uno, va l’altro. La sua katana dello stile Shura non conosce esitazione.',
    base:{ hp:46, mp:14, atk:12, def:8, mag:4, spr:6, spd:9 },
    growth:{ hp:8.4, mp:2.0, atk:2.6, def:1.8, mag:0.8, spr:1.2, spd:1.6 },
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
    desc:'Moro, magro, barbetta sempre in ordine. Ladro gentiluomo di Vedano Olona e fidanzato di Elly (che lo tiene a bada). Dice di non aver mai perso una scommessa. Mente.',
    base:{ hp:40, mp:16, atk:10, def:6, mag:6, spr:7, spd:12 },
    growth:{ hp:7.0, mp:2.4, atk:2.2, def:1.4, mag:1.2, spr:1.4, spd:2.2 },
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
    base:{ hp:50, mp:12, atk:11, def:9, mag:5, spr:8, spd:8 },
    growth:{ hp:8.8, mp:1.8, atk:2.4, def:2.0, mag:1.0, spr:1.6, spd:1.5 },
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
    desc:'Un metro e sessanta di grinta, capelli rossi e occhi verdi che incantano — Ste può confermare: è la sua ragazza. Chierica della Collegiata di Castiglione: la sua luce guarisce gli amici e brucia le ombre.',
    base:{ hp:36, mp:26, atk:5, def:6, mag:11, spr:12, spd:7 },
    growth:{ hp:6.0, mp:3.8, atk:0.9, def:1.2, mag:2.3, spr:2.5, spd:1.2 },
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
    desc:'Mora, capelli lunghi e occhi castani; un metro e sessantasette di curve e mira infallibile. Custode dei boschi di Samarate e fidanzata di Fabri, che richiama all’ordine con un solo sguardo.',
    base:{ hp:38, mp:20, atk:9, def:6, mag:9, spr:9, spd:11 },
    growth:{ hp:6.6, mp:3.0, atk:1.9, def:1.3, mag:1.9, spr:1.7, spd:2.0 },
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
    desc:'Somiglia a Fabri, ma stempiato e con la barba ben più lunga. Ex cavatore di Samarate, braccia come tronchi, cuore d’oro: quello l’ha già dato a Vero. Quando si arrabbia, è meglio essere altrove.',
    base:{ hp:56, mp:10, atk:14, def:7, mag:3, spr:5, spd:6 },
    growth:{ hp:9.6, mp:1.6, atk:2.9, def:1.5, mag:0.6, spr:1.0, spd:1.2 },
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
    base:{ hp:35, mp:28, atk:5, def:5, mag:12, spr:10, spd:8 },
    growth:{ hp:5.8, mp:4.0, atk:0.9, def:1.1, mag:2.5, spr:2.1, spd:1.4 },
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
