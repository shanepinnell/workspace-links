import { ACTIONS, parseDocUrl, buildUrl } from './hacks.js';

const PATTERNS = ['document', 'spreadsheets', 'presentation', 'drawings']
  .map((app) => `https://docs.google.com/${app}/*`);

// Right-click menu on Docs/Sheets/Slides/Drawings pages.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'root', title: 'Workspace Links', contexts: ['page'], documentUrlPatterns: PATTERNS });
    for (const a of ACTIONS) {
      // Only show an item on the apps it supports.
      const patterns = Object.keys(a.path).map((app) => `https://docs.google.com/${app}/*`);
      chrome.contextMenus.create({
        id: a.id,
        parentId: 'root',
        title: a.group === 'download' ? `Download ${a.label}` : `Copy link: ${a.label}`,
        contexts: ['page'],
        documentUrlPatterns: patterns,
      });
    }
  });
});

// Runs inside the Docs page: the service worker itself has no clipboard.
function writeClipboard(text) {
  return navigator.clipboard.writeText(text).then(() => true, () => {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  });
}

async function flashBadge(tabId, ok) {
  await chrome.action.setBadgeBackgroundColor({ tabId, color: ok ? '#188038' : '#d93025' });
  await chrome.action.setBadgeText({ tabId, text: ok ? '✓' : '!' });
  setTimeout(() => chrome.action.setBadgeText({ tabId, text: '' }), 1500);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = buildUrl(parseDocUrl(info.pageUrl || tab?.url), info.menuItemId);
  if (!url || tab?.id == null) return;

  if (ACTIONS.find((a) => a.id === info.menuItemId)?.group === 'download') {
    chrome.downloads.download({ url });
    return;
  }

  let ok = false;
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: writeClipboard, args: [url] });
    ok = !!res?.result;
  } catch (e) {
    console.error('Copy failed', e);
  }
  flashBadge(tab.id, ok);
});
