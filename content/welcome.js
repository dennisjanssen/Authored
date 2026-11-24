// Welcome overlay: a short, quiet greeting when focus mode is switched on,
// with a button to resume where you last wrote.
//
// • Shows for SHOW_MS over a slightly dimmed page, then fades out. Hovering
//   keeps it; clicking outside the card or typing dismisses it
//   at once, so it never gets in the way of writing.
// • Not shown again for a quick off-and-on (within AGAIN_AFTER_MS), only on
//   the first focus-mode entry of a page load or after a real break.
// • The button never takes keyboard focus from the document.
// • Can be switched off in the drawer ("Greet me in focus mode").

(() => {
  'use strict';
  const Authored = globalThis.Authored;

  const SHOW_MS = 12000;
  const AGAIN_AFTER_MS = 15 * 60 * 1000;
  const FADE_MS = 600;

  let el = null;
  let hideTimer = 0;
  let lastOffAt = 0;
  let shownThisLoad = false;

  function greeting() {
    const hour = new Date().getHours();
    const part = hour < 5 ? 'evening' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const name = Authored.settings.name;
    return name ? `Good ${part}, ${name}.` : `Good ${part}.`;
  }

  function daysAgo(ts) {
    const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((start(new Date()) - start(new Date(ts))) / 86400000);
    if (days <= 0) return 'earlier today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  }

  function subline(place) {
    const parts = [];
    if (place) parts.push(`You last wrote here ${daysAgo(place.at)}.`);
    const today = Authored.goal.todayWords();
    if (today > 0) parts.push(`${today.toLocaleString('en-US')} words today so far.`);
    else parts.push(`Today's goal: ${Authored.settings.goal.toLocaleString('en-US')} words.`);
    return parts.join(' ');
  }

  function hide(fast = false) {
    clearTimeout(hideTimer);
    if (!el) return;
    const node = el;
    el = null;
    node.classList.remove('show');
    setTimeout(() => node.remove(), fast || Authored.reducedMotion() ? 0 : FADE_MS);
  }

  function scheduleHide(ms) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => hide(), ms);
  }

  function show() {
    hide(true);
    const h = Authored.ui.h;
    const place = Authored.lastPlace.get();
    const resume = place
      ? h('button', { class: 'welcome-resume', text: 'Resume where I was' })
      : null;
    const card = h('div', { class: 'welcome', role: 'status' },
      h('div', { class: 'welcome-title', text: greeting() }),
      h('div', { class: 'welcome-sub', text: subline(place) }),
      resume);
    const backdrop = h('div', { class: 'welcome-backdrop' });
    el = h('div', { class: 'welcome-layer' }, backdrop, card);

    // Keep the text cursor in the document when clicking anywhere here.
    el.addEventListener('mousedown', (e) => e.preventDefault());
    // Clicking around the card closes it.
    backdrop.addEventListener('click', () => hide());
    card.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    card.addEventListener('mouseleave', () => scheduleHide(3000));
    resume?.addEventListener('click', () => {
      hide();
      Authored.lastPlace.jump();
    });

    Authored.ui.mount(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el?.classList.add('show')));
    scheduleHide(SHOW_MS);
    shownThisLoad = true;
  }

  function onFocus({ on }) {
    if (!on) {
      lastOffAt = Date.now();
      hide(true);
      return;
    }
    if (!Authored.settings.welcome) return;
    if (shownThisLoad && Date.now() - lastOffAt < AGAIN_AFTER_MS) return;
    // Wait a moment so the layout (and fullscreen) settles first.
    setTimeout(() => Authored.focusMode.isOn() && show(), 450);
  }

  Authored.welcome = {
    init() {
      Authored.bus.on('focus', onFocus);
      Authored.bus.on('key', (k) => {
        if (el && k.kind !== 'modifier') hide();
      });
    },
    show,
    hide,
  };
})();
