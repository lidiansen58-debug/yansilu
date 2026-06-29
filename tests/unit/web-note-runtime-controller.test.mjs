import test from "node:test";
import assert from "node:assert/strict";

import {
  createNoteRuntimeController
} from "../../apps/web/src/note-runtime-controller.js";

test("note runtime controller derives and persists relation network status", () => {
  const writes = [];
  const state = {
    graphConnectedNoteIds: new Set(["pn_connected"]),
    graphConnectivityReady: true,
    notes: [
      { id: "pn_connected", folderId: "permanent" },
      { id: "pn_isolated", folderId: "permanent" },
      { id: "lit_1", folderId: "literature" }
    ]
  };
  const controller = createNoteRuntimeController(() => ({
    readStoredRelationNetworkStatus: () => "",
    state,
    typeFromFolder: (_state, folderId) => folderId,
    writeStoredRelationNetworkStatus: (noteId, status) => writes.push([noteId, status])
  }));

  assert.equal(controller.relationNetworkStatusForNote(state.notes[0]), "connected");
  assert.equal(controller.syncNoteRelationNetworkStatus(state.notes[1]), "isolated");
  assert.equal(state.notes[1].relationNetworkStatus, "isolated");
  assert.deepEqual(writes.at(-1), ["pn_isolated", "isolated"]);

  assert.equal(controller.syncNoteRelationNetworkStatus(state.notes[2]), "");
  assert.deepEqual(writes.at(-1), ["lit_1", ""]);
});

test("note runtime controller loads note template settings through scoped storage", () => {
  const writes = [];
  const settingsState = {
    noteTemplates: {
      permanent: { text: "", draftText: "", history: [] },
      literature: { text: "", draftText: "", history: [] }
    }
  };
  const storage = new Map([
    ["yansilu:settings:note-template:permanent", "legacy permanent"],
    ["yansilu:settings:note-template:permanent:history", JSON.stringify(["legacy permanent"])]
  ]);
  const controller = createNoteRuntimeController(() => ({
    settingsState,
    noteTemplateStorageScope: () => "vault:demo",
    noteTemplateStorageKey: (kind, options = {}) => `vault:demo:${kind}${options.suffix ? `:${options.suffix}` : ""}`,
    readStoredText: (key, fallback = "") => storage.get(key) || fallback,
    writeStoredText: (key, value) => {
      writes.push([key, value]);
      storage.set(key, value);
    },
    normalizeStoredNoteTemplateSource: (value) => String(value || "").trim(),
    normalizeDraftBuffer: (value) => String(value || ""),
    normalizeNoteTemplateHistory: (value) => Array.isArray(value) ? value : []
  }));

  const templates = controller.loadNoteTemplateSettingsFromStorage();

  assert.equal(templates.permanent.text, "legacy permanent");
  assert.deepEqual(templates.permanent.history, ["legacy permanent"]);
  assert.equal(writes.some((call) => call[0] === "vault:demo:permanent"), true);
});

test("note runtime controller delegates note body loading and tab sync", async () => {
  const calls = [];
  const state = {
    activeTabId: "tab_1",
    notes: [{ id: "n1", title: "Stub", body: "stub", bodyLoaded: false }],
    tabs: [{ id: "tab_1", noteId: "n1", body: "stub", title: "Stub", dirty: false }]
  };
  const controller = createNoteRuntimeController(() => ({
    editor: {
      fillEditorFromTab: () => calls.push(["fill"]),
      syncTabMetadataFromNote: (noteId) => calls.push(["sync", noteId])
    },
    fetchNote: async () => ({ id: "n1", title: "Full", body: "full", status: "draft" }),
    state
  }));

  const note = await controller.ensureNoteBodyLoaded("n1");

  assert.equal(note.bodyLoaded, true);
  assert.equal(note.title, "Full");
  assert.equal(state.tabs[0].body, "full");
  assert.equal(state.tabs[0].dirty, false);
  assert.deepEqual(calls, [["sync", "n1"], ["fill"]]);
});
