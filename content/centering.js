// Centred typing (typewriter scrolling).
//
// After a keystroke, find the caret, measure it, and scroll the editor so the
// caret sits at the target height (default 45 % of the window). Corrections
// are batched into animation frames and eased over ~150 ms.
//
// • Mouse wheel, touch or scrollbar drag pauses centring until the next
//   keystroke, so it never pulls the writer away from what they are reading.
// • Movements smaller than DEADBAND_PX are ignored (no micro-scrolling).
// • Extra space is added below the last page (CSS variable --authored-end-space,
//   used in focus-mode.js) so the last lines can reach the target height.
// • Mouse clicks do not trigger centring; only keys do.

(() => {
  'use strict';
  const Authored = globalThis.Authored;

  const DEADBAND_PX = 6;
  const EASE_MS = 150;
  const RECHECK_MS = [0, 90, 260]; // Docs sometimes moves the caret a little later
  // Ctrl/Cmd shortcuts that edit text or move the caret (paste, cut, undo, word jumps …)
  const CARET_SHORTCUTS = new Set(['v', 'x', 'z', 'y', 'backspace', 'delete', 'enter', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'home', 'end']);

  let enabled = false;
  let paused = false;
  let anim = null;
  let programmaticUntil = 0;
  let framePending = false;
  let timers = [];
  let lastCaretRect = null;

  const scroller = () => Authored.sel.q('editor');

  // Our own caret: a visible caret whose cursor has no collaborator name label.
  function ownCaretRect() {
    const carets = Authored.sel.qa('cursorCaret');
    for (const caret of carets) {
      const cursor = caret.closest(Authored.SEL.cursor.css);
      const name = cursor && Authored.sel.q('cursorName', cursor);
      if (name && name.textContent.trim()) continue;
      const r = caret.getBoundingClientRect();
      if (r.height > 0) return r;
    }
    if (!carets.length) Authored.sel.warnMissing('cursorCaret');
    return null;
  }

  function correct() {
    framePending = false;
    if (!enabled || paused) return;
    const sc = scroller();
    if (!sc) {
      Authored.sel.warnMissing('editor');
      return;
    }
    // A blinking caret can be momentarily hidden; the re-checks in schedule()
    // catch it on a later frame.
    const r = ownCaretRect();
    if (!r) return;
    lastCaretRect = r;
    const caretMid = r.top + r.height / 2;
    const target = (window.innerHeight * Authored.settings.targetPct) / 100;
    const delta = caretMid - target;
    if (Math.abs(delta) < DEADBAND_PX) return;
    const max = sc.scrollHeight - sc.clientHeight;
    const dest = Authored.clamp(sc.scrollTop + delta, 0, max);
    if (Math.abs(dest - sc.scrollTop) < 1) return; // top of document: nothing to do
    animateTo(sc, dest);
  }

  function schedule() {
    for (const t of timers) clearTimeout(t);
    timers = RECHECK_MS.map((ms) =>
      setTimeout(() => {
        if (framePending) return;
        framePending = true;
        // Two frames: let Docs render the keystroke before measuring.
        requestAnimationFrame(() => requestAnimationFrame(correct));
      }, ms)
    );
  }

  function setScroll(sc, y) {
    programmaticUntil = performance.now() + 120;
    sc.scrollTop = y;
  }

  function animateTo(sc, to) {
    if (Authored.reducedMotion()) {
      anim = null;
      setScroll(sc, to);
      return;
    }
    const from = sc.scrollTop;
    const start = performance.now();
    const token = (anim = { to });
    const step = (now) => {
      if (anim !== token) return;
      const t = Math.min(1, (now - start) / EASE_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setScroll(sc, from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
      else anim = null;
    };
    requestAnimationFrame(step);
  }

  function pause() {
    if (!enabled) return;
    paused = true;
    anim = null;
  }

  function onKey(k) {
    if (!enabled) return;
    const caretKey = k.typing || k.kind === 'nav' || (k.kind === 'shortcut' && k.ctrl && CARET_SHORTCUTS.has(k.key.toLowerCase()));
    if (!caretKey) return;
    paused = false;
    schedule();
  }

  function updateEndSpace() {
    const html = document.documentElement;
    if (enabled) html.style.setProperty('--authored-end-space', `${100 - Authored.settings.targetPct}vh`);
    else html.style.removeProperty('--authored-end-space');
  }

  function refresh() {
    const want = Authored.focusMode.isOn() && Authored.settings.typewriter;
    if (want === enabled) {
      updateEndSpace();
      return;
    }
    enabled = want;
    paused = false;
    anim = null;
    updateEndSpace();
  }

  Authored.centering = {
    init() {
      Authored.bus.on('key', onKey);
      Authored.bus.on('focus', refresh);
      Authored.bus.on('settings', ({ patch }) => {
        if ('typewriter' in patch || 'targetPct' in patch) refresh();
      });

      // Manual scrolling pauses centring until the next keystroke.
      window.addEventListener('wheel', pause, { capture: true, passive: true });
      window.addEventListener('touchmove', pause, { capture: true, passive: true });
      // Scrollbar drag: a scroll event we did not cause while the mouse is down.
      let mouseDown = false;
      window.addEventListener('mousedown', () => (mouseDown = true), true);
      window.addEventListener('mouseup', () => (mouseDown = false), true);
      document.addEventListener(
        'scroll',
        (e) => {
          if (mouseDown && performance.now() > programmaticUntil && e.target === scroller()) pause();
        },
        { capture: true, passive: true }
      );
    },
    isEnabled: () => enabled,
    isPaused: () => paused,
    lastCaretRect: () => lastCaretRect,
    caretRect: ownCaretRect, // shared with lastplace.js
  };
})();
