import test from "node:test";
import assert from "node:assert/strict";

import {
  actionItems,
  resultBrief,
  resultMetrics,
  resultTitle
} from "../../apps/web/src/import-result-model.js";

test("writing project result strings use current project and scaffold copy", () => {
  assert.equal(resultTitle("writing_project"), "项目已创建");
  assert.equal(resultTitle("writing_project_error"), "项目创建失败");
  assert.equal(resultTitle("writing_copy_scaffold"), "草稿骨架 Markdown 已复制");
  assert.equal(resultTitle("writing_export_scaffold"), "草稿骨架 Markdown 已导出");
  assert.equal(resultBrief({ stage: "writing_project" }), "项目已创建。下一步可以生成草稿骨架。");
  assert.equal(resultBrief({ stage: "writing_copy_scaffold" }), "草稿骨架 Markdown 已复制，可以粘贴到你的写作环境。");
});

test("writing project result metrics expose project title and basket size", () => {
  const metrics = resultMetrics({
    stage: "writing_project",
    writingProjectId: "wp_123",
    title: "Seed Project",
    basketNoteIds: ["n1", "n2"]
  });

  assert.deepEqual(metrics, [
    { label: "项目", value: "wp_123" },
    { label: "标题", value: "Seed Project" },
    { label: "写作篮", value: "2" }
  ]);
});

test("writing project error action items include title-specific guidance", () => {
  const actions = actionItems({
    stage: "writing_project_error",
    message: "title is required"
  });

  assert.deepEqual(actions, ["补充项目标题后再创建。"]);
});
