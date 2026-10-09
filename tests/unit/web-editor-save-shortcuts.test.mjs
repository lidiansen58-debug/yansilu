import test from "node:test";
import assert from "node:assert/strict";
import { createNoteSaveShortcutHandler, createWritingSaveShortcutHandler } from "../../apps/web/src/editor-save-shortcuts.js";

function event(options = {}) {
  return { key: "s", ctrlKey: true, prevented: 0, stopped: 0,
    preventDefault() { this.prevented++; }, stopPropagation() { this.stopped++; }, ...options };
}

function setup() {
  const state = { module: "explorer" }, source = { disabled: false }, button = { disabled: false, clicks: 0, click() { this.clicks++; } };
  let noteSaves = 0, tab = { id: "note" }, search = { hidden: true };
  const note = createNoteSaveShortcutHandler({ state, activeTab: () => tab, saveActiveNote: () => noteSaves++, documentRef: { getElementById: () => search } });
  const writing = createWritingSaveShortcutHandler({ source, getSaveButton: () => button });
  return { state, source, button, note, writing, noteSaves: () => noteSaves, clearTab: () => { tab = null; }, search };
}

for (const modifier of ["ctrlKey", "metaKey"]) test(`${modifier} save routes to writing without saving the background note`, () => {
  const s = setup();
  s.state.module = "writing";
  const e = event({ ctrlKey: false, [modifier]: true });
  s.note(e);
  assert.equal(e.prevented, 0);
  assert.equal(e.stopped, 0);
  s.writing(e);
  s.writing(e);
  assert.equal(s.noteSaves(), 0);
  assert.equal(s.button.clicks, 1);
  assert.equal(e.prevented, 1);
  assert.equal(e.stopped, 1);
});

test("returning to note editing keeps exactly one save across both capture listeners", () => {
  const s = setup();
  s.state.module = "writing";
  s.note(event());
  s.state.module = "explorer";
  const e = event();
  s.note(e); s.note(e);
  assert.equal(s.noteSaves(), 1);
  assert.equal(s.button.clicks, 0);
});

for (const input of [{ isComposing: true }, { keyCode: 229 }, { ctrlKey: false }, { key: "b" }]) test(`save handlers preserve composition and unrelated keys: ${JSON.stringify(input)}`, () => {
  const s = setup(), e = event(input);
  s.note(e); s.writing(e);
  assert.equal(s.noteSaves(), 0);
  assert.equal(s.button.clicks, 0);
  assert.equal(e.prevented, 0);
  assert.equal(e.stopped, 0);
});

for (const unavailable of ["source", "button"]) test(`disabled ${unavailable} cannot start a writing save`, () => {
  const s = setup();
  s[unavailable].disabled = true;
  const e = event();
  s.writing(e);
  assert.equal(s.button.clicks, 0);
  assert.equal(e.prevented, 1, "Do not trigger the browser Save Page action");
});

for (const unavailable of ["tab", "move", "search"]) test(`note shortcut keeps its ${unavailable} protection`, () => {
  const s = setup(), e = event();
  if (unavailable === "tab") s.clearTab();
  if (unavailable === "move") s.state.pendingNoteMoveId = "note";
  if (unavailable === "search") s.search.hidden = false;
  s.note(e);
  assert.equal(s.noteSaves(), 0);
  assert.equal(e.prevented, 0);
});

test("a hidden writing workspace cannot consume a save shortcut", () => {
  const s = setup(), e = event();
  const handler = createWritingSaveShortcutHandler({ source: s.source, getSaveButton: () => s.button,
    isActive: () => s.state.module === "writing" });
  handler(e);
  assert.equal(s.button.clicks, 0);
  assert.equal(e.prevented, 0);
  assert.equal(e.stopped, 0);
  s.state.module = "writing";
  handler(e);
  assert.equal(s.button.clicks, 1);
});
