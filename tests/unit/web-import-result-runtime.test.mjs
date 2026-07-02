import test from "node:test";
import assert from "node:assert/strict";

import { createImportResultRuntime } from "../../apps/web/src/import-result-runtime.js";

function createRuntimeHarness(lastResultPayload) {
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
    openNoteById: (noteId) => {
      calls.push(["open", noteId]);
      return true;
    },
    $: (id) => (id === "importOperationResultModal" ? { classList: { add: (value) => calls.push(["modalClassAdd", value]) } } : null),
    setStatus: (message, tone) => calls.push(["status", tone, message])
  });
  return { runtime, calls };
}

test("import result runtime opens the first recommended unlinked permanent note", async () => {
  const { runtime, calls } = createRuntimeHarness({
    result: {
      organizingOverview: {
        recommendedFirst: [{ noteId: "pn_recommended", title: "推荐处理" }]
      },
      createdFiles: [{ noteType: "permanent", noteId: "pn_first" }]
    }
  });

  const opened = await runtime.openFirstImportedPermanentNote();

  assert.equal(opened, true);
  assert.deepEqual(calls.find((call) => call[0] === "ensure"), ["ensure", ["pn_recommended"]]);
  assert.deepEqual(calls.find((call) => call[0] === "open"), ["open", "pn_recommended"]);
  assert.deepEqual(calls.find((call) => call[0] === "modalClassAdd"), ["modalClassAdd", "hidden"]);
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
