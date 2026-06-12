// Oggetti consumabili e negozi.

export const ITEMS = {
  pozione:      { name:'Pozione', desc:'Ripristina 60 HP.', price:30, type:'heal', power:60 },
  granpozione:  { name:'Granpozione', desc:'Ripristina 250 HP.', price:120, type:'heal', power:250 },
  elisir:       { name:'Elisir', desc:'Ripristina tutti gli HP e MP.', price:600, type:'full' },
  etere:        { name:'Etere', desc:'Ripristina 40 MP.', price:90, type:'mp', power:40 },
  coda_fenice:  { name:'Coda di Fenice', desc:'Rianima un alleato KO con metà HP.', price:200, type:'revive', power:0.5 },
  antidoto:     { name:'Antidoto', desc:'Cura il veleno.', price:25, type:'cure', status:'veleno' },
  campana:      { name:'Campanella d’Argento', desc:'Risveglia dal sonno.', price:25, type:'cure', status:'sonno' },
};

export const SHOPS = {
  varese:      ['pozione','etere','antidoto','campana'],
  vedano:      ['pozione','etere','antidoto','campana'],
  castiglione: ['pozione','granpozione','etere','coda_fenice','antidoto','campana'],
  jerago:      ['pozione','granpozione','etere','coda_fenice','antidoto','campana'],
  samarate:    ['granpozione','elisir','etere','coda_fenice','antidoto','campana'],
};

export const INN_PRICES = { varese:20, vedano:25, castiglione:40, jerago:60, samarate:80 };
