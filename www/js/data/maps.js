// Mappe a tile. Legenda:
// ^ montagna  T albero  ~ acqua  # muro  (bloccanti)
// . erba  , erba alta (incontri)  = strada  : pavé  F fiori  B ponte  D porta (camminabili)
// 1-5 = paesi (portali)  S = Sacro Monte  A = Accademia
// I trigger (porte, NPC, forzieri, eventi) sono definiti per coordinate.

export const MAPS = {

  world: {
    name:'Provincia di Varese', music:'world', town:false,
    spawn:{ x:24, y:10 },
    tiles:[
      '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
      '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
      '^^^^^^^^^S^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
      '^^^^^^^^^=^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
      '^^^,,,,,,=,,,,^^^^,,,,,,,,,,,,,^^^^^^^^^^^^^^^^^^^^^^^^^^',
      '^^,,T,,,,=,,T,,,^^,,,,T,,,,,,,,,T,,^^^^^^^^^^^^^^^^^^^^^^',
      '^^,,,,,,,================,,,,,,,,,,,,,^^^^^^^^^^^^^^^^^^^',
      '^,T,,,,,,,,,,,,T,,,,,,,,=,,,,,T,,,,,,,,,,,^^^^^^^^^^^^^^^',
      '^,,,,,,,,T,,,,,,,,,,,,,,=,,,,,,,,,T~,,,,,,,,,,^^^^^^^^^^^',
      '^,,,,,,,,,,,,,,,,,,,,,,,1,,,,,,,,,,~,,,,,,,,,,,^^^^^^^^^^',
      '^,,,~~~~~~,,,,,,,,,,,,,,=,,,,,,,,,,~,,,,,,T,,,,,,^^^^^^^^',
      '^,,~~~~~~~~~~,,,,,,,,,,,=,,,,,,,,,,~,,,,,,,,,,,,,^^^^^^^^',
      '^,,~~~~~~~~~~~,,,,,,T,,,=,,,,,,,,,,~,,,,T,,,,,,,,^^^^^^^^',
      '^,,~~~~~~~~~~~,,,,,,,,,,========,,,~,,,,,,,,,,,,,^^^^^^^^',
      '^,,,~~~~~~~~~,,,,,,,,,,,,,,,,,,=,,,~,,,,,,,,,,,,,,^^^^^^^',
      '^,,,,~~~~~~~,,,,,,,,,,,,,,,,,,,=,,,~,,,,,,,,,,,,,,,^^^^^^',
      '^,,,,,~~~~,,,,,,,,,,,,,,,,,,,,,=,,,~,,T,,T,,,,,,,,^^^^^^^',
      '^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,2,,,~,,,T,,,T,,,,,^^^^^^^^',
      '^,,,,,,,,T,,,,,,,,,,,,,,,,,,,,,=,,,~,,T,T,,T,,,,,^^^^^^^^',
      '^,,,,,,,,,,,,,,,,,T,,,,,,,,,,,,=,,,~,,,,T,,,,,,,,^^^^^^^^',
      '^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,=,,,B,,,,,,,,,,,,,^^^^^^^^',
      '^,,,,T,,,,,,,,,,,,,,,,,,,,,,,,,=,,,~,,T,,,T,,,,,,^^^^^^^^',
      '^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,=,,,~,,,,T,,,,,,,,^^^^^^^^',
      '^,,,,,,,,,,,T,,,,,,,,,,,,,,,,,,=,,,~,,,,,,,,,,,,,^^^^^^^^',
      '^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,3,,,~,,,,,,,,,,,,,^^^^^^^^',
      '^,,,,,,,,,,,,,,,,,,============,=,,~,,,,,,,,,,,,,^^^^^^^^',
      '^,,,,,T,,,,,,,,,,,,=,,,,,,,,,,,,,,,~,T,,,,,,,,,,,^^^^^^^^',
      '^,,,,,,,,,,,,,,,,,,=,,,,,T,,,,,,,,,~,,,,,T,,,,,,,^^^^^^^^',
      '^,,,,,,,,T,,,,,,,,,=,,,,,,,,,,,,,,,~,,,,,,,,,,,,,^^^^^^^^',
      '^,,,,,,,,,,,,,,,,,,=,,,,,,,,,,,,,,,~,,,,,,,,,,,,,^^^^^^^^',
      '^,,,,,,,,,,,,,,,,,,4,,,,,,,,,,,,,,,~,,,,,,,,,,,,,^^^^^^^^',
      '^,,,T,,,,,,,,,,,,,,=,,,,T,,,,,,,,,,~,,,,,,,,,,,,,^^^^^^^^',
      '^,,,,,,,,,,,,,,,,,,=,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^^',
      '^,,,,,,,,===========,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^^',
      '^,,,,,,,,=,,,,,,,,,,,,T,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^^',
      '^,,,,,,,,5,,,,,,,,,,,,,,,,,T,,,,,,,,,,,,,,,,,,,,,^^^^^^^^',
      '^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^^',
      '^,,,T,,,,,,,,,T,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^^',
      '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
      '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
    ],
    // zone di incontro: il primo rettangolo che contiene (x,y) vince
    zones:[
      { x:0,  y:0,  w:22, h:8,  zone:'sacromonte' },
      { x:22, y:0,  w:36, h:13, zone:'varese' },
      { x:0,  y:8,  w:22, h:14, zone:'varese' },
      { x:22, y:13, w:36, h:8,  zone:'vedano' },
      { x:22, y:21, w:36, h:19, zone:'castiglione' },
      { x:12, y:25, w:10, h:9,  zone:'jerago' },
      { x:0,  y:30, w:16, h:10, zone:'samarate' },
      { x:0,  y:22, w:22, h:18, zone:'jerago' },
    ],
    triggers:[
      { x:24, y:9,  type:'portal', to:{ map:'varese', x:17, y:22 } },
      { x:31, y:17, type:'portal', to:{ map:'vedano', x:13, y:18 } },
      { x:31, y:24, type:'portal', to:{ map:'castiglione', x:16, y:18 } },
      { x:19, y:30, type:'portal', to:{ map:'jerago', x:9, y:16 } },
      { x:9,  y:35, type:'portal', to:{ map:'samarate', x:8, y:16 } },
      { x:9,  y:2,  type:'portal', to:{ map:'sacromonte', x:11, y:23 }, needSigilli:4,
        lockedMsg:'Una barriera di luce sbarra la salita al Sacro Monte. Servono i Quattro Sigilli delle Ore.' },
      { x:40, y:20, type:'chest', id:'w_pineta', item:'granpozione', qty:2 },
      { x:44, y:8,  type:'chest', id:'w_nordest', item:'etere', qty:2 },
      { x:4,  y:32, type:'chest', id:'w_sudovest', item:'coda_fenice', qty:1 },
      { x:38, y:14, type:'chest', id:'w_vernice1', item:'vernice', qty:1 },
      { x:27, y:20, type:'chest', id:'w_vernice2', item:'vernice', qty:1 },
    ],
  },

  // Varese: piazza Monte Grappa con la Torre Civica e il mercato, il corso
  // pedonale con i lampioni, la basilica di San Vittore con il campanile
  // del Bernascone, i Giardini Estensi con siepi, fontana, panchine e
  // Palazzo Estense. Ogni edificio è visitabile.
  varese: {
    name:'Varese', music:'town', town:true,
    tiles:[
      'TTTTTTTTTTTTTTTTTATTTTTTTTTTTTTTTTTT',
      'T................:.................T',
      'T..#####..#####..:..#####..#####...T',
      'T..##D##..##D##..:..##D##..##D##...T',
      'T................:.................T',
      'T...::::::::::...:.....#C#W........T',
      'T...:::::W::::...:.....#D#.........T',
      'T...:m::m:::m:...:.................T',
      'T...::::::::::..P:.................T',
      'T.::::::::::::::::::::::::::::::::.T',
      'T.P..............:..............P..T',
      'T................:.................T',
      'T.EEEEEEEEEEE....:...#####.........T',
      'T.EFFFFFFFFFE....:...##D##.........T',
      'T.EFFFQFFFFFE....:.................T',
      'T.EFF.....FFE....:....#####........T',
      'T.EFFbFFFbFFE....:....##D##........T',
      'T.EEEEE..EEEE....:.................T',
      'T...#######......:.................T',
      'T...###DD##......:.................T',
      'T................:.................T',
      'T................:.................T',
      'T................:.................T',
      'TTTTTTTTTTTTTTTTT:TTTTTTTTTTTTTTTTTT',
    ],
    triggers:[
      { x:17, y:0,  type:'portal', to:{ map:'accademia', x:9, y:9 } },
      { x:17, y:23, type:'portal', to:{ map:'world', x:24, y:10 } },
      { x:5,  y:3,  type:'portal', to:{ map:'casa_varese1', x:4, y:5 } },
      { x:12, y:3,  type:'portal', to:{ map:'casa_varese2', x:4, y:5 } },
      { x:22, y:3,  type:'portal', to:{ map:'casa_varese4', x:4, y:5 } },
      { x:29, y:3,  type:'portal', to:{ map:'casa_varese5', x:4, y:5 } },
      { x:24, y:6,  type:'portal', to:{ map:'chiesa_varese', x:4, y:7 } },
      { x:23, y:13, type:'portal', to:{ map:'negozio_varese', x:4, y:5 } },
      { x:24, y:16, type:'portal', to:{ map:'locanda_varese', x:5, y:6 } },
      { x:7,  y:19, type:'portal', to:{ map:'casa_varese3', x:4, y:5 } },
      { x:8,  y:19, type:'portal', to:{ map:'casa_varese3', x:4, y:5 } },
      { x:10, y:5,  type:'npc', npc:'varese_casa', sprite:'#b08968' },
      { x:6,  y:6,  type:'npc', npc:'varese_mercante', sprite:'#c9883c' },
      { x:27, y:12, type:'npc', npc:'varese_casa2', sprite:'#8aa1c9' },
      { x:7,  y:15, type:'quest', quest:'varese_lumache', sprite:'#69a35d' },
      { x:13, y:10, type:'quest', quest:'varese_corvi', sprite:'#d98ec0' },
      { x:16, y:21, type:'npc', npc:'varese_guardia', sprite:'#9aa7b8' },
      { x:11, y:16, type:'chest', id:'v_giardini', item:'etere', qty:1 },
    ],
  },

  accademia: {
    name:'Accademia del Sacro Monte', music:'town', town:true, indoor:true,
    tiles:[
      '##################',
      '#ZZ::::::::::::ZZ#',
      '#::OOO::::OOO::::#',
      '#::::::::::::::::#',
      '#::OOO::::OOO::::#',
      '#::::::::::::::::#',
      '#::OOO::::OOO::::#',
      '#::::::::::::::::#',
      '#::::::::::::::::#',
      '#::::::::::::::::#',
      '#:::::::DD:::::::#',
      '##################',
    ],
    triggers:[
      { x:8, y:10, type:'portal', to:{ map:'varese', x:17, y:1 } },
      { x:9, y:10, type:'portal', to:{ map:'varese', x:17, y:1 } },
      { x:9, y:3,  type:'npc', npc:'rettore_cid', sprite:'#c9b458' },
      { x:3, y:8,  type:'npc', npc:'accademia_allievo', sprite:'#7e9cd8' },
      { x:14, y:8, type:'npc', npc:'accademia_allieva', sprite:'#d8a27e' },
      { x:2, y:2,  type:'npc', npc:'accademia_bibliotecaria', sprite:'#8e6cc9' },
    ],
  },

  // Vedano Olona: il fiume Olona a ovest con la vecchia filanda sulla riva,
  // due ponti, la piazza con la chiesa di San Maurizio e — fedele alla
  // realtà — il parco pubblico con la statua del Gundam.
  vedano: {
    name:'Vedano Olona', music:'town', town:true,
    tiles:[
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'T...~~.......:...............T',
      'T...~~.#####.:..EEEEEEEEEEE..T',
      'T...~~.##D##.:..E.........E..T',
      'T...~~.......:..E.FF...FF.E..T',
      'T...~~..#C#..:..E.b.....b.E..T',
      'T...~~..#D#..:.......G....E..T',
      'T...~~.:::::::..E.........E..T',
      'T...BB.:::::::..EEEEEEEEEEE..T',
      'T###~~.......:...............T',
      'T###~~.......:..#####........T',
      'T#D#~~.......:..##D##........T',
      'T...~~.......:...............T',
      'T...BB.#####.:....#####......T',
      'T...~~.##D##.:....##D##......T',
      'T...~~.......:...............T',
      'T...~~.......:...............T',
      'T...~~..P....:....P..........T',
      'T...~~.......:...............T',
      'TTTTTTTTTTTTT:TTTTTTTTTTTTTTTT',
    ],
    triggers:[
      { x:13, y:19, type:'portal', to:{ map:'world', x:31, y:18 } },
      { x:9,  y:3,  type:'portal', to:{ map:'casa_vedano1', x:4, y:5 } },
      { x:9,  y:6,  type:'portal', to:{ map:'chiesa_vedano', x:4, y:7 } },
      { x:18, y:11, type:'portal', to:{ map:'negozio_vedano', x:4, y:5 } },
      { x:9,  y:14, type:'portal', to:{ map:'locanda_vedano', x:5, y:6 } },
      { x:20, y:14, type:'portal', to:{ map:'casa_vedano2', x:4, y:5 } },
      { x:2,  y:11, type:'door_event', event:'filanda' },
      { x:11, y:8,  type:'npc', npc:'vedano_custode', sprite:'#8a7a66' },
      { x:7,  y:4,  type:'npc', npc:'vedano_cittadino', sprite:'#b08968' },
      { x:16, y:12, type:'quest', quest:'vedano_lupi', sprite:'#cccccc' },
      { x:19, y:7,  type:'quest', quest:'vedano_gundam', sprite:'#5b8fd8' },
      { x:23, y:7,  type:'chest', id:'ve_parco', item:'vernice', qty:1 },
    ],
  },

  // Castiglione Olona: il borgo medievale nel fondovalle attraversato
  // dall'Olona, la Collegiata in cima al colle a nord-est, piazza Garibaldi
  // con la Chiesa di Villa al centro e Palazzo Branda a ovest.
  castiglione: {
    name:'Castiglione Olona', music:'town', town:true,
    tiles:[
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'T..................^^^^^^^^^.T',
      'T..................^^#C#^^^^.T',
      'T..................^^#D#^^^^.T',
      'T..................^^:::^^^^.T',
      'T....................:.......T',
      'T~~~~~B~~~~~~~~~~~~~~B~~~~~~~T',
      'T.....:..............:.......T',
      'T.####:...::::::::...:.......T',
      'T.##D#:...:::C::::...:.......T',
      'T.....:...:::D::::...:.......T',
      'T.....:...::::::U:...:.......T',
      'T.....:..............:.......T',
      'T.....:.###....###...:.####..T',
      'T.....:.#D#....#D#...:.#D##..T',
      'T.....:..............:.......T',
      'T.....::::::::::::::::.......T',
      'T...............:P...........T',
      'T...............:............T',
      'TTTTTTTTTTTTTTTT:TTTTTTTTTTTTT',
    ],
    triggers:[
      { x:16, y:19, type:'portal', to:{ map:'world', x:31, y:25 } },
      { x:22, y:3,  type:'door_event', event:'collegiata' },
      { x:4,  y:9,  type:'portal', to:{ map:'casa_castiglione1', x:4, y:5 } },
      { x:13, y:10, type:'portal', to:{ map:'chiesa_castiglione', x:4, y:7 } },
      { x:9,  y:14, type:'portal', to:{ map:'negozio_castiglione', x:4, y:5 } },
      { x:16, y:14, type:'portal', to:{ map:'locanda_castiglione', x:5, y:6 } },
      { x:24, y:14, type:'portal', to:{ map:'casa_castiglione2', x:4, y:5 } },
      { x:3,  y:10, type:'npc', npc:'castiglione_palazzo', sprite:'#c9b458' },
      { x:12, y:11, type:'npc', npc:'castiglione_pasq_npc', sprite:'#e67e22', hideFlag:'pasq_join' },
      { x:15, y:12, type:'quest', quest:'castiglione_spettri', sprite:'#8e6cc9' },
      { x:18, y:8,  type:'quest', quest:'castiglione_reliquia', sprite:'#d98ec0' },
      { x:24, y:5,  type:'chest', id:'c_reliquia', item:'reliquia', qty:1 },
    ],
  },

  // Jerago con Orago: il castello medievale con le torri in cima al colle,
  // il borgo sotto con la chiesa di San Giorgio sulla piazza.
  jerago: {
    name:'Jerago con Orago', music:'town', town:true,
    tiles:[
      'TTTTTTTTTTTTTTTTTTTTTTTTTT',
      'T....^^^^^^^^^^^.........T',
      'T....^^W###W^^^^.........T',
      'T....^^##DD#^^^^.........T',
      'T....^^^:::^^^^^.........T',
      'T........:...............T',
      'T.####...:...####........T',
      'T.##D#...:...#D##........T',
      'T........:...............T',
      'T...::::::::::.#C#.......T',
      'T...::::::::::.#D#.......T',
      'T........:...............T',
      'T.#####..:....P..........T',
      'T.##D##..:...............T',
      'T........:...............T',
      'T........:......Q........T',
      'T........:...............T',
      'TTTTTTTTT:TTTTTTTTTTTTTTTT',
    ],
    triggers:[
      { x:9,  y:17, type:'portal', to:{ map:'world', x:19, y:31 } },
      { x:9,  y:3,  type:'door_event', event:'castello' },
      { x:10, y:3,  type:'door_event', event:'castello' },
      { x:4,  y:7,  type:'portal', to:{ map:'casa_jerago', x:4, y:5 } },
      { x:14, y:7,  type:'portal', to:{ map:'negozio_jerago', x:4, y:5 } },
      { x:16, y:10, type:'portal', to:{ map:'chiesa_jerago', x:4, y:7 } },
      { x:4,  y:13, type:'portal', to:{ map:'locanda_jerago', x:5, y:6 } },
      { x:8,  y:5,  type:'npc', npc:'jerago_castellano', sprite:'#9aa7b8' },
      { x:12, y:14, type:'quest', quest:'jerago_cinghiali', sprite:'#b08968' },
      { x:15, y:15, type:'npc', npc:'jerago_bambino', sprite:'#d9a05a' },
    ],
  },

  // Samarate: la piazza con la chiesa della SS. Trinità e, a est, il grande
  // capannone delle officine (l'eredità delle storiche fabbriche aeronautiche).
  samarate: {
    name:'Samarate', music:'town', town:true,
    tiles:[
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'T............................T',
      'T.#####......###############.T',
      'T.##D##......###############.T',
      'T............#####DD########.T',
      'T............................T',
      'T...::::::::#C#..............T',
      'T...::::::::#D#..P...........T',
      'T.......:....................T',
      'T.#####.:....#####...EEEE....T',
      'T.##D##.:....##D##...EFFE....T',
      'T.......:............EFFE....T',
      'T.......:....#####...E..E....T',
      'T.......:....##D##...........T',
      'T.......:....................T',
      'T.......:......P.............T',
      'T.......:....................T',
      'TTTTTTTT:TTTTTTTTTTTTTTTTTTTTT',
    ],
    triggers:[
      { x:8,  y:17, type:'portal', to:{ map:'world', x:9, y:36 } },
      { x:18, y:4,  type:'door_event', event:'officina' },
      { x:19, y:4,  type:'door_event', event:'officina' },
      { x:4,  y:3,  type:'portal', to:{ map:'casa_samarate1', x:4, y:5 } },
      { x:13, y:7,  type:'portal', to:{ map:'chiesa_samarate', x:4, y:7 } },
      { x:4,  y:10, type:'portal', to:{ map:'negozio_samarate', x:4, y:5 } },
      { x:15, y:10, type:'portal', to:{ map:'locanda_samarate', x:5, y:6 } },
      { x:15, y:13, type:'portal', to:{ map:'casa_samarate2', x:4, y:5 } },
      { x:16, y:5,  type:'quest', quest:'samarate_automi', sprite:'#8aa1c9' },
      { x:6,  y:6,  type:'npc', npc:'samarate_sofy_npc', sprite:'#f1c40f', hideFlag:'sofy_join' },
      { x:12, y:14, type:'npc', npc:'samarate_pilota', sprite:'#c9b458' },
      { x:22, y:10, type:'npc', npc:'samarate_nonna', sprite:'#c9a0c0' },
    ],
  },

  sacromonte: {
    name:'Sacro Monte', music:'dungeon', town:false, zone:'sacromonte',
    tiles:[
      '^^^^^^^^^^^^^^^^^^^^',
      '^^^^^^^::::^^^^^^^^^',
      '^^^^^^^::::^^^^^^^^^',
      '^^^^^^^^::^^^^^^^^^^',
      '^^^,,,,,::^^^^^^^^^^',
      '^^^,,^^^^^^^^^^^^^^^',
      '^^^,,^^^^,,,,,,^^^^^',
      '^^^,,,,,,,,^^,,^^^^^',
      '^^^^^^^^^,,^^,,^^^^^',
      '^^^^^^^^^,,^^,,,,,^^',
      '^^^,,,,,,,,^^^^^,,^^',
      '^^^,,^^^^^^^^^^^,,^^',
      '^^^,,^^^,,,,,,,,,,^^',
      '^^^,,^^^,,^^^^^^^^^^',
      '^^^,,,,,,,^^^^^^^^^^',
      '^^^^^^^,,^^^^^^^^^^^',
      '^^^^^^^,,^^^^^^^^^^^',
      '^^^^^,,,,,,^^^^^^^^^',
      '^^^^^,,^^^^^^^^^^^^^',
      '^^^^^,,^^^^^^^^^^^^^',
      '^^^^^,,,,,,,,^^^^^^^',
      '^^^^^^^^^^^,,^^^^^^^',
      '^^^^^^^^^^^,,^^^^^^^',
      '^^^^^^^^^^^::^^^^^^^',
      '^^^^^^^^^^^::^^^^^^^',
      '^^^^^^^^^^^^^^^^^^^^',
    ],
    triggers:[
      { x:11, y:24, type:'portal', to:{ map:'world', x:9, y:3 } },
      { x:12, y:24, type:'portal', to:{ map:'world', x:9, y:3 } },
      { x:8,  y:4,  type:'heal' },
      { x:8,  y:2,  type:'event', event:'finale' },
      { x:9,  y:2,  type:'event', event:'finale' },
      { x:16, y:9,  type:'chest', id:'sm_elisir', item:'elisir', qty:1 },
      { x:17, y:12, type:'chest', id:'sm_gran', item:'granpozione', qty:3 },
      { x:3,  y:13, type:'chest', id:'sm_fenice', item:'coda_fenice', qty:2 },
    ],
  },
};

