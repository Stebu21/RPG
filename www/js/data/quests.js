// Missioni secondarie dei paesi.
// kind: 'kill' (sconfiggi N mostri di un tipo) oppure 'item' (porta N oggetti).
// Lo stato vive in G.s.quests[id] = { count:n, done:true|false }.

export const QUESTS = {

  varese_lumache: {
    name:'Lumache ai Giardini', town:'Varese', giver:'Giardiniere',
    kind:'kill', target:'lumacone', targetName:'Lumaconi del Lago', need:3,
    desc:'Il giardiniere dei Giardini Estensi è disperato: i Lumaconi del Lago divorano le aiuole. Sconfiggine 3 nei prati attorno a Varese.',
    reward:{ gold:80, item:'pozione', qty:3 },
    offer:[
      ['Giardiniere','Benvenuti ai Giardini Estensi! O meglio... a quel che ne resta.'],
      ['Giardiniere','I Lumaconi del Lago salgono di notte e si mangiano le aiuole. Trent’anni di lavoro, ridotti a insalata!'],
      ['Giardiniere','Se me ne togliete di mezzo TRE, vi ricompenso con quel che ho.'],
    ],
    accepted:[ ['Giardiniere','Grazie! Li trovate nei prati attorno alla città. Colpite forte: sotto il muco sono permalosi.'] ],
    progress:[ ['Giardiniere','Come va la caccia? Le mie ortensie contano su di voi.'] ],
    complete:[
      ['Giardiniere','Tre lumaconi in meno! Sento già le aiuole respirare.'],
      ['Giardiniere','Tenete: pozioni di calendula fatte in casa. E questa mancia per il disturbo.'],
    ],
    after:[ ['Giardiniere','I fiori rinascono. Quando tutto questo sarà finito, vi pianto una siepe a forma di gruppo.'] ],
  },

  varese_corvi: {
    name:'Il gatto Ambrogio', town:'Varese', giver:'Bimba',
    kind:'kill', target:'corvo', targetName:'Corvi di Biumo', need:2,
    desc:'Il gatto della bimba di piazza Monte Grappa non scende dal campanile: i Corvi di Biumo lo terrorizzano. Scacciane 2.',
    reward:{ gold:50, item:'campana', qty:1 },
    offer:[
      ['Bimba','Snif... il mio gatto Ambrogio è scappato sul campanile e non scende più!'],
      ['Bimba','Ha paura dei corvi cattivi. Voi siete grandi e grossi... li mandate via voi? Due bastano, gli altri sono suoi amici.'],
    ],
    accepted:[ ['Bimba','Evviva! I corvi cattivi stanno nei prati fuori città. Ambrogio vi guarda dal campanile!'] ],
    progress:[ ['Bimba','Ambrogio è ancora lassù. Miagola in do minore, dice il campanaro.'] ],
    complete:[
      ['Bimba','AMBROGIO! Sei sceso! ...Vi ha visto combattere e dice che siete i suoi eroi.'],
      ['Bimba','La mamma mi ha dato questa campanella per voi. E anche i miei risparmi. Tutti e cinquanta!'],
    ],
    after:[ ['Bimba','Ambrogio adesso dorme sulla panchina dei giardini. Come un re.'] ],
  },

  vedano_gundam: {
    name:'Il Colosso del Parco', town:'Vedano Olona', giver:'Custode del parco',
    kind:'item', item:'vernice', itemName:'Vernice Speciale', need:3,
    desc:'La statua del Gundam nel parco di Vedano si sta scrostando. Il custode cerca 3 barattoli di Vernice Speciale, nascosti in vecchi forzieri della zona.',
    reward:{ gold:200, item:'granpozione', qty:2 },
    offer:[
      ['Custode del parco','Ammiratelo: il Colosso del parco di Vedano. C’è chi lo chiama Gundam, chi «il robottone». Io lo chiamo capolavoro.'],
      ['Custode del parco','Ma guardate la corazza: tutta scrostata! Serve la Vernice Speciale, quella dei vecchi modellisti.'],
      ['Custode del parco','Ne restano tre barattoli, chiusi in forzieri sparsi tra il parco e le campagne. Portatemeli e non ve ne pentirete.'],
    ],
    accepted:[ ['Custode del parco','Un barattolo è qui nel parco, gli altri nei boschi a est e a sud. Occhio ai lupi!'] ],
    progress:[ ['Custode del parco','Trovata la vernice? Il Colosso non si ridipinge da solo. Purtroppo.'] ],
    complete:[
      ['Custode del parco','TRE barattoli! Bianco, blu e rosso: i suoi colori. Domani il Colosso torna a splendere.'],
      ['Custode del parco','Questa è per voi. E quando passate di qui... salutatelo. Porta fortuna, sapete?'],
    ],
    after:[ ['Custode del parco','Guardatelo come brilla! Dicono che di notte gli occhi si accendano. Io dico che veglia su Vedano.'] ],
  },

  vedano_lupi: {
    name:'I lupi dell’Olona', town:'Vedano Olona', giver:'Anziano',
    kind:'kill', target:'lupo', targetName:'Lupi dell’Olona', need:4,
    desc:'I Lupi dell’Olona spaventano i pescatori di Vedano. L’anziano del paese chiede di sconfiggerne 4 lungo il fiume.',
    reward:{ gold:120, item:'pozione', qty:2 },
    offer:[
      ['Anziano','Ai miei tempi l’Olona era piena di pesci. Ora è piena di lupi che ululano al gelo.'],
      ['Anziano','I pescatori non scendono più alla riva. Quattro lupi in meno e il paese tornerebbe a mangiare pesce fresco.'],
    ],
    accepted:[ ['Anziano','Cercateli lungo il fiume e nei boschi. E copritevi: il loro ululato gela le ossa.'] ],
    progress:[ ['Anziano','Li sento ancora ululare, la notte. Contateli bene: quattro.'] ],
    complete:[
      ['Anziano','Stanotte, silenzio. Solo il fiume. Non sentivo questa pace da vent’anni.'],
      ['Anziano','Tenete, da parte mia e dei pescatori. E domani, frittura per tutti!'],
    ],
    after:[ ['Anziano','Il primo luccio l’abbiamo chiamato come voi. Spero non vi offenda: è un bel luccio.'] ],
  },

  castiglione_spettri: {
    name:'Gli occhi degli affreschi', town:'Castiglione Olona', giver:'Pittore',
    kind:'kill', target:'spettro', targetName:'Spettri del Borgo', need:4,
    desc:'Gli Spettri del Borgo disturbano il restauro degli affreschi di Masolino. Il pittore chiede di dissolverne 4.',
    reward:{ gold:150, item:'etere', qty:2 },
    offer:[
      ['Pittore','Studio gli affreschi di Masolino da dieci anni. Ultimamente... le figure mi seguono con lo sguardo.'],
      ['Pittore','Sono gli spettri del borgo: si infilano nei dipinti e li abitano! Come posso restaurare un santo che sbadiglia?'],
      ['Pittore','Dissolvetene quattro e i pennelli torneranno a danzare.'],
    ],
    accepted:[ ['Pittore','Girano nel borgo vecchio e lungo il fiume, al crepuscolo. La luce sacra li spaventa, se l’avete.'] ],
    progress:[ ['Pittore','Stamattina la Madonna della cappella mi ha fatto l’occhiolino. FATE PRESTO.'] ],
    complete:[
      ['Pittore','Gli affreschi sono tornati immobili! Beh, quasi: il committente nel pannello grande sorride. Ma quello sorrideva già.'],
      ['Pittore','Ecco il compenso. E questi eteri: li usavo per sciogliere i pigmenti, a voi serviranno di più.'],
    ],
    after:[ ['Pittore','Ho aggiunto otto figurine in fondo all’affresco nuovo. Una ha la coda di cavallo. Non ditelo al committente.'] ],
  },

  castiglione_reliquia: {
    name:'La reliquia perduta', town:'Castiglione Olona', giver:'Dama',
    kind:'item', item:'reliquia', itemName:'Reliquia del Cardinale', need:1,
    desc:'Una reliquia del Cardinale Branda è sparita dalla Collegiata. La dama del borgo sospetta sia in un forziere sul colle.',
    reward:{ gold:180, item:'coda_fenice', qty:1 },
    offer:[
      ['Dama','Il borgo è un gioiello del Quattrocento, ma manca una gemma: la reliquia del Cardinale, sparita dalla Collegiata.'],
      ['Dama','Le malelingue accusano gli spettri. Io dico che è in uno di quei forzieri lassù, vicino al colle della Collegiata.'],
      ['Dama','Riportatemela e la mia famiglia saprà essere generosa.'],
    ],
    accepted:[ ['Dama','Cercate sul colle, oltre il ponte. E maneggiatela con guanti di velluto, mi raccomando.'] ],
    progress:[ ['Dama','La reliquia è ancora là fuori. Il Cardinale, dovunque sia, tamburella le dita.'] ],
    complete:[
      ['Dama','La reliquia! Intatta! Il borgo vi deve un pezzo della sua anima.'],
      ['Dama','Questa Coda di Fenice appartiene alla mia famiglia da tre generazioni. Ora appartiene a voi.'],
    ],
    after:[ ['Dama','La reliquia è tornata nella teca. I turisti fotografano, gli spettri si tengono a distanza. Perfetto.'] ],
  },

  jerago_cinghiali: {
    name:'Cinghiali nei campi', town:'Jerago con Orago', giver:'Contadina',
    kind:'kill', target:'cinghiale', targetName:'Cinghiali Corazzati', need:4,
    desc:'I Cinghiali Corazzati devastano i campi di Jerago. La contadina offre una ricompensa per 4 di loro.',
    reward:{ gold:200, item:'granpozione', qty:1 },
    offer:[
      ['Contadina','Guardate i miei campi: sembrano arati da un esercito. Sono i cinghiali corazzati delle colline!'],
      ['Contadina','Quattro di quelli in meno e il raccolto si salva. Ho messo da parte una ricompensa: il granoturco non si difende da solo.'],
    ],
    accepted:[ ['Contadina','Battete le colline attorno al paese. E mirate al muso: la corazza, davanti, ha uno spiraglio.'] ],
    progress:[ ['Contadina','Ne ho visto un altro stanotte. Grosso come il trattore. IL TRATTORE.'] ],
    complete:[
      ['Contadina','Il raccolto è salvo! Quest’inverno si mangia polenta, e la dobbiamo a voi.'],
      ['Contadina','Ecco quanto promesso. La granpozione è ricetta di mia nonna: mais, miele e un segreto.'],
    ],
    after:[ ['Contadina','I campi sono quieti. Ho persino rimesso lo spaventapasseri. Più che altro per compagnia.'] ],
  },

  samarate_automi: {
    name:'Ferraglia ribelle', town:'Samarate', giver:'Meccanico',
    kind:'kill', target:'automa', targetName:'Automi della Cava', need:3,
    desc:'Gli Automi della Cava rubano pezzi di ricambio dalle officine di Samarate. Il meccanico ne vuole 3 fuori uso.',
    reward:{ gold:300, item:'elisir', qty:1 },
    offer:[
      ['Meccanico','Qui una volta si costruivano macchine volanti. Adesso le macchine si costruiscono da sole — e vengono a rubarmi i bulloni!'],
      ['Meccanico','Gli automi della cava mi hanno svuotato il magazzino. Smontatene tre e vi pago in oro e in miracoli di officina.'],
    ],
    accepted:[ ['Meccanico','Girano nella brughiera. Se sentite un ticchettio idraulico... è tardi. Colpite i giunti!'] ],
    progress:[ ['Meccanico','Ne mancano ancora. Stanotte uno ha provato a smontare la mia bicicletta. LA BICICLETTA.'] ],
    complete:[
      ['Meccanico','Tre automi in pensione anticipata! Coi loro pezzi ci faccio un tostapane. Un tostapane ENORME.'],
      ['Meccanico','Ecco l’oro. E questo elisir: lo teneva il mio maestro per le emergenze. Voi puntate a una strega: direi che conta.'],
    ],
    after:[ ['Meccanico','Il magazzino è di nuovo pieno. Il tostapane gigante funziona. Colazione per tutto il paese!'] ],
  },
};

