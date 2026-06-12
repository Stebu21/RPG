// Dialoghi NPC ed eventi di trama.
// NPC: id -> lista di varianti; vince la prima il cui "if" è soddisfatto.
//   if: { has:[flag...], not:[flag...] }
// Eventi: sequenze di passi eseguiti in ordine:
//   { d:[[nome,testo],...] }  dialogo
//   { flag:'x' }              imposta flag
//   { join:'id' }             personaggio si unisce
//   { battle:'monsterId' }    battaglia (sconfitta = game over)
//   { item:'id', qty:n }      oggetto ottenuto
//   { heal:true }             cura completa
//   { ending:true }           finale di gioco

export const NPCS = {
  rettore_cid: [
    { if:{ has:['sigillo_alba','sigillo_meriggio','sigillo_vespro','sigillo_notte'] }, name:'Rettore Cid',
      lines:['Avete i Quattro Sigilli delle Ore... La barriera del Sacro Monte cederà.',
             'Eterna vi aspetta al Santuario. Andate, e che il tempo sia dalla vostra parte.'] },
    { if:{ has:['intro_done'] }, name:'Rettore Cid',
      lines:['I Sigilli delle Ore sono custoditi nei paesi della provincia: Vedano, Castiglione, Jerago e Samarate.',
             'Senza tutti e quattro, nessuno può salire al Santuario del Sacro Monte.'] },
    { name:'Rettore Cid', lines:['...'] },
  ],
  accademia_allievo: [
    { name:'Allievo', lines:['Dicono che a Vedano Olona la vecchia filanda si sia... svegliata. Brrr.'] },
  ],
  accademia_allieva: [
    { name:'Allieva', lines:['Ste e Riki, vero? In bocca al lupo per l’esame. Io l’anno scorso sono svenuta davanti a un Lumacone.'] },
  ],
  varese_casa: [
    { name:'Cittadino', lines:['Una volta dal Sacro Monte si vedeva tutta la provincia. Ora c’è solo quella nube viola...'] },
  ],
  varese_casa2: [
    { name:'Cittadina', lines:['Mio cugino abita a Samarate. Dice che dalle vecchie officine escono rumori di metallo... vivi.'] },
  ],
  varese_giardiniere: [
    { name:'Giardiniere', lines:['Benvenuti ai Giardini Estensi! Persino con una strega in giro, i fiori vanno annaffiati.'] },
  ],
  varese_bimba: [
    { name:'Bimba', lines:['La mamma dice che se faccio i capricci arriva la Strega del Tempo e mi fa diventare vecchia!'] },
  ],
  varese_guardia: [
    { if:{ has:['sigillo_alba'], not:['sigillo_meriggio'] }, name:'Guardia',
      lines:['Avete sistemato la filanda di Vedano? Allora provate a Castiglione Olona: la Collegiata è infestata.'] },
    { name:'Guardia', lines:['La strada per Vedano Olona parte a sud-est. State sulla via: nei campi gironzolano brutte bestie.'] },
  ],
  vedano_fabri_npc: [
    { name:'Fabri', lines:['Ehi, voi due! Facce da Accademia, eh?',
      'Sono Fabri. La filanda qui dietro è piena di roba stregata, e dentro c’è un coso enorme che custodisce un sigillo luccicante.',
      'Apro io la porta — diciamo che le serrature mi adorano. Voi pensate al coso enorme, intesi?'] },
  ],
  vedano_cittadino: [
    { name:'Cittadino', lines:['Di notte la filanda si illumina e i telai tessono da soli. Tessono COSA, poi?'] },
  ],
  vedano_anziano: [
    { name:'Anziano', lines:['Ai miei tempi l’Olona era piena di pesci. Ora è piena di serpi grosse come tubi.'] },
  ],
  castiglione_palazzo: [
    { name:'Custode del Palazzo', lines:['Questo è il borgo del Cardinale Branda. Persino la sua ombra, dicono, non ha mai lasciato la Collegiata...'] },
  ],
  castiglione_pasq_npc: [
    { name:'Pasq', lines:['Mmh. Voi cercate il Sigillo del Meriggio.',
      'È nella Collegiata, ma qualcosa di antico lo tiene stretto. Sofy è dentro che prega da tre giorni per contenerlo.',
      'Io vi apro la strada. I miei pugni pregano a modo loro.'] },
  ],
  castiglione_pittore: [
    { name:'Pittore', lines:['Studio gli affreschi di Masolino. Ultimamente... le figure dipinte mi seguono con lo sguardo.'] },
  ],
  castiglione_dama: [
    { name:'Dama', lines:['Il borgo è un gioiello del Quattrocento. Peccato per gli spettri. Rovinano il turismo.'] },
  ],
  jerago_castellano: [
    { if:{ has:['sigillo_vespro'] }, name:'Castellano',
      lines:['Il castello è di nuovo silenzioso. Vero vi ha seguito? Quella ragazza canta da quando era bambina ai fantasmi del mastio.'] },
    { name:'Castellano', lines:['Nel Castello di Jerago si è insediato un cavaliere che non appartiene a questo tempo. Vero, la custode, è rimasta dentro!'] },
  ],
  jerago_contadina: [
    { name:'Contadina', lines:['Da Jerago, scendendo a sud-ovest, si arriva a Samarate. Occhio alle vespe: sono grosse come mucche.'] },
  ],
  samarate_meccanico: [
    { name:'Meccanico', lines:['Qui una volta si costruivano macchine volanti, sai? Adesso le officine si sono costruite... qualcos’altro.'] },
  ],
  samarate_elly_npc: [
    { name:'Elly', lines:['Fermi! Non avvicinatevi alle officine senza un piano.',
      'Là dentro c’è un drago fatto di lamiere e turbine, e tiene il Sigillo della Notte conficcato nel petto.',
      'Io e Mirko ci proviamo da settimane. Magari in cinque... pardon, in squadra, ce la facciamo.'] },
  ],
  samarate_pilota: [
    { name:'Vecchio Pilota', lines:['Ho volato su mezzo mondo, ma un drago d’acciaio non l’avevo mai visto. Quasi quasi è bello.'] },
  ],
};

