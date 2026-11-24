# Your own key sounds

Authored ships with synthesised typewriter and keyboard sounds. Real recordings sound much better, so you can add your own. They stay on your computer: git ignores this folder's subfolders and `sounds.local.json`.

## Setup

1. Create a folder per style, `typewriter/` and/or `keyboard/`, and put your clips in it.
2. Copy `sounds.json` to **`sounds.local.json`** and list your files in it, with paths relative to this folder:

   ```json
   {
     "typewriter": {
       "key":    ["typewriter/key-1.wav", "typewriter/key-2.wav", "typewriter/key-3.wav"],
       "space":  ["typewriter/space-1.wav"],
       "delete": [],
       "enter":  ["typewriter/enter-1.wav"]
     },
     "keyboard": { "key": [], "space": [], "delete": [], "enter": [] },
     "chime": []
   }
   ```

3. Reload the extension in `chrome://extensions`, then reload the Docs tab. Under **Sound**, the drawer should now say *Playing your recordings*.

Authored uses `sounds.local.json` if it exists, and `sounds.json` (empty, so built-in sounds only) otherwise.

## What to collect

| Sound | Clips | Notes |
|---|---|---|
| `key` | 6 to 10 | Single keystrokes, preferably of different keys, so fast typing varies. |
| `space` | 1 to 3 | The space bar. Optional; falls back to `key`. |
| `delete` | 1 to 3 | Backspace. Optional; falls back to `key`. |
| `enter` | 1 or 2 | Typewriter: bell and/or carriage return. Keyboard: the Enter key. |
| `chime` | 1 | Optional. Replaces the soft goal-reached chime. |

## Tips

- **Formats:** WAV, MP3 and OGG all work, at any sample rate, mono or stereo.
- **Start each clip on the strike.** Leading silence is trimmed automatically, but a clip that starts after the hit loses it, and you'll mostly hear the ring-out.
- **Keep a whole keystroke:** the strike plus its short tail, up to about 300 ms, ending before the next key. Clips may overlap when you type fast, just as on a real machine.
- **Loudness:** all clips of one style share one volume setting, so their natural differences are kept. The typewriter plays at about half the keyboard's level (`STYLE_LEVEL` in `content/sound.js`).
- **Licences:** CC0 sounds (for example from freesound.org) are the easiest choice. Many libraries, Pixabay included, allow use but not redistribution, which is another reason these files stay out of git.
