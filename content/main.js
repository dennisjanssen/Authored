// Wiring: loads settings, starts every module, and maps shortcuts and buttons
// to actions. Modules talk to each other through Authored.bus; a new feature
// (e.g. chapter navigation) is a new file with an init() that is listed in
// manifest.json and started here.

(() => {
  'use strict';
  const Authored = globalThis.Authored;
  if (window.top !== window) return; // top frame only

  const ON_OFF = (v) => (v ? 'on' : 'off');

  Authored.actions = {
    focus() {
      const on = !Authored.focusMode.isOn();
      Authored.focusMode.set(on);
      if (on && Authored.settings.fullscreenWithFocus && !Authored.fullscreen.isOn()) {
        Authored.fullscreen.set(true, { byFocus: true });
      } else if (!on && Authored.fullscreen.enteredByFocus()) {
        Authored.fullscreen.set(false);
      }
    },
    fullscreen() {
      Authored.fullscreen.toggle();
    },
    typewriter() {
      const v = !Authored.settings.typewriter;
      Authored.store.set({ typewriter: v });
      Authored.ui.note(`Centred typing ${ON_OFF(v)}`);
    },
    sound() {
      const v = !Authored.settings.sound;
      Authored.store.set({ sound: v });
      Authored.ui.note(`Sound ${ON_OFF(v)}`);
    },
    drawer() {
      Authored.ui.toggleDrawer();
    },
    jump() {
      Authored.lastPlace.jump();
    },
  };

  const COMMANDS = {
    'toggle-focus': 'focus',
    'toggle-fullscreen': 'fullscreen',
    'toggle-typewriter': 'typewriter',
    'toggle-sound': 'sound',
    'toggle-drawer': 'drawer',
    'jump-back': 'jump',
  };

  async function start() {
    // Listen for shortcuts first, so they work even if a module fails below.
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type !== 'authored:command') return;
      const action = COMMANDS[msg.command];
      try {
        if (action) Authored.actions[action]();
      } catch (e) {
        Authored.log.error(`action "${action}" failed:`, e);
      }
    });

    await Authored.store.load();

    // Each module starts on its own: one failure must not take the others down.
    const steps = [
      ['focus mode', () => Authored.focusMode.init()],
      ['keyboard', () => Authored.keys.init()],
      ['interface', () => Authored.ui.init()],
      ['fullscreen', () => Authored.fullscreen.init()],
      ['centred typing', () => Authored.centering.init()],
      ['word count', () => Authored.wordcount.init()],
      ['goal', () => Authored.goal.init()],
      ['sound', () => Authored.sound.init()],
      ['last place', () => Authored.lastPlace.init()],
      ['welcome', () => Authored.welcome.init()],
    ];
    let failed = 0;
    for (const [name, init] of steps) {
      try {
        await init();
      } catch (e) {
        failed++;
        Authored.log.error(`${name} failed to start:`, e);
      }
    }

    Authored.log.info(
      failed
        ? `started with ${failed} problem(s), see errors above.`
        : 'ready. Toggle focus mode with the corner button or the shortcut (default Alt+Shift+F).'
    );
  }

  start().catch((e) => Authored.log.error('failed to start:', e));
})();
