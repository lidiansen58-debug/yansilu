import test from "node:test";
import assert from "node:assert/strict";
import { mergeDistillationText, reconcileDistillationTab, mapDistillationSelection } from "../../apps/web/src/distillation-body-merge.js";
import { syncDistillationEditorResult } from "../../apps/web/src/distillation-editor-result.js";

test("disjoint replacements and insertions merge in either order", () => {
  assert.equal(mergeDistillationText("abc def ghi", "abc DEF ghi", "abc def GHI"), "abc DEF GHI");
  assert.equal(mergeDistillationText("abc def ghi", "abc def GHI", "abc DEF ghi"), "abc DEF GHI");
  assert.equal(mergeDistillationText("abc", "Xabc", "abcY"), "XabcY");
  assert.equal(mergeDistillationText("abc", "ac", "abcY"), "acY");
});

test("inserting a confirmed viewpoint keeps the caret and selected prose on the same user text", () => {
  const before = "# 笔记\n\n原文。\n\n我正在写的段落。";
  const after = before.replace("\n\n原文", "\n\n## 提炼观点\n\n新的判断。\n\n原文");
  const start = before.indexOf("我正在写"), end = before.length;
  const mapped = mapDistillationSelection(before, after, { from: start, to: end });
  assert.equal(after.slice(mapped.from, mapped.to), before.slice(start, end));
  assert.deepEqual(mapDistillationSelection(before, after, { from: end, to: end }), { from: after.length, to: after.length });
  assert.deepEqual(mapDistillationSelection(before, after, { from: 2, to: 4 }), { from: 2, to: 4 });
});

test("overlapping and ambiguous edits are not guessed", () => {
  assert.equal(mergeDistillationText("abc", "axc", "ayc"), null);
  assert.equal(mergeDistillationText("abc", "abcX", "abcY"), null);
  assert.equal(mergeDistillationText(undefined, "local", "remote"), null);
  assert.equal(mergeDistillationText("abc", "abc", "xyz"), "xyz");
  assert.equal(mergeDistillationText("abc", "xyz", "xyz"), "xyz");
});

test("editor reconciliation does not roll back a newer ordinary save baseline", () => {
  const baseline = { body: "old", savedBody: "old", title: "Old", savedTitle: "Old", savedFileRevision: "old" };
  const tab = { body: "newer", savedBody: "newer", title: "Newer", savedTitle: "Newer", savedFileRevision: "newer", dirty: false };
  const before = structuredClone(tab);
  syncDistillationEditorResult({ activeTab: () => tab, getEditorValue: () => "newer",
    fillEditorFromTab: () => assert.fail("A newer save owns the editor") }, {
    body: "remote", title: "Remote", fileRevision: "remote", distillationEditorBaseline: baseline
  }, "old");
  assert.deepEqual(tab, before);
});

test("two different title renames conflict rather than inventing a combined title", () => {
  const baseline = { savedBody: "body", savedTitle: "ABC XYZ", savedFileRevision: "old" };
  const tab = { body: "body", title: "DEF XYZ", ...baseline };
  assert.equal(reconcileDistillationTab(tab, { body: "body", title: "ABC UVW", fileRevision: "new" }, baseline), false);
  assert.equal(tab.title, "DEF XYZ");
  assert.equal(tab.savedFileRevision, "old");
});
