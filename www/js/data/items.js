// Oggetti consumabili e negozi.

export const ITEMS = {
  pozione:      { name:'Pozione', desc:'Ripristina 60 HP.', price:30, type:'heal', power:60 },
  granpozione:  { name:'Granpozione', desc:'Ripristina 250 HP.', price:120, type:'heal', power:250 },
  elisir:       { name:'Elisir', desc:'Ripristina tutti gli HP e MP.', price:600, type:'full' },
  etere:        { name:'Etere', desc:'Ripristina 40 MP.', price:90, type:'mp', power:40 },
  coda_fenice:  { name:'Coda di Fenice', desc:'Rianima un alleato KO con metà HP.', price:200, type:'revive', power:0.5 },
  antidoto:     { name:'Antidoto', desc:'Cura il veleno.', price:25, type:'cure', status:'veleno' },
  campana:      { name:'Campanella d’Argento', desc:'Risveglia dal sonno.', price:25, type:'cure', status:'sonno' },
  // oggetti delle missioni secondarie
  vernice:      { name:'Vernice Speciale', desc:'Barattolo di vernice per il Colosso del parco di Vedano.', price:0, type:'quest' },
  reliquia:     { name:'Reliquia del Cardinale', desc:'Piccola teca dorata sparita dalla Collegiata.', price:0, type:'quest' },
  // oggetti chiave
  scarpe:       { name:'Scarpe da Corsa', desc:'Tieni premuto B (Alt o Shift sulla tastiera) mentre cammini per correre.', price:300, type:'key' },
  bici:         { name:'Bicicletta', desc:'Premi V (o il tasto 🚲) per salire o scendere. Non negli interni.', price:800, type:'key', vehicle:true },
  monopattino:  { name:'Monopattino Elettrico', desc:'Scatta subito e curva stretto. Premi V per salire o scendere.', price:600, type:'key', vehicle:true },
  cavallo:      { name:'Cavallo', desc:'Veloce e agile, al galoppo quasi come la Vespa. Premi V per salire o scendere.', price:3000, type:'key', vehicle:true },
  asino:        { name:'Asinello', desc:'Lento ma testardo e simpatico. Premi V per salire o scendere.', price:900, type:'key', vehicle:true },
  vespa:        { name:'Vespa', desc:'La più veloce: prende velocità piano e va di inerzia. Premi V per salire o scendere.', price:2500, type:'key', vehicle:true },
};

// Negozi per paese, divisi per reparto come in Final Fantasy. Più si va a sud
// nella storia (Vedano -> Castiglione -> Jerago -> Samarate) più la merce è forte.
export const SHOPS = {
  varese: {
    oggetti:['pozione','etere','antidoto','campana'],
    armi:['bastone_betulla','katana_acciaio','revolver','bende_monaco','aspersorio','arco_frassino','ascia_cavatore','flauto_osso'],
    abiti:['tunica_allievo','gi_rinforzato','corazza_cuoio','anello_forza','amuleto_saggio'],
    magie:['tomo_fiamma','rotolo_iaijutsu'],
  },
  vedano: {
    oggetti:['pozione','etere','antidoto','campana'],
    armi:['bastone_betulla','katana_acciaio','revolver','arco_frassino'],
    abiti:['tunica_allievo','gi_rinforzato','stivali_vento'],
    magie:['tomo_fiamma','tomo_gelo','rotolo_iaijutsu','manuale_spine'],
  },
  castiglione: {
    oggetti:['pozione','granpozione','etere','coda_fenice','antidoto','campana'],
    armi:['bastone_cristallo','katana_biumo','pistole_gemelle','artigli_tigre','bastone_aurora','arco_quercia'],
    abiti:['mantello_arcano','haori_samurai','corazza_ferro','ciondolo_vita','stivali_vento'],
    magie:['tomo_gelo','tomo_folgore','rotolo_vento','tomo_benedizione','manuale_calcio'],
  },
  jerago: {
    oggetti:['pozione','granpozione','etere','coda_fenice','antidoto','campana'],
    armi:['bastone_cristallo','katana_biumo','ascia_titano','arpa_lago','pistole_gemelle'],
    abiti:['mantello_arcano','haori_samurai','corazza_ferro','ciondolo_vita','anello_forza','amuleto_saggio'],
    magie:['tomo_folgore','rotolo_vento','spartito_ninna','manuale_urlo','tomo_curara'],
  },
  samarate: {
    oggetti:['granpozione','elisir','etere','coda_fenice','antidoto','campana','bici','monopattino','vespa'],
    armi:['scettro_ore','masamune','ascia_titano','arpa_lago','bastone_aurora','arco_quercia'],
    abiti:['veste_astrale','armatura_shura','corazza_ferro','medaglia_eroe','ciondolo_vita'],
    magie:['tomo_incendio','rotolo_lune','tomo_curara','manuale_raffica'],
  },
};

export const INN_PRICES = { varese:15, vedano:20, castiglione:30, jerago:40, samarate:50 };
