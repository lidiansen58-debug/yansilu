import test from "node:test";
import assert from "node:assert/strict";
import {
  actionItems,
  resultBrief,
  resultMetrics,
  resultStatusLabel,
  resultSubtitle,
  resultTitle,
  resultTone,
  warningItems
} from "../../apps/web/src/import-result-model.js";

test("import result model derives simplified preview title tone metrics subtitle", () => {
  const payload = {
    stage: "preview",
    importRecordId: "imp_1",
    connector: "markdown",
    status: "preview",
    summary: { sources: 1, literatureNotes: 2, permanentNotes: 3, warnings: 1 },
    warnings: [{ code: "IMPORT_MALFORMED_FRONTMATTER", message: "bad frontmatter" }]
  };

  assert.equal(resultTitle(payload.stage), "导入预览已生成");
  assert.equal(resultTone(payload), "warn");
  assert.equal(resultSubtitle(payload), "imp_1");
  assert.equal(resultStatusLabel("warn"), "注意");
  assert.equal(resultBrief(payload, "warn"), "可以继续，但建议先处理警告。");
  assert.deepEqual(resultMetrics(payload), [
    { label: "来源", value: "Markdown" },
    { label: "状态", value: "待确认" },
    { label: "候选", value: "1 来源 / 2 文献 / 3 永久" },
    { label: "警告", value: "1" }
  ]);
});

test("import result model derives plain-language briefs", () => {
  assert.equal(resultBrief({ stage: "preview" }, "ok"), "检查候选内容，确认后再导入。");
  assert.equal(resultBrief({ stage: "export_markdown" }, "ok"), "导出文件已经写到目标目录。");
  assert.equal(resultBrief({ stage: "preview_error" }, "bad"), "这一步没有完成，请先处理下面的问题。");
});

test("import result model derives warnings and actions from originality and skipped files", () => {
  const payload = {
    stage: "confirm_error",
    code: "ORIGINALITY_GUARD_BLOCKED",
    message: "blocked",
    originalityGuard: {
      evaluations: [{ id: "pn_1", status: "warning", reasons: ["citation_locator_missing"] }]
    },
    result: {
      skippedFiles: [{ path: "notes/pn_1.md", reason: "modified" }]
    }
  };

  const warnings = warningItems(payload);
  assert.deepEqual(warnings, [
    { code: "ORIGINALITY_GUARD_BLOCKED", message: "blocked" },
    { code: "ORIGINALITY_WARNING", message: "pn_1：缺少引用定位" }
  ]);
  assert.deepEqual(actionItems(payload, warnings), [
    "先降低与原文的重复度。",
    "补充引用定位或加强转述。",
    "补充页码、章节或时间定位。"
  ]);
});

test("import result model derives confirm metrics with selection", () => {
  const payload = {
    stage: "confirm",
    importRecordId: "imp_2",
    status: "completed",
    result: {
      selection: { selectedCandidates: 3, totalCandidates: 4, mode: "partial" },
      created: 3,
      skipped: { invalid: 1 }
    }
  };

  assert.equal(resultTone(payload), "warn");
  assert.deepEqual(resultMetrics(payload), [
    { label: "状态", value: "已导入" },
    { label: "已选", value: "3/4" },
    { label: "范围", value: "部分" }
  ]);
});

test("import result model includes created asset file metrics", () => {
  const payload = {
    stage: "confirm",
    importRecordId: "imp_assets",
    status: "completed",
    result: {
      selection: { selectedCandidates: 2, totalCandidates: 2, mode: "all" },
      createdFiles: [
        { noteId: "ln_1", noteType: "literature", path: "notes/literature/ln_1.md" },
        { noteId: "asset_1", noteType: "asset", path: "assets/imports/imp_assets/chart.png" }
      ]
    }
  };

  assert.deepEqual(resultMetrics(payload), [
    { label: "状态", value: "已导入" },
    { label: "已选", value: "2/2" },
    { label: "范围", value: "全部" },
    { label: "写入", value: "2" },
    { label: "资源", value: "1" }
  ]);
});

test("import result model derives export simplified metrics", () => {
  const payload = {
    stage: "export_markdown",
    exportJobId: "exp_1",
    status: "queued",
    copied: 3,
    directoryId: "dir_original_default",
    directoryLabel: "永久笔记盒 / 写作方法",
    targetPath: "E:\\exports"
  };

  assert.deepEqual(resultMetrics(payload), [
    { label: "状态", value: "已排队" },
    { label: "文件", value: "3" },
    { label: "导出自", value: "永久笔记盒 / 写作方法" },
    { label: "目标", value: "E:\\exports" }
  ]);
});

test("import result model surfaces failed import records", () => {
  const payload = {
    stage: "record",
    importRecordId: "imp_failed_1",
    importRecord: {
      connector: "markdown",
      status: "failed",
      summary: { sources: 1, literatureNotes: 1, permanentNotes: 0 },
      failureResult: {
        code: "IMPORT_CLEANUP_PRESERVE_FAILED",
        message: "preserve move failed"
      }
    }
  };

  const warnings = warningItems(payload);
  assert.equal(resultTone(payload), "bad");
  assert.deepEqual(resultMetrics(payload), [
    { label: "来源", value: "Markdown" },
    { label: "状态", value: "失败" },
    { label: "摘要", value: "1 来源 / 1 文献 / 0 永久" },
    { label: "失败代码", value: "IMPORT_CLEANUP_PRESERVE_FAILED" }
  ]);
  assert.deepEqual(warnings, [
    { code: "IMPORT_CLEANUP_PRESERVE_FAILED", message: "preserve move failed" }
  ]);
  assert.deepEqual(actionItems(payload, warnings), [
    "失败导入的已修改文件未能自动迁移，请先手动处理后再重试。"
  ]);
});
