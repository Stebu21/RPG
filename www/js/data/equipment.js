// Equipaggiamento in stile Final Fantasy: arma, abito e accessorio per
// personaggio, con bonus alle statistiche. `who`: chi può indossarlo
// (assente = tutti). Più si va avanti nella storia, più i negozi offrono
// pezzi forti (vedi SHOPS in items.js).
// Tomi: libri che insegnano subito un'abilità del proprio repertorio.

export const SLOTS_EQ = ['arma', 'abito', 'accessorio'];
export const SLOT_NAMES = { arma:'Arma', abito:'Abito', accessorio:'Accessorio' };

const W = (name, who, stats, price, desc)=>({ name, slot:'arma', who:[who], stats, price, desc });
const MAGI = ['ste', 'sofy', 'vero', 'elly', 'fabri'];
const AGILI = ['riki', 'fabri'];
const PESANTI = ['riki', 'mirko', 'pasq'];

export const EQUIP = {
  // ---- armi: Ste (bastoni) ----
  bastone_betulla:   W('Bastone di Betulla', 'ste', { mag:4 }, 120, 'Legno dei boschi del Campo dei Fiori.'),
  bastone_cristallo: W('Bastone di Cristallo', 'ste', { mag:10, mp:10 }, 680, 'Un cristallo di quarzo canalizza gli incantesimi.'),
  scettro_ore:       W('Scettro delle Ore', 'ste', { mag:20, mp:25, spr:4 }, 2200, 'Il suo ticchettio accelera la magia.'),
  // ---- Riki (katane) ----
  katana_acciaio:    W('Katana d’Acciaio', 'riki', { atk:5 }, 130, 'Forgiata in una bottega di Varese.'),
  katana_biumo:      W('Kiku-ichimonji', 'riki', { atk:12, spd:2 }, 720, 'Lama leggera dal filo ondulato.'),
  masamune:          W('Masamune dell’Olona', 'riki', { atk:24, spd:4, crit:0.08 }, 2400, 'Temprata nelle acque del fiume.'),
  // ---- Fabri (strumenti del bardo; le chiavi restano quelle dei salvataggi) ----
  revolver:          W('Liuto da Viaggio', 'fabri', { mag:5, spd:1 }, 130, 'Sei corde e un po’ di fortuna.'),
  pistole_gemelle:   W('Mandolino d’Ebano', 'fabri', { mag:12, spd:3 }, 720, 'Suona da solo le note che Fabri dimentica.'),
  // ---- Pasq (martelli da fabbro) ----
  bende_monaco:      W('Martello da Forgia', 'pasq', { atk:5, def:1 }, 130, 'Consumato dall’incudine di Castiglione.'),
  artigli_tigre:     W('Maglio del Borgo', 'pasq', { atk:13, def:3 }, 740, 'Ha piegato cancellate e armature.'),
  // ---- Sofy (bacchette fatate) ----
  aspersorio:        W('Bacchetta di Lucciola', 'sofy', { mag:5, spr:3 }, 140, 'Si accende da sola quando fa buio.'),
  bastone_aurora:    W('Bacchetta dell’Aurora', 'sofy', { mag:14, spr:8, mp:15 }, 900, 'Brilla come l’alba sul lago.'),
  // ---- Elly (bastoni da curatrice) ----
  arco_frassino:     W('Bastone di Frassino', 'elly', { mag:4, spr:3 }, 140, 'Per camminare, per curare, per bussare in testa a Fabri.'),
  arco_quercia:      W('Caduceo della Guaritrice', 'elly', { mag:10, spr:9, mp:12 }, 900, 'Due serpi d’argento attorno al legno di quercia.'),
  // ---- Mirko (attrezzi del botanico) ----
  ascia_cavatore:    W('Falcetto dell’Erborista', 'mirko', { atk:4, mag:4 }, 160, 'Taglia erbe, rovi e ogni tanto un nemico.'),
  ascia_titano:      W('Vanga del Giardino Antico', 'mirko', { atk:8, mag:10, hp:40 }, 950, 'Dove affonda, qualcosa germoglia.'),
  // ---- Vero (bacchette fatate) ----
  flauto_osso:       W('Bacchetta di Rugiada', 'vero', { mag:5, mp:8 }, 140, 'Lascia una scia di gocce che brillano.'),
  arpa_lago:         W('Bacchetta del Lago', 'vero', { mag:14, spr:6, mp:20 }, 950, 'Un giunco del Lago di Varese che sogna da solo.'),

  // ---- abiti ----
  tunica_allievo:    { name:'Soprabito da Allievo', slot:'abito', who:MAGI, stats:{ def:2, spr:4, mp:8 }, price:150, desc:'Il cappotto dell’Accademia, con tasche per le pergamene.' },
  mantello_arcano:   { name:'Mantello Arcano', slot:'abito', who:MAGI, stats:{ def:6, spr:10, mp:20 }, price:820, desc:'Tessuto dalle monache del Lazzaretto di Vedano.' },
  veste_astrale:     { name:'Veste Astrale', slot:'abito', who:MAGI, stats:{ def:12, spr:18, mag:6, mp:35 }, price:2300, desc:'Cucita con la luce delle stelle del Sacro Monte.' },
  gi_rinforzato:     { name:'Gi Rinforzato', slot:'abito', who:AGILI, stats:{ def:5, hp:20 }, price:160, desc:'Cotone pesante e cuciture doppie.' },
  haori_samurai:     { name:'Haori del Ronin', slot:'abito', who:AGILI, stats:{ def:10, spd:2, hp:40 }, price:860, desc:'La giacca di un vagabondo che non ha mai perso.' },
  armatura_shura:    { name:'Armatura Shura', slot:'abito', who:AGILI, stats:{ def:18, spd:3, hp:90 }, price:2400, desc:'Lamelle laccate di nero e rosso.' },
  corazza_cuoio:     { name:'Corazza di Cuoio', slot:'abito', who:PESANTI, stats:{ def:7, hp:30 }, price:180, desc:'Cuoio bollito, robusto e senza fronzoli.' },
  corazza_ferro:     { name:'Corazza di Ferro', slot:'abito', who:PESANTI, stats:{ def:15, hp:60 }, price:900, desc:'Pesante, rumorosa, efficace.' },

  // ---- accessori ----
  anello_forza:      { name:'Anello della Forza', slot:'accessorio', stats:{ atk:5 }, price:400, desc:'+5 ATK.' },
  amuleto_saggio:    { name:'Amuleto del Saggio', slot:'accessorio', stats:{ mag:5, mp:10 }, price:400, desc:'+5 MAG, +10 MP.' },
  stivali_vento:     { name:'Stivali del Vento', slot:'accessorio', stats:{ spd:4 }, price:520, desc:'+4 VEL: si arriva primi.' },
  ciondolo_vita:     { name:'Ciondolo della Vita', slot:'accessorio', stats:{ hp:60, def:3 }, price:650, desc:'+60 HP, +3 DEF.' },
  medaglia_eroe:     { name:'Medaglia dell’Eroe', slot:'accessorio', stats:{ atk:6, mag:6, def:6, spr:6, spd:2 }, price:3000, desc:'Tutte le statistiche in su.' },
};

