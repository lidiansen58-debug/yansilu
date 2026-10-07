import test from "node:test";
import assert from "node:assert/strict";
import { literatureCitationReadiness, literatureSourceCompletion } from "../../apps/web/src/literature-source-readiness.js";
import { EditorPane, parseLiteratureWorkspace } from "../../apps/web/src/components-editor-pane.js";
import { literatureQueueLaneForNote } from "../../apps/web/src/prototype-literature-queue.js";

test("a traceable source needs a title and location or link, not academic metadata", () => {
  for (const citation of [{ sourceTitle: "书", locator: "第二章" }, { sourceTitle: "文章", identifier: "article.md" }]) {
    assert.equal(literatureCitationReadiness(citation).complete, true);
  }
  assert.deepEqual(literatureCitationReadiness({}).missingLabels, ["来源标题", "页码、章节或链接"]);
  assert.equal(literatureCitationReadiness({ sourceTitle: " ", locator: "页" }).complete, false);
  assert.equal(literatureCitationReadiness({ sourceTitle: "书", authors: "甲", year: "2026" }).complete, false);
});

test("forming a judgment is the next step, not an extra prerequisite for preparing a source", () => {
  const fields = { citation: { sourceTitle: "书", locator: "第二章" }, originalText: "原文", paraphrase: "自己的理解" };
  const ready = literatureSourceCompletion(fields);
  assert.equal(ready.readyForOriginal, true);
  assert.equal(ready.hasJudgmentSeed, false);
  assert.equal(ready.hasQuestion, false);
  assert.equal(ready.lane, "ready");
  assert.equal(ready.status, "draft");
  assert.equal(literatureSourceCompletion(fields, { status: "active" }).status, "active");
  assert.equal(literatureSourceCompletion({ ...fields, originalText: "" }).readyForOriginal, false);
  assert.equal(literatureSourceCompletion({ ...fields, paraphrase: "" }).lane, "pending");
  assert.equal(literatureSourceCompletion({ ...fields, citation: {} }).lane, "refine");
});

test("new and legacy source headings parse without rewriting original metadata or text", () => {
  const modern = "# 文章记录\n\n## 出处\n\n- 标题：文章甲\n- 链接 / 文件：https://example.test/article\n\n## 原文\n\n原文甲\n\n## 我的理解\n\n理解甲";
  const legacy = "# 文章记录\n\n## 引用信息\n\n- 标题：文章甲\n- 作者：作者甲\n- 年份：2026\n- 页码 / 定位：第二章\n- DOI / ISBN / arXiv / URL / PDF：doi:123\n\n## 原文\n\n原文甲\n\n## 转述\n\n理解甲\n\n## 判断种子\n\n旧想法";
  const parsed = parseLiteratureWorkspace(modern);
  assert.equal(parsed.citation.identifier, "https://example.test/article");
  assert.equal(parsed.paraphrase, "理解甲");
  assert.equal(parsed.originalText, "原文甲");
  const old = parseLiteratureWorkspace(legacy);
  assert.equal(old.citation.authors, "作者甲");
  assert.equal(old.citation.year, "2026");
  assert.equal(old.citation.identifier, "doi:123");
  assert.equal(old.supportsJudgment, "旧想法");
  const note = { body: modern, status: "draft" };
  const pane = Object.create(EditorPane.prototype);
  pane.isLiteratureWorkspaceActive = () => false;
  pane.parseLiteratureBody = parseLiteratureWorkspace;
  pane.hasGeneratedOriginal = () => false;
  assert.equal(pane.literatureCompletionState(note).readyForOriginal, true);
  assert.equal(pane.literatureQueueRecord(note).lane, "ready");
  assert.equal(literatureQueueLaneForNote(note, { parseLiteratureWorkspace }), "ready");
});

test("empty sections cannot absorb the next heading as original text or understanding", () => {
  for (const body of ["# 空材料\n\n## 出处\n\n## 原文\n\n\n## 我的理解", "# 空材料\n## 出处\n## 原文\n## 我的理解\n"]) {
    const parsed = parseLiteratureWorkspace(body);
    assert.equal(parsed.originalText, "");
    assert.equal(parsed.paraphrase, "");
    assert.equal(literatureSourceCompletion(parsed).readyForOriginal, false);
  }
});
