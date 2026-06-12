// Gestore schermate: ogni schermata si registra con enter/exit.

const registry = {};
let currentName = null;

export function registerScreen(name, def){
  registry[name] = def; // { el, enter(params), exit() }
}

export function show(name, params){
  if (currentName && registry[currentName]){
    registry[currentName].exit?.();
    registry[currentName].el.classList.add('hidden');
  }
  currentName = name;
  const scr = registry[name];
  scr.el.classList.remove('hidden');
  scr.enter?.(params);
}

export function currentScreen(){ return currentName; }
