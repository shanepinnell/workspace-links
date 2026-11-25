import { ACTIONS, actionsFor, parseDocUrl, buildUrl } from './hacks.js';

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
// `ms: null` keeps it up until replaced. An optional action adds a text button.
let snackTimer;
function snackbar(text, { ms = 4000, action } = {}) {
  const el = $('#snackbar');
  const btn = el.querySelector('.action');
  el.querySelector('.text').textContent = text;
  btn.hidden = !action;
  btn.onclick = null;
  if (action) {
    btn.textContent = action.label;
    btn.onclick = action.onClick;
  }
  el.classList.toggle('has-action', !!action);
  el.classList.add('show');
  clearTimeout(snackTimer);
  if (ms != null) snackTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// Resolve when a download finishes; reject if it's interrupted.
function whenDownloaded(id) {
  return new Promise((resolve, reject) => {
    const onChanged = (delta) => {
      if (delta.id !== id || !delta.state) return;
      if (delta.state.current === 'complete') { done(); resolve(); }
      if (delta.state.current === 'interrupted') { done(); reject(new Error(delta.error?.current || 'interrupted')); }
    };
    const done = () => chrome.downloads.onChanged.removeListener(onChanged);
    chrome.downloads.onChanged.addListener(onChanged);
    // In case it finished before the listener was attached.
    chrome.downloads.search({ id }).then(([item]) => {
      if (item?.state === 'complete') { done(); resolve(); }
      if (item?.state === 'interrupted') { done(); reject(new Error(item.error || 'interrupted')); }
    });
  });
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

// Shown on pages that aren't a Google editor. Colours are the apps' own.
const HOME_ITEMS = [
  { group: 'drive', label: 'Open Google Drive', url: 'https://drive.google.com/', icon: 'folder_open' },
  { group: 'new', label: 'Document',     url: 'https://docs.new',     icon: 'description-fill', color: '#4285f4' },
  { group: 'new', label: 'Spreadsheet',  url: 'https://sheets.new',   icon: 'table_chart-fill', color: '#0f9d58' },
  { group: 'new', label: 'Presentation', url: 'https://slides.new',   icon: 'slideshow-fill',   color: '#f4b400' },
  { group: 'new', label: 'Drawing',      url: 'https://drawings.new', icon: 'draw-fill',        color: '#db4437' },
];

if (!doc) {
  $('#home').hidden = false;
  for (const item of HOME_ITEMS) {
    const btn = document.createElement('button');
    const icon = symbol(item.icon, 'hack-icon');
    if (item.color) icon.style.color = item.color;
    btn.append(icon, item.label);
    btn.addEventListener('click', async () => {
      await chrome.tabs.create({ url: item.url });
      window.close();
    });
    $(`.list[data-group="${item.group}"]`).append(btn);
  }
  $('#home').addEventListener('pointerdown', ripple);
} else {
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
    const format = action.id.toUpperCase();
    try {
      if (action.group === 'download') {
        // The popup stays open; when the file lands, offer to show it in the file manager.
        const id = await chrome.downloads.download({ url });
        snackbar(`Downloading ${format}…`, { ms: null });
        try {
          await whenDownloaded(id);
        } catch (err) {
          snackbar(`${format} download failed`);
          console.error(err);
          return;
        }
        snackbar(`${format} downloaded`, {
          action: { label: 'Show in folder', onClick: () => chrome.downloads.show(id) },
        });
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
