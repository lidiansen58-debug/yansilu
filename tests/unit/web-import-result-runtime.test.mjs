import test from "node:test";
import assert from "node:assert/strict";

import { createImportResultRuntime } from "../../apps/web/src/import-result-runtime.js";

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
