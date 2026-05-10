import test from "node:test";
import assert from "node:assert/strict";
import {
  actionItems,
  resultMetrics,
  resultStatusLabel,
  resultSubtitle,
  resultTitle,
  resultTone,
  warningItems
} from "../../apps/web/src/import-result-model.js";

test("import result model derives preview title tone metrics subtitle", () => {
  const payload = {
    stage: "preview",
    importRecordId: "imp_1",
    connector: "markdown",
    status: "preview",
    summary: { sources: 1, literatureNotes: 2, permanentNotes: 3, warnings: 1 },
    warnings: [{ code: "IMPORT_MALFORMED_FRONTMATTER", message: "bad frontmatter" }]
  };

  assert.equal(resultTitle(payload.stage), "导入预览完成");
  assert.equal(resultTone(payload), "warn");
  assert.equal(resultSubtitle(payload), "imp_1");
  assert.equal(resultStatusLabel("warn"), "需注意");
  assert.deepEqual(resultMetrics(payload), [
    { label: "导入记录", value: "imp_1" },
    { label: "连接器", value: "Markdown" },
    { label: "状态", value: "预览中" },
    { label: "来源卡片", value: "1" },
    { label: "文献笔记", value: "2" },
    { label: "永久笔记", value: "3" },
    { label: "警告", value: "1" },
    { label: "警告", value: "1" }
  ]);
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
    "把高相似度文本改写成自己的核心主张，并补充来源定位后重新预览。",
    "补充引用定位或增强转述，再重新运行原创性检查。",
    "为引用补充页码、章节、时间戳或其他可追溯定位。",
    "被修改过的文件不会自动回滚；请打开对应路径手动合并或删除。"
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
    { label: "导入记录", value: "imp_2" },
    { label: "状态", value: "已写入" },
    { label: "已选候选", value: "3/4" },
    { label: "选择模式", value: "部分候选" },
    { label: "已创建", value: "3" }
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
    { label: "导入记录", value: "imp_assets" },
    { label: "状态", value: "已写入" },
    { label: "已选候选", value: "2/2" },
    { label: "选择模式", value: "全部候选" },
    { label: "写入文件", value: "2" },
    { label: "资源文件", value: "1" }
  ]);
});

test("import result model derives export copied breakdown metrics", () => {
  const payload = {
    stage: "export_markdown",
    exportJobId: "exp_1",
    status: "queued",
    copied: 3,
    copiedBreakdown: {
      markdownFiles: 2,
      assetFiles: 1,
      totalFiles: 3
    },
    targetPath: "E:\\exports"
  };

  assert.deepEqual(resultMetrics(payload), [
    { label: "导出任务", value: "exp_1" },
    { label: "状态", value: "queued" },
    { label: "已复制文件", value: "3" },
    { label: "Markdown 文件", value: "2" },
    { label: "资源文件", value: "1" },
    { label: "文件总数", value: "3" },
    { label: "目标路径", value: "E:\\exports" }
  ]);
});
