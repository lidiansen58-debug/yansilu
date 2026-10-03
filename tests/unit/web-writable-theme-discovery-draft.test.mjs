import test from "node:test";
import assert from "node:assert/strict";
import { captureWritableThemeDiscoveryDrafts, recordWritableThemeDiscoveryInput, writableThemeDiscoveryDraftView } from "../../apps/web/src/writable-theme-discovery-draft.js";
import { renderWritableThemeDiscoveryPanelDom } from "../../apps/web/src/writable-theme-discovery-panel.js";

test("theme suggestion input survives a rerender without changing the original suggestion", () => {
  const suggestion = { id: "s1", title: "Suggested", centralQuestion: "Original?", items: [{ noteId: "n1", rationale: "Original reason" }] };
  const writingState = { themeDiscoverySuggestions: [suggestion] };
  const type = (field, value, noteId = "") => {
    const input = { value, closest: () => ({ getAttribute: () => suggestion.id }),
      getAttribute: name => name === "data-theme-discovery-field" ? field : noteId };
    recordWritableThemeDiscoveryInput({ target: { closest: () => input } }, writingState);
  };
  type("title", "Human title");
  type("centralQuestion", "Human question?");
  type("item-rationale", "Human reason", "n1");
  assert.equal(suggestion.title, "Suggested");
  const view = writableThemeDiscoveryDraftView(suggestion);
  assert.equal(view.title, "Human title");
  assert.equal(view.centralQuestion, "Human question?");
  assert.equal(view.items[0].rationale, "Human reason");
  const html = renderWritableThemeDiscoveryPanelDom({ writingState });
  assert.match(html, /Human title/);
  assert.match(html, /Human question\?/);
  assert.match(html, /Human reason/);
});

test("a late input from a removed suggestion cannot change a new suggestion", () => {
  const current = { id: "new", title: "Current" };
  recordWritableThemeDiscoveryInput({ target: { closest: () => ({
    value: "Old draft", closest: () => ({ getAttribute: () => "old" })
  }) } }, { themeDiscoverySuggestions: [current] });
  assert.equal(current.draft, undefined);
});

test("theme rerender captures changed DOM text even when an input event was missed and ignores a removed scope", () => {
  const suggestion = { id: "s1", title: "Suggested" };
  const input = {
    value: "Human title", defaultValue: "Suggested",
    closest: selector => selector === "[data-theme-discovery-field]" ? input : { getAttribute: () => "s1" },
    getAttribute: () => "title"
  };
  captureWritableThemeDiscoveryDrafts({ querySelectorAll: () => [input] }, { themeDiscoverySuggestions: [suggestion] });
  assert.equal(writableThemeDiscoveryDraftView(suggestion).title, "Human title");
  const other = { id: "s2", title: "Other vault" };
  captureWritableThemeDiscoveryDrafts({ querySelectorAll: () => [input] }, { themeDiscoverySuggestions: [other] });
  assert.equal(other.draft, undefined);
});
