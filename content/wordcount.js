// Measures the document's total word count and emits 'total' {total, method}.
//
// Method 1 (preferred): fetch the plain-text export of this document from the
//   same origin with the user's own session, and count words locally.
//   Nothing leaves the browser; it is the same request as File → Download → .txt.
// Method 2 (fallback): the accessibility text layer in the DOM. Docs only
//   renders pages near the viewport, so this is approximate for long documents.
// Method 3 (the Word count dialog) is deliberately not implemented: it
//   disturbs the interface. See README.
//
// Polling: at most every POLL_MS, only while focus mode is on and only after
// the user typed. A measurement is not considered final until it starts at
// least SETTLE_MS after the last keystroke, so the export has had time to
// include the latest (auto-saved) edits.

(() => {
  'use strict';
  const Authored = globalThis.Authored;

  const POLL_MS = 10000;
  const SETTLE_MS = 4000;
  const TICK_MS = 1000;
  const EXPORT_FAILURES_BEFORE_FALLBACK = 2;

  let timer = 0;
  let dirty = false;
  let inflight = false;
  let lastFetch = 0;
  let exportFailures = 0;
  let method = null;

  // Matches how Docs counts closely enough: whitespace and em/en dashes
  // separate words; tokens without a letter or digit (e.g. "*", "—") don't count.
  function countWords(text) {
    const tokens = text.replace(/^﻿/, '').split(/[\s–—]+/u);
    let n = 0;
    for (const t of tokens) if (/[\p{L}\p{N}]/u.test(t)) n++;
    return n;
  }

  async function viaExport() {
    const id = Authored.docId();
    if (!id) throw new Error('no document id in URL');
    const url = `${location.origin}/document/d/${id}/export?format=txt`;
    // Docs answers with a redirect to a signed URL on *.googleusercontent.com,
    // which allows any origin (Access-Control-Allow-Origin: *) but only for
    // requests without cookies. 'same-origin' sends the session cookie to
    // docs.google.com and drops it after the cross-origin redirect, which is
    // exactly what both hops need. ('include' fails the CORS check.)
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) throw new Error(`export returned HTTP ${res.status}`);
    const type = res.headers.get('content-type') || '';
    if (type.includes('text/html')) throw new Error('export returned an HTML page (signed out?)');
    return countWords(await res.text());
  }

  function viaTextLayer() {
    const nodes = Authored.sel.qa('textLayer');
    if (!nodes.length) {
      Authored.sel.warnMissing('textLayer');
      throw new Error('no text layer');
    }
    const text = nodes.map((n) => n.getAttribute('aria-label') ?? n.textContent ?? '').join('\n');
    return countWords(text);
  }

  async function measure() {
    if (inflight) return;
    inflight = true;
    lastFetch = performance.now();
    dirty = lastFetch - Authored.keys.lastKeyAt() < SETTLE_MS; // still typing: measure again later
    try {
      let total;
      let used;
      if (exportFailures < EXPORT_FAILURES_BEFORE_FALLBACK) {
        try {
          total = await viaExport();
          used = 'export';
          exportFailures = 0;
        } catch (e) {
          exportFailures++;
          Authored.log.warn(`word count via export failed (${exportFailures}/${EXPORT_FAILURES_BEFORE_FALLBACK}):`, e.message);
        }
      }
      if (total == null) {
        total = viaTextLayer();
        used = 'text-layer';
      }
      if (used !== method) {
        method = used;
        Authored.log.info(`word count method: ${method}`);
      }
      Authored.bus.emit('total', { total, method });
    } catch (e) {
      Authored.log.warnOnce('wordcount-none', 'no word count method works on this page:', e.message);
      Authored.bus.emit('total-error', { error: e.message });
    } finally {
      inflight = false;
    }
  }

  function tick() {
    if (!dirty || inflight) return;
    if (performance.now() - lastFetch < POLL_MS) return;
    measure();
  }

  Authored.wordcount = {
    init() {
      Authored.bus.on('key', (k) => {
        if (k.typing || (k.kind === 'shortcut' && 'vxzy'.includes(k.key.toLowerCase()))) dirty = true;
      });
      Authored.bus.on('focus', ({ on }) => {
        clearInterval(timer);
        if (on) timer = setInterval(tick, TICK_MS);
      });
    },
    // Measure now (used at the start of a session for the baseline).
    refresh: measure,
    method: () => method,
    countWords,
  };
})();
