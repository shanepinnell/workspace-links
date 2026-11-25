// Shared URL logic for the popup and the context menu.

// https://docs.google.com/<app>/[u/<n>/]d/<id>/...
const DOC_URL = /^https:\/\/docs\.google\.com\/(document|spreadsheets|presentation|drawings)\/((?:u\/\d+\/)?d\/[A-Za-z0-9_-]+)/;

// Every action, in display order. `group` decides where it appears in the popup:
// 'link' copies the hacked URL; 'download' downloads it.
// `path` maps each supported app to the suffix that replaces /edit...
export const ACTIONS = [
  { id: 'copy',     label: 'Copy',             group: 'link',     path: { document: 'copy', spreadsheets: 'copy', presentation: 'copy', drawings: 'copy' } },
  { id: 'preview',  label: 'Preview',          group: 'link',     path: { document: 'preview', spreadsheets: 'preview', presentation: 'preview', drawings: 'preview' } },
  { id: 'template', label: 'Template',         group: 'link',     path: { document: 'template/preview', spreadsheets: 'template/preview', presentation: 'template/preview' } },
  { id: 'pdf',      label: 'PDF',              group: 'download', path: { document: 'export?format=pdf', spreadsheets: 'export?format=pdf', presentation: 'export/pdf', drawings: 'export/pdf' } },
  { id: 'csv',      label: 'CSV',              group: 'download', path: { spreadsheets: 'export?format=csv' }, keepGid: true },
  { id: 'png',      label: 'PNG',              group: 'download', path: { presentation: 'export/png', drawings: 'export/png' }, keepSlide: true },
  { id: 'svg',      label: 'SVG',              group: 'download', path: { presentation: 'export/svg', drawings: 'export/svg' }, keepSlide: true },
];

/** Parse a Google editor URL. Returns { app, base, gid, slide } or null. */
export function parseDocUrl(url) {
  const m = DOC_URL.exec(url || '');
  if (!m) return null;
  const gid = /[#&?]gid=(\d+)/.exec(url)?.[1] ?? null;
  // Slides: #slide=id.<pageid> is the slide currently shown.
  const slide = /#slide=id\.([A-Za-z0-9_-]+)/.exec(url)?.[1] ?? null;
  return { app: m[1], base: `https://docs.google.com/${m[1]}/${m[2]}/`, gid, slide };
}

/** Actions available for a parsed doc. */
export function actionsFor(doc) {
  return ACTIONS.filter((a) => doc && doc.app in a.path);
}

/** The rewritten URL for an action, or null if the action doesn't apply. */
export function buildUrl(doc, actionId) {
  const action = ACTIONS.find((a) => a.id === actionId);
  if (!doc || !action || !(doc.app in action.path)) return null;
  let url = doc.base + action.path[doc.app];
  if (action.keepGid && doc.gid) url += `&gid=${doc.gid}`;
  if (action.keepSlide && doc.app === 'presentation' && doc.slide) url += `?pageid=${doc.slide}`;
  return url;
}
