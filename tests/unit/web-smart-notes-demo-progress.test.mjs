import test from "node:test";
import assert from "node:assert/strict";

import { completePendingSmartNotesDemoRelation } from "../../apps/web/src/permanent-relation-composer-controller.js";
import { beginSmartNotesDemoPractice, completeSmartNotesDemoSavedDraft, completeSmartNotesDemoSavedJudgment, configureSmartNotesDemoProgress, smartNotesDemoCompletedStepsForState } from "../../apps/web/src/smart-notes-demo-practice-progress.js";
import { handleSaveNoteDistillationStateChange } from "../../apps/web/src/app-shell-distillation-state-actions.js";
import { handleWritingSaveDraftClick } from "../../apps/web/src/writing-draft-save-controller.js";

test("saved steps survive reload in the same vault, without saving unsaved practice text", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  const configure = (state, path) => configureSmartNotesDemoProgress(state, { getVaultPath: () => path, getStorage: () => storage });
  const state = {};
  configure(state, "E:\\Vault\\");
  const pending = beginSmartNotesDemoPractice(state, { key: "first-judgment", noteId: "note", baseline: "private baseline" });
  assert.equal(completeSmartNotesDemoSavedJudgment(state, { id: "note", thesis: "changed", distillationStatus: "confirmed" }, pending), true);
  beginSmartNotesDemoPractice(state, { key: "first-relation", noteId: "relation-source" });
  const reloaded = {};
  configure(reloaded, "e:/vault");
  assert.deepEqual(smartNotesDemoCompletedStepsForState(reloaded), ["first-judgment"]);
  assert.deepEqual(reloaded.smartNotesDemoPendingSteps, {});
  assert.equal([...values.values()].some((value) => value.includes("private baseline")), false);
});

test("progress is isolated by vault and late results cannot persist into another path", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  let path = "/vault-a";
  const state = { noteMoveVaultScope: 1 };
  configureSmartNotesDemoProgress(state, { getVaultPath: () => path, getStorage: () => storage });
  const pending = beginSmartNotesDemoPractice(state, { key: "first-judgment", noteId: "note", baseline: "before" });
  completeSmartNotesDemoSavedJudgment(state, { id: "note", thesis: "after", distillationStatus: "confirmed" }, pending);
  const late = beginSmartNotesDemoPractice(state, { key: "write-from-notes", projectId: "project", baseline: "# Article\nold" });
  path = "/vault-b";
  assert.equal(completeSmartNotesDemoSavedDraft(state, "project", "# Article\nnew", late), false);
  assert.deepEqual(smartNotesDemoCompletedStepsForState(state), []);
  path = "/vault-a";
  state.noteMoveVaultScope += 1;
  assert.deepEqual(smartNotesDemoCompletedStepsForState(state), ["first-judgment"]);
  path = "";
  assert.deepEqual(smartNotesDemoCompletedStepsForState(state), []);
  path = "/vault-a";
  assert.deepEqual(smartNotesDemoCompletedStepsForState(state), ["first-judgment"]);
});

test("damaged and restricted storage do not prevent in-session completion", () => {
  for (const storage of [
    { getItem: () => '{bad', setItem: () => { throw new Error("denied"); } },
    { getItem: () => '["first-judgment","unknown","first-judgment"]', setItem: () => {} }
  ]) {
    const state = {};
    configureSmartNotesDemoProgress(state, { getVaultPath: () => "/vault", getStorage: () => storage });
    const pending = beginSmartNotesDemoPractice(state, { key: "write-from-notes", projectId: "project", baseline: "old" });
    assert.equal(completeSmartNotesDemoSavedDraft(state, "project", "new", pending), true);
    assert.ok(smartNotesDemoCompletedStepsForState(state).includes("write-from-notes"));
    assert.ok(!smartNotesDemoCompletedStepsForState(state).includes("unknown"));
  }
});

test("saving the demo relation advances only the pending demo relation step", () => {
  const state = {
    smartNotesDemoCompletedSteps: ["first-judgment"], smartNotesDemoProgressScope: [undefined, undefined]
  };
  beginSmartNotesDemoPractice(state, { key: "first-relation", noteId: "PERM-UNLINKED-PRACTICE" });
  const relation = { id: "relation", rationale: "这条笔记补充了一个实际例子" };

  assert.equal(completePendingSmartNotesDemoRelation(state, "another-note", relation, relation.rationale), false);
  assert.deepEqual(state.smartNotesDemoCompletedSteps, ["first-judgment"]);

  assert.equal(completePendingSmartNotesDemoRelation(state, "PERM-UNLINKED-PRACTICE", relation, "新理由尚未保存"), false);
  assert.equal(completePendingSmartNotesDemoRelation(state, "PERM-UNLINKED-PRACTICE", relation, ""), false);
  assert.equal(completePendingSmartNotesDemoRelation(state, "PERM-UNLINKED-PRACTICE", relation, relation.rationale), true);
  assert.deepEqual(state.smartNotesDemoCompletedSteps, ["first-judgment", "first-relation"]);
  assert.equal(state.smartNotesDemoPendingSteps["first-relation"], undefined);
});

