import test from "node:test";
import assert from "node:assert/strict";

import {
  applyWritingOutlineAction,
  normalizeWritingOutlineSections,
  syncWritingScaffoldMarkdown,
  updateWritingOutlineSection,
  writingDraftMarkdown,
  writingOutlineMarkdown,
  writingWorkbenchHasTopic
} from "../../apps/web/src/writing-workbench-model.js";

test("writing workbench model distinguishes empty and selected-topic states", () => {
  assert.equal(writingWorkbenchHasTopic({ writingState: {}, basketIds: [] }), false);
  assert.equal(writingWorkbenchHasTopic({ writingState: {}, basketIds: ["n1"] }), false);
  assert.equal(writingWorkbenchHasTopic({ writingState: { project: { id: "p1" } }, basketIds: [] }), true);
  assert.equal(writingWorkbenchHasTopic({ writingState: {}, basketIds: [], selectedTheme: { id: "theme-1" } }), true);
});

test("writing workbench model normalizes outline sections and markdown", () => {
  const sections = normalizeWritingOutlineSections({
    sections: [
      { heading: "开头", purpose: "说明问题", evidence_note_ids: ["n1"] },
      { title: "结尾" }
    ]
  });

  assert.deepEqual(sections.map((section) => section.heading), ["开头", "结尾"]);
  assert.equal(sections[1].purpose, "");

  const markdown = writingOutlineMarkdown({
    title: "主题",
    sections,
    openQuestions: ["还缺什么案例？"]
  });

  assert.match(markdown, /^# 主题/);
  assert.match(markdown, /## 开头/);
  assert.match(markdown, /相关笔记：n1/);
  assert.match(markdown, /还缺什么案例/);
});

test("writing workbench model edits outline sections and syncs scaffold markdown", () => {
  const writingState = {
    project: { title: "主题" },
    scaffold: {
      sections: [
        { heading: "第一节", purpose: "旧目的" },
        { heading: "第二节", purpose: "" }
      ],
      open_questions: []
    },
    scaffoldMarkdown: ""
  };

  assert.equal(updateWritingOutlineSection(writingState, 0, "purpose", "新目的"), true);
  assert.match(writingState.scaffoldMarkdown, /新目的/);

  assert.equal(applyWritingOutlineAction(writingState, "down", 0), true);
  assert.deepEqual(writingState.scaffold.sections.map((section) => section.heading), ["第二节", "第一节"]);

  assert.equal(applyWritingOutlineAction(writingState, "add", 1), true);
  assert.equal(writingState.scaffold.sections.length, 3);

  assert.equal(applyWritingOutlineAction(writingState, "delete", 2), true);
  assert.equal(writingState.scaffold.sections.length, 2);

  const synced = syncWritingScaffoldMarkdown(writingState);
  assert.match(synced, /^# 主题/);
  assert.match(synced, /## 第二节/);
});

test("writing draft markdown keeps one generated footer across repeated saves", () => {
  const first = writingDraftMarkdown({
    markdown: "# 旧标题\n\n正文",
    title: "新标题",
    references: ["可写主题：p1", "文章提纲：s1"]
  });
  const second = writingDraftMarkdown({
    markdown: `${first}\n补充一句。`,
    title: "新标题",
    references: ["可写主题：p1", "文章提纲：s1"]
  });

  assert.match(second, /^# 新标题/);
  assert.equal((second.match(/可写主题：p1/g) || []).length, 1);
  assert.equal((second.match(/文章提纲：s1/g) || []).length, 1);
  assert.match(second, /补充一句。/);
});
