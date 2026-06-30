import test from "node:test";
import assert from "node:assert/strict";

import {
  actionItems,
  resultBrief,
  resultMetrics,
  resultTitle
} from "../../apps/web/src/import-result-model.js";

test("writing project result strings use theme wording", () => {
  assert.equal(resultTitle("writing_project"), "可写主题已确定");
  assert.equal(resultTitle("writing_project_error"), "确定可写主题失败");
  assert.equal(resultTitle("writing_copy_scaffold"), "文章提纲 Markdown 已复制");
  assert.equal(resultTitle("writing_export_scaffold"), "文章提纲 Markdown 已导出");
  assert.equal(
    resultBrief({ stage: "writing_project" }),
    "可写主题已确定。下一步可以生成文章提纲。"
  );
  assert.equal(
    resultBrief({ stage: "writing_copy_scaffold" }),
    "文章提纲 Markdown 已复制，可以粘贴到你的写作环境。"
  );
});

test("writing project result metrics label uses theme", () => {
  const metrics = resultMetrics({
    stage: "writing_project",
    writingProjectId: "wp_123",
    title: "Seed Project",
    basketNoteIds: ["n1", "n2"]
  });

  assert.deepEqual(metrics[0], { label: "主题", value: "wp_123" });
});

test("writing project error action item asks for 主题标题", () => {
  const actions = actionItems({
    stage: "writing_project_error",
    message: "title is required"
  });

  assert.ok(actions.includes("补充主题标题后再确定可写主题。"));
});
