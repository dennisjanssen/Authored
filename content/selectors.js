// Every Google Docs selector Authored relies on lives in this file.
//
// Docs class names and IDs are internal and change from time to time. When
// something stops working, the console shows a line like
//   [Authored] Selector "toolbar" (#docs-toolbar-wrapper) matched nothing …
// Open a document, inspect the element in DevTools, and fix the `css` value
// here. Nothing else needs to change.
//
// Fields:
//   css   the CSS selector (a comma list is fine)
//   hide  true → hidden while focus mode is on (one CSS rule per entry, so a
//         broken selector can never break the others)
//   why   what it targets, in plain words
//
// Prefer IDs and ARIA attributes; avoid deep structural selectors.

(() => {
  'use strict';
  const Authored = globalThis.Authored;

  Authored.SEL = {
    // ── Interface hidden in focus mode ───────────────────────────────────
    docsChrome: { css: '#docs-chrome', hide: true, why: 'Whole top area: title bar, menus and toolbar.' },
    titleBar: { css: '#docs-titlebar-container', hide: true, why: 'Document title, star, share button, avatar (inside docsChrome; kept as a fallback).' },
    menuBar: { css: '#docs-menubar', hide: true, why: 'File / Edit / View … menus (inside docsChrome; fallback).' },
    toolbar: { css: '#docs-toolbar-wrapper', hide: true, why: 'Formatting toolbar (inside docsChrome; fallback).' },
    shareButton: { css: '#docs-titlebar-share-client-button', hide: true, why: 'Share button (fallback).' },
    commentsButton: { css: '#docs-docos-commentsbutton', hide: true, why: 'Open-comments button next to Share.' },
    horizontalRuler: { css: '#kix-horizontal-ruler-container, #kix-horizontal-ruler', hide: true, why: 'Ruler above the page.' },
    verticalRuler: { css: '#kix-vertical-ruler', hide: true, why: 'Ruler left of the page.' },
    outline: { css: '.left-sidebar-container, .navigation-widget', hide: true, why: 'Left panel: document tabs and outline.' },
    companionRail: { css: '.docs-companion-app-switcher-container', hide: true, why: 'Right-hand rail with Calendar / Keep / Tasks icons.' },
    companionPanel: { css: '.docs-companion-sidebar, #docs-side-panel', hide: true, why: 'Opened side panel (Keep, Tasks, Gemini …).' },
    commentThreads: { css: '.docos-anchoreddocoview, #docos-stream-view', hide: true, why: 'Comment cards shown in the right margin.' },
    instantBubble: { css: '#docs-instant-button-bubble, .docs-instant-button-bubble', hide: true, why: 'Floating "add comment / suggest" buttons beside the cursor.' },
    exploreButton: { css: '.docs-explore-widget', hide: true, why: 'Floating Explore button, bottom right.' },

    // ── Structure Authored works with ────────────────────────────────────────
    editor: { css: '.kix-appview-editor', why: 'The scroll container that holds the pages. Centred typing scrolls this.' },
    editorContainer: { css: '.kix-appview-editor-container', why: 'Outer area around the pages; recoloured to the theme background.' },
    editorOuter: {
      css: '#docs-editor-container, #docs-editor',
      why: 'Outermost editor wrappers. Docs keeps space for the (hidden) right-hand side panel rail; recolouring these stops that space showing as a white bar.',
    },
    page: { css: '.kix-page-paginated', why: 'One page of the document; the theme filter (dark / sepia) is applied to it.' },
    cursor: { css: '.kix-cursor', why: 'A text cursor (yours, or a collaborator\'s).' },
    cursorCaret: { css: '.kix-cursor-caret', why: 'The blinking caret line inside a cursor; measured for centred typing.' },
    cursorName: { css: '.kix-cursor-name', why: 'Name label on collaborators\' cursors; used to skip them.' },
    textEventIframe: { css: '.docs-texteventtarget-iframe', why: 'Hidden iframe where Docs receives keystrokes; key sounds listen here.' },
    textLayer: {
      css: '.kix-canvas-tile-content svg rect[aria-label], .kix-lineview-text-block',
      why: 'Accessibility text layer (word-count fallback; only present for rendered pages).',
    },
  };

  const HIDE_KEYS = Object.keys(Authored.SEL).filter((k) => Authored.SEL[k].hide);

  function entry(key) {
    const s = Authored.SEL[key];
    if (!s) throw new Error(`[Authored] unknown selector key "${key}"`);
    return s;
  }

  function warnMissing(key) {
    const s = entry(key);
    Authored.log.warnOnce(
      `sel:${key}`,
      `Selector "${key}" (${s.css}) matched nothing. It targets: ${s.why} ` +
        'Google Docs may have changed; fix it in content/selectors.js.'
    );
  }

  Authored.sel = {
    HIDE_KEYS,
    q(key, root = document) {
      try {
        return root.querySelector(entry(key).css);
      } catch (e) {
        Authored.log.warnOnce(`sel-bad:${key}`, `Selector "${key}" is not valid CSS:`, e.message);
        return null;
      }
    },
    qa(key, root = document) {
      try {
        return Array.from(root.querySelectorAll(entry(key).css));
      } catch (e) {
        Authored.log.warnOnce(`sel-bad:${key}`, `Selector "${key}" is not valid CSS:`, e.message);
        return [];
      }
    },
    // Logs a clear warning for each key that currently matches nothing.
    report(keys) {
      for (const k of keys) if (!this.q(k)) warnMissing(k);
    },
    warnMissing,
  };
})();
