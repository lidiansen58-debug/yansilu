import test from "node:test";
import assert from "node:assert/strict";
import { buildWritingStrongModelRequest, mergeWritingStrongModelResponse } from "../../packages/ai-orchestrator/src/writing-analysis.mjs";
import { buildSourceNoteDistillDraftFromAiResult } from "../../apps/web/src/source-note-distill-ai-draft.js";

const input = { privacyMode: "local_only", analysisFocus: "source_distill", writingGoal: "从材料中形成可编辑观点。",
  notes: [{ noteId: "source_1", body: "用自己的语言解释概念可以检验理解。熟悉原文不等于能说明因果。" }] };
const response = { draft: { title: "解释比熟悉更能检验理解", coreArgument: "判断自己是否理解，应试着说明概念而不只是辨认原句。",
  content: "能说明因果，才暴露出自己的理解是否完整。", questions: "是否适用于初次学习？", sourceNoteIds: ["source_1"], evidenceQuote: "熟悉原文不等于能说明因果。" } };

test("source distillation uses a grounded editable draft contract rather than an article outline", () => {
  const request = buildWritingStrongModelRequest(input);
  assert.equal(JSON.parse(request.messages[1].content).task, "source_note_distillation");
  assert.deepEqual(Object.keys(request.responseContract), ["draft"]);
  const result = mergeWritingStrongModelResponse(request, response);
  assert.deepEqual(result.sourceDistillDraft, response.draft);
  assert.equal(result.summary.outlineDraftCount, 0);
  assert.equal(result.provenance.canAutoConfirm, false);
  const preview = buildSourceNoteDistillDraftFromAiResult({ result });
  assert.equal(preview.draft.coreArgument, response.draft.coreArgument);
  assert.match(preview.draft.content, /依据原文：熟悉原文/);
  assert.equal(preview.requiresConfirmation, true);
  assert.equal(preview.autoWrite, false);
});

test("incomplete or invented source drafts cannot become model-generated viewpoints", () => {
  const request = buildWritingStrongModelRequest(input);
  for (const change of [{ coreArgument: "" }, { content: "" }, { questions: null }, { evidenceQuote: "杜撰的事实" }, { sourceNoteIds: ["invented"] }]) {
    assert.throws(() => mergeWritingStrongModelResponse(request, { draft: { ...response.draft, ...change } }));
  }
  assert.throws(() => mergeWritingStrongModelResponse(request, { draft: null }));
  assert.throws(() => mergeWritingStrongModelResponse(request, { writingMoves: [] }));
  assert.throws(() => buildWritingStrongModelRequest({ ...input, notes: [] }));
});
