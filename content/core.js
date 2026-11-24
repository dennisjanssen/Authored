// Shared plumbing for all Authored content-script modules: logging, a tiny event
// bus, persisted settings, the keyboard source, and small helpers.
// Every module hangs off the global `Authored` namespace (isolated world only).

(() => {
  'use strict';
  const Authored = (globalThis.Authored = globalThis.Authored || {});

  // ── Logging ────────────────────────────────────────────────────────────
  const PREFIX = '[Authored]';
  const warned = new Set();
  Authored.log = {
    info: (...a) => console.info(PREFIX, ...a),
    warn: (...a) => console.warn(PREFIX, ...a),
    error: (...a) => console.error(PREFIX, ...a),
    warnOnce(key, ...a) {
      if (warned.has(key)) return;
      warned.add(key);
      console.warn(PREFIX, ...a);
    },
  };

  // ── Event bus ──────────────────────────────────────────────────────────
  // Events: 'focus' {on}, 'fullscreen' {on}, 'settings' {patch, settings},
  // 'key' (see classify), 'total' {total, method}, 'progress' {...},
  // 'milestone' {levels, top}, 'drawer' {open}.
  const handlers = new Map();
  Authored.bus = {
    on(evt, fn) {
      if (!handlers.has(evt)) handlers.set(evt, new Set());
      handlers.get(evt).add(fn);
      return () => handlers.get(evt).delete(fn);
    },
    emit(evt, payload) {
      for (const fn of handlers.get(evt) || []) {
        try {
          fn(payload);
        } catch (e) {
          Authored.log.error(`handler for "${evt}" failed:`, e);
        }
      }
    },
  };

  // ── Helpers ────────────────────────────────────────────────────────────
  // False once the extension has been reloaded/removed while this tab stays open.
  Authored.alive = () => {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  };

  Authored.send = async (msg) => {
    if (!Authored.alive()) return null;
    try {
      return await chrome.runtime.sendMessage(msg);
    } catch (e) {
      Authored.log.warnOnce(`send:${msg.type}`, `message "${msg.type}" failed:`, e?.message || e);
      return null;
    }
  };

  Authored.loadText = async (path) => {
    const res = await fetch(chrome.runtime.getURL(path));
    return res.text();
  };

  Authored.reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  Authored.docId = () => (location.pathname.match(/\/document\/d\/([^/]+)/) || [])[1] || null;

  Authored.clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // ── Settings ───────────────────────────────────────────────────────────
  const DEFAULTS = {
    theme: 'dark', // dark | sepia | light  (see styles/themes.css)
    goal: 500,
    typewriter: true,
    targetPct: 45, // centred-typing line height, % of window height
    sound: true,
    soundStyle: 'typewriter', // typewriter | keyboard  (see content/sound.js)
    volume: 0.35,
    fullscreenWithFocus: true,
    name: '', // used by the welcome overlay
    welcome: true, // greet when entering focus mode
  };
  Authored.DEFAULTS = DEFAULTS;
  Authored.settings = { ...DEFAULTS };

  const storageGet = async (keys) => (Authored.alive() ? chrome.storage.local.get(keys) : {});
  const storageSet = async (obj) => {
    if (!Authored.alive()) return;
    try {
      await chrome.storage.local.set(obj);
    } catch (e) {
      Authored.log.warnOnce('storage-set', 'could not save:', e?.message || e);
    }
  };
  Authored.storage = { get: storageGet, set: storageSet };

  Authored.store = {
    async load() {
      const { settings } = await storageGet('settings');
      Object.assign(Authored.settings, DEFAULTS, settings || {});
      // Keep tabs in sync when settings change elsewhere.
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes.settings) return;
        const next = changes.settings.newValue || {};
        const patch = {};
        for (const [k, v] of Object.entries(next)) if (Authored.settings[k] !== v) patch[k] = v;
        if (!Object.keys(patch).length) return;
        Object.assign(Authored.settings, patch);
        Authored.bus.emit('settings', { patch, settings: Authored.settings });
      });
    },
    set(patch) {
      Object.assign(Authored.settings, patch);
      storageSet({ settings: { ...Authored.settings } });
      Authored.bus.emit('settings', { patch, settings: Authored.settings });
    },
  };

  // ── Keyboard source ────────────────────────────────────────────────────
  // Google Docs captures typing in a hidden iframe (.docs-texteventtarget-iframe),
  // so keydown listeners go on that iframe's document as well as the main one.
  // Each event happens in exactly one of them, so nothing is counted twice.
  const MODIFIERS = new Set([
    'Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'OS', 'Fn', 'NumLock', 'ScrollLock', 'Hyper', 'Super',
  ]);
  const isMac = /Mac/.test(navigator.platform);

  // kind: modifier | shortcut | char | space | enter | delete | nav | escape | other
  function classify(e) {
    const k = e.key;
    if (MODIFIERS.has(k)) return 'modifier';
    const altGr = e.ctrlKey && e.altKey; // AltGr on Windows (AZERTY @, #, € …)
    if ((e.ctrlKey || e.metaKey) && !altGr) return 'shortcut';
    if (e.altKey && !e.ctrlKey && !isMac) return 'shortcut';
    if (k === 'Enter') return 'enter';
    if (k === 'Backspace' || k === 'Delete') return 'delete';
    if (k === ' ' || k === 'Tab') return 'space';
    if (k === 'Escape') return 'escape';
    if (/^(Arrow|Page|Home$|End$)/.test(k)) return 'nav';
    if (k.length === 1 || k === 'Dead' || k === 'Process' || k === 'Unidentified') return 'char';
    return 'other';
  }
  const TYPING = new Set(['char', 'space', 'enter', 'delete']);

  const attached = new WeakSet();
  let lastKeyAt = 0;
  let iframeSeen = false;

  function onKeydown(e) {
    if (Authored.ui?.owns(e)) return; // typing inside our own settings drawer
    const kind = classify(e);
    if (kind !== 'modifier') lastKeyAt = performance.now();
    Authored.bus.emit('key', {
      kind,
      typing: TYPING.has(kind),
      key: e.key,
      repeat: e.repeat,
      ctrl: e.ctrlKey || e.metaKey,
      time: performance.now(),
    });
  }

  function attach(doc) {
    if (!doc || attached.has(doc)) return;
    attached.add(doc);
    doc.addEventListener('keydown', onKeydown, true);
  }

  function scanFrames() {
    attach(document);
    const frames = Authored.sel ? Authored.sel.qa('textEventIframe') : [];
    for (const f of frames) {
      try {
        attach(f.contentDocument);
        iframeSeen = true;
      } catch {
        Authored.log.warnOnce('iframe-access', 'cannot reach the typing iframe; key sounds may only work partly.');
      }
    }
  }

  Authored.keys = {
    init() {
      scanFrames();
      // Docs can recreate the iframe document; re-check cheaply.
      setInterval(scanFrames, 2000);
      setTimeout(() => {
        if (!iframeSeen) Authored.sel?.report(['textEventIframe']);
      }, 8000);
    },
    lastKeyAt: () => lastKeyAt,
  };
})();
