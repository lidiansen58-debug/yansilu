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
  assert.deepEqual(buildImportPayload({ connector: "markdown", path: "E:\\vault" }), { path: "E:\\vault" });
  assert.deepEqual(buildImportPayload({ connector: "zotero", payloadText: '{"library":"main"}' }), { library: "main" });
  assert.throws(() => buildImportPayload({ connector: "obsidian", path: "" }), /Payload JSON|来源目录/);
});

test("import toolbar actions preview assembles params and reports success", async () => {
  const calls = [];
  const actions = createImportToolbarActions({
    getToolbarValues: () => ({
      connector: "markdown",
      path: "E:\\vault",
      payload: "",
      options: '{"detectAliases":true}',
      importRecordId: ""
    }),
    previewImport: async (input) => {
      calls.push(["previewImport", input]);
      return { importRecordId: "imp_1", connector: "markdown" };
    },
    onPreviewSuccess: async (preview) => {
      calls.push(["onPreviewSuccess", preview.importRecordId]);
    },
    refreshImportHistory: async (options) => {
      calls.push(["refreshImportHistory", options]);
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
      connector: "markdown",
      payload: { path: "E:\\vault" },
      options: { detectAliases: true }
    }
  ]);
  assert.deepEqual(calls[1], ["onPreviewSuccess", "imp_1"]);
  assert.deepEqual(calls[2], ["refreshImportHistory", { silent: true }]);
  assert.deepEqual(calls[3], ["setStatus", "导入预览完成：imp_1", "ok"]);
});

test("import toolbar actions block confirm when no candidates are selected", async () => {
  const calls = [];
  const actions = createImportToolbarActions({
    getToolbarValues: () => ({ importRecordId: "imp_2" }),
    getActivePreview: () => ({ importRecordId: "imp_2", candidatePreview: { items: [{ id: "c1" }] } }),
    selectionSummary: () => ({ selectedIds: new Set(), selectedCount: 0, totalCount: 1 }),
    confirmImport: async () => {
      calls.push(["confirmImport"]);
    },
    setStatus: (text, tone) => {
      calls.push(["setStatus", text, tone]);
    }
  });

  await actions.handleConfirm();

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "setStatus");
  assert.equal(calls[0][2], "warn");
});

test("import toolbar actions require record id for refresh and rollback", async () => {
  const calls = [];
  const actions = createImportToolbarActions({
    getToolbarValues: () => ({ importRecordId: "" }),
    getFallbackImportRecordId: () => "",
    setStatus: (text, tone) => {
      calls.push([text, tone]);
    }
  });

  await actions.handleRefresh();
  await actions.handleRollback();

  assert.deepEqual(calls, [
    ["请先填写 ImportRecord ID", "warn"],
    ["请先填写 ImportRecord ID", "warn"]
  ]);
});

test("import toolbar actions pass selected file-box directory on confirm", async () => {
  const calls = [];
  const actions = createImportToolbarActions({
    getToolbarValues: () => ({ importRecordId: "imp_4", directoryId: "dir_literature_child" }),
    getFallbackImportRecordId: () => "imp_4",
    getActivePreview: () => ({ importRecordId: "imp_4", candidatePreview: { literatureNotes: [{ id: "c1" }] } }),
    selectionSummary: () => ({ selectedIds: new Set(["c1"]), selectedCount: 1, totalCount: 1 }),
    resolveDirectoryRootId: () => "dir_literature_default",
    confirmImport: async (importRecordId, payload) => {
      calls.push([importRecordId, payload]);
      return { status: "completed", result: {} };
    }
  });

  await actions.handleConfirm();

  assert.deepEqual(calls, [["imp_4", { selectedCandidateIds: ["c1"], directoryId: "dir_literature_child" }]]);
});

test("validateImportDirectorySelection blocks mixed literature and permanent selections", () => {
  const result = validateImportDirectorySelection({
    candidatePreview: {
      literatureNotes: [{ id: "ln_1" }],
      permanentNotes: [{ id: "pn_1" }]
    },
    selectedIds: ["ln_1", "pn_1"],
    directoryId: "dir_literature_child",
    resolveDirectoryRootId: () => "dir_literature_default"
  });

  assert.deepEqual(result, {
    code: "IMPORT_DIRECTORY_SCOPE_INVALID",
    message: "当前一次确认只能给同一根目录的一批笔记选择“导入到”。请把文献笔记和永久笔记分开确认。"
  });
});

test("validateImportDirectorySelection uses candidateSelection when truncated preview omits hidden groups", () => {
  const result = validateImportDirectorySelection({
    candidatePreview: {
      literatureNotes: [{ id: "ln_1" }]
    },
    candidateSelection: {
      sources: [],
      literatureNotes: ["ln_1"],
      permanentNotes: ["pn_hidden"],
      total: { sources: 0, literatureNotes: 1, permanentNotes: 1 }
    },
    selectedIds: ["ln_1", "pn_hidden"],
    directoryId: "dir_literature_child",
    resolveDirectoryRootId: () => "dir_literature_default"
  });

  assert.deepEqual(result, {
    code: "IMPORT_DIRECTORY_SCOPE_INVALID",
    message: "当前一次确认只能给同一根目录的一批笔记选择“导入到”。请把文献笔记和永久笔记分开确认。"
  });
});

test("import toolbar actions block mismatched directory roots before confirm", async () => {
  const calls = [];
  const actions = createImportToolbarActions({
    getToolbarValues: () => ({ importRecordId: "imp_5", directoryId: "dir_literature_child" }),
    getFallbackImportRecordId: () => "imp_5",
    getActivePreview: () => ({
      importRecordId: "imp_5",
      candidatePreview: { permanentNotes: [{ id: "pn_1" }] }
    }),
    selectionSummary: () => ({ selectedIds: new Set(["pn_1"]), selectedCount: 1, totalCount: 1 }),
    resolveDirectoryRootId: () => "dir_literature_default",
    confirmImport: async () => {
      calls.push(["confirmImport"]);
      return { status: "completed", result: {} };
    },
    showImportResult: (payload) => {
      calls.push(["showImportResult", payload.code, payload.message]);
    },
    setStatus: (text, tone) => {
      calls.push(["setStatus", text, tone]);
    }
  });

  await actions.handleConfirm();

  assert.deepEqual(calls, [
    ["showImportResult", "IMPORT_DIRECTORY_SCOPE_INVALID", "当前选择的是永久笔记，请改选永久笔记盒目录后再确认。"],
    ["setStatus", "当前选择的是永久笔记，请改选永久笔记盒目录后再确认。", "warn"]
  ]);
});

test("import toolbar actions emit stable error payloads", async () => {
  const calls = [];
  const actions = createImportToolbarActions({
    getToolbarValues: () => ({ importRecordId: "imp_3" }),
    getFallbackImportRecordId: () => "imp_3",
    loadImportRecordIntoUi: async () => {
      throw Object.assign(new Error("missing"), { code: "IMPORT_RECORD_NOT_FOUND" });
    },
    showImportResult: (payload) => {
      calls.push(payload);
    },
    setStatus: (text, tone) => {
      calls.push({ text, tone });
    }
  });

  await actions.handleRefresh();

  assert.deepEqual(calls[0], {
    stage: "record_error",
    importRecordId: "imp_3",
    message: "missing",
    code: "IMPORT_RECORD_NOT_FOUND"
  });
  assert.deepEqual(calls[1], {
    text: "读取导入记录失败：missing",
    tone: "bad"
  });
});
