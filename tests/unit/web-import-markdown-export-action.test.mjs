import test from "node:test";
import assert from "node:assert/strict";
import { createImportMarkdownExportAction } from "../../apps/web/src/import-markdown-export-action.js";

function harness(overrides = {}) {
  const elements = {
    exportDirectoryId: { value: "permanent-child" },
    exportTargetPath: { value: "" },
    exportAdvanced: { setAttribute: (...args) => calls.push(["attribute", ...args]) }
  };
  const calls = [];
  const deps = {
    $: id => elements[id],
    desktopCommands: { browseDirectory: async options => { calls.push(["browse", options]); return { path: "C:/export" }; } },
    directoryPathLabel: id => `Notes/${id}`,
    updateExportTargetHint: () => calls.push(["hint"]),
    exportMarkdown: async payload => { calls.push(["export", payload]); return { copied: 3, status: "completed", exportJobId: "job-1", copiedBreakdown: { notes: 2, assets: 1 } }; },
    showExportResult: result => calls.push(["result", result]),
    setStatus: (...args) => calls.push(["status", ...args]),
    ...overrides
  };
  return { elements, calls, run: createImportMarkdownExportAction(deps) };
}

test("directory chooser success retains the selected path and reports actual export counts", async () => {
  const h = harness();
  await h.run();
  assert.equal(h.elements.exportTargetPath.value, "C:/export");
  assert.deepEqual(h.calls.find(([action]) => action === "export")[1], { targetPath: "C:/export", directoryId: "permanent-child" });
  assert.deepEqual(h.calls.find(([action]) => action === "attribute"), ["attribute", "open", "open"]);
  assert.ok(h.calls.some(([action]) => action === "hint"));
  const result = h.calls.find(([action]) => action === "result")[1];
  assert.equal(result.stage, "export_markdown");
  assert.equal(result.directoryLabel, "Notes/permanent-child");
  assert.equal(result.exportJobId, "job-1");
  assert.deepEqual(result.copiedBreakdown, { notes: 2, assets: 1 });
  assert.deepEqual(h.calls.at(-1), ["status", "已导出 3 个文件", "ok"]);
});

test("missing directory and cancelled chooser never call the export API", async () => {
  const missing = harness();
  missing.elements.exportDirectoryId.value = " ";
  await missing.run();
  assert.deepEqual(missing.calls, [["status", "请先选择永久笔记目录", "warn"]]);
  const cancelled = harness({ desktopCommands: { browseDirectory: async () => null } });
  await cancelled.run();
  assert.deepEqual(cancelled.calls, [["status", "请先选择导出目标目录", "warn"]]);
});

test("directory chooser failure is visible with its cause and can be retried", async () => {
  let attempts = 0;
  const error = Object.assign(new Error("目录选择器未能打开"), { code: "dialog_unavailable", details: { native: "denied" } });
  const h = harness({ desktopCommands: { browseDirectory: async () => { if (++attempts === 1) throw error; return { path: "C:/retry" }; } } });
  await h.run();
  const result = h.calls.find(([action]) => action === "result")[1];
  assert.equal(result.stage, "export_error");
  assert.equal(result.message, error.message);
  assert.equal(result.code, error.code);
  assert.deepEqual(result.details, error.details);
  assert.equal(result.targetPath, "");
  assert.equal(h.calls.some(([action]) => action === "export"), false);
  assert.deepEqual(h.calls.at(-1), ["status", "导出失败：目录选择器未能打开", "bad"]);
  await h.run();
  assert.equal(h.elements.exportTargetPath.value, "C:/retry");
  assert.equal(h.calls.at(-1)[2], "ok");
});

test("API failure keeps the entered path and retry does not reopen the chooser", async () => {
  let attempts = 0;
  const h = harness({
    desktopCommands: { browseDirectory: () => assert.fail("an entered path should be used") },
    exportMarkdown: async () => { if (++attempts === 1) throw new Error("目标目录无写入权限"); return { copied: 2 }; }
  });
  h.elements.exportTargetPath.value = " C:/my-notes ";
  await h.run();
  assert.equal(h.elements.exportTargetPath.value, " C:/my-notes ");
  assert.equal(h.calls.find(([action]) => action === "result")[1].targetPath, "C:/my-notes");
  assert.equal(h.calls.at(-1)[2], "bad");
  await h.run();
  assert.equal(attempts, 2);
  assert.deepEqual(h.calls.at(-1), ["status", "已导出 2 个文件", "ok"]);
});
