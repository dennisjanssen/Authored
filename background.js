// Authored service worker.
// 1. Forwards chrome.commands shortcuts to the content script in the active tab.
// 2. Handles fullscreen. A shortcut from chrome.commands does not carry a user
//    gesture into the page, so element.requestFullscreen() would be rejected
//    there. Instead the window itself is put into fullscreen with
//    chrome.windows.update, which needs no gesture and no extra permission.
// 3. Reports the current shortcut bindings so the settings drawer can show them.

'use strict';

chrome.commands.onCommand.addListener(async (command, tab) => {
  try {
    const target = tab?.id ? tab : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (!target?.id) return;
    await chrome.tabs.sendMessage(target.id, { type: 'authored:command', command });
  } catch {
    // No Authored content script in this tab (not a Google Doc). Nothing to do.
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'authored:fullscreen') {
    setFullscreen(sender.tab?.windowId, msg.want)
      .then(sendResponse)
      .catch((e) => sendResponse({ error: String(e?.message || e) }));
    return true; // async response
  }
  if (msg?.type === 'authored:commands') {
    chrome.commands.getAll().then(sendResponse);
    return true;
  }
  return false;
});

const prevKey = (windowId) => `prevState:${windowId}`;

// want: true / false to switch, undefined to only report the current state.
async function setFullscreen(windowId, want) {
  if (windowId == null) return { fullscreen: false };
  const win = await chrome.windows.get(windowId);
  const isFs = win.state === 'fullscreen';
  if (want === undefined || want === isFs) return { fullscreen: isFs };

  if (want) {
    await chrome.storage.session.set({ [prevKey(windowId)]: win.state });
    await chrome.windows.update(windowId, { state: 'fullscreen' });
  } else {
    const key = prevKey(windowId);
    const prev = (await chrome.storage.session.get(key))[key];
    const state = prev === 'maximized' ? 'maximized' : 'normal';
    await chrome.windows.update(windowId, { state });
    await chrome.storage.session.remove(key);
  }
  return { fullscreen: want };
}
