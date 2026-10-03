import test from "node:test";
import assert from "node:assert/strict";
import { beginSourceDistillRequest, cancelSourceDistillRequest } from "../../apps/web/src/source-distill-request.js";
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { renderSourceNotePromotionPanel } from "../../apps/web/src/source-note-promotion-panel.js";

test("source cancellation aborts transport, ignores a late result and permits retry", async () => {
  const pane = Object.create(EditorPane.prototype);
  pane.state = {}; pane.els = {};
  pane.activeNote = () => ({ id: "fn_cancel", title: "材料" });
  pane.isOriginalRecordableSource = () => true;
  pane.resolvedNoteType = () => "fleeting";
  pane.getEditorValue = () => "来源正文";
  pane.clearPendingContextualAiAction = () => {};
  pane.onStatus = () => {};
  let complete, entered, signal;
  const started = new Promise(resolve => { entered = resolve; });
  pane.onStateChange = async (reason, payload) => {
    if (reason === "ensure-ai-ready-for-feature") return { ready: true };
    signal = payload.signal;
    entered();
    return new Promise(resolve => { complete = resolve; });
  };
  const running = pane.runSourceDistillAction();
  await started;
  assert.equal(pane.sourceDistillAiState.cancellable, true);
  cancelSourceDistillRequest(pane);
  assert.equal(signal.aborted, true);
  complete({ kind: "draft", draft: { title: "晚到草稿" } });
  assert.equal(await running, false);
  assert.equal(pane.sourceDistillAiState.cancelled, true);
  assert.equal(pane.sourceDistillAiState.result, null);
  const html = renderSourceNotePromotionPanel({ note: pane.activeNote(), noteType: "fleeting", aiActionState: pane.sourceDistillAiState });
  assert.match(html, /已取消/);
  assert.match(html, /重试提炼/);
  pane.onStateChange = async reason => reason === "ensure-ai-ready-for-feature" ? { ready: true } : { kind: "draft", draft: { title: "新草稿" } };
  assert.equal(await pane.runSourceDistillAction(), true);
  assert.equal(pane.sourceDistillAiState.result.draft.title, "新草稿");
});

test("a replacement source request aborts the previous transport", () => {
  const pane = {};
  const first = beginSourceDistillRequest(pane);
  const second = beginSourceDistillRequest(pane);
  assert.equal(first.controller.signal.aborted, true);
  assert.equal(second.controller.signal.aborted, false);
});