export const EVENTS = {
  intro: {
    map:'accademia', when:'enter', if:{ not:['intro_done'] },
    steps:[
      { d:[
        ['','Accademia del Sacro Monte — aula magna, ore 8:00.'],
        ['Rettore Cid','Ste. Riki. Avanti, niente cerimonie.'],
        ['Ste','Rettore. Ci ha convocati per l’esame finale?'],
        ['Rettore Cid','L’esame è annullato. O meglio: è diventato reale.'],
        ['Rettore Cid','Questa notte una strega si è insediata nel Santuario del Sacro Monte. Si fa chiamare Eterna.'],
        ['Riki','...E vuole?'],
        ['Rettore Cid','Comprimere il tempo. Tutte le epoche, schiacciate in un solo istante: il suo. Varese sarebbe solo l’inizio.'],
        ['Rettore Cid','Il Santuario è protetto da una barriera che cede solo ai Quattro Sigilli delle Ore: Alba, Meriggio, Vespro e Notte.'],
        ['Rettore Cid','Sono custoditi a Vedano Olona, Castiglione Olona, Jerago e Samarate. Ma i custodi... sono stati corrotti dal potere di Eterna.'],
        ['Ste','Quindi: cinque paesi, quattro mostri, una strega. Prima di pranzo è impossibile.'],
        ['Riki','Allora salteremo il pranzo.'],
        ['Rettore Cid','Da oggi siete operativi. Trovate alleati lungo la strada: da soli non arrivereste al Vespro.'],
        ['','Missione: raggiungete Vedano Olona, a sud-est di Varese.'],
      ]},
      { flag:'intro_done' },
    ],
  },

  filanda: {
    if:{ not:['sigillo_alba'] },
    steps:[
      { d:[
        ['','La porta della vecchia filanda cigola. Dentro, i telai tessono fili di luce da soli...'],
        ['Fabri','Visto? Ve l’avevo detto. E quello là in fondo è il padrone di casa.'],
        ['???','CHI... DISTURBA... IL TURNO DI NOTTE...'],
        ['Riki','Parla pure il mattone.'],
        ['Ste','Fabri, stai dietro. Anzi no: spara.'],
      ]},
      { battle:'boss_golem' },
      { d:[
        ['','Il Golem crolla in un mucchio di mattoni fumanti. Tra le macerie brilla il SIGILLO DELL’ALBA.'],
        ['Fabri','Niente male, gente dell’Accademia. Sapete che vi dico? Vengo con voi.'],
        ['Fabri','Uno: mi annoio. Due: una strega che comprime il tempo comprimerebbe anche i miei risparmi.'],
        ['Ste','I tuoi risparmi sono refurtiva.'],
        ['Fabri','Risparmi DINAMICI.'],
        ['','Fabri si è unito alla squadra! Hai ottenuto il Sigillo dell’Alba (1/4).'],
      ]},
      { join:'fabri' }, { flag:'fabri_join' }, { flag:'sigillo_alba' }, { heal:true },
    ],
    doneSteps:[ { d:[['','La filanda è silenziosa. I telai, finalmente, riposano.']] } ],
  },

  collegiata: {
    if:{ not:['sigillo_meriggio'] },
    steps:[
      { d:[
        ['','L’interno della Collegiata è freddo come gennaio. Una ragazza prega davanti all’altare, avvolta in una luce dorata.'],
        ['Sofy','State indietro! La barriera regge a malapena...'],
        ['???','...kekekeke... il MIO borgo... la MIA collegiata... il MIO tempo...'],
        ['','Dall’ombra dell’abside si stacca una figura in porpora, alta tre metri.'],
        ['Sofy','L’Ombra del Cardinale! Se sfondiamo la sua superbia, il Sigillo del Meriggio è libero!'],
        ['Pasq','Ottimo. La superbia è il mio bersaglio preferito.'],
      ]},
      { battle:'boss_cardinale' },
      { d:[
        ['','L’ombra si dissolve in un sospiro di incenso. Sull’altare appare il SIGILLO DEL MERIGGIO.'],
        ['Sofy','Ste... lo sapevo che saresti arrivato. Te l’avevo detto: ovunque tu vada, ci ritroviamo sempre.'],
        ['Ste','...Riki. Smettila di sorridere.'],
        ['Riki','Non sto sorridendo. Sto ARCHIVIANDO.'],
        ['Sofy','Lasciate che vi segua: la mia luce vi servirà contro Eterna. E poi qualcuno deve tenere d’occhio Ste.'],
        ['Pasq','Dove va lei, vado io. Qualcuno deve contare i suoi miracoli.'],
        ['','Sofy e Pasq si sono uniti alla squadra! Hai ottenuto il Sigillo del Meriggio (2/4).'],
      ]},
      { join:'sofy' }, { join:'pasq' }, { flag:'sofy_join' }, { flag:'sigillo_meriggio' }, { heal:true },
    ],
    doneSteps:[ { d:[['','La Collegiata è tornata tiepida. Gli affreschi, giurereste, sorridono.']] } ],
  },

  castello: {
    if:{ not:['sigillo_vespro'] },
    steps:[
      { d:[
        ['','Il portone del Castello di Jerago è spalancato. Dal mastio scende una musica: qualcuno canta per tenere a bada qualcosa.'],
        ['Vero','Ospiti! Perfetto tempismo: la mia voce sta finendo.'],
        ['Cavaliere Senza Tempo','...ho servito questo castello per ottocento anni. Il Vespro è MIO.'],
        ['Vero','È un cavaliere del Trecento, poverino. Eterna gli ha promesso di riavere la sua epoca.'],
        ['Riki','Un guerriero di ottocento anni. Finalmente un avversario con esperienza.'],
      ]},
      { battle:'boss_cavaliere' },
      { d:[
        ['','Il cavaliere si inginocchia, e per un istante l’armatura è di nuovo lucida, giovane. Poi, polvere. Resta il SIGILLO DEL VESPRO.'],
        ['Vero','Riposa, messere. ...Bene! Io vengo con voi. Il castello sa badare a sé, e voi avete una strega da spodestare.'],
        ['Ste','Sai combattere?'],
        ['Vero','So chiamare chi combatte per me. È molto più elegante.'],
        ['Vero','Ah, e se passiamo da Samarate: c’è un omone stempiato con un barbone, Mirko. È il mio uomo. Niente battute sulla differenza d’altezza, le ho già fatte tutte io.'],
        ['','Vero si è unita alla squadra! Hai ottenuto il Sigillo del Vespro (3/4).'],
      ]},
      { join:'vero' }, { flag:'vero_join' }, { flag:'sigillo_vespro' }, { heal:true },
    ],
    doneSteps:[ { d:[['','Il castello è quieto. Sul mastio, una bandiera nuova saluta il tramonto.']] } ],
  },

  officina: {
    if:{ not:['sigillo_notte'] },
    steps:[
      { d:[
        ['','Le officine di Samarate ruggiscono. Tra le travi, due figure vi fanno cenno di abbassarvi.'],
        ['Elly','Zitti e giù la testa— ...FABRI?!'],
        ['Fabri','Ciao, amore. Posso spiegare: c’era una strega, quattro sigilli, un golem...'],
        ['Elly','UNA lettera in due mesi. UNA. E ti presenti con una squadra intera.'],
        ['Fabri','Sorpresa?'],
        ['Elly','...Ne parliamo dopo il drago. Eccolo: dorme sulla pista, arrotolato come un gatto. Un gatto di quaranta tonnellate.'],
        ['Mirko','Io dico di svegliarlo con l’ascia.'],
        ['Elly','Mirko, il piano prevedeva SILENZIO—'],
        ['Drago d’Acciaio','...SISTEMI DI COMBATTIMENTO... RIATTIVATI...'],
        ['Mirko','Visto? Si è svegliato da solo. Risparmiata un’ascia.'],
      ]},
      { battle:'boss_drago_acciaio' },
      { d:[
        ['','Il drago si affloscia con un lungo sibilo di vapore. Dal suo petto rotola il SIGILLO DELLA NOTTE.'],
        ['Mirko','Vero canterà per un mese quando le racconto che ho cavalcato un drago.'],
        ['Elly','Non l’hai cavalcato.'],
        ['Mirko','L’ho cavalcato EMOTIVAMENTE.'],
        ['Elly','Quattro sigilli... allora è vero. Andrete al Sacro Monte.'],
        ['Mirko','ANDREMO. Io non mi perdo la strega. Ho un conto aperto col tempo: guarda che attaccatura.'],
        ['Elly','...Veniamo anche noi. Il bosco mi ha insegnato che le tempeste si affrontano in branco.'],
        ['','Elly e Mirko si sono uniti alla squadra! Hai ottenuto il Sigillo della Notte (4/4).'],
        ['','La barriera del Sacro Monte ora può essere infranta. Tornate a nord-ovest di Varese!'],
      ]},
      { join:'elly' }, { join:'mirko' }, { flag:'elly_join' }, { flag:'sigillo_notte' }, { heal:true },
    ],
    doneSteps:[ { d:[['','Le officine tacciono. Sul piazzale, il vento muove solo foglie e bulloni.']] } ],
  },

  finale: {
    if:{ not:['game_done'] },
    steps:[
      { d:[
        ['','Il Santuario del Sacro Monte. Le quattordici cappelle brillano come una collana di stelle sotto la nube viola.'],
        ['Eterna','Benvenuti, frammenti di presente.'],
        ['Eterna','Ho visto mille epoche di questa provincia: i romani sul lago, il Cardinale nel suo borgo, le macchine volanti di Samarate...'],
        ['Eterna','Tutte MERAVIGLIOSE. Tutte PERDUTE. Io le salverò: un solo istante, eterno, dove nulla muore.'],
        ['Ste','Un istante dove nulla vive, vuoi dire.'],
        ['Riki','Il tempo scorre. È questo che lo rende prezioso.'],
        ['Eterna','...Allora scorrete via.'],
      ]},
      { battle:'boss_eterna' },
      { d:[
        ['','La clessidra di Eterna si incrina. La nube viola si squarcia, e per la prima volta dopo settimane... l’alba tocca il lago.'],
        ['Eterna','...così tanto futuro... e nessuna paura...?'],
        ['Ste','Tanta. Ma la condividiamo. È il trucco.'],
        ['','La Strega del Tempo si dissolve in granelli di sabbia dorata, che il vento porta via verso le Prealpi.'],
      ]},
      { flag:'game_done' },
      { ending:true },
    ],
  },
};

// Testo missione corrente per il menu
export function missionText(flags){
  const sig = ['sigillo_alba','sigillo_meriggio','sigillo_vespro','sigillo_notte'].filter(s=>flags[s]).length;
  if (flags.game_done) return 'Avete salvato la provincia. Esplorate liberamente!';
  if (sig===4) return 'Avete i Quattro Sigilli! Salite al Sacro Monte, a nord-ovest di Varese, e affrontate Eterna.';
  if (!flags.intro_done) return 'Presentatevi dal Rettore Cid all’Accademia, a nord di Varese.';
  const mancanti = [];
  if (!flags.sigillo_alba) mancanti.push('Vedano Olona (Sigillo dell’Alba)');
  if (!flags.sigillo_meriggio) mancanti.push('Castiglione Olona (Sigillo del Meriggio)');
  if (!flags.sigillo_vespro) mancanti.push('Jerago (Sigillo del Vespro)');
  if (!flags.sigillo_notte) mancanti.push('Samarate (Sigillo della Notte)');
  return `Sigilli raccolti: ${sig}/4. Da recuperare: ${mancanti.join(', ')}.`;
}
