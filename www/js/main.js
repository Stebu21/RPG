// Avvio del gioco: registra le schermate, collega input e schermate finali.

import './screens/title.js';
import './screens/world.js';
import './screens/battle.js';
import './screens/menu.js';
import { initTitle } from './screens/title.js';
import { initWorld, worldAction } from './screens/world.js';
import { initMenu } from './screens/menu.js';
import { initInput } from './engine/input.js';
import { registerScreen, show, currentScreen } from './engine/ui.js';
import { playMusic, stopMusic, resumeAudio } from './engine/audio.js';
import { G } from './engine/state.js';

// schermate semplici
registerScreen('gameover', {
  el: document.getElementById('screen-gameover'),
  enter(){ stopMusic(); },
});
registerScreen('ending', {
  el: document.getElementById('screen-ending'),
  enter(){
    playMusic('final');
    document.getElementById('ending-text').innerHTML = `
      <p>La nube viola si dissolve sopra il Sacro Monte. Le campane della provincia suonano tutte insieme:
      Varese, Vedano, Castiglione, Jerago, Samarate — per la prima volta, all'unisono.</p><br>
      <p>Ste torna all'Accademia, dove il Rettore Cid lo aspetta con una pila di esami da correggere
      («Il tempo scorre di nuovo: nessuna scusa»).</p><br>
      <p>Riki appende la katana al muro della locanda, ma solo per la fotografia.</p><br>
      <p>Fabri giura di restituire tutto quello che ha «trovato» durante il viaggio. Nessuno gli crede.</p><br>
      <p>Sofy e Pasq riaprono la Collegiata. Elly e Mirko ricostruiscono le officine.
      Vero canta dal mastio di Jerago, e nelle sere d'estate, dicono, gli spiriti del lago cantano con lei.</p><br>
      <p>E da qualche parte, tra un'ora e l'altra, una manciata di sabbia dorata
      continua a viaggiare col vento sopra le Prealpi.</p><br>
      <p style="text-align:center;color:#f1c40f">~ Grazie per aver giocato ~</p>`;
  },
  exit(){ stopMusic(); },
});

document.getElementById('btn-gameover-title').addEventListener('click', ()=>show('title'));
document.getElementById('btn-ending-title').addEventListener('click', ()=>show('title'));

initTitle();
initWorld();
initMenu();
initInput(
  ()=>{ if (currentScreen() === 'world') worldAction(); },
  ()=>{ if (currentScreen() === 'world' && G.s) show('menu'); },
);

// la musica può partire solo dopo un gesto dell'utente (politica autoplay)
document.addEventListener('pointerdown', ()=>resumeAudio());

show('title');
