<div align="center">

<img src="assets/icons/icon128.png" width="88" alt="Authored icon">

# Authored

**A quiet, distraction-free writing room for Google Docs.**

One shortcut and the Docs interface disappears, the window goes fullscreen,<br>
and only your words remain.

![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4f4f4f)
![Version](https://img.shields.io/badge/version-1.0.0-b3322c)
![License: MIT](https://img.shields.io/badge/license-MIT-4f4f4f)

</div>

---

Authored is a Chrome extension for long-form writing in Google Docs. It was built for writing a novel, in sessions of an hour or more, so everything in it is meant to stay out of the way. Nothing animates without reason, nothing pops up while you type, and every control fades away when you don't need it.

## Features

- **Focus mode:** hides menus, toolbar, rulers, comments and side panels, and recolours the page. Switch it off and Docs looks exactly as before.
- **Fullscreen** on the same shortcut or separately, and Escape leaves it.
- **Centred typing:** the line you're writing stays at one height on the screen while the text scrolls up underneath, like a typewriter.
- **Word count and session goal:** a faint count of words written this session, and a thin red progress line that rewards going past your goal.
- **Nine themes**, six of them *pageless*: no visible page, only text on a calm background.
- **Key sounds:** typewriter or mechanical keyboard, built in or from your own recordings.
- **Back to where you were:** one click returns you to the spot where you last typed.
- **A short welcome** when you sit down to write, with a button to resume.
- **Private by design:** everything stays in your browser. Authored only asks for `storage` and access to `docs.google.com`.

## Installation

Authored isn't in the Chrome Web Store; you load it unpacked:

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the folder that contains `manifest.json`.
4. Open or reload a Google Doc.

To update later, pull the new version, click the reload icon on the Authored card in `chrome://extensions`, then reload your Docs tab.

## Getting started

1. In a Google Doc, press **Alt+Shift+F**, or move the mouse and click the small round button that fades in at the bottom left.
2. Open the settings drawer by resting the mouse on the **left edge** of the screen. There you choose a theme, set your session goal, pick a sound style and enter your name for the welcome.
3. Write. Press **Alt+Shift+F** again to leave focus mode.

## Keyboard shortcuts

| Action | Default | Also |
|---|---|---|
| Focus mode on / off | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> | first corner button, bottom left |
| Fullscreen on / off | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd> | second corner button; <kbd>Esc</kbd> leaves fullscreen |
| Centred typing on / off | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> | settings drawer |
| Key sounds on / off | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> | speaker icon in the drawer |
| Settings drawer | *not set* | rest the mouse on the left edge |
| Back to where I was | *not set* | return-arrow corner button |

Change or add shortcuts at `chrome://extensions/shortcuts`. Chrome allows only four default shortcuts per extension, so the last two have none until you assign them.

> **Tip:** if you have several keyboard layouts on Windows, Alt+Shift may also switch layouts. If so, choose different shortcuts.

## How it works

### Focus mode and fullscreen

Focus mode hides everything around the page and applies your theme. Switching it off removes every style Authored added, without reloading the page or moving your cursor. Fullscreen turns on together with focus mode by default (you can change that in the drawer), but it's a separate switch: leaving fullscreen keeps focus mode on.

The corner buttons only appear when you move the mouse, and the mouse pointer hides after a few seconds of typing.

### Centred typing

While you type, Authored keeps the current line at a fixed height: 45 % of the window by default, adjustable from 35 to 60 % in the drawer. It scrolls in short, eased steps and ignores tiny movements, so the page never jumps and you never type your way down to the bottom edge.

- Scrolling with the mouse wheel or trackpad, for example to reread an earlier paragraph, pauses centring until your next keystroke.
- Clicking in the text doesn't trigger it; only keys do.
- Extra space below the last page lets the final lines reach the centre too.

### Word count, goal and rewards

The count sits faintly in the bottom-right corner (*412 words this session · 38,950 total*) and becomes clear when you hover over it. A session starts when you switch focus mode on. If you switch it off and on again within 15 minutes, the session continues, so a quick trip to the menus doesn't reset anything. **Start a new session** in the drawer resets the count to zero.

Set a session goal in the drawer (default 500 words). The thin red line along the top fills as you approach it, and rewards you gently for going further:

| Progress | What happens |
|---|---|
| 100 % | A short glow, one quiet chime, and "Goal reached" for a few seconds |
| 150 % | The line turns amber and gains a very slow shimmer |
| 200 %, 300 %, … | A small dot is added and a soft ripple runs along the line once |

Each reward plays once per session. If reduced motion is turned on in your operating system, all movement is switched off.

The total comes from the document's plain-text export: the same request as *File → Download → Plain text*, sent with your own session and counted locally. It updates within about ten seconds of a pause in typing and stays within a few words of Docs' own count.

### Back to where you were, and the welcome

Authored remembers where you last typed in each document. The return-arrow corner button, or a shortcut you assign, scrolls back there and puts your cursor in place. If Docs doesn't accept the automatic click, a note asks you to click once yourself.

When you enter focus mode, a short welcome appears over a slightly dimmed page, with your name if you've entered one: *Good evening. You last wrote here yesterday. Today's goal: 500 words.* It has a **Resume where I was** button. Typing or clicking anywhere dismisses it, and you can switch it off in the drawer.

### Sounds

Sounds play only in focus mode, and only for actual typing: shortcuts and modifier keys stay silent, and AltGr characters (as on AZERTY keyboards) do click. Pick **Typewriter** or **Keyboard** in the drawer, where clicking a style plays a short preview.

The built-in sounds are synthesised in the browser. For the most convincing result, **add your own recordings**: they stay on your computer and out of git. [assets/sounds/README.md](assets/sounds/README.md) explains which clips to collect and how to list them. The drawer shows whether your recordings or the built-in sounds are playing.

## Themes

Docs draws its text on a canvas, so the page can't be restyled directly. Each theme applies a colour filter to the page and colours everything around it to match.

<table>
<tr><th>With a visible page</th><th>Pageless: only text on the background</th></tr>
<tr valign="top"><td>

| Theme | |
|---|---|
| **Dark** | light text on a near-black page |
| **Sepia** | dark text on a warm page |
| **Light** | the original page on soft grey |

</td><td>

| Theme | |
|---|---|
| **Night** | soft grey on charcoal |
| **Midnight** | blue-white on deep blue-grey |
| **Espresso** | cream on dark brown |
| **Forest** | pale green on very dark green |
| **Mist** | dark grey on soft grey |
| **Parchment** | brown-black on warm cream |

</td></tr>
</table>

All themes share a red accent for the progress line and selected options.

**How pageless works:** the filter turns Docs' white paper into one exact colour, and the background uses that same colour, so the page edge vanishes. [`tools/theme-colors.js`](tools/theme-colors.js) works out that colour for any filter:

```sh
node tools/theme-colors.js "invert(0.9) sepia(1) hue-rotate(170deg) saturate(1.5) brightness(0.9)"
# paper: #161d25   text: #d7e3e6
```

Dark themes also invert images in the document, and most pageless dark themes tint coloured text slightly. Plain black text is unaffected.

## Privacy

- Authored makes no network requests of its own except one: the document's text export on `docs.google.com`, which is used for the word count.
- Settings, sessions, a per-day count of words written and your last writing position are stored in `chrome.storage.local`, on your computer only.
- Permissions: `storage`, plus access to `docs.google.com` (needed to run on your documents).

## Troubleshooting

**Nothing happens.** Check `chrome://extensions/shortcuts`: Chrome leaves a shortcut blank when another extension already uses it. Then open DevTools (F12) → Console, filter on `Authored`, and look for errors.

**Part of the Docs interface shows again, or centred typing stops.** Google occasionally renames Docs' internal elements. Every selector Authored relies on lives in one file, [`content/selectors.js`](content/selectors.js), with a note on what it targets. The console names the selector that stopped matching:

```
[Authored] Selector "toolbar" (#docs-toolbar-wrapper) matched nothing. It targets: Formatting toolbar …
```

To fix it, right-click the element in Docs, choose **Inspect**, and find a stable hook. Prefer, in this order, an `id`, an ARIA attribute, or a short class name. Update the `css` value in `selectors.js`, then reload the extension and the tab. A broken selector never takes the rest of Authored down with it.

**The count shows "≈" or "session count unavailable".** The plain-text export couldn't be fetched (for example, while signed out), so Authored is showing an approximate count of the pages currently on screen. Session counts and rewards wait for an exact count.

## Known limitations

- **Documents with several Docs tabs:** the plain-text export may only include the first tab, which affects the total.
- **Back to where I was** stores a position on the page, not in the text, so large edits above that point can shift it a little.
- **Docs internals change.** Hiding and centring depend on Docs' internal element names; see *Troubleshooting* above for repairs.

## Development

No build step and no dependencies: plain JavaScript content scripts, loaded in the order listed in `manifest.json`.

```
manifest.json
background.js           service worker: shortcuts, window fullscreen, sound list lookup
content/
  core.js               namespace, logging, event bus, settings, keyboard source
  selectors.js          every Google Docs selector, with notes  ← fix breakages here
  focus-mode.js         injects / removes styles, applies the theme
  fullscreen.js         fullscreen state
  centering.js          centred typing
  wordcount.js          total word count
  goal.js               sessions, goal, rewards, daily history
  sound.js              key sounds: recordings or synthesised
  lastplace.js          back to where I was
  welcome.js            welcome card
  ui.js                 corner controls, count, progress line, drawer
  main.js               wiring and actions
styles/
  themes.css            theme colours and page filters
  focus.css             focus-mode rules that need no Docs selectors
  ui.css                Authored's own interface (in a shadow root)
assets/
  icons/                extension icons
  sounds/               your own recordings (git-ignored), see its README
tools/
  theme-colors.js       paper and text colours for a page filter
```

Modules communicate through a small event bus, `Authored.bus`, with events such as `focus`, `settings`, `key`, `total`, `progress` and `milestone`. A new feature is a new file with an `init()`, added to `manifest.json` and started in `main.js`. It can add its own panel to the drawer with `Authored.ui.addDrawerSection(title, element)`.

<details>
<summary><b>Design notes</b></summary>

- **Fullscreen goes through `chrome.windows.update`, not `requestFullscreen()`.** Shortcuts from `chrome.commands` reach the page without a user gesture, which the Fullscreen API requires. Switching the browser window (like F11) works for both the shortcut and the button. Escape is handled by Authored, and a resize listener keeps the state right however you leave fullscreen.
- **No `innerHTML`.** Google Docs enforces Trusted Types, which blocks HTML strings even from extensions. All interface elements are built with DOM calls, and inline styles are set through the CSSOM.
- **The interface lives in a closed shadow root**, so Docs' styles and Authored's can't affect each other. Keystrokes in the drawer stop at the shadow root and never reach the document.
- **Typing is captured in Docs' hidden typing iframe** as well as the main document, and the listeners re-attach if Docs recreates the iframe.
- **The word-count request uses `credentials: 'same-origin'`.** Docs redirects the export to a signed `googleusercontent.com` URL that allows any origin, but only without cookies. `same-origin` sends the session cookie to `docs.google.com` and drops it after the redirect.
- **Only exact counts drive sessions.** The approximate fallback, which counts the pages on screen, is displayed but never used for session counts, rewards or history.
- **Recorded sounds keep their natural dynamics.** All clips of one style share one gain, and each keystroke gets only a hint of pitch variation.
- **The drawer sits on the left edge**, because Docs' scrollbar is on the right, where an edge-triggered drawer would keep opening by accident.

</details>

<details>
<summary><b>Stored data</b></summary>

All in `chrome.storage.local`:

| Key | Contents |
|---|---|
| `settings` | theme, goal, centred typing and height, sound on/off, style and volume, fullscreen with focus mode, name, welcome on/off |
| `sessions` | per document: baseline, last total and milestones reached; pruned after 7 days |
| `history` | net words written per day, in total and per document |
| `lastPlace` | per document: where you last typed; the 50 most recent documents are kept |

</details>

## Roadmap

Ideas for later versions:

- Chapter navigation: a drawer panel that jumps between headings
- A writing streak and weekly overview, built on the per-day history that's already stored
- Sprint timers and a scratchpad

## License

[MIT](LICENSE) © 2026 Dennis Janssen

Sound recordings are not included in this repository; see [assets/sounds/README.md](assets/sounds/README.md) to add your own.
