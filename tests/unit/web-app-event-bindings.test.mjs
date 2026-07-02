import test from "node:test";
import assert from "node:assert/strict";

import { bindImportWorkspaceEventsForRuntime } from "../../apps/web/src/app-event-bindings.js";

function targetFor(selector, attrs = {}) {
  return {
    id: attrs.id || "",
    value: attrs.value || "",
    closest: (requested) => requested === selector
      ? {
          getAttribute: (name) => attrs[name] || ""
        }
      : null
  };
}

test("import event bindings route tabs preview and writing actions", async () => {
  const handlers = new Map();
  const calls = [];
  const mount = {
    addEventListener: (eventName, handler) => handlers.set(eventName, handler)
  };

  const registrations = bindImportWorkspaceEventsForRuntime({
    $: (id) => id === "importPageMount" ? mount : null,
    importState: { activeTab: "import", resultFocusReason: "" },
    normalizeImportWorkspaceTab: (value) => value,
    setImportWorkspaceTab: (tab) => calls.push(["tab", tab]),
    importToolbarActions: {
      handlePreview: async () => calls.push(["preview"])
    },
    openFirstImportedPermanentNote: async (noteId) => calls.push(["openFirst", noteId]),
    createWritingProjectFromImportedPermanentNotes: async () => calls.push(["createProject"]),
    hideImportOperationResultModal: () => calls.push(["hideModal"]),
    activateModule: (moduleName) => calls.push(["module", moduleName]),
    setStatus: (message, tone) => calls.push(["status", tone, message])
  });

  assert.deepEqual(registrations.map((item) => item.eventName), ["click", "change"]);

  handlers.get("click")({
    target: targetFor(".import-workspace-tab[data-import-workspace-tab]", { "data-import-workspace-tab": "export" })
  });
  handlers.get("click")({ target: targetFor("#btnImportPreview") });
  handlers.get("click")({
    target: targetFor("[data-import-writing-action]", { "data-import-writing-action": "create-writing-project" })
  });
  handlers.get("click")({
    target: targetFor("[data-import-writing-action]", {
      "data-import-writing-action": "open-first-isolated-note",
      "data-note-id": "pn_1"
    })
  });
  handlers.get("click")({
    target: targetFor("[data-import-writing-action]", { "data-import-writing-action": "open-today" })
  });
  await Promise.resolve();

  assert.deepEqual(calls[0], ["tab", "export"]);
  assert.ok(calls.some((call) => call[0] === "preview"));
  assert.ok(calls.some((call) => call[0] === "createProject"));
  assert.ok(calls.some((call) => call[0] === "openFirst" && call[1] === "pn_1"));
  assert.ok(calls.some((call) => call[0] === "hideModal"));
  assert.ok(calls.some((call) => call[0] === "module" && call[1] === "today"));
});

test("import event bindings update candidate selection and export directory hints", () => {
  const handlers = new Map();
  const selectedCandidateIds = new Set();
  const calls = [];
  const mount = {
    addEventListener: (eventName, handler) => handlers.set(eventName, handler)
  };
  const importState = {
    lastPreview: { importRecordId: "r1", candidatePreview: {}, candidateSelection: null, originalityGuard: null },
    selectionImportRecordId: "r1",
    selectedCandidateIds,
    directoryId: "old"
  };

  bindImportWorkspaceEventsForRuntime({
    $: (id) => id === "importPageMount" ? mount : null,
    importState,
    preferredImportDirectoryId: (value) => `preferred:${value}`,
    directoryPathLabel: (id) => `label:${id}`,
    updateExportTargetHint: () => calls.push(["hint"]),
    rerenderImportResult: () => calls.push(["rerender"]),
    setStatus: (message, tone) => calls.push(["status", tone, message])
  });

  handlers.get("change")({
    target: {
      closest: (selector) => selector === ".candidate-checkbox"
        ? {
            checked: true,
            getAttribute: (name) => name === "data-candidate-id" ? "c1" : ""
          }
        : null
    }
  });
  handlers.get("change")({
    target: targetFor("#importDirectoryId", { value: "dir1" })
  });
  handlers.get("change")({
    target: targetFor("#exportTargetPath")
  });

  assert.equal(selectedCandidateIds.has("c1"), true);
  assert.equal(importState.directoryId, "preferred:dir1");
  assert.ok(calls.some((call) => call[0] === "rerender"));
  assert.ok(calls.some((call) => call[0] === "hint"));
});
