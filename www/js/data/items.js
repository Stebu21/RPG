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

export const SHOPS = {
  varese:      ['pozione','etere','antidoto','campana','scarpe'],
  vedano:      ['pozione','etere','antidoto','campana'],
  castiglione: ['pozione','granpozione','etere','coda_fenice','antidoto','campana'],
  jerago:      ['pozione','granpozione','etere','coda_fenice','antidoto','campana'],
  samarate:    ['granpozione','elisir','etere','coda_fenice','antidoto','campana','bici'],
};

export const INN_PRICES = { varese:15, vedano:20, castiglione:30, jerago:40, samarate:50 };
