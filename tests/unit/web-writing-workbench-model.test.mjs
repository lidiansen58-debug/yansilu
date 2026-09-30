import test from "node:test";
import assert from "node:assert/strict";

import {
  applyWritingOutlineAction,
  normalizeWritingOutlineSections,
  syncWritingScaffoldMarkdown,
  updateWritingOutlineSection,
  writingDraftMarkdown,
  writingDraftContent,
  writingInitialDraftMarkdown,
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

test("initial article draft uses real section order and note titles without report metadata", () => {
  const scaffold = {
    sections: [
      { heading: "先检查反例", purpose: "说明适用条件。", evidence_note_ids: ["n2", "n2"], counterpoints: ["无反馈时无法判断。"] },
      { heading: "再组织写作", purpose: "用结构检验观点。", evidence_note_ids: ["n1"] }
    ],
    markdown: "## 就绪检查\nbasket_note_ids: n1,n2"
  };
  const markdown = writingInitialDraftMarkdown({ title: "如何检验理解", scaffold, notes: [{ id: "n1", title: "写作检验" }, { id: "n2", title: "用反例限定判断" }] });
  assert.match(markdown, /^# 如何检验理解/);
  assert.ok(markdown.indexOf("## 先检查反例") < markdown.indexOf("## 再组织写作"));
  assert.doesNotMatch(markdown, /说明适用条件|无反馈时无法判断/);
  assert.equal(scaffold.sections[0].purpose, "说明适用条件。");
  assert.deepEqual(scaffold.sections[0].counterpoints, ["无反馈时无法判断。"]);
  assert.equal((markdown.match(/\[\[用反例限定判断\]\]/g) || []).length, 1);
  assert.match(markdown, /\[\[写作检验\]\]/);
  assert.doesNotMatch(markdown, /就绪检查|basket_note_ids|n1|n2|段落-证据对照表/);
});

test("initial draft reports unavailable references without exposing internal IDs", () => {
  const markdown = writingInitialDraftMarkdown({ scaffold: { sections: [{ heading: "待核对", evidence_note_ids: ["missing-internal-id"] }] } });
  assert.match(markdown, /1 条来源暂时不可用，请回到提纲核对/);
  assert.doesNotMatch(markdown, /missing-internal-id/);
});

test("draft content preserves edited or saved prose and only generates for a new draft", () => {
  assert.equal(writingDraftContent({ writingState: { draftMarkdown: "未保存正文", project: { draft_note: { body: "旧正文" } } } }), "未保存正文");
  assert.equal(writingDraftContent({ writingState: { project: { draft_note: { body: "保存正文" } }, scaffold: { sections: [] } } }), "保存正文");
  assert.equal(writingDraftContent({ writingState: { scaffoldMarkdown: "内部报告" } }), "");
  assert.match(writingDraftContent({ writingState: { project: { title: "新文章" }, scaffold: { sections: [{ heading: "真实章节" }] }, scaffoldMarkdown: "内部报告" } }), /## 真实章节/);
});