// ---------- interni generati (case, botteghe, locande, chiese) ----------
// Legenda interni: M parete  w pavimento in legno  R tappeto (camminabili)
// K bancone  l letto  Z scaffale  O tavolo  H altare  (bloccanti)
const INTERNI = {
  casa: {
    tiles:[
      'MMMMMMMMMM',
      'MZZwwwwllM',
      'MwwwwwwllM',
      'MwOOwwwwwM',
      'MwOOwwwwwM',
      'MwwwRRwwwM',
      'MMMMwwMMMM',
    ],
    exit:[[4,6],[5,6]],
    npcs:[{ x:7, y:3, npc:'abitante' }],
  },
  negozio: {
    tiles:[
      'MMMMMMMMMM',
      'MZZZZZZZwM',
      'MwwwwwwwwM',
      'MKKKKKwwwM',
      'MwwwwwwwwM',
      'MwwwRRwwwM',
      'MMMMwwMMMM',
    ],
    exit:[[4,6],[5,6]],
    npcs:[{ x:2, y:2, npc:'bottegaio', sprite:'#c9883c' }],
  },
  locanda: {
    tiles:[
      'MMMMMMMMMMMM',
      'MKKKKwwwllwM',
      'MwwwwwwwllwM',
      'MwwOOwwwwwwM',
      'MwwOOwwwllwM',
      'MwwwwwwwllwM',
      'MwwwwRRwwwwM',
      'MMMMMwwMMMMM',
    ],
    exit:[[5,7],[6,7]],
    npcs:[{ x:6, y:1, npc:'oste', sprite:'#b06a4a' }],
  },
  chiesa: {
    tiles:[
      'MMMMMMMMMM',
      'MwwwHHwwwM',
      'MwwwwwwwwM',
      'MOOwwwwOOM',
      'MOOwwwwOOM',
      'MOOwwwwOOM',
      'MwwwwwwwwM',
      'MwwwRRwwwM',
      'MMMMwwMMMM',
    ],
    exit:[[4,8],[5,8]],
    npcs:[{ x:2, y:2, npc:'sacerdote', sprite:'#e8e2d4' }],
  },
};

