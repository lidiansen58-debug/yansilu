import test from "node:test";
import assert from "node:assert/strict";

import { createImportResultRuntime } from "../../apps/web/src/import-result-runtime.js";
import { importConfirmButtonState } from "../../apps/web/src/import-toolbar-model.js";

for (const [stage, recordStatus, mode, selected, total, visible] of [
  ["preview", "", "import", 2, 3, true],
  ["preview", "", "import", 0, 3, true],
  ["preview", "", "import", 0, 0, true],
  ["record", "preview", "import", 2, 3, true],
  ["record", "completed", "import", 2, 3, false],
  ["preview_error", "", "import", 2, 3, false],
  ["confirm_error", "", "import", 2, 3, false],
  ["confirm_pending", "", "import", 2, 3, false],
  ["confirm", "", "import", 2, 3, false],
  ["preview", "", "export", 2, 3, false]
]) {
  test(`import confirmation belongs to a matching preview: ${stage}/${recordStatus}/${mode}/${selected}`, () => {
    const elements = { importRecordId: { value: "imp_1" }, btnImportConfirm: {}, importPreviewActions: {} };
    const importState = { lastPreview: { importRecordId: "imp_1", candidatePreview: {} }, lastResultPayload: { stage, importRecord: { status: recordStatus } }, operationResultMode: mode };
    const runtime = createImportResultRuntime({
      $: id => elements[id] || null, importState, importConfirmButtonState,
      selectionSummaryForImportState: () => ({ selectedCount: selected, totalCount: total })
    });
    runtime.updateImportConfirmButton();
    assert.equal(elements.importPreviewActions.hidden, !visible);
    assert.equal(elements.btnImportConfirm.disabled, selected === 0);
  });
}

function createRuntimeHarness(lastResultPayload, overrides = {}) {
  const calls = [];
  const importState = { lastResultPayload };
  const runtime = createImportResultRuntime({
    importState,
    createdNoteIdsByTypeFromImportPayload: (payload, type) =>
      (payload?.result?.createdFiles || [])
        .filter((file) => file.noteType === type)
        .map((file) => file.noteId),
    ensureNotesLoaded: async (ids) => calls.push(["ensure", ids]),
    activateModule: (moduleName) => calls.push(["activate", moduleName]),
    noteById: (noteId) => overrides.notesById?.[noteId] || null,
    openNoteById: (noteId) => {
      calls.push(["open", noteId]);
      return true;
    },
    handleStateChange: async (reason, payload) => {
      calls.push(["state", reason, payload]);
      if (reason === "select-folder") return true;
      return overrides.graphFlowResult === undefined ? false : overrides.graphFlowResult;
    },
    $: (id) => (id === "importOperationResultModal" ? { classList: { add: (value) => calls.push(["modalClassAdd", value]) } } : null),
    setStatus: (message, tone) => calls.push(["status", tone, message])
  });
  return { runtime, calls };
}

test("import result runtime opens the first recommended unlinked permanent note in graph relation flow", async () => {
  const { runtime, calls } = createRuntimeHarness({
    result: {
      organizingOverview: {
        recommendedFirst: [{ noteId: "pn_recommended", title: "推荐处理" }]
      },
      createdFiles: [{ noteType: "permanent", noteId: "pn_first" }]
    }
  }, {
    graphFlowResult: true,
    notesById: { pn_recommended: { id: "pn_recommended", folderId: "dir_imported" } }
  });

  const opened = await runtime.openFirstImportedPermanentNote();

  assert.equal(opened, true);
  assert.deepEqual(calls.find((call) => call[0] === "ensure"), ["ensure", ["pn_recommended"]]);
  assert.deepEqual(calls.find((call) => call[0] === "activate"), ["activate", "graph"]);
  assert.deepEqual(
    calls.filter((call) => call[0] === "state"),
    [
      ["state", "select-folder", { folderId: "dir_imported", source: "import-result" }],
      ["state", "graph-associate-note", { noteId: "pn_recommended", source: "import-result", importedPermanentNoteIds: ["pn_first"] }]
    ]
  );
  assert.equal(calls.some((call) => call[0] === "open"), false);
  assert.deepEqual(calls.find((call) => call[0] === "modalClassAdd"), ["modalClassAdd", "hidden"]);
});

test("import result runtime falls back to opening the note when relation flow cannot open", async () => {
  const { runtime, calls } = createRuntimeHarness({
    result: {
      organizingOverview: {
        recommendedFirst: [{ noteId: "pn_recommended", title: "推荐处理" }]
      }
    }
  });

  const opened = await runtime.openFirstImportedPermanentNote();

  assert.equal(opened, true);
  assert.deepEqual(calls.filter((call) => call[0] === "activate"), [["activate", "graph"], ["activate", "explorer"]]);
  assert.deepEqual(calls.find((call) => call[0] === "open"), ["open", "pn_recommended"]);
});

test("import result runtime does not treat arbitrary imported permanent notes as unlinked work", async () => {
  const { runtime, calls } = createRuntimeHarness({
    result: {
      organizingOverview: {
        recommendedFirst: []
      },
      createdFiles: [{ noteType: "permanent", noteId: "pn_first" }]
    }
  });

  const opened = await runtime.openFirstImportedPermanentNote();

  assert.equal(opened, false);
  assert.equal(calls.some((call) => call[0] === "open"), false);
  assert.match(calls.find((call) => call[0] === "status")?.[2] || "", /没有需要优先处理的未关联永久笔记/);
});

test("continuing imported literature dismisses persisted result state before navigation", async () => {
  const calls = [];
  const importState = { operationResultVisible: true, lastResultPayload: { stage: "confirm", result: { createdFiles: [{ noteType: "literature", noteId: "ln1" }] } } };
  const runtime = createImportResultRuntime({
    importState, $: () => null,
    createdNoteIdsByTypeFromImportPayload: () => ["ln1"],
    importPayloadRecordId: () => "imp1", ensureNotesLoaded: async () => {},
    setLiteratureQueueFocus: ids => calls.push(["scope", ids]),
    activateModule: module => { assert.equal(importState.operationResultVisible, false); calls.push(["module", module]); },
    openNoteById: id => { calls.push(["open", id]); return true; },
    setStatus: () => {}
  });
  assert.equal(await runtime.openImportedLiteratureQueue(), true);
  assert.deepEqual(calls, [["scope", ["ln1"]], ["module", "explorer"], ["open", "ln1"]]);
  assert.equal(importState.operationResultVisible, false);
});
