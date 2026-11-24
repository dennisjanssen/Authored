// Fullscreen, kept separate from focus mode.
//
// The window is switched by the service worker (chrome.windows.update) rather
// than element.requestFullscreen(): shortcuts from chrome.commands arrive
// without a user gesture, which the Fullscreen API requires. Using one
// mechanism for both the shortcut and the button keeps the state simple.
//
// Escape leaves fullscreen. If the user leaves it any other way (F11, OS),
// the resize listener notices and keeps our state in step. Leaving
// fullscreen never switches focus mode off.

(() => {
  'use strict';
  const Authored = globalThis.Authored;

  let on = false;
  let byFocus = false; // entered automatically together with focus mode
  let resizeTimer = 0;

  function update(next) {
    if (typeof next !== 'boolean' || next === on) return;
    on = next;
    if (!on) byFocus = false;
    Authored.bus.emit('fullscreen', { on });
  }

  async function set(want, opts = {}) {
    const res = await Authored.send({ type: 'authored:fullscreen', want: !!want });
    if (!res || res.error) {
      if (res?.error) Authored.log.warn('fullscreen failed:', res.error);
      return;
    }
    if (want) byFocus = !!opts.byFocus;
    update(res.fullscreen);
  }

  async function sync() {
    const res = await Authored.send({ type: 'authored:fullscreen' });
    if (res && !res.error) update(res.fullscreen);
  }

  Authored.fullscreen = {
    init() {
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(sync, 300);
      });
      Authored.bus.on('key', (k) => {
        if (k.kind === 'escape' && on) set(false);
      });
      sync();
    },
    isOn: () => on,
    enteredByFocus: () => byFocus,
    set,
    toggle: () => set(!on),
  };
})();