function interno(kind, nome, ret, extra=[]){
  const t = INTERNI[kind];
  return {
    name: nome, music:'town', town:true, indoor:true,
    tiles: t.tiles,
    triggers: [
      ...t.exit.map(([x, y])=>({ x, y, type:'portal', to:ret })),
      ...t.npcs.map(n=>({ x:n.x, y:n.y, type:'npc', npc:n.npc, sprite:n.sprite || '#b08968' })),
      ...extra,
    ],
  };
}

function negozioDi(town, nome, ret){
  return interno('negozio', nome, ret, [2,3,4].map(x=>({ x, y:4, type:'shop', shop:town })));
}
function locandaDi(town, nome, ret){
  return interno('locanda', nome, ret, [1,2,3,4].map(x=>({ x, y:2, type:'inn', town })));
}
function chiesaDi(nome, ret){
  return interno('chiesa', nome, ret, [{ x:4, y:2, type:'heal' }, { x:5, y:2, type:'heal' }]);
}

// Varese
MAPS.casa_varese1   = interno('casa', 'Casa di Varese', { map:'varese', x:5, y:4 });
MAPS.casa_varese2   = interno('casa', 'Casa di Varese', { map:'varese', x:12, y:4 });
MAPS.casa_varese4   = interno('casa', 'Casa di Biumo', { map:'varese', x:22, y:4 });
MAPS.casa_varese5   = interno('casa', 'Casa di Giubiano', { map:'varese', x:29, y:4 });
MAPS.casa_varese3   = interno('casa', 'Palazzo Estense', { map:'varese', x:7, y:20 });
MAPS.negozio_varese = negozioDi('varese', 'Bottega del Corso', { map:'varese', x:23, y:14 });
MAPS.locanda_varese = locandaDi('varese', 'Locanda del Corso', { map:'varese', x:24, y:17 });
MAPS.chiesa_varese  = chiesaDi('Basilica di San Vittore', { map:'varese', x:24, y:7 });
// Vedano Olona
MAPS.casa_vedano1   = interno('casa', 'Casa di Vedano', { map:'vedano', x:9, y:4 });
MAPS.casa_vedano2   = interno('casa', 'Casa di Vedano', { map:'vedano', x:20, y:15 });
MAPS.negozio_vedano = negozioDi('vedano', 'Bottega di Vedano', { map:'vedano', x:18, y:12 });
MAPS.locanda_vedano = locandaDi('vedano', 'Locanda di Vedano', { map:'vedano', x:9, y:15 });
MAPS.chiesa_vedano  = chiesaDi('Chiesa di San Maurizio', { map:'vedano', x:9, y:7 });
// Castiglione Olona
MAPS.casa_castiglione1   = interno('casa', 'Palazzo Branda', { map:'castiglione', x:4, y:10 });
MAPS.casa_castiglione2   = interno('casa', 'Casa del Borgo', { map:'castiglione', x:24, y:15 });
MAPS.negozio_castiglione = negozioDi('castiglione', 'Bottega del Borgo', { map:'castiglione', x:9, y:15 });
MAPS.locanda_castiglione = locandaDi('castiglione', 'Locanda del Borgo', { map:'castiglione', x:16, y:15 });
MAPS.chiesa_castiglione  = chiesaDi('Chiesa di Villa', { map:'castiglione', x:13, y:11 });
// Jerago con Orago
MAPS.casa_jerago    = interno('casa', 'Casa di Jerago', { map:'jerago', x:4, y:8 });
MAPS.negozio_jerago = negozioDi('jerago', 'Bottega di Jerago', { map:'jerago', x:14, y:8 });
MAPS.locanda_jerago = locandaDi('jerago', 'Locanda di Jerago', { map:'jerago', x:4, y:14 });
MAPS.chiesa_jerago  = chiesaDi('Chiesa di San Giorgio', { map:'jerago', x:16, y:11 });
// Samarate
MAPS.casa_samarate1   = interno('casa', 'Casa di Samarate', { map:'samarate', x:4, y:4 });
MAPS.casa_samarate2   = interno('casa', 'Casa di Verghera', { map:'samarate', x:15, y:14 });
MAPS.negozio_samarate = negozioDi('samarate', 'Bottega di Samarate', { map:'samarate', x:4, y:11 });
MAPS.locanda_samarate = locandaDi('samarate', 'Locanda di Samarate', { map:'samarate', x:15, y:11 });
MAPS.chiesa_samarate  = chiesaDi('Chiesa della SS. Trinità', { map:'samarate', x:13, y:8 });

// le seconde case usano l'altro abitante
for (const id of ['casa_varese2','casa_varese5','casa_vedano2','casa_castiglione2','casa_samarate2']){
  const t = MAPS[id].triggers.find(t=>t.type === 'npc');
  if (t) t.npc = 'abitante2';
}

export const SIGILLI = ['sigillo_alba','sigillo_meriggio','sigillo_vespro','sigillo_notte'];
