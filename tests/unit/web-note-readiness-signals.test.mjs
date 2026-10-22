import test from "node:test";
import assert from "node:assert/strict";
import { noteHasBoundarySignal, noteHasConfirmedViewpoint, writingNoteEligibility } from "../../apps/web/src/note-readiness-signals.js";
import { noteHasBoundarySignal as writingBoundary } from "../../apps/web/src/writing-readiness.js";
import { noteHasBoundarySignal as editorBoundary } from "../../apps/web/src/editor-template-workspace.js";
import { defaultPermanentTemplateSource, legacyPermanentTemplateSource } from "../../apps/web/src/prototype-note-templates.js";

test("all frontend boundary consumers share the same rule", () => {
  assert.equal(writingBoundary, noteHasBoundarySignal);
  assert.equal(editorBoundary, noteHasBoundarySignal);
});

test("empty boundary headings and supplied template questions are not completed boundaries", () => {
  for (const body of [
    "## 边界 / 反例\n\n",
    "## 边界 / 反例\n\n## 相关笔记\n\n已有一条笔记。",
    "## Boundary\n\n> TODO\n- [ ]\n",
    defaultPermanentTemplateSource(),
    legacyPermanentTemplateSource(),
    "## 边界 / 反例\n\n它在哪些条件下不成立？还有什么需要验证？"
  ]) assert.equal(noteHasBoundarySignal({ body }), false, body);
});

test("structured boundary prompts and incomplete placeholders are not substantive", () => {
  for (const boundaryOrCounterpoint of [
    "## 边界 / 反例", "它在哪些条件下不成立？", "这条判断在什么条件下不成立？",
    "它在哪些条件下不成立？还有什么需要验证？", "待补充", "________", "在________条件下成立"
  ]) assert.equal(noteHasBoundarySignal({ boundaryOrCounterpoint }), false, boundaryOrCounterpoint);
});

test("punctuation and emphasis do not turn empty boundary labels into authored conditions", () => {
  for (const label of [
    "边界：", "反例：", "边界 / 反例：", "**边界 / 反例：**", "- **反例:**",
    "> **边界：**", "Boundary:", "**Boundary / counterexample:**", "反例。"
  ]) {
    assert.equal(noteHasBoundarySignal({ boundaryOrCounterpoint: label }), false, `field: ${label}`);
    assert.equal(noteHasBoundarySignal({ body: label }), false, `body: ${label}`);
  }
});

test("boundary labels preserve actual inline and section conditions", () => {
  for (const body of [
    "边界：仅用于已经复核过来源的研究。",
    "**边界 / 反例：**仅用于已经复核过来源的研究。",
    "反例：小样本观察不足以推导所有用户的行为。",
    "## **边界 / 反例：**\n\n仅用于已经复核过来源的研究。",
    "### Boundary:\n\nOnly applies to verified sources."
  ]) assert.equal(noteHasBoundarySignal({ body }), true, body);
  assert.equal(noteHasBoundarySignal({ boundaryOrCounterpoint: "**边界 / 反例：**仅用于已复核来源。" }), true);
});

test("boundary section contents count without repeating the heading label", () => {
  assert.equal(noteHasBoundarySignal({ body: "## 边界 / 反例\n\n只适用于已经复核过来源的研究。" }), true);
  assert.equal(noteHasBoundarySignal({ body: "### Boundary\n\nOnly applies to verified sources." }), true);
  assert.equal(noteHasBoundarySignal({ body: "适用边界：这个判断不适用于只剩摘录、还没有转述的材料。" }), true);
  assert.equal(noteHasBoundarySignal({ boundary_or_counterpoint: "只有长期观察支持时才成立。" }), true);
});

test("boundary metadata comments and code examples do not complete a note", () => {
  assert.equal(noteHasBoundarySignal({ body: "---\nstatus: boundary_review\n---\n正文。\n<!-- 边界已经填好 -->\n```md\n反例：这是代码示例。\n```" }), false);
  assert.equal(noteHasBoundarySignal({ body: "## 边界\n\n~~~text\n只是示例。\n~~~\n## 其他内容\n\n普通内容。" }), false);
});

test("a confirmed viewpoint needs exactly three completed lines and the real confirmation state", () => {
  const note = { thesis: "练习需要反馈", threeLineSummary: ["观点", "理由", "用途"], distillationStatus: "confirmed" };
  assert.equal(noteHasConfirmedViewpoint(note), true);
  for (const patch of [
    { thesis: " " }, { threeLineSummary: ["观点", "理由", " "] },
    { threeLineSummary: ["观点", "理由", "用途", "第四句"] },
    { distillationStatus: "draft" }, { distillationStatus: "approved" }, { distillationStatus: "complete" }, { distillationStatus: "" }
  ]) assert.equal(noteHasConfirmedViewpoint({ ...note, ...patch }), false, JSON.stringify(patch));
  assert.equal(noteHasConfirmedViewpoint({ thesis: note.thesis, three_line_summary: note.threeLineSummary, distillation_status: "confirmed" }), true);
});

test("writing eligibility keeps author confirmation and originality separate from viewpoint maturity", () => {
  const note = { noteType: "permanent", status: "active", authorship: { user_confirmed: true } };
  assert.equal(writingNoteEligibility(note).ok, true);
  assert.equal(noteHasConfirmedViewpoint(note), false);
  assert.equal(writingNoteEligibility(null).key, "missing");
  assert.equal(writingNoteEligibility({ ...note, noteType: "fleeting" }).key, "type");
  assert.equal(writingNoteEligibility({ ...note, authorship: { user_confirmed: false } }).key, "authorship");
  assert.equal(writingNoteEligibility({ ...note, status: "draft" }).key, "draft");
  assert.equal(writingNoteEligibility({ ...note, noteType: "original", folderId: "legacy-root" }, {
    isDirectoryUnderOriginalRoot: id => id === "legacy-root"
  }).ok, true);
});
