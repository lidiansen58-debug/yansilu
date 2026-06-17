import test from "node:test";
import assert from "node:assert/strict";
import { importConfirmButtonState, importConnectorOptions, importToolbarViewModel } from "../../apps/web/src/import-toolbar-model.js";

test("import toolbar model exposes the obsidian-only connector option", () => {
  assert.deepEqual(importConnectorOptions().map((item) => item.value), ["obsidian"]);
  assert.deepEqual(importConnectorOptions().map((item) => item.label), ["Obsidian 仓库"]);
});

test("import toolbar model derives localized confirm button state", () => {
  assert.deepEqual(importConfirmButtonState(), {
    disabled: false,
    label: "确认导入"
  });
  assert.deepEqual(importConfirmButtonState({ hasMatchingPreview: true, selectedCount: 2, totalCount: 3 }), {
    disabled: false,
    label: "确认导入（2/3）"
  });
  assert.deepEqual(importConfirmButtonState({ hasMatchingPreview: true, selectedCount: 0, totalCount: 3 }), {
    disabled: true,
    label: "确认导入（0/3）"
  });
  assert.deepEqual(importConfirmButtonState({ hasMatchingPreview: true, selectedCount: 0, totalCount: 0 }), {
    disabled: true,
    label: "没有可导入候选"
  });
});

test("import toolbar model normalizes view values", () => {
  assert.deepEqual(importToolbarViewModel({ connector: "", importRecordId: "imp_1", path: "C:\\vault", payload: "{}", options: "{}" }), {
    connector: "obsidian",
    directoryId: "",
    directoryOptions: [],
    importRecordId: "imp_1",
    path: "C:\\vault",
    payload: "{}",
    options: "{}",
    confirmButton: {
      disabled: false,
      label: "确认导入"
    }
  });
});
