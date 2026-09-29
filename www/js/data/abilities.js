// Abilità: type = 'phys' | 'mag' | 'heal' | 'healall' | 'revive' | 'buff' | 'status' | 'steal'
// target = 'enemy' | 'enemies' | 'ally' | 'allies' | 'self'
// element: fuoco, ghiaccio, tuono, vento, terra, acqua, sacro, oscurita, neutro
// hits: numero di colpi (default 1). buff: {stat:'atk'|'def', mult, turns}
// status: {id:'veleno'|'sonno', chance}

// Mosse combinate del duo Ste + Riki: servono entrambi vivi e svegli, costano
// MP a tutti e due e consumano anche la carica ATB del compagno (almeno a metà).
// Il danno somma una parte magica (MAG di Ste) e una fisica (ATK di Riki).
export const COMBOS = {
  lama_ardente:     { name:'Lama Ardente', lv:1, mp:{ ste:4, riki:3 }, power:30, element:'fuoco', target:'enemy',
                      desc:'Ste incendia la katana, Riki affonda il colpo.' },
  vortice_gemello:  { name:'Vortice Gemello', lv:7, mp:{ ste:7, riki:6 }, power:24, element:'vento', target:'enemies',
                      desc:'Un ciclone di rune e fendenti travolge tutti i nemici.' },
  iaido_fulmine:    { name:'Iaido del Fulmine', lv:14, mp:{ ste:10, riki:9 }, power:58, element:'tuono', target:'enemy', crit:0.3,
                      desc:'Il fulmine di Ste cade, Riki estrae nello stesso istante.' },
  mille_lame_gelo:  { name:'Mille Lame di Gelo', lv:22, mp:{ ste:16, riki:14 }, power:40, hits:2, element:'ghiaccio', target:'enemies',
                      desc:'Lame di ghiaccio evocate e scagliate a colpi di katana.' },
  ora_zero:         { name:'Ora Zero', lv:35, mp:{ ste:26, riki:22 }, power:80, element:'neutro', target:'enemies',
                      desc:'Ste ferma il tempo, Riki taglia ogni istante rimasto sospeso.' },
};

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

  // ------- SOFY (Fata della Luce) -------
  polvere_fatata:  { name:'Polvere di Fata', mp:3, type:'mag', power:14, element:'sacro', target:'enemy', desc:'Una manciata di polvere dorata che punge come mille api.' },
  abbaglio:        { name:'Abbaglio', mp:6, type:'status', power:0, element:'sacro', target:'enemy', status:{id:'sonno', chance:0.65}, desc:'Un lampo delle sue ali stordisce il nemico fino a farlo crollare.' },
  petali_luce:     { name:'Petali di Luce', mp:6, type:'heal', power:45, target:'ally', desc:'Petali luminosi si posano sulle ferite e le chiudono.' },
  raggio_aurora:   { name:'Raggio d’Aurora', mp:11, type:'mag', power:30, element:'sacro', target:'enemies', desc:'Il primo raggio del mattino, spezzato in mille riflessi.' },
  scudo_ali:       { name:'Scudo d’Ali', mp:10, type:'buff', buff:{stat:'def', mult:1.5, turns:4}, target:'allies', desc:'Ali di luce avvolgono la squadra.' },
  lacrima_fata:    { name:'Lacrima di Fata', mp:22, type:'revive', power:0.5, target:'ally', desc:'Una lacrima di fata richiama chi è caduto.' },
  stella_cadente:  { name:'Stella Cadente', mp:18, type:'mag', power:64, element:'sacro', target:'enemy', desc:'Sofy afferra una stella e la lascia cadere.' },
  cerchio_fatato:  { name:'Cerchio delle Fate', mp:24, type:'healall', power:120, target:'allies', desc:'Un anello di funghi luminosi guarisce chi ci sta dentro.' },
  tempesta_scintille:{ name:'Tempesta di Scintille', mp:32, type:'mag', power:78, element:'sacro', target:'enemies', desc:'Uno sciame di scintille fatate sul campo.' },
  sole_fatato:     { name:'Cuore del Sole Fatato', mp:44, type:'mag', power:115, element:'sacro', target:'enemy', desc:'Tutta la luce delle fate in un solo punto.' },
  danza_lucciole:  { name:'LIMITE: Danza delle Lucciole', mp:0, type:'mag', power:115, element:'sacro', target:'enemies', limit:true, desc:'Mille lucciole seguono Sofy e bruciano ogni ombra.' },

  // ------- FABRI (Bardo) -------
  nota_tagliente:  { name:'Nota Tagliente', mp:2, type:'mag', power:13, element:'neutro', target:'enemy', desc:'Una corda del liuto vibra come una lama.' },
  ballata_coraggio:{ name:'Ballata del Coraggio', mp:7, type:'buff', buff:{stat:'atk', mult:1.3, turns:4}, target:'allies', desc:'Una canzone da osteria che fa sentire tutti eroi.' },
  ninna_nanna:     { name:'Ninna Nanna del Viandante', mp:7, type:'status', power:0, element:'neutro', target:'enemy', status:{id:'sonno', chance:0.7}, desc:'Una melodia così dolce che il nemico si addormenta.' },
  accordo_tuono:   { name:'Accordo del Tuono', mp:12, type:'mag', power:30, element:'tuono', target:'enemies', desc:'Un accordo così forte che scoppia come un temporale.' },
  canto_ristoro:   { name:'Canto del Ristoro', mp:14, type:'healall', power:45, target:'allies', desc:'Un ritornello che rimette in piedi la compagnia.' },
  mano_lesta:      { name:'Mano Lesta', mp:4, type:'steal', power:8, element:'neutro', target:'enemy', desc:'Mentre il pubblico applaude, le tasche si svuotano.' },
  marcia_trionfale:{ name:'Marcia Trionfale', mp:18, type:'buff', buff:{stat:'atk', mult:1.5, turns:4}, target:'allies', desc:'Tamburi immaginari e trombe vere: all’attacco!' },
  sonata_vento:    { name:'Sonata del Vento', mp:24, type:'mag', power:68, element:'vento', target:'enemies', desc:'Il liuto chiama le raffiche del lago.' },
  requiem_bardo:   { name:'Requiem', mp:34, type:'mag', power:110, element:'oscurita', target:'enemy', desc:'L’ultima strofa, quella che nessuno vuole sentire.' },
  gran_finale:     { name:'LIMITE: Gran Finale', mp:0, type:'mag', power:42, hits:3, element:'neutro', target:'enemies', limit:true, desc:'Fabri suona il pezzo della vita: tre accordi, tutto il pubblico al tappeto.' },

  // ------- PASQ (Fabbro) -------
  martellata:      { name:'Martellata', mp:2, type:'phys', power:13, element:'neutro', target:'enemy', desc:'Un colpo di martello da forgia.' },
  scintille:       { name:'Pioggia di Scintille', mp:7, type:'phys', power:18, element:'fuoco', target:'enemies', desc:'Il martello sull’incudine: scintille su tutti i nemici.' },
  tempra_lama:     { name:'Tempra delle Lame', mp:8, type:'buff', buff:{stat:'atk', mult:1.4, turns:4}, target:'allies', desc:'Pasq ripassa al volo le armi della squadra.' },
  ferro_rovente:   { name:'Ferro Rovente', mp:10, type:'phys', power:32, element:'fuoco', target:'enemy', desc:'Una barra appena uscita dalla forgia.' },
  scudo_forgiato:  { name:'Scudo Forgiato', mp:12, type:'buff', buff:{stat:'def', mult:1.5, turns:4}, target:'allies', desc:'Piastre battute a mano per tutti.' },
  maglio_tuono:    { name:'Maglio del Tuono', mp:18, type:'phys', power:62, element:'tuono', target:'enemy', desc:'Il maglio cade come un fulmine.' },
  colata_fusa:     { name:'Colata Fusa', mp:26, type:'phys', power:52, element:'fuoco', target:'enemies', desc:'Metallo fuso rovesciato sul campo.' },
  martello_titano: { name:'Martello del Titano', mp:34, type:'phys', power:122, element:'terra', target:'enemy', desc:'Il martello che ha forgiato le campane di Castiglione.' },
  forgia_ardente:  { name:'LIMITE: Forgia Ardente', mp:0, type:'phys', power:60, hits:3, element:'fuoco', target:'enemies', limit:true, desc:'Pasq accende la forgia nel cuore della battaglia.' },

  // ------- ELLY (Curatrice) -------
  cura:            { name:'Cura', mp:4, type:'heal', power:30, target:'ally', desc:'Mani calde e un unguento: ripristina un po’ di HP.' },
  benedizione:     { name:'Benedizione', mp:8, type:'buff', buff:{stat:'def', mult:1.5, turns:4}, target:'allies', desc:'Aumenta la difesa della squadra.' },
  luce_punitiva:   { name:'Luce Punitiva', mp:5, type:'mag', power:22, element:'sacro', target:'enemy', desc:'Anche chi cura sa farsi rispettare.' },
  curara:          { name:'Curara', mp:9, type:'heal', power:80, target:'ally', desc:'Ripristina molti HP.' },
  preghiera:       { name:'Preghiera del Mattino', mp:18, type:'healall', power:55, target:'allies', desc:'Cura tutta la squadra.' },
  rinascita:       { name:'Rinascita', mp:24, type:'revive', power:0.5, target:'ally', desc:'Rianima un alleato KO.' },
  curaga:          { name:'Curaga', mp:20, type:'heal', power:190, target:'ally', desc:'Ripristina moltissimi HP.' },
  sacra:           { name:'Sacra', mp:16, type:'mag', power:60, element:'sacro', target:'enemy', desc:'La collera serena di chi ha visto troppe ferite.' },
  grazia_eterna:   { name:'Grazia Eterna', mp:48, type:'healall', power:280, target:'allies', desc:'Una cascata di luce risana tutti.' },
  mani_guaritrici: { name:'LIMITE: Mani della Guaritrice', mp:0, type:'healall', power:400, revive:true, target:'allies', limit:true, desc:'Elly posa le mani sulla squadra: nessuna ferita resiste.' },

  // ------- MIRKO (Botanico) -------
  frustata_liana:  { name:'Frustata di Liana', mp:2, type:'phys', power:14, element:'terra', target:'enemy', desc:'Una liana schiocca come una frusta.' },
  spore_velenose:  { name:'Spore Velenose', mp:6, type:'mag', power:12, element:'terra', target:'enemy', status:{id:'veleno', chance:0.85}, desc:'Una nuvola di spore che avvelena.' },
  erba_medica:     { name:'Erba Medica', mp:6, type:'heal', power:60, target:'ally', desc:'Un impacco d’erbe del castello.' },
  radici:          { name:'Radici Serpeggianti', mp:12, type:'mag', power:30, element:'terra', target:'enemies', desc:'Radici emergono dal suolo e stringono i nemici.' },
  fungo_soporifero:{ name:'Fungo Soporifero', mp:9, type:'status', power:0, element:'terra', target:'enemy', status:{id:'sonno', chance:0.7}, desc:'Un fungo del sottobosco: basta annusarlo.' },
  infuso_linfa:    { name:'Infuso di Linfa', mp:18, type:'healall', power:70, target:'allies', desc:'Un sorso a testa: la linfa scorre di nuovo.' },
  rovo_gigante:    { name:'Rovo Gigante', mp:22, type:'mag', power:66, element:'terra', target:'enemy', desc:'Un rovo alto come il mastio.' },
  polline_tempesta:{ name:'Tempesta di Polline', mp:28, type:'mag', power:62, element:'vento', target:'enemies', status:{id:'veleno', chance:0.4}, desc:'Nubi di polline urticante.' },
  quercia_millenaria:{ name:'Quercia Millenaria', mp:40, type:'mag', power:118, element:'terra', target:'enemy', desc:'Una quercia cresce in un istante, sopra il nemico.' },
  giardino_primordiale:{ name:'LIMITE: Giardino Primordiale', mp:0, type:'mag', power:112, element:'terra', target:'enemies', limit:true, desc:'Mirko semina il campo di battaglia: la foresta si riprende tutto.' },

  // ------- VERO (Fata dei Sogni) -------
  scintilla_lunare:{ name:'Scintilla Lunare', mp:3, type:'mag', power:14, element:'neutro', target:'enemy', desc:'Un bagliore d’argento dalla punta della bacchetta.' },
  sonno_fatato:    { name:'Sonno Fatato', mp:7, type:'status', power:0, element:'neutro', target:'enemy', status:{id:'sonno', chance:0.75}, desc:'Polvere dei sogni: il nemico crolla addormentato.' },
  rugiada:         { name:'Rugiada del Mattino', mp:12, type:'healall', power:40, target:'allies', desc:'Gocce fatate ristorano la squadra.' },
  bolle_lago:      { name:'Bolle del Lago', mp:16, type:'mag', power:42, element:'acqua', target:'enemies', desc:'Bolle iridescenti che scoppiano come onde.' },
  brezza_fatata:   { name:'Brezza Fatata', mp:18, type:'buff', buff:{stat:'atk', mult:1.4, turns:4}, target:'allies', desc:'Un soffio d’ali rende tutti più svelti di mano.' },
  vortice_petali:  { name:'Vortice di Petali', mp:24, type:'mag', power:62, element:'vento', target:'enemies', desc:'Un turbine di petali taglienti.' },
  incubo:          { name:'Incubo', mp:26, type:'mag', power:72, element:'oscurita', target:'enemy', status:{id:'sonno', chance:0.3}, desc:'Il rovescio dei sogni: il nemico non si sveglia tranquillo.' },
  dono_fata:       { name:'Dono della Fata', mp:30, type:'healall', power:150, target:'allies', desc:'Un desiderio esaudito a tutta la squadra.' },
  onda_sogni:      { name:'Onda dei Sogni', mp:42, type:'mag', power:100, element:'acqua', target:'enemies', desc:'Il lago di Varese si alza come in un sogno.' },
  regno_fate:      { name:'LIMITE: Regno delle Fate', mp:0, type:'mag', power:112, element:'neutro', target:'enemies', limit:true, desc:'Vero apre la porta del regno delle fate: il nemico non trova più l’uscita.' },
};


export const STATUS_NAMES = { veleno:'Veleno', sonno:'Sonno' };
