# Cronache di Varese — Design

RPG in italiano in stile Final Fantasy VIII, distribuito come APK Android (WebView via Capacitor). Il gioco è una web-app HTML5 self-contained (funziona anche da browser come fallback).

## Trama (ideologia FF8)

Ste e Riki sono allievi dell'**Accademia del Sacro Monte**, una scuola di mercenari sopra Varese (eco del Garden di FF8). La strega del tempo **Eterna** vuole compiere la **Compressione del Tempo** dal Santuario del Sacro Monte. Per fermarla servono i **Quattro Sigilli delle Ore**, custoditi nei paesi della provincia. Il viaggio attraversa Varese, Vedano Olona, Castiglione Olona, Jerago e Samarate; in ogni paese si affronta un guardiano corrotto (mid-boss) e si incontrano nuovi alleati. Boss finale: Eterna, al Sacro Monte.

## Personaggi

| Nome | Classe | Dove si unisce |
|---|---|---|
| Ste | Mago | protagonista (inizio) |
| Riki | Guerriero Samurai | protagonista (inizio) |
| Fabri | Ladro pistolero | Vedano Olona |
| Pasq | Monaco | Castiglione Olona |
| Sofy | Chierica | Castiglione Olona (Collegiata) |
| Elly | Arciera druida | Samarate |
| Mirko | Berserker | Samarate (cava) |
| Vero | Evocatrice bardo | Jerago (castello) |

Party massimo 3; gli altri restano in riserva e sono scambiabili dal menu in qualsiasi momento.

## Mappa

Mappa del mondo a tile (overworld) che riproduce la topografia reale: Varese a nord con il Sacro Monte a nord-ovest e il Lago di Varese a ovest; Vedano Olona a sud-est di Varese; Castiglione Olona più a sud lungo il fiume Olona; Jerago con il castello a sud-ovest; Samarate ancora più a sud-ovest. Strade provinciali collegano i paesi; boschi e colline ospitano incontri casuali. Ogni paese ha una mappa interna con edifici interagibili (locanda per riposare, negozio, case, chiese, NPC con dialoghi).

## Sistema di combattimento

A turni con barra ATB (stile FF8): la velocità riempie la barra, al riempimento il personaggio agisce. Comandi: Attacca, Abilità (MP), Oggetti, Fuggi. **Limite**: con HP sotto il 30% si sblocca la mossa Limite del personaggio (eco dei Limit Break FF8). Mostri a zone con livelli crescenti, mid-boss per paese, boss finale.

## Crescita

Livello massimo 100, curva EXP quadratica, statistiche per classe che crescono col livello. Le abilità si sbloccano a livelli fissi stile Pokémon (notifica "ha imparato..."). Nomi evocativi (es. Ste: Meteora, Apocalisse; Riki: Zantetsuken, Getsuga del Crepuscolo; Sofy: Sacra, Rinascita).

## Account e salvataggio

Account locali sul dispositivo (registrazione + login con nome e PIN, hash memorizzato), salvataggi multipli per account in localStorage. Nessun server: l'APK è offline.

## Architettura

- `www/` — gioco HTML5: ES modules, Canvas 2D per rendering tile/sprite (pixel-art procedurale, nessun asset esterno), WebAudio per musica chiptune procedurale.
  - `js/data/` — personaggi, abilità, mostri, mappe, dialoghi/eventi.
  - `js/engine/` — save/account, input (tastiera + D-pad touch), renderer, audio.
  - `js/screens/` — titolo/login, mondo, battaglia, menu party.
- Capacitor 7 wrappa `www/` in un APK Android (debug build firmata debug-key).
- Build: Android SDK 35 + JDK 21 (Gradle non supporta Java 25).

## Test

Verifica manuale via browser (il gioco gira identico in WebView); smoke test dei moduli dati (coerenza tabelle abilità/livelli) con uno script Node.
