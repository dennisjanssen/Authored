// Focus mode: hides the Docs interface and applies the theme.
//
// On: injects three <style> elements (themes.css, focus.css, and rules generated
// from selectors.js) and marks <html> with .authored-on + data-authored-theme.
// Off: removes all of them, so Docs looks exactly as before. Nothing reloads
// and the cursor is untouched; Docs is only asked to re-measure its layout.

(() => {
  'use strict';
  const Authored = globalThis.Authored;

  // Present on every document; worth a warning if they stop matching.
  const EXPECTED = ['docsChrome', 'horizontalRuler', 'editor', 'editorContainer', 'page'];

  let on = false;
  let cssThemes = '';
  let cssFocus = '';
  let styleEls = [];

  // Rules that need Docs selectors are generated here, one rule per selector,
  // so that a single broken selector cannot invalidate the others.
  function generatedCss() {
    const S = Authored.SEL;
    const rules = Authored.sel.HIDE_KEYS.map((k) => `${S[k].css} { display: none !important; }`);
    rules.push(
      `${S.editorContainer.css} { background: var(--authored-bg) !important; }`,
      `${S.editorOuter.css} { background: var(--authored-bg) !important; }`,
      `${S.editor.css} {
        background: var(--authored-bg) !important;
        box-sizing: border-box !important;
        padding-bottom: var(--authored-end-space, 0px) !important;
        scrollbar-width: thin;
        scrollbar-color: var(--authored-faint) transparent;
      }`,
      `${S.page.css} {
        filter: var(--authored-page-filter, none) !important;
        box-shadow: none !important;
        border-color: transparent !important;
      }`
    );
    return rules.join('\n');
  }

  function addStyle(id, text) {
    const el = document.createElement('style');
    el.id = id;
    el.textContent = text;
    (document.head || document.documentElement).appendChild(el);
    return el;
  }

  // Docs sizes its editor from JavaScript; a resize event makes it re-measure
  // after the top bar appears or disappears.
  function relayout() {
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  function applyTheme() {
    if (on) document.documentElement.dataset.authoredTheme = Authored.settings.theme;
  }

  function set(want) {
    want = !!want;
    if (want === on) return;
    on = want;
    const html = document.documentElement;
    if (on) {
      styleEls = [
        addStyle('authored-themes', cssThemes),
        addStyle('authored-focus', cssFocus),
        addStyle('authored-generated', generatedCss()),
      ];
      html.classList.add('authored-on');
      applyTheme();
      setTimeout(() => Authored.sel.report(EXPECTED), 500);
    } else {
      for (const el of styleEls) el.remove();
      styleEls = [];
      html.classList.remove('authored-on', 'authored-mouse-idle');
      delete html.dataset.authoredTheme;
    }
    relayout();
    Authored.bus.emit('focus', { on });
  }

  Authored.focusMode = {
    async init() {
      [cssThemes, cssFocus] = await Promise.all([
        Authored.loadText('styles/themes.css'),
        Authored.loadText('styles/focus.css'),
      ]);
      Authored.bus.on('settings', ({ patch }) => {
        if ('theme' in patch) applyTheme();
      });
    },
    isOn: () => on,
    set,
    toggle: () => set(!on),
  };
})();
