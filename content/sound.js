// Key sounds, synthesised locally with the Web Audio API (no samples, no
// network, no licences to worry about). Two styles:
//
//   typewriter  key-lever click → type bar striking the platen (sharp
//               transient + short metallic ring + rubber thud) → escapement
//               tick as the carriage steps. Enter rings the bell, ratchets
//               the line feed and slams the carriage home.
//   keyboard    mechanical keyboard: plastic bottom-out click with a hollow
//               case resonance, then a softer upstroke as the key returns.
//               Space is deeper with a little stabiliser rattle.
//
// At start-up a handful of variants per sound and style are rendered once
// with an OfflineAudioContext and normalised; each keystroke then only plays
// a pre-rendered buffer with a little random pitch and volume, which keeps
// latency low and fast typing from sounding mechanical in the wrong way.
//
// Only while focus mode is on and the sound switch is on. Modifier-only
// presses and shortcuts are silent; held-key repeats are rate-limited.

(() => {
  'use strict';
  const Authored = globalThis.Authored;

  const SR = 44100;
  const REPEAT_MIN_MS = 90;
  const VARIANTS = { key: 7, space: 3, delete: 3, enter: 2 };
  const STYLES = ['typewriter', 'keyboard'];

  let buffers = null; // { typewriter: {key: [...], …}, keyboard: {…}, chime: [...] }
  let rendering = null;
  let ctx = null;
  let master = null;
  let lastRepeat = 0;

  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const jit = (v, amount = 0.05) => v * rand(1 - amount, 1 + amount);

  // ── Synthesis building blocks (offline context) ────────────────────────
  function envelope(oac, t, peak, attack, decay) {
    const g = oac.createGain();
    g.gain.setValueAtTime(0, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }

  function noiseSource(oac, dur) {
    const len = Math.max(1, Math.ceil(dur * SR));
    const buf = oac.createBuffer(1, len, SR);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = oac.createBufferSource();
    src.buffer = buf;
    return src;
  }

  // Filtered noise burst: clicks, knocks and body resonances.
  function burst(oac, out, { t = 0, f, q = 1, type = 'bandpass', peak, attack = 0.0005, decay }) {
    const src = noiseSource(oac, attack + decay + 0.03);
    const flt = oac.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    flt.Q.value = q;
    src.connect(flt).connect(envelope(oac, t, peak, attack, decay)).connect(out);
    src.start(t);
  }

  function tone(oac, out, { t = 0, f, peak, attack = 0.001, decay, f1 }) {
    const o = oac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
    o.connect(envelope(oac, t, peak, attack, decay)).connect(out);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  // Short inharmonic ring: the metal of a type bar or carriage.
  function metal(oac, out, { t = 0, base, peak, decay, partials = [1, 1.63, 2.57, 3.71, 5.3] }) {
    partials.forEach((ratio, i) => {
      tone(oac, out, { t, f: jit(base * ratio, 0.03), peak: peak / (1 + i * 0.7), attack: 0.0005, decay: decay / (1 + i * 0.45) });
    });
  }

  // Output chain: a gentle low-pass and a very short, damped early reflection.
  function outputChain(oac, { lowpass, room }) {
    const input = oac.createGain();
    const lp = oac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = lowpass;
    lp.Q.value = 0.5;
    const delay = oac.createDelay(0.1);
    delay.delayTime.value = 0.009;
    const fb = oac.createGain();
    fb.gain.value = room;
    const damp = oac.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2500;
    input.connect(lp);
    lp.connect(oac.destination);
    lp.connect(delay);
    delay.connect(damp).connect(fb).connect(delay);
    damp.connect(oac.destination);
    return input;
  }

  // ── Typewriter ─────────────────────────────────────────────────────────
  function escapement(oac, out, t, level = 1) {
    burst(oac, out, { t, f: jit(5200), q: 3, peak: 0.35 * level, decay: 0.004 });
    tone(oac, out, { t, f: jit(3300), peak: 0.06 * level, decay: 0.012 });
  }

  const TYPEWRITER = {
    chain: { lowpass: 11000, room: 0.18 },
    key: { dur: 0.17, level: 0.85, build(oac, out) {
      // key lever starting to move
      burst(oac, out, { f: jit(3000), q: 1, peak: 0.18, decay: 0.006 });
      // type bar strikes the platen
      const s = rand(0.009, 0.015);
      burst(oac, out, { t: s, f: 900, type: 'highpass', q: 0.7, peak: 1, decay: 0.0035 });
      metal(oac, out, { t: s, base: rand(1050, 1350), peak: 0.22, decay: 0.035 });
      burst(oac, out, { t: s, f: jit(380), type: 'lowpass', q: 0.8, peak: 0.55, decay: 0.018 });
      burst(oac, out, { t: s, f: jit(700), q: 5, peak: 0.4, decay: 0.03 });
      // carriage escapement steps one space
      escapement(oac, out, s + rand(0.028, 0.038));
    } },
    space: { dur: 0.16, level: 0.6, build(oac, out) {
      burst(oac, out, { f: jit(520), q: 3, peak: 0.6, decay: 0.035 });
      burst(oac, out, { f: jit(2400), q: 1.2, peak: 0.25, decay: 0.008 });
      escapement(oac, out, rand(0.022, 0.03), 1.3);
    } },
    delete: { dur: 0.14, level: 0.55, build(oac, out) {
      burst(oac, out, { f: jit(1500), q: 2, peak: 0.5, decay: 0.014 });
      metal(oac, out, { base: rand(1500, 1700), peak: 0.1, decay: 0.02 });
      escapement(oac, out, rand(0.018, 0.024), 0.8);
    } },
    enter: { dur: 1.5, level: 0.9, build(oac, out) {
      // bell
      metal(oac, out, { base: rand(2350, 2450), peak: 0.5, decay: 1.1, partials: [1, 2.32, 4.1] });
      // line-feed ratchet as the lever is pushed, slowing slightly
      let t = 0.09;
      for (let i = 0; i < 6; i++) {
        burst(oac, out, { t, f: jit(3200), q: 2.5, peak: 0.22, decay: 0.006 });
        metal(oac, out, { t, base: jit(2100), peak: 0.03, decay: 0.01, partials: [1, 1.7] });
        t += 0.032 + i * 0.006;
      }
      // carriage sliding home …
      burst(oac, out, { t, f: 1800, q: 0.6, peak: 0.07, attack: 0.08, decay: 0.12 });
      // … and the slam
      const end = t + 0.2;
      burst(oac, out, { t: end, f: 700, type: 'highpass', peak: 0.8, decay: 0.005 });
      burst(oac, out, { t: end, f: 260, type: 'lowpass', peak: 0.9, decay: 0.07 });
      metal(oac, out, { t: end, base: rand(620, 700), peak: 0.3, decay: 0.12 });
      burst(oac, out, { t: end, f: 1200, q: 3, peak: 0.3, decay: 0.05 });
    } },
  };

  // ── Mechanical keyboard ────────────────────────────────────────────────
  function upstroke(oac, out, t, caseF, level = 1) {
    burst(oac, out, { t, f: jit(2900), q: 1.2, peak: 0.2 * level, decay: 0.006 });
    burst(oac, out, { t, f: caseF * 1.3, q: 4, peak: 0.22 * level, decay: 0.014 });
  }

  const KEYBOARD = {
    chain: { lowpass: 7500, room: 0.12 },
    key: { dur: 0.16, level: 0.7, build(oac, out) {
      const caseF = rand(420, 540);
      burst(oac, out, { f: jit(2200), q: 0.8, peak: 0.45, decay: 0.009 });
      burst(oac, out, { f: caseF, q: 5, peak: 0.75, decay: 0.028 });
      burst(oac, out, { f: jit(1150), q: 3, peak: 0.3, decay: 0.018 });
      upstroke(oac, out, rand(0.075, 0.11), caseF);
    } },
    space: { dur: 0.2, level: 0.75, build(oac, out) {
      const caseF = rand(260, 320);
      burst(oac, out, { f: jit(1600), q: 0.8, peak: 0.35, decay: 0.012 });
      burst(oac, out, { f: caseF, q: 4, peak: 0.85, decay: 0.045 });
      burst(oac, out, { t: 0.006, f: jit(3600), q: 4, peak: 0.12, decay: 0.016 }); // stabiliser rattle
      upstroke(oac, out, rand(0.09, 0.12), caseF, 1.2);
    } },
    delete: { dur: 0.16, level: 0.65, build(oac, out) {
      const caseF = rand(560, 650);
      burst(oac, out, { f: jit(2500), q: 0.9, peak: 0.45, decay: 0.008 });
      burst(oac, out, { f: caseF, q: 5, peak: 0.65, decay: 0.024 });
      upstroke(oac, out, rand(0.07, 0.1), caseF);
    } },
    enter: { dur: 0.2, level: 0.8, build(oac, out) {
      const caseF = rand(330, 380);
      burst(oac, out, { f: jit(1900), q: 0.8, peak: 0.45, decay: 0.012 });
      burst(oac, out, { f: caseF, q: 4.5, peak: 0.9, decay: 0.04 });
      burst(oac, out, { t: 0.005, f: jit(3300), q: 4, peak: 0.08, decay: 0.012 });
      upstroke(oac, out, rand(0.09, 0.12), caseF, 1.1);
    } },
  };

  const CHIME = { dur: 2.8, level: 0.45, chain: { lowpass: 9000, room: 0.1 }, build(oac, out) {
    tone(oac, out, { f: 659.25, peak: 0.12, attack: 0.02, decay: 2.2 });
    tone(oac, out, { f: 1318.5, peak: 0.03, attack: 0.02, decay: 1.4 });
    tone(oac, out, { t: 0.14, f: 987.77, peak: 0.1, attack: 0.02, decay: 2.2 });
  } };

  const STYLE_DEFS = { typewriter: TYPEWRITER, keyboard: KEYBOARD };

  // Renders one voice and scales it so its loudest sample sits at `level`.
  async function renderVoice(voice, chain) {
    const oac = new OfflineAudioContext(1, Math.ceil(voice.dur * SR), SR);
    voice.build(oac, outputChain(oac, chain));
    const buf = await oac.startRendering();
    const d = buf.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (peak > 0) {
      const k = voice.level / peak;
      for (let i = 0; i < d.length; i++) d[i] *= k;
    }
    return buf;
  }

  async function renderAll() {
    const out = {};
    for (const style of STYLES) {
      const def = STYLE_DEFS[style];
      out[style] = {};
      for (const [name, n] of Object.entries(VARIANTS)) {
        out[style][name] = await Promise.all(Array.from({ length: n }, () => renderVoice(def[name], def.chain)));
      }
    }
    out.chime = [await renderVoice(CHIME, CHIME.chain)];
    buffers = out;
    return out;
  }

  // ── Your own recordings ────────────────────────────────────────────────
  // assets/sounds/sounds.json lists files per style and sound; anything listed
  // there replaces the synthesised version. Files may be raw downloads:
  // leading silence is trimmed. All clips of one style share one gain, so the
  // natural loudness differences between strokes are kept; the loudest clip
  // of the style ends up at RECORDED_PEAK × STYLE_LEVEL.
  const RECORDED_PEAK = 0.85;
  const CHIME_PEAK = 0.45;
  // Per-style loudness: the typewriter is kept toned down.
  const STYLE_LEVEL = { typewriter: 0.55, keyboard: 1 };
  const SILENCE = 0.02; // relative to the file's peak
  const PRE_ROLL_S = 0.002;
  let samples = null; // { typewriter: {key: [AudioBuffer…], …}, keyboard: {…}, chime: [...] }
  const recorded = new Set(); // AudioBuffers that came from recordings

  const peakOf = (buf) => {
    let p = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) for (const v of buf.getChannelData(c)) p = Math.max(p, Math.abs(v));
    return p;
  };

  // Removes leading silence and adds a short fade-out so a cut never clicks.
  function trim(buf) {
    const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
    const peak = peakOf(buf);
    if (!peak) return buf;
    let start = buf.length;
    for (const d of chans) {
      for (let i = 0; i < d.length; i++) {
        if (Math.abs(d[i]) >= peak * SILENCE) {
          start = Math.min(start, i);
          break;
        }
      }
    }
    start = Math.max(0, start - Math.round(PRE_ROLL_S * buf.sampleRate));
    const len = buf.length - start;
    const out = new AudioBuffer({ numberOfChannels: chans.length, length: len, sampleRate: buf.sampleRate });
    chans.forEach((d, c) => {
      const o = out.getChannelData(c);
      for (let i = 0; i < len; i++) o[i] = d[start + i];
      const fade = Math.min(len, Math.round(0.008 * buf.sampleRate));
      for (let i = 0; i < fade; i++) o[len - 1 - i] *= i / fade;
    });
    return out;
  }

  function scale(buffers, k) {
    for (const b of buffers) for (let c = 0; c < b.numberOfChannels; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] *= k;
    }
  }

  async function loadSample(path) {
    const res = await fetch(chrome.runtime.getURL(`assets/sounds/${path}`));
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    const decoder = new OfflineAudioContext(1, 1, SR);
    return trim(await decoder.decodeAudioData(await res.arrayBuffer()));
  }

  async function loadSamples() {
    let list;
    try {
      list = await (await fetch(chrome.runtime.getURL('assets/sounds/sounds.json'))).json();
    } catch (e) {
      Authored.log.warn('could not read assets/sounds/sounds.json:', e?.message || e);
      return;
    }
    const out = {};
    let count = 0;
    const loadList = async (files) => {
      const bufs = [];
      for (const f of files || []) {
        try {
          bufs.push(await loadSample(f));
          count++;
        } catch (e) {
          Authored.log.warn('could not load sound', f, '-', e?.message || e);
        }
      }
      return bufs;
    };
    for (const style of STYLES) {
      out[style] = {};
      for (const name of Object.keys(VARIANTS)) out[style][name] = await loadList(list?.[style]?.[name]);
      const all = Object.values(out[style]).flat();
      const loudest = Math.max(0, ...all.map(peakOf));
      if (loudest) scale(all, (RECORDED_PEAK * (STYLE_LEVEL[style] ?? 1)) / loudest);
    }
    out.chime = await loadList(list?.chime);
    if (out.chime.length) scale(out.chime, CHIME_PEAK / Math.max(...out.chime.map(peakOf)));
    samples = out;
    for (const style of STYLES) for (const bufs of Object.values(out[style])) bufs.forEach((b) => recorded.add(b));
    out.chime.forEach((b) => recorded.add(b));
    if (count) Authored.log.info(`loaded ${count} sound file(s) from assets/sounds.`);
    else Authored.log.warn('no recorded sounds loaded; using the built-in synthesised sounds.');
    Authored.bus.emit('sound-source', {});
  }

  // How many recordings a style has (0 = built-in synthesised sounds only).
  function recordedCount(style) {
    const s = samples?.[style];
    return s ? Object.values(s).reduce((n, list) => n + list.length, 0) : 0;
  }

  // Recorded sounds win; within a style that has recordings, a missing sound
  // falls back to the recorded key sound, then to the synthesised one.
  function pick(style, name) {
    if (name === 'chime') return samples?.chime?.length ? samples.chime : buffers?.chime;
    const s = samples?.[style];
    if (s?.[name]?.length) return s[name];
    if (s?.key?.length && name !== 'enter') return s.key;
    return buffers?.[style]?.[name];
  }

  // ── Playback ───────────────────────────────────────────────────────────
  // Created inside a keydown handler, so the page has a user gesture.
  function ensureContext() {
    if (!ctx) {
      ctx = new AudioContext({ latencyHint: 'interactive' });
      master = ctx.createGain();
      master.gain.value = Authored.settings.volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playBuffer(list, jitter) {
    const c = ensureContext();
    const src = c.createBufferSource();
    src.buffer = list[(Math.random() * list.length) | 0];
    const g = c.createGain();
    if (jitter) {
      // Recordings only get a hint of pitch variation, so they keep their own
      // character; synthesised sounds need more to avoid sounding identical.
      const spread = recorded.has(src.buffer) ? 0.012 : 0.035;
      src.playbackRate.value = rand(1 - spread, 1 + spread);
      g.gain.value = rand(0.8, 1.05);
    }
    src.connect(g).connect(master);
    src.start();
  }

  function play(name) {
    const style = STYLES.includes(Authored.settings.soundStyle) ? Authored.settings.soundStyle : 'typewriter';
    const list = pick(style, name);
    if (list?.length) playBuffer(list, name !== 'chime');
  }

  const KIND_TO_SOUND = { char: 'key', space: 'space', delete: 'delete', enter: 'enter' };

  function active() {
    return Authored.focusMode.isOn() && Authored.settings.sound;
  }

  function onKey(k) {
    const name = KIND_TO_SOUND[k.kind];
    if (!name || !active()) return;
    if (k.repeat) {
      if (k.time - lastRepeat < REPEAT_MIN_MS) return;
      lastRepeat = k.time;
    }
    play(name);
  }

  Authored.sound = {
    STYLES,
    init() {
      rendering = Promise.all([
        renderAll().catch((e) => Authored.log.warn('could not prepare sounds:', e?.message || e)),
        loadSamples(),
      ]);
      Authored.bus.on('key', onKey);
      Authored.bus.on('milestone', ({ top }) => {
        if (top === 1 && active() && ctx) play('chime');
      });
      Authored.bus.on('settings', ({ patch }) => {
        if ('volume' in patch && master) master.gain.setTargetAtTime(patch.volume, ctx.currentTime, 0.02);
        // Silence immediately, including a ringing bell. The next keystroke resumes.
        if (patch.sound === false && ctx) ctx.suspend();
      });
    },
    ready: () => rendering,
    recordedCount,
    play,
  };
})();
