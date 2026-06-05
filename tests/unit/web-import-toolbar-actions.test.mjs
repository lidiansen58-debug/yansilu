import test from "node:test";
import assert from "node:assert/strict";
import {
  buildImportPayload,
  createImportToolbarActions,
  parseJsonOrEmpty,
  validateImportDirectorySelection
} from "../../apps/web/src/import-toolbar-actions.js";

test("import toolbar actions parse JSON and build payloads", () => {
  assert.deepEqual(parseJsonOrEmpty('{"detectAliases":true}', "Options"), { detectAliases: true });
  assert.deepEqual(buildImportPayload({ connector: "obsidian", path: "E:\\vault" }), { path: "E:\\vault" });
  assert.deepEqual(buildImportPayload({ connector: "obsidian", payloadText: '{"path":"C:/vault"}' }), { path: "C:/vault" });
  assert.throws(() => buildImportPayload({ connector: "obsidian", path: "" }), /vault path or payload json/i);
});

test("import toolbar actions preview assembles params and reports success", async () => {
  const calls = [];
  const actions = createImportToolbarActions({
    getToolbarValues: () => ({
      connector: "obsidian",
      path: "E:\\vault",
      payload: "",
      options: '{"detectAliases":true}',
      importRecordId: ""
    }),
    previewImport: async (input) => {
      calls.push(["previewImport", input]);
      return { importRecordId: "imp_1", connector: "obsidian" };
    },
    onPreviewSuccess: async (preview) => {
      calls.push(["onPreviewSuccess", preview.importRecordId]);
    },
    setStatus: (text, tone) => {
      calls.push(["setStatus", text, tone]);
    },
    showImportResult: (payload) => {
      calls.push(["showImportResult", payload.stage]);
    }
  });

  await actions.handlePreview();

  assert.deepEqual(calls[0], [
    "previewImport",
    {
      connector: "obsidian",
      payload: { path: "E:\\vault" },
      options: { detectAliases: true }
    }
  ]);
  assert.deepEqual(calls[1], ["onPreviewSuccess", "imp_1"]);
  assert.deepEqual(calls[2], ["setStatus", "Import preview ready: imp_1", "ok"]);
});

test("import toolbar actions confirm with selected candidates and directory", async () => {
  const calls = [];
  const actions = createImportToolbarActions({
    getToolbarValues: () => ({ importRecordId: "imp_4", directoryId: "dir_literature_child" }),
    getFallbackImportRecordId: () => "imp_4",
    getActivePreview: () => ({ importRecordId: "imp_4", candidatePreview: { literatureNotes: [{ id: "c1" }] } }),
    selectionSummary: () => ({ selectedIds: new Set(["c1"]), selectedCount: 1, totalCount: 1 }),
    confirmImport: async (importRecordId, payload) => {
      calls.push([importRecordId, payload]);
      return { status: "completed", result: {} };
    },
    setStatus: () => {},
    showImportResult: () => {}
  });

  await actions.handleConfirm();

  assert.deepEqual(calls, [["imp_4", { selectedCandidateIds: ["c1"], directoryId: "dir_literature_child" }]]);
});

test("import toolbar actions require preview before confirm", async () => {
  const calls = [];
  const actions = createImportToolbarActions({
    getToolbarValues: () => ({ importRecordId: "" }),
    getFallbackImportRecordId: () => "",
    setStatus: (text, tone) => {
      calls.push([text, tone]);
    }
  });

  await actions.handleConfirm();

  assert.deepEqual(calls, [["Preview the import first.", "warn"]]);
});

test("import toolbar actions emit stable confirm error payloads", async () => {
  const calls = [];
  const actions = createImportToolbarActions({
    getToolbarValues: () => ({ importRecordId: "imp_3" }),
    getFallbackImportRecordId: () => "imp_3",
    getActivePreview: () => ({
      importRecordId: "imp_3",
      candidatePreview: { sources: [{ id: "src_1" }] }
    }),
    selectionSummary: () => ({ selectedIds: new Set(["src_1"]), selectedCount: 1, totalCount: 1 }),
    confirmImport: async () => {
      throw Object.assign(new Error("missing"), { code: "IMPORT_RECORD_NOT_FOUND" });
    },
    showImportResult: (payload) => {
      calls.push(payload);
    },
    setStatus: (text, tone) => {
      calls.push({ text, tone });
    }
  });

  await actions.handleConfirm();

  assert.deepEqual(calls[0], {
    stage: "confirm_error",
    importRecordId: "imp_3",
    message: "missing",
    code: "IMPORT_RECORD_NOT_FOUND",
    details: null
  });
  assert.deepEqual(calls[1], {
    text: "Import failed: missing",
    tone: "bad"
  });
});

test("validateImportDirectorySelection is a no-op in simplified mode", () => {
  const result = validateImportDirectorySelection({
    candidatePreview: {
      literatureNotes: [{ id: "ln_1" }],
      permanentNotes: [{ id: "pn_1" }]
    },
    selectedIds: ["ln_1", "pn_1"],
    directoryId: "dir_literature_child",
    resolveDirectoryRootId: () => "dir_literature_default"
  });

  assert.equal(result, null);
});

test("import toolbar actions refresh and rollback report unsupported mode", async () => {
  const calls = [];
  const actions = createImportToolbarActions({
    getToolbarValues: () => ({ importRecordId: "imp_x" }),
    setStatus: (text, tone) => {
      calls.push([text, tone]);
    }
  });

  await actions.handleRefresh();
  await actions.handleRollback();

  assert.deepEqual(calls, [
    ["Refresh is not available in the simplified importer.", "warn"],
    ["Rollback is not available in the simplified importer.", "warn"]
  ]);
});
