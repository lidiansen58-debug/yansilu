import test from "node:test";
import assert from "node:assert/strict";

import {
  applyLocalUntitledPlaceholderRefresh,
  loadNoteTemplateSettingsFromStorageForRuntime,
  refreshUntitledPlaceholderForRuntime,
  untitledPlaceholderRefreshPlan
} from "../../apps/web/src/note-template-runtime-helpers.js";
import { NOTE_TEMPLATE_STORAGE_KEYS } from "../../apps/web/src/prototype-note-templates.js";

function templateState() {
  return {
    noteTemplates: {
      permanent: { text: "", draftText: "", draftActive: false, history: [], scope: "" },
      literature: { text: "", draftText: "", draftActive: false, history: [], scope: "" }
    }
  };
}

test("template storage runtime migrates legacy scoped templates and history", () => {
  const state = templateState();
  const storage = new Map([
    [NOTE_TEMPLATE_STORAGE_KEYS.permanent, "legacy permanent"],
    [`${NOTE_TEMPLATE_STORAGE_KEYS.permanent}:history`, JSON.stringify(["old permanent"])],
    [NOTE_TEMPLATE_STORAGE_KEYS.literature, "legacy literature"]
  ]);
  const writes = [];

  loadNoteTemplateSettingsFromStorageForRuntime({
    settingsState: state,
    noteTemplateStorageScope: () => "vault-a",
    noteTemplateStorageKey: (kind, options = {}) => `${NOTE_TEMPLATE_STORAGE_KEYS[kind]}:vault-a${options.suffix ? `:${options.suffix}` : ""}`,
    readStoredText: (key, fallback = "") => storage.get(key) || fallback,
    writeStoredText: (key, value) => writes.push([key, value]),
    normalizeStoredNoteTemplateSource: (value, kind) => `${kind}:${value || "default"}`,
    normalizeDraftBuffer: (value) => String(value || ""),
    normalizeNoteTemplateHistory: (items, kind) => items.map((item) => `${kind}:${item}`)
  });

  assert.equal(state.noteTemplates.permanent.text, "permanent:legacy permanent");
  assert.equal(state.noteTemplates.permanent.draftActive, false);
  assert.deepEqual(state.noteTemplates.permanent.history, ["permanent:old permanent"]);
  assert.ok(writes.some(([key]) => key === `${NOTE_TEMPLATE_STORAGE_KEYS.permanent}:vault-a`));
});

test("template storage runtime preserves unsaved draft for same scope", () => {
  const state = templateState();
  state.noteTemplates.permanent = {
    text: "saved",
    draftText: "draft edit",
    draftActive: true,
    history: [],
    scope: "vault-a"
  };

  loadNoteTemplateSettingsFromStorageForRuntime({
    settingsState: state,
    noteTemplateStorageScope: () => "vault-a",
    noteTemplateStorageKey: (kind, options = {}) => `${kind}${options.suffix ? `:${options.suffix}` : ""}`,
    readStoredText: (key) => key === "permanent" ? "saved" : "",
    normalizeStoredNoteTemplateSource: (value) => String(value || "default"),
    normalizeDraftBuffer: (value) => String(value || ""),
    normalizeNoteTemplateHistory: () => []
  });

  assert.equal(state.noteTemplates.permanent.text, "saved");
  assert.equal(state.noteTemplates.permanent.draftText, "draft edit");
  assert.equal(state.noteTemplates.permanent.draftActive, true);
});

test("untitled placeholder plan only refreshes editable old placeholders", () => {
  const note = { id: "n1", title: "Untitled", folderId: "f1", body: "old placeholder" };
  const plan = untitledPlaceholderRefreshPlan(note, {
    isUntitledTitle: () => true,
    noteTabFor: () => null,
    normalizedDefaultUntitledBody: () => "new placeholder",
    ensureEditableNoteBody: (value) => String(value || ""),
    isEmptyUntitledMarkdown: (body) => body === "old placeholder",
    initialBodyForFolder: () => "new placeholder"
  });

  assert.equal(plan.shouldRefresh, true);
  assert.equal(plan.nextBody, "new placeholder");
  assert.equal(untitledPlaceholderRefreshPlan({ title: "Named" }, { isUntitledTitle: () => false }).shouldRefresh, false);
});

test("untitled placeholder runtime refreshes local notes and remote notes through injected deps", async () => {
  const local = { id: "n1", title: "Untitled", folderId: "f1", body: "old" };
  const tab = { body: "old", savedBody: "old", dirty: false };
  applyLocalUntitledPlaceholderRefresh(local, tab, "# Untitled\n\nnew", {
    parseTags: () => ["tag"],
    parseLinks: () => ["link"]
  });
  assert.equal(local.bodyLoaded, true);
  assert.deepEqual(local.tags, ["tag"]);
  assert.equal(tab.savedBody, "# Untitled\n\nnew");

  const remote = { id: "n2", title: "Untitled", folderId: "f1", body: "old", status: "draft" };
  const calls = [];
  await refreshUntitledPlaceholderForRuntime(remote, {
    isUntitledTitle: () => true,
    noteTabFor: () => null,
    normalizedDefaultUntitledBody: () => "new",
    ensureEditableNoteBody: (value) => String(value || ""),
    isEmptyUntitledMarkdown: () => true,
    initialBodyForFolder: () => "new",
    isLocalOnlyNote: () => false,
    updateNote: async (id, payload) => {
      calls.push([id, payload.body]);
      return { id, title: "Untitled", body: payload.body };
    },
    mapNoteItem: (value) => ({ ...value, mapped: true })
  });

  assert.deepEqual(calls, [["n2", "new"]]);
  assert.equal(remote.mapped, true);
  assert.equal(remote.bodyLoaded, true);
});
