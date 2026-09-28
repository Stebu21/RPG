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
  scarpe:       { name:'Scarpe da Corsa', desc:'Tieni premuto Shift per correre. Sempre attive.', price:300, type:'key' },
  bici:         { name:'Bicicletta', desc:'Usala dal menu per pedalare veloce (non negli interni).', price:800, type:'key' },
};

// Negozi per paese, divisi per reparto come in Final Fantasy. Più si va a sud
// nella storia (Vedano -> Castiglione -> Jerago -> Samarate) più la merce è forte.
export const SHOPS = {
  varese: {
    oggetti:['pozione','etere','antidoto','campana','scarpe'],
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
    oggetti:['granpozione','elisir','etere','coda_fenice','antidoto','campana','bici'],
    armi:['scettro_ore','masamune','ascia_titano','arpa_lago','bastone_aurora','arco_quercia'],
    abiti:['veste_astrale','armatura_shura','corazza_ferro','medaglia_eroe','ciondolo_vita'],
    magie:['tomo_incendio','rotolo_lune','tomo_curara','manuale_raffica'],
  },
};

export const INN_PRICES = { varese:15, vedano:20, castiglione:30, jerago:40, samarate:50 };
