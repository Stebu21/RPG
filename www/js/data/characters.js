// Personaggi giocabili. base = statistiche a livello 1, growth = incremento per livello.
// learnset: abilità apprese a livelli fissi (stile Pokémon). limit: mossa Limite (HP < 30%).
// look: aspetto per gli sprite — h: tall|mid|short, build: slim|wide,
//       beard: 0|1|2, bald, baldTop (stempiato), longHair, tattoo, hair/eyes: colori,
//       outfit: mage|samurai|bard|smith|fairy|healer|botanist (abito e oggetti caratteristici).

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
    name:'Fabri', className:'Bardo', color:'#27ae60',
    look:{ h:'mid', build:'slim', hair:'#1a1a1a', eyes:'#1a1a2a', beard:1, outfit:'bard' },
    desc:'Moro, magro, barbetta sempre in ordine, cappello con la piuma e liuto a tracolla. Bardo girovago della valle dell’Olona, sorpreso a «prendere in prestito» il sigillo della Collegiata per la sua nuova ballata; fidanzato di Elly (che lo tiene a bada). Dice di non aver mai stonato una nota. Mente.',
    base:{ hp:50, mp:24, atk:9, def:8, mag:12, spr:10, spd:14 },
    growth:{ hp:8.4, mp:3.6, atk:1.6, def:1.6, mag:2.4, spr:1.9, spd:2.4 },
    learnset:[
      { lv:1,  ab:'nota_tagliente' }, { lv:6,  ab:'ballata_coraggio' }, { lv:11, ab:'ninna_nanna' },
      { lv:16, ab:'mano_lesta' }, { lv:21, ab:'accordo_tuono' }, { lv:28, ab:'canto_ristoro' },
      { lv:38, ab:'marcia_trionfale' }, { lv:50, ab:'sonata_vento' }, { lv:66, ab:'requiem_bardo' },
    ],
    limit:'gran_finale',
  },
  pasq: {
    name:'Pasq', className:'Fabbro', color:'#e67e22',
    look:{ h:'mid', build:'wide', bald:true, hair:'#222222', eyes:'#3b7dd8', beard:2, outfit:'smith' },
    desc:'Spalle larghe da incudine, testa rasata a specchio, barba incolta e due occhi azzurri che valutano ogni lama. Fabbro di Castiglione e cavaliere templare: veste cotta di maglia e sopravveste con la croce rossa, e combatte con un’ascia che si è forgiato da solo. Parla poco, batte molto.',
    base:{ hp:68, mp:14, atk:15, def:14, mag:4, spr:8, spd:8 },
    growth:{ hp:11.6, mp:2.0, atk:3.0, def:2.7, mag:0.8, spr:1.6, spd:1.3 },
    learnset:[
      { lv:1,  ab:'martellata' }, { lv:6,  ab:'scintille' }, { lv:11, ab:'tempra_lama' },
      { lv:17, ab:'ferro_rovente' }, { lv:24, ab:'scudo_forgiato' }, { lv:33, ab:'maglio_tuono' },
      { lv:45, ab:'colata_fusa' }, { lv:60, ab:'martello_titano' },
    ],
    limit:'forgia_ardente',
  },
  sofy: {
    name:'Sofy', className:'Fata della Luce', color:'#f1c40f',
    look:{ h:'short', build:'slim', hair:'#c0392b', eyes:'#2e9e5b', longHair:true, outfit:'fairy' },
    desc:'Un metro e sessanta di grinta, capelli rossi, occhi verdi che incantano e due ali di luce dorata — Ste può confermare: è la sua ragazza. Fata della Luce, nata nei prati di Samarate: protegge gli operai delle officine, e la sua polvere brucia le ombre.',
    base:{ hp:44, mp:32, atk:5, def:7, mag:16, spr:13, spd:11 },
    growth:{ hp:7.2, mp:4.6, atk:0.9, def:1.3, mag:3.0, spr:2.5, spd:1.8 },
    learnset:[
      { lv:1,  ab:'polvere_fatata' }, { lv:5,  ab:'petali_luce' }, { lv:10, ab:'abbaglio' },
      { lv:16, ab:'raggio_aurora' }, { lv:22, ab:'scudo_ali' }, { lv:30, ab:'stella_cadente' },
      { lv:38, ab:'lacrima_fata' }, { lv:46, ab:'cerchio_fatato' }, { lv:56, ab:'tempesta_scintille' },
      { lv:70, ab:'sole_fatato' },
    ],
    limit:'danza_lucciole',
  },
  elly: {
    name:'Elly', className:'Curatrice', color:'#2ecc71',
    look:{ h:'mid', build:'slim', hair:'#2a1a10', eyes:'#7a4a21', longHair:true, outfit:'healer' },
    desc:'Elena, per tutti Elly: mora, capelli lunghi, occhi castani, veste bianca e borsa di bende e unguenti. Curatrice dell’ospedale di Castiglione, ha rimesso in piedi mezza valle dell’Olona; fidanzata di Fabri, che richiama all’ordine con un solo sguardo.',
    base:{ hp:50, mp:30, atk:6, def:8, mag:13, spr:15, spd:10 },
    growth:{ hp:8.2, mp:4.4, atk:1.0, def:1.6, mag:2.4, spr:3.0, spd:1.6 },
    learnset:[
      { lv:1,  ab:'cura' }, { lv:5,  ab:'luce_punitiva' }, { lv:10, ab:'benedizione' },
      { lv:15, ab:'curara' }, { lv:21, ab:'preghiera' }, { lv:27, ab:'rinascita' },
      { lv:34, ab:'curaga' }, { lv:42, ab:'sacra' }, { lv:62, ab:'grazia_eterna' },
    ],
    limit:'mani_guaritrici',
  },
  mirko: {
    name:'Mirko', className:'Botanico', color:'#c0392b',
    look:{ h:'mid', build:'wide', hair:'#1a1a1a', eyes:'#1a1a2a', beard:2, baldTop:true, outfit:'botanist' },
    desc:'Somiglia a Fabri, ma stempiato e con la barba ben più lunga; cappello di paglia, borsa piena di semi e falcetto alla cintura. Botanico del Castello di Jerago, cura il giardino del mastio e conosce ogni erba della brughiera. Cuore d’oro: quello l’ha già dato a Vero. Quando si arrabbia, fanno paura anche le ortiche.',
    base:{ hp:70, mp:22, atk:11, def:10, mag:12, spr:9, spd:7 },
    growth:{ hp:11.4, mp:3.2, atk:2.0, def:1.9, mag:2.4, spr:1.6, spd:1.2 },
    learnset:[
      { lv:1,  ab:'frustata_liana' }, { lv:6,  ab:'spore_velenose' }, { lv:11, ab:'erba_medica' },
      { lv:17, ab:'radici' }, { lv:24, ab:'fungo_soporifero' }, { lv:31, ab:'infuso_linfa' },
      { lv:40, ab:'rovo_gigante' }, { lv:52, ab:'polline_tempesta' }, { lv:66, ab:'quercia_millenaria' },
    ],
    limit:'giardino_primordiale',
  },
  vero: {
    name:'Vero', className:'Fata dei Sogni', color:'#9b59b6',
    look:{ h:'short', build:'wide', hair:'#0a0a0a', eyes:'#2a1a10', longHair:true, outfit:'fairy' },
    desc:'Veronica, per tutti Vero: un metro e cinquantacinque, morbida e solare, lunghi capelli neri e ali viola come l’ora del tramonto. Fata dei Sogni del Castello di Jerago e compagna di Mirko: la sua polvere addormenta i fantasmi del mastio, e i suoi sogni aprono porte che le chiavi non conoscono.',
    base:{ hp:46, mp:32, atk:6, def:7, mag:15, spr:12, spd:10 },
    growth:{ hp:7.6, mp:4.6, atk:1.0, def:1.4, mag:2.9, spr:2.4, spd:1.6 },
    learnset:[
      { lv:1,  ab:'scintilla_lunare' }, { lv:7,  ab:'sonno_fatato' }, { lv:13, ab:'rugiada' },
      { lv:20, ab:'bolle_lago' }, { lv:28, ab:'brezza_fatata' }, { lv:36, ab:'vortice_petali' },
      { lv:46, ab:'incubo' }, { lv:58, ab:'dono_fata' }, { lv:70, ab:'onda_sogni' },
    ],
    limit:'regno_fate',
  },
};


export const MAX_LEVEL = 100;
export const PARTY_MAX = 3;
