import { APP_NAMES, ACTIONS, actionsFor, parseDocUrl, buildUrl } from './hacks.js';

const $ = (sel) => document.querySelector(sel);

// Material Symbols (outlined), the icon set Google's own toolbars use. See icons/material/.
// Rendered as CSS masks so they take the current text colour.
function symbol(name, extraClass = '') {
  const el = document.createElement('span');
  el.className = `ms ${extraClass}`.trim();
  el.style.setProperty('--icon', `url("icons/material/${name}.svg")`);
  el.setAttribute('aria-hidden', 'true');
  return el;
}

const HACK_SYMBOLS = { copy: 'file_copy', preview: 'visibility', template: 'dashboard' };
const hackIcon = (id) => (HACK_SYMBOLS[id] ? symbol(HACK_SYMBOLS[id], 'hack-icon') : null);

// Copy icon shown on hover, swapped for a check mark after copying.
function copyHint() {
  const hint = document.createElement('span');
  hint.className = 'copy-hint';
  hint.append(symbol('content_copy', 'i-copy'), symbol('check', 'i-check'));
  return hint;
}

// File-type icon: a page with a folded corner, coloured per format, with the extension on it.
const FILE_COLORS = { pdf: '#d93025', csv: '#188038', png: '#8430ce', svg: '#e37400' };
function fileIcon(type) {
  const color = FILE_COLORS[type];
  if (!color) return null;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 20 24');
  svg.setAttribute('class', 'file-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <path d="M3 1h10l6 6v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z" fill="${color}"/>
    <path d="M13 1v4a2 2 0 0 0 2 2h4z" fill="#fff" fill-opacity=".55"/>
    <text x="10" y="18.5" text-anchor="middle" font-size="6.2" font-weight="700"
          font-family="system-ui, sans-serif" fill="#fff">${type.toUpperCase()}</text>`;
  return svg;
}

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const doc = parseDocUrl(tab?.url);

if (!doc) {
  $('#unsupported').hidden = false;
} else {
  $('#app').textContent = `Google ${APP_NAMES[doc.app]}`;
  $('#actions').hidden = false;

  for (const action of actionsFor(doc)) {
    const btn = document.createElement('button');
    btn.dataset.action = action.id;
    const icon = action.group === 'download' ? fileIcon(action.id) : hackIcon(action.id);
    if (icon) btn.append(icon);
    btn.append(action.label);
    if (action.group === 'link') btn.append(copyHint());
    $(`.list[data-group="${action.group}"]`).append(btn);
  }
  // Hide sections with nothing in them for this app.
  document.querySelectorAll('section').forEach((s) => {
    s.hidden = !s.querySelector('button');
  });

  $('#actions').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = ACTIONS.find((a) => a.id === btn.dataset.action);
    const url = buildUrl(doc, action.id);
    try {
      if (action.group === 'download') {
        await chrome.downloads.download({ url });
        $('#toast').textContent = `Downloading ${action.label}…`;
        setTimeout(() => window.close(), 900);
      } else {
        await navigator.clipboard.writeText(url);
        // Brief green flash; the popup stays open so more links can be copied.
        btn.classList.remove('copied');
        void btn.offsetWidth; // restart the animation on repeat clicks
        btn.classList.add('copied');
        clearTimeout(btn._copiedTimer);
        btn._copiedTimer = setTimeout(() => btn.classList.remove('copied'), 1200);
      }
    } catch (err) {
      $('#toast').textContent = action.group === 'download' ? 'Download failed' : 'Could not copy link';
      console.error(err);
    }
  });
}
