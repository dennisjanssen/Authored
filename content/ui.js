// Authored's own interface, in a closed shadow root so Docs styles cannot touch it:
//   • corner controls (bottom left): focus, fullscreen, settings. They fade in
//     when the mouse moves and fade out again after a couple of seconds.
//   • word count (bottom right): faint, full opacity on hover.
//   • progress line (top edge) with the goal rewards.
//   • settings drawer (left edge): opens when the mouse rests on the edge or
//     via the shortcut. Other features (e.g. chapter navigation later) can add
//     their own section with Authored.ui.addDrawerSection().
// It also hides the mouse pointer after a few seconds of typing.

(() => {
  'use strict';
  const Authored = globalThis.Authored;

  const CONTROLS_IDLE_MS = 2200;
  const POINTER_HIDE_MS = 3000;
  const EDGE_DWELL_MS = 250;
  const DRAWER_LEAVE_MS = 700;
  const NOTE_MS = 1800;
  const GOAL_NOTE_MS = 4500;

  // [id, name, background, text, page] for the drawer's previews. page is the
  // paper colour for themes that show a page; pageless themes have none.
  // The real colours live in styles/themes.css.
  const THEMES = [
    ['dark', 'Dark', '#161616', '#e5e5e5', '#191919'],
    ['sepia', 'Sepia', '#e6dcc8', '#1a1a1a', '#f1f1ed'],
    ['light', 'Light', '#f2f2f0', '#111111', '#ffffff'],
    ['night', 'Night', '#1c1c1c', '#cecece'],
    ['midnight', 'Midnight', '#161d25', '#d7e3e6'],
    ['espresso', 'Espresso', '#201917', '#d9d4bc'],
    ['forest', 'Forest', '#171917', '#cce2d1'],
    ['mist', 'Mist', '#eaeaea', '#212121'],
    ['parchment', 'Parchment', '#f1e5cf', '#28241d'],
  ];

  const SOUND_STYLES = [
    ['typewriter', 'Typewriter'],
    ['keyboard', 'Keyboard'],
  ];

  // Google Docs enforces Trusted Types, which blocks innerHTML even for
  // extensions. All of Authored's interface is therefore built with DOM calls.
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') el.textContent = v;
      else if (k === 'style') el.style.cssText = v; // CSSOM: allowed even where CSP blocks style attributes
      else el.setAttribute(k, v);
    }
    el.append(...children.flat().filter((c) => c != null));
    return el;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(shapes) {
    const s = document.createElementNS(SVG_NS, 'svg');
    const base = { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    for (const [k, v] of Object.entries(base)) s.setAttribute(k, v);
    for (const [tag, attrs] of shapes) {
      const e = document.createElementNS(SVG_NS, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
      s.append(e);
    }
    return s;
  }

  const SPEAKER = ['path', { d: 'M2.5 6h2.5l3.5-3v10l-3.5-3H2.5z' }];
  const ICON = {
    focus: () => svg([['circle', { cx: 8, cy: 8, r: 5.5 }], ['circle', { cx: 8, cy: 8, r: 1.6, fill: 'currentColor', stroke: 'none' }]]),
    fullscreen: () => svg([['path', { d: 'M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10' }]]),
    drawer: () =>
      svg([
        ['path', { d: 'M2.5 4.5h11M2.5 8h11M2.5 11.5h11' }],
        ['circle', { cx: 5.5, cy: 4.5, r: 1.3, fill: 'currentColor' }],
        ['circle', { cx: 10.5, cy: 8, r: 1.3, fill: 'currentColor' }],
        ['circle', { cx: 7, cy: 11.5, r: 1.3, fill: 'currentColor' }],
      ]),
    soundOn: () => svg([SPEAKER, ['path', { d: 'M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.8a6 6 0 0 1 0 8.4' }]]),
    soundOff: () => svg([SPEAKER, ['path', { d: 'M11 6l3.5 4M14.5 6L11 10' }]]),
    jump: () => svg([['path', { d: 'M6 3.5L3 6.5l3 3' }], ['path', { d: 'M3.5 6.5H10a3 3 0 0 1 0 6H7.5' }]]),
  };

  function buildDom() {
    const sec = (label, ...rows) => h('section', { class: 'sec' }, h('span', { class: 'label', text: label }), ...rows);
    const row = (tag, ...kids) => h(tag, { class: 'row' }, ...kids);
    const span = (text, cls) => h('span', cls ? { class: cls, text } : { text });

    return [
      h('div', { class: 'controls' },
        h('button', { class: 'ctl', 'data-act': 'focus', title: 'Focus mode', 'aria-pressed': 'false' }, ICON.focus()),
        h('button', { class: 'ctl', 'data-act': 'fullscreen', title: 'Fullscreen', 'aria-pressed': 'false' }, ICON.fullscreen()),
        h('button', { class: 'ctl', 'data-act': 'jump', title: 'Back to where I was writing' }, ICON.jump()),
        h('button', { class: 'ctl', 'data-act': 'drawer', title: 'Settings' }, ICON.drawer())),

      h('div', { class: 'bar' },
        h('div', { class: 'fill' }, h('div', { class: 'glow-layer' }), h('div', { class: 'ripple-layer' })),
        h('div', { class: 'markers' })),

      h('div', { class: 'count' },
        h('span', { class: 'main' }, span('…', 'session'), span('', 'total')),
        span('', 'note')),

      h('div', { class: 'edge' }),

      h('aside', { class: 'drawer', 'aria-label': 'Authored settings' },
        h('h1', { text: 'AUTHORED' }),
        sec('Session goal',
          row('div', h('input', { type: 'number', class: 'goal', min: 50, max: 50000, step: 50 }), span('words')),
          h('div', { class: 'hint today' }),
          h('button', { class: 'link restart', text: 'Start a new session' })),
        sec('Theme',
          h('div', { class: 'swatches themes' }, THEMES.map(([id, name, bg, text, page]) =>
            h('button', { 'data-theme': id, 'aria-pressed': 'false', title: page ? name : `${name} (pageless)` },
              h('span', { class: 'swatch', style: `background:${bg}` },
                h('span', { class: page ? 'swatch-page' : 'swatch-text', style: page ? `background:${page};color:${text}` : `color:${text}`, text: 'Aa' })),
              h('span', { class: 'swatch-name', text: name })))),
          h('div', { class: 'hint', text: 'Bottom two rows: pageless, only text on the background.' })),
        sec('Centred typing',
          row('label', span('Keep the line in place'), h('input', { type: 'checkbox', class: 'typewriter' })),
          row('div', span('Height'), h('input', { type: 'range', class: 'target', min: 35, max: 60, step: 1 }), span('', 'val target-val'))),
        sec('Sound',
          h('div', { class: 'seg sound-styles' }, SOUND_STYLES.map(([id, name]) => h('button', { 'data-style': id, 'aria-pressed': 'false', text: name }))),
          row('div',
            h('button', { class: 'speaker', 'aria-pressed': 'true', title: 'Sound on/off' }),
            h('input', { type: 'range', class: 'volume', min: 0, max: 100, step: 1 }),
            span('', 'val volume-val')),
          h('div', { class: 'hint sound-source' })),
        sec('Window',
          row('label', span('Fullscreen with focus mode'), h('input', { type: 'checkbox', class: 'fswf' }))),
        sec('Welcome',
          row('div', span('Your name'), h('input', { type: 'text', class: 'name', maxlength: 40, placeholder: 'optional', spellcheck: 'false' })),
          row('label', span('Greet me in focus mode'), h('input', { type: 'checkbox', class: 'welcome' }))),
        h('div', { class: 'extra' }),
        h('div', { class: 'keys' })),
    ];
  }

  let host, root;
  const $ = (sel) => root.querySelector(sel);

  let controlsTimer = 0;
  let lastMouseMove = 0;
  let drawerOpen = false;
  let drawerPinned = false; // opened by shortcut/button: stays until closed explicitly
  let edgeTimer = 0;
  let leaveTimer = 0;
  let noteTimer = 0;
  let lastProgress = null;

  // ── Corner controls & mouse pointer ────────────────────────────────────
  function wakeControls() {
    const c = $('.controls');
    c.classList.add('awake');
    clearTimeout(controlsTimer);
    controlsTimer = setTimeout(() => {
      if (!c.matches(':hover')) c.classList.remove('awake');
      else wakeControls();
    }, CONTROLS_IDLE_MS);
  }

  function onMouseMove() {
    lastMouseMove = performance.now();
    document.documentElement.classList.remove('authored-mouse-idle');
    wakeControls();
  }

  function onKey(k) {
    if (!Authored.focusMode.isOn() || !k.typing) return;
    if (performance.now() - lastMouseMove > POINTER_HIDE_MS) {
      document.documentElement.classList.add('authored-mouse-idle');
      $('.controls').classList.remove('awake');
    }
  }

  // ── Word count ─────────────────────────────────────────────────────────
  const fmt = (n) => Math.abs(n).toLocaleString('en-US');

  function renderCount(p) {
    const sessionEl = $('.session');
    const totalEl = $('.total');
    if (!p || p.total == null) {
      sessionEl.textContent = p?.error ? 'word count unavailable' : '…';
      totalEl.textContent = '';
      $('.count').title = p?.error ? 'See the console for details ([Authored])' : '';
      return;
    }
    if (p.session == null) {
      // Only an approximate total (rendered pages); no session count from that.
      sessionEl.textContent = 'session count unavailable';
      totalEl.textContent = `≈${fmt(p.total)} total`;
      $('.count').title = 'Approximate: the exact count could not be fetched. See the console ([Authored]).';
      return;
    }
    const s = p.session;
    const sign = s < 0 ? '−' : '';
    sessionEl.textContent = `${sign}${fmt(s)} ${Math.abs(s) === 1 ? 'word' : 'words'} this session`;
    totalEl.textContent = `${fmt(p.total)} total`;
    $('.count').title = `Goal: ${fmt(p.goal)} words${p.method === 'text-layer' ? ' (approximate count)' : ''}`;
  }

  function note(text, ms = NOTE_MS) {
    const c = $('.count');
    $('.note').textContent = text;
    c.classList.add('noting');
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => c.classList.remove('noting'), ms);
  }

  // ── Progress line & rewards ────────────────────────────────────────────
  function renderBar(p) {
    const bar = $('.bar');
    const ratio = p && p.total != null ? p.ratio : 0;
    $('.fill').style.width = `${Authored.clamp(ratio, 0, 1) * 100}%`;
    bar.classList.toggle('complete', ratio >= 1);
    bar.classList.toggle('warm', ratio >= 1.5);
    const markers = ratio >= 2 ? Math.min(Math.floor(ratio) - 1, 20) : 0;
    const box = $('.markers');
    if (box.childElementCount !== markers) box.replaceChildren(...Array.from({ length: markers }, () => h('i')));
  }

  function playOnce(cls, ms) {
    if (Authored.reducedMotion()) return;
    const bar = $('.bar');
    bar.classList.remove(cls);
    void bar.offsetWidth; // restart the animation
    bar.classList.add(cls);
    setTimeout(() => bar.classList.remove(cls), ms);
  }

  function onMilestone({ top }) {
    if (top === 1) {
      playOnce('glow', 2000);
      note('Goal reached', GOAL_NOTE_MS);
    } else if (top >= 2) {
      playOnce('ripple', 2600);
    }
    // 1.5: the warm colour and shimmer follow from renderBar; nothing extra.
  }

  // ── Drawer ─────────────────────────────────────────────────────────────
  function syncDrawer() {
    const s = Authored.settings;
    const goalInput = $('.goal');
    if (root.activeElement !== goalInput) goalInput.value = s.goal;
    for (const b of root.querySelectorAll('.themes button')) b.setAttribute('aria-pressed', String(b.dataset.theme === s.theme));
    for (const b of root.querySelectorAll('.sound-styles button')) b.setAttribute('aria-pressed', String(b.dataset.style === s.soundStyle));
    $('.typewriter').checked = s.typewriter;
    $('.target').value = s.targetPct;
    $('.target-val').textContent = `${s.targetPct}%`;
    const sp = $('.speaker');
    sp.setAttribute('aria-pressed', String(s.sound));
    sp.replaceChildren(s.sound ? ICON.soundOn() : ICON.soundOff());
    $('.volume').value = Math.round(s.volume * 100);
    $('.volume-val').textContent = `${Math.round(s.volume * 100)}`;
    $('.fswf').checked = s.fullscreenWithFocus;
    const rec = Authored.sound?.recordedCount?.(s.soundStyle) ?? 0;
    $('.sound-source').textContent = rec ? `Playing your recordings (${rec} clips)` : 'Playing built-in sounds (no recordings loaded)';
    if (root.activeElement !== $('.name')) $('.name').value = s.name;
    $('.welcome').checked = s.welcome;
    const today = Authored.goal?.todayWords?.() ?? 0;
    $('.today').textContent = `${today < 0 ? '−' : ''}${fmt(today)} words written today`;
  }

  async function renderShortcuts() {
    const cmds = await Authored.send({ type: 'authored:commands' });
    if (!Array.isArray(cmds)) return;
    $('.keys').replaceChildren(
      ...cmds
        .filter((c) => c.description)
        .map((c) => h('div', {}, h('span', { text: c.description }), h('kbd', { text: c.shortcut || 'not set' })))
    );
  }

  // Give the keyboard back to the document after using the drawer.
  function refocusDocument() {
    if (!host.matches(':focus-within') && document.activeElement !== host) return;
    document.activeElement?.blur?.();
    const frame = Authored.sel.q('textEventIframe');
    try {
      frame?.contentWindow?.focus();
      frame?.contentDocument?.activeElement?.focus?.();
    } catch {
      /* ignore */
    }
  }

  function setDrawer(open, { pinned = false } = {}) {
    if (open && !Authored.focusMode.isOn()) return;
    clearTimeout(leaveTimer);
    if (open === drawerOpen) {
      if (open) drawerPinned = drawerPinned || pinned;
      return;
    }
    drawerOpen = open;
    drawerPinned = open && pinned;
    $('.drawer').classList.toggle('open', open);
    if (open) {
      syncDrawer();
      renderShortcuts();
    } else {
      refocusDocument();
    }
    Authored.bus.emit('drawer', { open });
  }

  function wireDrawer() {
    const edge = $('.edge');
    const drawer = $('.drawer');
    edge.addEventListener('mouseenter', () => {
      clearTimeout(edgeTimer);
      edgeTimer = setTimeout(() => setDrawer(true), EDGE_DWELL_MS);
    });
    edge.addEventListener('mouseleave', () => clearTimeout(edgeTimer));
    drawer.addEventListener('mouseenter', () => clearTimeout(leaveTimer));
    drawer.addEventListener('mouseleave', () => {
      if (drawerPinned) return;
      if (drawer.matches(':focus-within') && root.activeElement?.matches('input[type=number], input[type=text]')) return;
      leaveTimer = setTimeout(() => setDrawer(false), DRAWER_LEAVE_MS);
    });
    // Click outside closes a drawer that was opened by shortcut.
    document.addEventListener(
      'mousedown',
      (e) => {
        if (drawerOpen && e.target !== host) setDrawer(false);
      },
      true
    );

    const set = (patch) => Authored.store.set(patch);
    $('.goal').addEventListener('change', (e) => {
      const v = Math.round(Number(e.target.value));
      if (Number.isFinite(v) && v > 0) set({ goal: v });
      else e.target.value = Authored.settings.goal;
    });
    $('.themes').addEventListener('click', (e) => {
      const t = e.target.closest('button')?.dataset.theme;
      if (t) set({ theme: t });
    });
    $('.restart').addEventListener('click', () => {
      Authored.goal.restart();
      note('New session started');
    });
    $('.sound-styles').addEventListener('click', (e) => {
      const style = e.target.closest('button')?.dataset.style;
      if (!style) return;
      set({ soundStyle: style });
      if (Authored.settings.sound) Authored.sound.play('key'); // a quick preview
    });
    $('.typewriter').addEventListener('change', (e) => set({ typewriter: e.target.checked }));
    $('.target').addEventListener('input', (e) => set({ targetPct: Number(e.target.value) }));
    $('.speaker').addEventListener('click', () => set({ sound: !Authored.settings.sound }));
    $('.volume').addEventListener('input', (e) => set({ volume: Number(e.target.value) / 100 }));
    $('.fswf').addEventListener('change', (e) => set({ fullscreenWithFocus: e.target.checked }));
    $('.name').addEventListener('change', (e) => set({ name: e.target.value.trim() }));
    $('.welcome').addEventListener('change', (e) => set({ welcome: e.target.checked }));
  }

  // ── Init ───────────────────────────────────────────────────────────────
  async function init() {
    host = document.createElement('authored-root');
    root = host.attachShadow({ mode: 'closed' });
    const css = await Authored.loadText('styles/ui.css');
    root.append(h('style', { text: css }), ...buildDom());
    document.body.appendChild(host);

    // Keys typed in our inputs must not reach Docs' own handlers.
    for (const type of ['keydown', 'keypress', 'keyup']) root.addEventListener(type, (e) => {
      e.stopPropagation();
      if (type === 'keydown' && e.key === 'Escape') setDrawer(false);
    });

    // Buttons must not steal focus from the document (keeps the text cursor).
    $('.controls').addEventListener('mousedown', (e) => e.preventDefault());
    $('.controls').addEventListener('click', (e) => {
      const act = e.target.closest('button')?.dataset.act;
      if (act) Authored.actions[act]?.();
    });

    wireDrawer();
    document.addEventListener('mousemove', onMouseMove, { capture: true, passive: true });

    Authored.bus.on('key', onKey);
    Authored.bus.on('focus', ({ on }) => {
      host.dataset.focus = on ? 'on' : 'off';
      $('.ctl[data-act="focus"]').setAttribute('aria-pressed', String(on));
      if (!on) setDrawer(false);
    });
    Authored.bus.on('fullscreen', ({ on }) => $('.ctl[data-act="fullscreen"]').setAttribute('aria-pressed', String(on)));
    Authored.bus.on('progress', (p) => {
      lastProgress = p;
      renderCount(p);
      renderBar(p);
      if (drawerOpen) syncDrawer();
    });
    Authored.bus.on('milestone', onMilestone);
    Authored.bus.on('sound-source', () => drawerOpen && syncDrawer());
    Authored.bus.on('lastplace', ({ available }) => (host.dataset.place = available ? 'yes' : 'no'));
    Authored.bus.on('settings', () => {
      if (drawerOpen) syncDrawer();
    });
    host.dataset.focus = 'off';
  }

  Authored.ui = {
    init,
    // True if the event came from inside Authored's own interface.
    owns: (e) => !!host && (e.target === host || e.composedPath?.().includes(host)),
    note: (text, ms) => host && Authored.focusMode.isOn() && note(text, ms),
    toggleDrawer: () => setDrawer(!drawerOpen, { pinned: true }),
    setDrawer,
    // For future features (e.g. chapter navigation): adds a section to the
    // drawer above the shortcut list. Returns the section element.
    addDrawerSection(title, contentEl) {
      const sec = document.createElement('section');
      sec.className = 'sec';
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = title;
      sec.append(label, contentEl);
      $('.extra').appendChild(sec);
      return sec;
    },
    lastProgress: () => lastProgress,
    // For other modules that add their own elements (e.g. welcome.js).
    h,
    mount: (el) => root.append(el),
  };
})();
