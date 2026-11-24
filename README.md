# Authored

A personal Chrome extension (Manifest V3) that turns a Google Docs tab into a quiet writing room. Press a shortcut and the Docs interface disappears and the window goes fullscreen, leaving only the page. A faint word count, a session goal with a thin progress line, centred typing and optional typewriter sounds sit around it.

Authored keeps everything in the browser and sends nothing anywhere. It asks for `storage` and access to `docs.google.com`, and nothing else.

> **Status: 0.1, not yet tested on a live document.** All v1 features are written, but the Docs selectors, the caret measurement, the export-based word count and the typing iframe still need checking on a real document. See [Verification checklist](#verification-checklist).

## Install (unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose this folder (the one containing `manifest.json`).
4. Open or reload any Google Doc (`https://docs.google.com/document/d/…`).

After changing any file, click the reload icon on the Authored card in `chrome://extensions`, then reload the Docs tab.

## Using it

| Action | Default shortcut | Also |
|---|---|---|
| Focus mode on/off | Alt+Shift+F | first corner button (bottom left) |
| Fullscreen on/off | Alt+Shift+G | second corner button; Escape leaves fullscreen |
| Centred typing on/off | Alt+Shift+T | settings drawer |
| Key sounds on/off | Alt+Shift+S | speaker icon in the drawer |
| Settings drawer | *none set* | rest the mouse on the left edge, or the last corner button |
| Back to where I was writing | *none set* | return-arrow corner button (shown once a place is saved) |

To change shortcuts, go to `chrome://extensions/shortcuts`. Chrome allows at most four suggested shortcuts per extension, so the drawer and "back to where I was" have none by default; you can assign them there. If you have several keyboard layouts on Windows, Alt+Shift may also switch the layout. In that case pick other shortcuts.

The corner buttons only fade in when you move the mouse. The mouse pointer hides after three seconds of typing without moving it.

- **Focus mode** hides the menus, toolbar, rulers, title bar, comments, share button and side panels, and applies the theme. Switching it off removes every injected style, so Docs looks exactly as before. The page does not reload and the cursor does not move.
- **Fullscreen** is a separate switch. By default it turns on together with focus mode (you can change this in the drawer). Leaving fullscreen never switches focus mode off.
- **Centred typing** keeps the line you are typing at a fixed height (45 % of the window by default, adjustable from 35 to 60 %). Scrolling with the wheel or trackpad pauses it until your next keystroke. Clicking somewhere in the text does not trigger it. Only keys do.
- **Word count** sits bottom right: "412 words this session 38,950 total". Hover to read it clearly.
- **Session goal** (default 500) is set in the drawer. The line along the top edge fills as you approach it:
  - **100 %:** a short glow, one quiet chime and "Goal reached" for a few seconds.
  - **150 %:** the line turns warm and gets a very slow shimmer.
  - **200 %, 300 %, …:** a small dot is added at the right end and a soft ripple runs along the line once.

  Each milestone fires once per session. With reduced motion turned on in the OS, the glow, shimmer, ripple, eased scrolling and drawer slide are all switched off.
- **Sessions:** a session starts when focus mode is switched on, and the baseline is the document total at that moment. If you switch focus mode off and on again within 15 minutes on the same document, the session resumes, so a quick trip to the menus does not reset your count or replay rewards. Change `RESUME_MS` in `content/goal.js` if you want this to behave differently. **Start a new session** in the drawer resets the count to zero at any time.
- **Sounds** only play in focus mode. There are two styles, picked in the drawer (clicking one plays a short preview):
  - **Typewriter:** the key lever, then the type bar striking the platen (a sharp clack with a short metallic ring), then the escapement tick as the carriage steps. Enter rings the bell, ratchets the line feed and slams the carriage home.
  - **Keyboard:** a mechanical keyboard, with a plastic bottom-out click, a hollow case resonance and a softer upstroke as the key returns. Space is deeper, with a little stabiliser rattle.

  Regular keys, space, Backspace/Delete and Enter each have their own sound. Shortcuts (Ctrl+…) and modifier keys are silent. AltGr characters on AZERTY keyboards do click.

  **Your own sounds.** The built-in sounds are synthesised. Real recordings sound far better, so you can drop your own files into `assets/sounds/` and list them in `assets/sounds/sounds.json`. The [guide there](assets/sounds/README.md) explains which files to collect. Any sound you don't provide falls back to the built-in one.
- **Back to where I was.** Authored remembers where you last typed in each document, about 1.5 seconds after you stop. The return-arrow corner button (or a shortcut you assign) scrolls back there, puts the line at the centred-typing height and clicks to put the cursor back. If Docs doesn't accept that click, a note asks you to click once yourself. Docs offers no way to read the cursor's position in the text, so the place is stored as a position on the page. It stays accurate as long as the text above it hasn't changed much since, and writing on at the end doesn't move it.
- **Welcome.** When you switch focus mode on, a short greeting appears for about 12 seconds over a slightly dimmed page, with your name if you've entered one in the drawer. It says when you last wrote in this document, plus today's words or goal, and has a **Resume where I was** button. Typing or clicking anywhere outside the card dismisses it at once, hovering keeps it open, and it won't steal the cursor. A quick off-and-on doesn't show it again; it only returns after a 15-minute break or a page reload. You can switch it off in the drawer.

## Themes

The page text is drawn on a canvas, so it cannot be recoloured with normal CSS. Each theme instead applies a CSS `filter` to the page and colours everything around it:

**With a visible page:**

- **Dark:** `invert(0.9) hue-rotate(180deg)`. The paper becomes near-black, the text light grey, and coloured text keeps its hue. Images are inverted too.
- **Sepia:** a light sepia filter on warm paper.
- **Light:** no filter, with a soft grey surround.

**Pageless, only text on the background:**

| Theme | Text on |
|---|---|
| Night | soft light grey on charcoal |
| Midnight | blue-white on deep blue-grey |
| Espresso | cream on dark brown |
| Forest | pale green-white on very dark green |
| Mist | dark grey on soft grey |
| Parchment | brown-black on warm cream |

How pageless works: the filter turns Docs' white paper into one exact colour, and the background is set to that same colour, so the page edge disappears. `tools/theme-colors.js` works out that colour for any filter:

```
node tools/theme-colors.js "invert(0.9) sepia(1) hue-rotate(170deg) saturate(1.5) brightness(0.9)"
```

If you change a pageless theme's filter, update its `--authored-bg` to the new paper colour, or the edge comes back. Most dark pageless themes also tint the hue of coloured text and images, which doesn't matter for plain black text.

Every theme uses a red accent for the progress line, the drawer title, selected options, sliders and switches, and active corner buttons. Past 150 % of the goal the line turns amber. The colours are `--authored-accent` and `--authored-warm` in `styles/themes.css`. The drawer shows the themes as a grid of small previews.

To add a theme, add one block to `styles/themes.css` and one entry to `THEMES` in `content/ui.js` (name and preview colours).

## Repairing broken selectors

Google Docs changes its internal class names now and then. **Every Docs selector lives in [`content/selectors.js`](content/selectors.js)**, with a one-line note saying what it targets.

When something stops matching, the console (DevTools → Console, filter on `[Authored]`) shows a line like:

```
[Authored] Selector "toolbar" (#docs-toolbar-wrapper) matched nothing. It targets: Formatting toolbar … fix it in content/selectors.js.
```

To fix it:

1. Right-click the element in Docs and choose **Inspect**.
2. Find a stable hook. In order of preference: an `id`, an ARIA attribute (`[role=…]`, `[aria-label=…]`), or a short class name. Avoid long structural chains like `div > div:nth-child(3)`.
3. Update the `css` value in `selectors.js`, reload the extension, and reload the tab.

The hiding rules are generated with one CSS rule per selector, so one broken selector never breaks the others. The rest of Authored keeps working when a selector fails: hiding falls back to whatever still matches, centred typing does nothing if it can't find the caret, and the word count switches method.

## How the word count works

Three approaches were considered, in this order:

1. **Plain-text export (used).** Authored fetches `/document/d/<id>/export?format=txt` from `docs.google.com` with your existing session (the same request as File → Download → Plain text) and counts the words locally. It polls at most once every 10 seconds, only while focus mode is on and only after you've typed. A count is only treated as final once it was taken at least 4 seconds after your last keystroke, so Docs has time to auto-save first. The count therefore settles within about 10 seconds of a pause.
2. **Accessibility text layer (fallback).** Authored switches to this automatically if the export fails twice. Docs only renders pages near the viewport, so the count is approximate for long documents and changes as you scroll. It is shown as "≈ total" only, and is never used for the session count, rewards or history.
3. **The Word count dialog (not implemented).** Opening and parsing it disturbs the interface.

Word counting splits on whitespace and on em and en dashes, and ignores tokens with no letter or digit. This should stay within a few words of Docs' own count.

*Found on a live document:* the export redirects to a signed URL on `*.googleusercontent.com` that allows any origin, but only for requests without cookies. The request therefore uses `credentials: 'same-origin'`: the session cookie goes to `docs.google.com` and is dropped after the redirect. With `include` the browser blocks it. Still to check: how documents that use Docs **tabs** are exported. A novel kept in one tab per chapter may only export the first tab.

## Design decisions worth knowing

- **Fullscreen uses `chrome.windows.update`, not `requestFullscreen()`.** The brief asked for `requestFullscreen()` inside the event handler, but shortcuts registered through `chrome.commands` reach the page without a user gesture, so the Fullscreen API would reject them. The service worker switches the window to fullscreen instead (the same as F11), for both the shortcut and the button. No extra permission is needed. Escape is caught by Authored to leave fullscreen, and a resize listener keeps the state correct if you leave it any other way.
- **The drawer is on the left edge** because Docs' scrollbar sits on the right edge, where an edge-triggered drawer would keep opening by accident. The edge is a single CSS position in `styles/ui.css` and the hot zone in `content/ui.js`.
- **The UI lives in a closed shadow root** (`<authored-root>`), so Docs styles cannot affect it and Authored styles cannot affect Docs. Keystrokes typed into the drawer are stopped at the shadow root, so Docs doesn't receive them.
- **Sounds** use your own recordings when `assets/sounds/sounds.json` lists them, and otherwise fall back to sounds synthesised with the Web Audio API. Recordings are decoded once at start, then trimmed of leading silence and brought to a set loudness. Each keystroke plays one at random, with a small random variation in pitch and volume. Nothing is fetched from the network.
- **Key listeners sit on both the main document and the hidden typing iframe** (`.docs-texteventtarget-iframe`), and are re-attached if Docs recreates it.

## Data stored

Everything is stored in `chrome.storage.local` on this computer:

- `settings`: theme, goal, centred typing and its height, sound on/off, sound style and volume, fullscreen-with-focus, your name and whether to show the welcome.
- `sessions`: per document, the baseline, last total and milestones reached. Used to resume a session. Pruned after 7 days. Only exact (export) counts are stored. Version 2 discarded earlier session and history data once, because a failing export could have inflated it.
- `history`: net words written per day, in total and per document. This is in place for a future streak or weekly overview.
- `lastPlace`: per document, where you last typed (position on the page, see above). The 50 most recent documents are kept.

## Project layout

```
manifest.json
background.js          service worker: shortcuts → content script, window fullscreen
content/
  core.js              namespace, logging, event bus, settings store, keyboard source
  selectors.js         every Docs selector, with notes  ← fix breakages here
  focus-mode.js        inject/remove styles, theme
  fullscreen.js        fullscreen state
  centering.js         centred typing
  wordcount.js         total word count (export / text layer)
  goal.js              session, goal, milestones, daily history (exact counts only)
  sound.js             key sounds: your recordings, or synthesised (typewriter / keyboard)
  lastplace.js         "back to where I was"
  welcome.js           greeting overlay when entering focus mode
  ui.js                corner controls, count, progress line, drawer
  main.js              wiring and actions
styles/
  themes.css           theme variables
  focus.css            focus-mode rules that need no Docs selectors
  ui.css               Authored's own interface (inside the shadow root)
assets/icons/          extension icons
tools/theme-colors.js  works out the paper colour for a pageless theme
assets/sounds/         your own sound files + sounds.json (see the README there)
                       typewriter/, keyboard/: keystrokes cut from two Pixabay recordings (see below)
```

Modules talk through `Authored.bus` (events such as `focus`, `fullscreen`, `settings`, `key`, `total`, `progress` and `milestone`). **Chapter navigation** (not in v1) can be added as a new `content/chapters.js` that reads headings, registers a drawer panel with `Authored.ui.addDrawerSection(title, element)`, adds a command to `manifest.json` and an action in `main.js`. None of the existing modules need to change.

## Verification checklist

These items still need checking on a live document. They match the open questions in the brief.

- [ ] Each `hide` selector in `selectors.js` matches, and Docs stays fully usable after toggling focus mode on and off several times.
- [ ] `.kix-cursor-caret` can be measured with `getBoundingClientRect()` while typing (centred typing depends on it), and the caret stays visible in the dark theme. Whether the caret sits inside the filtered page decides whether it gets inverted.
- [ ] The extra space below the last page (padding on `.kix-appview-editor`) lets the last line reach the target height.
- [ ] The export endpoint works from the content script, and the count is within a few words of Tools → Word count.
- [ ] Keystrokes arrive on `.docs-texteventtarget-iframe`'s document, so sounds play.
- [ ] Typing in the drawer's goal field does not leak into the document.
- [ ] No console errors during a 30-minute session.

## Sound sources

The recordings in `assets/sounds/` were cut from two clips from Pixabay:
*keyboard typing fast* by virtualzero and *typewriter typing* by freesound_community. Each clip is a whole keystroke: it starts on the strike, pinned to the exact sample, and runs up to just before the next keystroke (at most 300 ms), so the ring and mechanism sounds after the strike are kept. All clips of a style share one gain, so their natural loudness differences survive; Authored lets them overlap when you type fast. For the typewriter, the softer half of the strikes was used, and the style plays at about half the keyboard's level (`STYLE_LEVEL` in `content/sound.js`). Pixabay's licence allows free use, but **not redistributing the files on their own**. Keep this repository private, or add `assets/sounds/*/*.wav` to `.gitignore` before publishing it.

The typewriter clip has no bell or carriage return, so Enter uses the two strikes that end a line (followed by a long pause). A separate "typewriter bell carriage return" clip can be added as `enter` in `sounds.json`.
