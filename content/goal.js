// Writing session, goal progress, milestone rewards and daily history.
//
// A session starts when focus mode is switched on; its baseline is the
// document total at that moment. Switching focus mode off and on again within
// RESUME_MS on the same document resumes the session (same baseline, same
// milestones), so a quick peek at the menus does not reset the count.
// "Start a new session" in the drawer re-baselines on demand.
//
// Only exact totals (the plain-text export) are used for the baseline, the
// session count and the history. The text-layer fallback only counts the
// pages Docs has rendered, so it changes as you scroll; it is shown as an
// approximate total but never turned into "words written".
//
// Milestones: 1 (100 %), 1.5 (150 %), 2, 3, 4 … (every further 100 %).
// Each fires once per session. If several are crossed at once, all are
// recorded but only the highest plays its effect.
//
// Storage (chrome.storage.local):
//   sessions:    { [docId]: { baseline, lastTotal, method, startedAt, lastSeen, reached[] } }
//   history:     { 'YYYY-MM-DD': { words, docs: { [docId]: words } } }   net words per day
//   dataVersion: bumped when stored data from older versions must be discarded

(() => {
  'use strict';
  const Authored = globalThis.Authored;

  const RESUME_MS = 15 * 60 * 1000;
  const KEEP_SESSIONS_MS = 7 * 24 * 60 * 60 * 1000;
  const SAVE_DEBOUNCE_MS = 3000;
  const EXACT = 'export'; // the only method trusted for counting words written
  // v2: versions before this could baseline a session on the approximate
  // text-layer count, inflating the session and that day's history.
  const DATA_VERSION = 2;

  let session = null;
  let history = {};
  let saveTimer = 0;
  let lastError = null;
  let approxTotal = null;

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  function addHistory(delta) {
    const day = (history[today()] ||= { words: 0, docs: {} });
    day.words += delta;
    const id = session.docId;
    day.docs[id] = (day.docs[id] || 0) + delta;
  }

  async function save() {
    clearTimeout(saveTimer);
    saveTimer = 0;
    const patch = { history };
    if (session) {
      const { sessions = {} } = await Authored.storage.get('sessions');
      const now = Date.now();
      for (const [id, s] of Object.entries(sessions)) if (now - s.lastSeen > KEEP_SESSIONS_MS) delete sessions[id];
      const { docId, baseline, lastTotal, method, startedAt, lastSeen, reached } = session;
      sessions[docId] = { baseline, lastTotal, method, startedAt, lastSeen, reached };
      patch.sessions = sessions;
    }
    await Authored.storage.set(patch);
  }

  function saveSoon() {
    if (!saveTimer) saveTimer = setTimeout(save, SAVE_DEBOUNCE_MS);
  }

  function progress() {
    const goal = Math.max(1, Authored.settings.goal);
    const method = Authored.wordcount.method();
    if (!session || session.baseline == null) {
      // No exact count yet: show the approximate total if there is one.
      return { session: null, total: approxTotal, approximate: approxTotal != null, goal, ratio: 0, error: lastError, method };
    }
    const count = session.lastTotal - session.baseline; // may be negative (editing)
    return { session: count, total: session.lastTotal, goal, ratio: Math.max(0, count) / goal, method };
  }

  function milestonesFor(ratio) {
    const levels = [];
    if (ratio >= 1) levels.push(1);
    if (ratio >= 1.5) levels.push(1.5);
    for (let n = 2; n <= Math.floor(ratio); n++) levels.push(n);
    return levels;
  }

  function emitProgress() {
    const p = progress();
    Authored.bus.emit('progress', p);
    if (!session || session.baseline == null) return;
    const fresh = milestonesFor(p.ratio).filter((l) => !session.reached.includes(l));
    if (fresh.length) {
      session.reached.push(...fresh);
      saveSoon();
      Authored.bus.emit('milestone', { levels: fresh, top: fresh[fresh.length - 1] });
    }
  }

  function freshSession(docId) {
    const now = Date.now();
    return { docId, baseline: null, lastTotal: null, method: EXACT, startedAt: now, lastSeen: now, reached: [] };
  }

  async function start() {
    const docId = Authored.docId();
    const now = Date.now();
    const { sessions = {} } = await Authored.storage.get('sessions');
    const prev = sessions[docId];
    const resumable = prev && prev.method === EXACT && prev.baseline != null && now - prev.lastSeen < RESUME_MS;
    session = resumable ? { docId, ...prev, reached: prev.reached || [], lastSeen: now } : freshSession(docId);
    lastError = null;
    emitProgress();
    Authored.wordcount.refresh();
  }

  function stop() {
    if (!session) return;
    session.lastSeen = Date.now();
    save();
    session = null;
  }

  // Throw away the current session and baseline on the next exact count.
  function restart() {
    if (!session) return;
    session = freshSession(session.docId);
    emitProgress();
    Authored.wordcount.refresh();
    saveSoon();
  }

  function onTotal({ total, method }) {
    lastError = null;
    if (method !== EXACT) {
      approxTotal = total;
      emitProgress();
      return;
    }
    approxTotal = null;
    if (!session) return;
    if (session.baseline == null) {
      session.baseline = total;
    } else if (session.lastTotal != null && total !== session.lastTotal) {
      addHistory(total - session.lastTotal);
    }
    session.lastTotal = total;
    session.lastSeen = Date.now();
    saveSoon();
    emitProgress();
  }

  async function loadData() {
    const data = await Authored.storage.get(['history', 'dataVersion']);
    if ((data.dataVersion || 1) < DATA_VERSION) {
      Authored.log.info('discarding session and history data from an older version (could be inflated).');
      history = {};
      await Authored.storage.set({ history: {}, sessions: {}, dataVersion: DATA_VERSION });
      return;
    }
    history = data.history || {};
  }

  Authored.goal = {
    async init() {
      await loadData();
      Authored.bus.on('focus', ({ on }) => (on ? start() : stop()));
      Authored.bus.on('total', onTotal);
      Authored.bus.on('total-error', ({ error }) => {
        lastError = error;
        emitProgress();
      });
      Authored.bus.on('settings', ({ patch }) => {
        if ('goal' in patch && session) emitProgress();
      });
      window.addEventListener('pagehide', () => session && save());
    },
    restart,
    todayWords: () => history[today()]?.words || 0,
    history: () => history,
  };
})();
