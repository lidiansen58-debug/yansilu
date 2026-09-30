import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { buildSmartNotesDemoWalkthrough, SMART_NOTES_SHORT_PRACTICE_STEPS } from "../../apps/web/src/beginner-onboarding-flow.js";
import { openShortPracticeWriting } from "../../apps/web/src/smart-notes-practice-writing-entry.js";
import { beginSmartNotesDemoPractice, completeSmartNotesDemoSavedJudgment, completeSmartNotesDemoExport } from "../../apps/web/src/smart-notes-demo-practice-progress.js";

test("short guide isolates its six real-result steps from the legacy walkthrough", () => {
  const flow = buildSmartNotesDemoWalkthrough({ notes: [{ id: "GUIDE-SHORT-PRACTICE" }, ...SMART_NOTES_SHORT_PRACTICE_STEPS.map(step => ({ id: step.targetNoteId }))], completedSteps: ["first-judgment", "first-relation", "write-from-notes"] });
  assert.equal(flow.steps.length, 6);
  assert.equal(flow.completedCount, 0);
  assert.equal(flow.activeStepKey, "practice-explain");
});

test("three independent saved judgments and a confirmed export advance only their own steps", () => {
  const state = {};
  for (const step of SMART_NOTES_SHORT_PRACTICE_STEPS.slice(0, 3)) {
    const pending = beginSmartNotesDemoPractice(state, { key: step.key, noteId: step.targetNoteId });
    assert.equal(completeSmartNotesDemoSavedJudgment(state, { id: "other", thesis: "判断", distillationStatus: "confirmed" }, pending), false);
    assert.equal(completeSmartNotesDemoSavedJudgment(state, { id: step.targetNoteId, thesis: "自己的判断", distillationStatus: "confirmed" }, pending), true);
  }
  const pending = beginSmartNotesDemoPractice(state, { key: "practice-export", projectId: "p" });
  for (const result of [{ status: "queued" }, { status: "completed" }]) assert.equal(completeSmartNotesDemoExport(state, "p", result, pending), false);
  assert.equal(completeSmartNotesDemoExport(state, "other", { status: "completed", articlePath: "/a.md" }, pending), false);
  assert.equal(completeSmartNotesDemoExport(state, "p", { status: "completed", articlePath: "/a.md" }, pending), true);
});

function setup({ scaffold = false, confirmed = true } = {}) {
  const ids = ["a", "b", "c"], calls = [];
  const state = { module: "writing", notes: ids.map(id => ({ id, thesis: "自己的判断", distillationStatus: confirmed ? "confirmed" : "draft" })) };
  const writingState = { project: { id: "p", basket_note_ids: ids, scaffold_id: scaffold ? "s" : null } };
  const deps = { state, writingState, continueWritingProjectEntry: async (_id, options) => { calls.push(["open", options]); return writingState.project; }, createDraftScaffold: async () => { calls.push(["create"]); writingState.project = { ...writingState.project, scaffold_id: "s" }; return { item: { id: "s" } }; } };
  return { deps, calls };
}

test("first writing entry generates once after own judgments; reopening preserves existing outline", async () => {
  const { deps, calls } = setup();
  const result = await openShortPracticeWriting("p", deps);
  assert.equal(result.scaffold_id, "s");
  assert.equal(calls.filter(call => call[0] === "create").length, 1);
  await openShortPracticeWriting("p", deps);
  assert.equal(calls.filter(call => call[0] === "create").length, 1);
  await openShortPracticeWriting("p", deps, { exportStep: true });
  assert.equal(calls.at(-1)[1].openDraft, true);
});

test("unconfirmed judgment and failed creation cannot manufacture a writing result", async () => {
  const { deps, calls } = setup({ confirmed: false });
  await assert.rejects(openShortPracticeWriting("p", deps), /三个自己的判断/);
  assert.equal(calls.some(call => call[0] === "create"), false);
  deps.state.notes.forEach(note => { note.distillationStatus = "confirmed"; });
  deps.createDraftScaffold = async () => { throw new Error("failed"); };
  await assert.rejects(openShortPracticeWriting("p", deps), /failed/);
  assert.equal(deps.writingState.project.scaffold_id, null);
});

test("duplicate entry shares one request; late scaffold after switching vault is not reopened", async () => {
  const { deps, calls } = setup();
  let resolve;
  deps.createDraftScaffold = () => new Promise(done => { resolve = done; });
  const first = openShortPracticeWriting("p", deps);
  assert.equal(openShortPracticeWriting("p", deps), first);
  await new Promise(done => setImmediate(done));
  deps.state.noteMoveVaultScope = "new";
  resolve({ item: { id: "s" } });
  assert.equal(await first, null);
  assert.equal(calls.length, 1);
});

test("desktop runtime includes the new data dependency and judgment entry exposes the form", async () => {
  const prepare = await fs.readFile(new URL("../../scripts/prepare-desktop-api-runtime.mjs", import.meta.url), "utf8");
  assert.match(prepare, /\["seed-smart-notes-product-thinking.mjs", "smart-notes-short-practice.mjs"\]/);
  const app = await fs.readFile(new URL("../../apps/web/src/prototype-app.js", import.meta.url), "utf8");
  assert.match(app, /if \(options.focusDistillation\) \{\s*state.inspectorVisible = true;\s*editor\?\.setInspectorVisible\?\.\(true\);\s*editor\?\.activatePermanentWorkspaceTab\?\.\("viewpoint"\)/);
});
