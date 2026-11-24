import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocUrl, buildUrl, actionsFor } from './hacks.js';

const D = 'https://docs.google.com';
const ID = '1GuARFGTqiIBcMpAEI3K_SuT1UiLwMxjHOwVm88yNMeY';
const ids = (doc) => actionsFor(doc).map((a) => a.id);

test('rewrites Docs URLs', () => {
  const doc = parseDocUrl(`${D}/document/d/${ID}/edit?tab=t.0`);
  assert.equal(buildUrl(doc, 'copy'), `${D}/document/d/${ID}/copy`);
  assert.equal(buildUrl(doc, 'preview'), `${D}/document/d/${ID}/preview`);
  assert.equal(buildUrl(doc, 'template'), `${D}/document/d/${ID}/template/preview`);
  assert.equal(buildUrl(doc, 'pdf'), `${D}/document/d/${ID}/export?format=pdf`);
  assert.deepEqual(ids(doc), ['copy', 'preview', 'template', 'pdf']);
});

test('no MS Office exports', () => {
  const doc = parseDocUrl(`${D}/document/d/${ID}/edit`);
  for (const id of ['docx', 'xlsx', 'pptx']) assert.equal(buildUrl(doc, id), null);
});

test('keeps the account index and sheet gid', () => {
  const doc = parseDocUrl(`${D}/spreadsheets/u/1/d/${ID}/edit?gid=42#gid=42`);
  assert.equal(buildUrl(doc, 'pdf'), `${D}/spreadsheets/u/1/d/${ID}/export?format=pdf`);
  assert.equal(buildUrl(doc, 'csv'), `${D}/spreadsheets/u/1/d/${ID}/export?format=csv&gid=42`);
  const downloads = actionsFor(doc).filter((a) => a.group === 'download').map((a) => a.id);
  assert.deepEqual(downloads, ['pdf', 'csv']);
});

test('Slides export PDF, and PNG/SVG of the current slide', () => {
  const slides = parseDocUrl(`${D}/presentation/d/${ID}/edit#slide=id.g2f_3a`);
  assert.equal(buildUrl(slides, 'pdf'), `${D}/presentation/d/${ID}/export/pdf`);
  assert.equal(buildUrl(slides, 'png'), `${D}/presentation/d/${ID}/export/png?pageid=g2f_3a`);
  assert.equal(buildUrl(slides, 'svg'), `${D}/presentation/d/${ID}/export/svg?pageid=g2f_3a`);
  assert.deepEqual(ids(slides), ['copy', 'preview', 'template', 'pdf', 'png', 'svg']);
  // No slide in the URL: Google exports the first slide.
  assert.equal(buildUrl(parseDocUrl(`${D}/presentation/d/${ID}/edit`), 'png'), `${D}/presentation/d/${ID}/export/png`);
});

test('Drawings download PDF/PNG/SVG', () => {
  const drawing = parseDocUrl(`${D}/drawings/d/${ID}/edit`);
  assert.equal(buildUrl(drawing, 'svg'), `${D}/drawings/d/${ID}/export/svg`);
  assert.equal(buildUrl(drawing, 'template'), null);
  assert.deepEqual(ids(drawing), ['copy', 'preview', 'pdf', 'png', 'svg']);
  assert.ok(actionsFor(drawing).filter((a) => ['pdf', 'png', 'svg'].includes(a.id)).every((a) => a.group === 'download'));
});

test('ignores non-editor URLs', () => {
  for (const url of [`${D}/document/u/0/`, 'https://drive.google.com/file/d/x/view', 'https://example.com/', undefined]) {
    assert.equal(parseDocUrl(url), null);
  }
});
