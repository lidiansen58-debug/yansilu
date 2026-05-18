import test from "node:test";
import assert from "node:assert/strict";
import { buildImportPayload, createImportToolbarActions, parseJsonOrEmpty } from "../../apps/web/src/import-toolbar-actions.js";

test("import toolbar actions parse JSON and build payloads", () => {
  assert.deepEqual(parseJsonOrEmpty('{"detectAliases":true}', "Options"), { detectAliases: true });
  assert.deepEqual(buildImportPayload({ connector: "markdown", path: "E:\\vault" }), { path: "E:\\vault" });
  assert.deepEqual(buildImportPayload({ connector: "zotero", payloadText: '{"library":"main"}' }), { library: "main" });
  assert.throws(() => buildImportPayload({ connector: "obsidian", path: "" }), /来源路径/);
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

  assert.deepEqual(calls, [["setStatus", "请至少勾选一个候选后再确认写入", "warn"]]);
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
