import test from "node:test";
import assert from "node:assert/strict";

import {
  actionItems,
  resultBrief,
  resultMetrics,
  resultTitle
} from "../../apps/web/src/import-result-model.js";

test("writing project result strings use current project and scaffold copy", () => {
  assert.equal(resultTitle("writing_project"), "已创建写作项目");
  assert.equal(resultTitle("writing_project_error"), "创建写作项目失败");
  assert.equal(resultTitle("writing_copy_scaffold"), "已复制草稿骨架");
  assert.equal(resultTitle("writing_export_scaffold"), "已导出草稿骨架");
  assert.equal(resultBrief({ stage: "writing_project" }), "现在可以继续生成草稿骨架。");
  assert.equal(resultBrief({ stage: "writing_copy_scaffold" }), "草稿骨架已复制。");
});

test("writing project result metrics currently fall back to generic status", () => {
  const metrics = resultMetrics({
    stage: "writing_project",
    writingProjectId: "wp_123",
    title: "Seed Project",
    basketNoteIds: ["n1", "n2"]
  });

  assert.deepEqual(metrics, [{ label: "状态", value: "未提供" }]);
});

test("writing project error action items no longer inject title-specific guidance", () => {
  const actions = actionItems({
    stage: "writing_project_error",
    message: "title is required"
  });

  assert.deepEqual(actions, []);
});
