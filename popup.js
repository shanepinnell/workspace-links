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

// File-type icon: Material Symbols `draft` (filled), coloured per format, with the extension on it.
// Inlined (not a mask) so the label can sit on top; the path is read from the bundled SVG.
const FILE_COLORS = { pdf: '#d93025', csv: '#188038', png: '#8430ce', svg: '#e37400' };
const DRAFT_PATH = (await (await fetch('icons/material/draft-fill.svg')).text()).match(/ d="([^"]+)"/)[1];
function fileIcon(type) {
  const color = FILE_COLORS[type];
  if (!color) return null;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '160 -880 640 800'); // the page's bounds in the 960 grid
  svg.setAttribute('class', 'file-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <path d="${DRAFT_PATH}" fill="${color}"/>
    <text x="480" y="-200" text-anchor="middle" font-size="200" font-weight="700"
          font-family="system-ui, sans-serif" fill="#fff">${type.toUpperCase()}</text>`;
  return svg;
}

// M3 snackbar: brief message at the bottom; a new message replaces the current one.
let snackTimer;
function snackbar(text, ms = 4000) {
  const el = $('#snackbar');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// M3 pressed state: a ripple spreading from the pointer.
function ripple(e) {
  const btn = e.target.closest('.list button');
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  const size = Math.hypot(r.width, r.height) * 2;
  const dot = document.createElement('span');
  dot.className = 'ripple';
  dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  btn.append(dot);
  dot.addEventListener('animationend', () => dot.remove());
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

  $('#actions').addEventListener('pointerdown', ripple);

  $('#actions').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = ACTIONS.find((a) => a.id === btn.dataset.action);
    const url = buildUrl(doc, action.id);
    try {
      if (action.group === 'download') {
        await chrome.downloads.download({ url });
        snackbar(`Downloading ${action.label}…`);
        setTimeout(() => window.close(), 1500);
      } else {
        await navigator.clipboard.writeText(url);
        // "Copy link copied" reads badly, so that one is named for what the link does.
        snackbar(action.id === 'copy' ? 'Make-a-copy link copied' : `${action.label} link copied`);
        // The row's trailing icon shows a check; the popup stays open for more copies.
        document.querySelectorAll('.list button.copied').forEach((b) => b !== btn && b.classList.remove('copied'));
        btn.classList.add('copied');
        clearTimeout(btn._copiedTimer);
        btn._copiedTimer = setTimeout(() => btn.classList.remove('copied'), 2000);
      }
    } catch (err) {
      snackbar(action.group === 'download' ? 'Download failed' : 'Couldn’t copy link');
      console.error(err);
    }
  });
}
