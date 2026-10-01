import test from "node:test";
import assert from "node:assert/strict";

import {
  hideWritingTopicPicker,
  installWritingSidebarActionEvents,
  showWritingTopicPicker,
  toggleWritingTopicPicker,
  syncWritingTopicPickerAction
} from "../../apps/web/src/writing-sidebar-actions.js";

function fakeClassList() {
  const names = new Set();
  return {
    toggle: (name, force) => force ? names.add(name) : names.delete(name),
    contains: (name) => names.has(name)
  };
}

test("writing sidebar returns an active workbench to the topic picker", () => {
  const shell = { dataset: {} };
  const sidebarButton = { classList: fakeClassList(), attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } };
  const documentRef = { querySelector: (selector) => selector === ".writing-shell" ? shell : selector.includes("topics") ? sidebarButton : null };
  let activeTab = "";

  assert.equal(showWritingTopicPicker({ documentRef, applyWritingTab: (tab) => { activeTab = tab; } }), true);
  assert.equal(shell.dataset.writingView, "topic-picker");
  assert.equal(activeTab, "theme");
  assert.equal(sidebarButton.classList.contains("is-active"), true);
  assert.equal(sidebarButton.attrs["aria-pressed"], "true");

  assert.equal(hideWritingTopicPicker({ root: shell, documentRef }), true);
  assert.equal(shell.dataset.writingView, undefined);
  assert.equal(sidebarButton.classList.contains("is-active"), false);
  assert.equal(syncWritingTopicPickerAction(true, { documentRef }), true);
});

test("topic picker returns to the existing draft without reloading or replacing its input", () => {
  const shell = { dataset: { writingActiveTab: "draft", writingHasTopic: "true" } };
  const documentRef = { querySelector: selector => selector === ".writing-shell" ? shell : null };
  const applyWritingTab = tab => { shell.dataset.writingActiveTab = tab; };
  toggleWritingTopicPicker({ documentRef, applyWritingTab });
  assert.equal(shell.dataset.writingView, "topic-picker");
  assert.equal(shell.dataset.writingReturnTab, "draft");
  toggleWritingTopicPicker({ documentRef, applyWritingTab });
  assert.equal(shell.dataset.writingView, undefined);
  assert.equal(shell.dataset.writingActiveTab, "draft");
});

test("topic picker remains open when there is no active topic", () => {
  const shell = { dataset: { writingView: "topic-picker", writingHasTopic: "false" } };
  const documentRef = { querySelector: selector => selector === ".writing-shell" ? shell : null };
  toggleWritingTopicPicker({ documentRef });
  assert.equal(shell.dataset.writingView, "topic-picker");
});

test("writing sidebar routes theme and related-note actions", () => {
  const listeners = new Map();
  const shell = {
    dataset: {},
    querySelector: (selector) => selector === "#writingRelatedOverlay" ? {
      classList: { toggle: () => {} },
      setAttribute: () => {}
    } : null
  };
  const root = {
    contains: () => true,
    addEventListener: (name, handler) => listeners.set(name, handler)
  };
  const documentRef = { querySelector: (selector) => selector === ".writing-shell" ? shell : null };
  const installed = installWritingSidebarActionEvents({ root, documentRef });

  assert.equal(installed.installed, true);
  listeners.get("click")({ target: { closest: () => ({ dataset: { writingSidebarAction: "topics" } }) } });
  assert.equal(shell.dataset.writingView, "topic-picker");

  assert.doesNotThrow(() => listeners.get("click")({ target: { closest: () => ({ dataset: { writingSidebarAction: "related" } }) } }));
});
