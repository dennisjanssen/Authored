# Your own key sounds

Put sound files in `typewriter/` or `keyboard/`, list them in `sounds.json`
(paths relative to this folder), then reload the extension in
`chrome://extensions` and reload the Docs tab.

```json
"typewriter": {
  "key":    ["typewriter/key-1.wav", "typewriter/key-2.wav", "typewriter/key-3.wav"],
  "space":  ["typewriter/space.wav"],
  "delete": ["typewriter/backspace.wav"],
  "enter":  ["typewriter/return.wav"]
}
```

What to collect per style:

| Sound  | Files | What |
|--------|-------|------|
| key    | 4 to 8 | single keystrokes, preferably of different keys, so fast typing varies |
| space  | 1 to 3 | the space bar (optional; falls back to key) |
| delete | 1 to 3 | backspace (optional; falls back to key) |
| enter  | 1 or 2 | typewriter: bell + carriage return in one file, up to 2 s. Keyboard: the Enter key |

`chime` (optional) replaces the soft goal-reached chime.

- WAV, MP3 or OGG; any sample rate; mono or stereo.
- Raw downloads are fine: silence at the start is trimmed and every file is
  brought to the same loudness automatically. Keep each file short (a
  keystroke under ~0.3 s), since anything after the sound plays too.
- Anything not listed falls back to the built-in synthesised sound.
- Check the licence (CC0 or similar). This extension is for personal use only
  and the files never leave your computer.
- A single recording of slow typing also works as a source: it can be cut into
  separate keystrokes.