// Tomi: insegnano subito un'abilità del repertorio del personaggio
export const TOMES = {
  tomo_fiamma:     { name:'Tomo: Fiamma', who:'ste', ab:'fiamma', price:250 },
  tomo_gelo:       { name:'Tomo: Gelo', who:'ste', ab:'gelo', price:450 },
  tomo_folgore:    { name:'Tomo: Folgore', who:'ste', ab:'folgore', price:650 },
  tomo_incendio:   { name:'Tomo: Incendio', who:'ste', ab:'incendio', price:1400 },
  rotolo_iaijutsu: { name:'Rotolo: Iaijutsu', who:'riki', ab:'iaijutsu', price:300 },
  rotolo_vento:    { name:'Rotolo: Lama del Vento', who:'riki', ab:'lama_del_vento', price:700 },
  rotolo_lune:     { name:'Rotolo: Danza delle Quattro Lune', who:'riki', ab:'danza_lune', price:1500 },
  tomo_benedizione:{ name:'Tomo: Benedizione', who:'elly', ab:'benedizione', price:600 },
  tomo_curara:     { name:'Tomo: Curara', who:'elly', ab:'curara', price:1100 },
  spartito_ninna:  { name:'Incanto: Sonno Fatato', who:'vero', ab:'sonno_fatato', price:700 },
  manuale_raffica: { name:'Spartito: Ninna Nanna', who:'fabri', ab:'ninna_nanna', price:700 },
  manuale_spine:   { name:'Erbario: Spore Velenose', who:'mirko', ab:'spore_velenose', price:500 },
  manuale_urlo:    { name:'Erbario: Radici Serpeggianti', who:'mirko', ab:'radici', price:900 },
  manuale_calcio:  { name:'Manuale: Pioggia di Scintille', who:'pasq', ab:'scintille', price:500 },
};

export function canEquip(id, charId){
  const e = EQUIP[id];
  return !!e && (!e.who || e.who.includes(charId));
}

// Caratteristiche in stile D&D: ogni livello dà 2 punti da spendere.
// Ogni punto si traduce in statistiche di combattimento.
export const ATTRS = {
  FOR:{ name:'Forza',        desc:'+2 ATK',              bonus:{ atk:2 } },
  DES:{ name:'Destrezza',    desc:'+1 VEL, +1 ATK',      bonus:{ spd:1, atk:1 } },
  COS:{ name:'Costituzione', desc:'+9 HP, +1 DEF',       bonus:{ hp:9, def:1 } },
  INT:{ name:'Intelligenza', desc:'+2 MAG, +3 MP',       bonus:{ mag:2, mp:3 } },
  SAG:{ name:'Saggezza',     desc:'+2 SPR, +2 MP',       bonus:{ spr:2, mp:2 } },
};
export const POINTS_PER_LEVEL = 2;
