// "Back to where I was": remembers where you last typed in each document and
// brings you back there with one button or shortcut.
//
// Docs offers no way to read the cursor's position in the text, so the place
// is stored as a position on the page: the caret's offset inside the editor's
// scroll area (plus the scroll height at that moment). That stays accurate as
// long as the text *above* that point has not changed much since; writing on
// at the end, the usual case for a draft, does not move it.
//
// Jumping scrolls there (with the line at the centred-typing height), then
// clicks at the caret's old spot so the text cursor lands there too. If Docs
// ignores the click, a short note asks you to click to place the cursor.
//
// Storage (chrome.storage.local):
//   lastPlace: { [docId]: { y, x, h, scrollHeight, at } }

(() => {
  'use strict';
  const Authored = globalThis.Authored;

  const SAVE_AFTER_MS = 1500; // after the last keystroke
  const MAX_PLACES = 50;

  let saveTimer = 0;
  let place = null; // this document's saved place

  const scroller = () => Authored.sel.q('editor');

  // Caret position in the editor's scroll content, or null.
  function measure() {
    const sc = scroller();
    const r = Authored.centering.caretRect();
    if (!sc || !r) return null;
    const box = sc.getBoundingClientRect();
    return {
      y: Math.round(sc.scrollTop + r.top - box.top),
      x: Math.round(sc.scrollLeft + r.left - box.left),
      h: Math.round(r.height),
      scrollHeight: sc.scrollHeight,
      at: Date.now(),
    };
  }

  async function save() {
    saveTimer = 0;
    const p = measure();
    if (!p) return;
    place = p;
    const id = Authored.docId();
    const { lastPlace = {} } = await Authored.storage.get('lastPlace');
    lastPlace[id] = p;
    // keep the most recent MAX_PLACES documents
    const ids = Object.keys(lastPlace).sort((a, b) => lastPlace[b].at - lastPlace[a].at);
    for (const old of ids.slice(MAX_PLACES)) delete lastPlace[old];
    await Authored.storage.set({ lastPlace });
    Authored.bus.emit('lastplace', { available: true });
  }

  function onKey(k) {
    if (!k.typing) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_AFTER_MS);
  }

  // A click Docs treats like a real one (if it accepts synthetic events).
  function clickAt(x, y) {
    const target = document.elementFromPoint(x, y);
    if (!target) return;
    const base = { clientX: x, clientY: y, screenX: x + screenX, screenY: y + screenY, button: 0, bubbles: true, cancelable: true, composed: true, view: window };
    target.dispatchEvent(new PointerEvent('pointerdown', { ...base, pointerType: 'mouse', isPrimary: true, buttons: 1 }));
    target.dispatchEvent(new MouseEvent('mousedown', { ...base, buttons: 1, detail: 1 }));
    target.dispatchEvent(new PointerEvent('pointerup', { ...base, pointerType: 'mouse', isPrimary: true }));
    target.dispatchEvent(new MouseEvent('mouseup', { ...base, detail: 1 }));
    target.dispatchEvent(new MouseEvent('click', { ...base, detail: 1 }));
  }

  const frames = (n) => new Promise((res) => {
    const step = () => (--n <= 0 ? res() : requestAnimationFrame(step));
    requestAnimationFrame(step);
  });
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  async function jump() {
    if (!place) {
      Authored.ui.note('No saved place yet');
      return;
    }
    const sc = scroller();
    if (!sc) {
      Authored.sel.warnMissing('editor');
      return;
    }
    const box = sc.getBoundingClientRect();
    const targetY = (window.innerHeight * Authored.settings.targetPct) / 100; // same height as centred typing
    const maxTop = sc.scrollHeight - sc.clientHeight;
    sc.scrollTop = Authored.clamp(place.y - (targetY - box.top), 0, maxTop);

    // Let Docs draw the pages that just came into view, then place the cursor.
    await frames(2);
    await wait(150);
    const b = sc.getBoundingClientRect();
    const x = b.left + place.x - sc.scrollLeft + 1;
    const y = b.top + place.y - sc.scrollTop + place.h / 2;
    if (y < 0 || y > window.innerHeight) return;
    clickAt(x, y);

    await frames(2);
    await wait(120);
    const r = Authored.centering.caretRect();
    const landed = r && Math.abs(r.top + r.height / 2 - y) < Math.max(place.h, 12) && Math.abs(r.left - x) < 60;
    if (!landed) {
      Authored.log.info('jump: Docs did not accept the click; the cursor was not moved.');
    }
    Authored.ui.note(landed ? 'Back where you left off' : 'Click to place your cursor', landed ? 1800 : 3500);
  }

  Authored.lastPlace = {
    async init() {
      const { lastPlace = {} } = await Authored.storage.get('lastPlace');
      place = lastPlace[Authored.docId()] || null;
      Authored.bus.on('key', onKey);
      window.addEventListener('pagehide', () => {
        if (saveTimer) {
          clearTimeout(saveTimer);
          save();
        }
      });
      Authored.bus.emit('lastplace', { available: !!place });
    },
    jump,
    get: () => place,
  };
})();