test("unchanged, empty, unconfirmed and unrelated viewpoints do not finish the demo task", () => {
  const state = {};
  const pending = beginSmartNotesDemoPractice(state, { key: "first-judgment", noteId: "note", baseline: "原观点" });
  for (const saved of [
    { id: "note", thesis: " 原观点 ", distillationStatus: "confirmed" },
    { id: "note", thesis: "", distillationStatus: "confirmed" },
    { id: "note", thesis: "自己的观点", distillationStatus: "draft" },
    { id: "other", thesis: "自己的观点", distillationStatus: "confirmed" }
  ]) assert.equal(completeSmartNotesDemoSavedJudgment(state, saved, pending), false);
  assert.deepEqual(state.smartNotesDemoCompletedSteps, []);
  assert.equal(completeSmartNotesDemoSavedJudgment(state, { id: "note", thesis: "自己的观点", distillation_status: "confirmed" }, pending), true);
});

test("a saved article title or whitespace change alone does not finish the writing task", () => {
  const state = {};
  const pending = beginSmartNotesDemoPractice(state, { key: "write-from-notes", projectId: "project", baseline: "# 示例\n\n示例内容" });
  for (const body of ["# 新标题\n\n示例内容", "# 示例\n\n示例内容   ", "# 空正文\n"]) assert.equal(completeSmartNotesDemoSavedDraft(state, "project", body, pending), false);
  assert.equal(completeSmartNotesDemoSavedDraft(state, "other", "# 示例\n\n自己的解释", pending), false);
  assert.equal(completeSmartNotesDemoSavedDraft(state, "project", "# 示例\n\n自己的解释", pending), true);
});

test("reopening retains the original baseline; changing vault discards old progress and pending operations", () => {
  const state = { noteMoveVaultScope: "a" };
  const pending = beginSmartNotesDemoPractice(state, { key: "first-judgment", noteId: "note", baseline: "原观点" });
  assert.equal(beginSmartNotesDemoPractice(state, { key: "first-judgment", noteId: "note", baseline: "现在的观点" }), pending);
  state.noteMoveVaultScope = "b";
  assert.equal(completeSmartNotesDemoSavedJudgment(state, { id: "note", thesis: "新观点", distillationStatus: "confirmed" }, pending), false);
  assert.deepEqual(smartNotesDemoCompletedStepsForState(state), []);
  beginSmartNotesDemoPractice(state, { key: "first-relation", noteId: "note" });
  assert.equal(state.smartNotesDemoPendingSteps["first-judgment"], undefined);
  assert.deepEqual(state.smartNotesDemoCompletedSteps, []);
});

for (const failing of [false, true]) test(`viewpoint save ${failing ? "failure keeps" : "success advances"} the pending task`, async () => {
  const state = { notes: [{ id: "note", thesis: "原观点" }] };
  beginSmartNotesDemoPractice(state, { key: "first-judgment", noteId: "note", baseline: "原观点" });
  await handleSaveNoteDistillationStateChange({ noteId: "note", thesis: "自己的判断", distillationStatus: "confirmed" }, {
    state, updatePermanentNoteDistillation: async () => { if (failing) throw new Error("模拟失败"); return { id: "note", thesis: "自己的判断" }; },
    confirmPermanentNoteDistillation: async () => ({ id: "note", thesis: "自己的判断", distillationStatus: "confirmed" })
  });
  assert.deepEqual(smartNotesDemoCompletedStepsForState(state), failing ? [] : ["first-judgment"]);
});

for (const failing of [false, true]) test(`draft save ${failing ? "failure keeps" : "success advances"} the pending task`, async () => {
  const state = { notes: [] }, editor = { value: "# 示例\n\n用户写的新段落" };
  beginSmartNotesDemoPractice(state, { key: "write-from-notes", projectId: "project", baseline: "# 示例\n\n原正文" });
  const writingState = { project: { id: "project", draft_note_id: "draft" }, scaffold: { id: "outline" }, scaffoldMarkdown: "真实提纲" };
  await handleWritingSaveDraftClick({ state, writingState, $: (id) => id === "writingDraftEditor" ? editor : null,
    writingDraftBody: () => editor.value, writingDraftTitle: () => "示例", updateNote: async (id, payload) => { if (failing) throw new Error("模拟失败"); return { id, ...payload }; }
  });
  assert.deepEqual(smartNotesDemoCompletedStepsForState(state), failing ? [] : ["write-from-notes"]);
});