// stato missioni: helper
export function questState(s, id){ return (s.quests ||= {})[id]; }
export function questAccept(s, id){ (s.quests ||= {})[id] = { count:0, done:false }; }

export function questProgressText(s, id){
  const q = QUESTS[id];
  const st = questState(s, id);
  if (!st) return null;
  if (st.done) return 'completata ✓';
  if (q.kind === 'kill') return `${Math.min(st.count, q.need)}/${q.need} ${q.targetName}`;
  const have = Math.min(s.items[q.item] || 0, q.need);
  return `${have}/${q.need} ${q.itemName}`;
}

// missioni kill: da chiamare a ogni mostro sconfitto
export function registerKill(s, monsterId){
  const done = [];
  for (const id of Object.keys(s.quests || {})){
    const st = s.quests[id];
    const q = QUESTS[id];
    if (!q || st.done || q.kind !== 'kill' || q.target !== monsterId) continue;
    if (st.count < q.need){
      st.count++;
      done.push({ id, count: st.count, need: q.need, name: q.name });
    }
  }
  return done;
}

// vera condizione di completamento (per il dialogo col committente)
export function questReadyToComplete(s, id){
  const q = QUESTS[id];
  const st = questState(s, id);
  if (!st || st.done) return false;
  if (q.kind === 'kill') return st.count >= q.need;
  return (s.items[q.item] || 0) >= q.need;
}
