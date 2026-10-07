import test from "node:test";
import assert from "node:assert/strict";
import { originalDraftBodyFromSource } from "../../apps/web/src/source-permanent-note-template.js";

test("source viewpoint draft retains citation and a stable labeled source link without duplicate prompts", () => {
  const body = originalDraftBodyFromSource({
    sourceType: "literature",
    sourceTitle: "真实文献",
    sourceNoteId: "lit-internal-id",
    paraphrase: "我的转述",
    supportsJudgment: "来源的判断",
    question: "哪些情况不适用？",
    boundary: "仅适用于有反馈的练习。",
    whyKeep: "用于检查学习方法。",
    citation: { authors: "作者甲", year: "2024", locator: "第 12 页", identifier: "https://example.test/source" }
  });
  assert.match(body, /来源：\[\[lit-internal-id\|真实文献\]\]/);
  assert.match(body, /作者甲/);
  assert.match(body, /第 12 页/);
  assert.match(body, /https:\/\/example.test\/source/);
  assert.match(body, /仅适用于有反馈的练习/);
  assert.match(body, /来源中的判断：来源的判断/);
  assert.match(body, /待回答：哪些情况不适用/);
  assert.equal((body.match(/^## 相关笔记$/gm) || []).length, 1);
  assert.doesNotMatch(body, /来源笔记 ID|原文摘录与证据链仍|已有用户转述仍/);
});

test("fleeting source draft keeps the original record and source link without copying it as the claim", () => {
  const body = originalDraftBodyFromSource({ sourceType: "fleeting", sourceTitle: "随手记", sourceNoteId: "internal", sourceBody: "# 随手记\n\n只有重读还不能检验理解。" });
  assert.match(body, /来源：\[\[internal\|随手记\]\]/);
  assert.match(body, /原始记录：\n\n只有重读还不能检验理解/);
  assert.match(body, /## 核心观点\n\n用自己的话/);
  assert.doesNotMatch(body, /来源笔记 ID/);
});

test("source draft preserves custom template content instead of deleting user prompts", () => {
  const body = originalDraftBodyFromSource({ sourceTitle: "材料", sourceBody: "内容" }, {
    permanentNoteTemplateBody: () => "# 自定\n\n## 核心观点\n\n自定提示\n\n## 自定栏目\n\n保留内容"
  });
  assert.match(body, /自定提示/);
  assert.match(body, /## 自定栏目\n\n保留内容/);
  assert.match(body, /\[\[材料\]\]/);
});

test("fleeting draft uses the user's title instead of turning a long paragraph into a title", () => {
  const excerpt = "我今天试着合上书解释其中一个观点，发现自己记住了结论，却没有记住作者讨论这个结论时限定的条件。";
  const body = originalDraftBodyFromSource({
    sourceType: "fleeting", sourceTitle: "解释后再核对", sourceNoteId: "material-1",
    sourceBody: `# 解释后再核对\n\n${excerpt}`
  });
  assert.equal(body.split("\n")[0], "# 解释后再核对");
  assert.ok(body.includes(excerpt), "The full original record is retained, not shortened with the title");
  assert.match(body, /\[\[material-1\|解释后再核对\]\]/);
});

test("an untitled source can still seed a draft title without copying it as the judgment", () => {
  const body = originalDraftBodyFromSource({
    sourceType: "fleeting", sourceTitle: "未命名笔记", sourceBody: "# 未命名笔记\n\n合上书解释一次。"
  });
  assert.equal(body.split("\n")[0], "# 合上书解释一次。");
  assert.match(body, /## 核心观点\n\n用自己的话/);
});
