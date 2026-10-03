import test from "node:test";
import assert from "node:assert/strict";
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { cancelRelationAnalysisRequest } from "../../apps/web/src/note-analysis-request.js";

test("closing during dirty-note save prevents AI preparation and duplicate saves", async () => {
  let finishSave;
  let saves = 0;
  let prepares = 0;
  const { pane } = analysisPane(() => assert.fail("cancelled save must not start analysis"));
  const tab = { body: "Draft", dirty: true };
  pane.activeTab = () => tab;
  pane.saveActiveNote = () => {
    saves++;
    return new Promise(resolve => { finishSave = resolve; });
  };
  pane.onStateChange = async () => { prepares++; return { ready: true }; };
  const pending = pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  const duplicate = pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(saves, 1);
  assert.equal(pane.noteAiSuggestionsState.loading, true);
  assert.equal(cancelRelationAnalysisRequest(pane), true);
  tab.dirty = false;
  finishSave(true);
  await pending;
  await duplicate;
  assert.equal(prepares, 0);
  assert.equal(pane.noteAnalysisRequest, null);
  assert.equal(pane.noteAiSuggestionsState.loading, false);
});

test("editing during dirty-note save discards analysis before provider preparation", async () => {
  let finishSave;
  let prepares = 0;
  const { pane } = analysisPane(() => assert.fail("changed draft must not be analyzed"));
  const tab = { body: "Before", dirty: true };
  pane.activeTab = () => tab;
  pane.saveActiveNote = () => new Promise(resolve => { finishSave = resolve; });
  pane.onStateChange = async () => { prepares++; return { ready: true }; };
  const pending = pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  tab.body = "Edited while saving";
  finishSave(true);
  await pending;
  assert.equal(prepares, 0);
  assert.equal(pane.noteAnalysisRequest, null);
  assert.equal(pane.noteAiSuggestionsState.loading, false);
});

test("failed dirty-note save releases the AI request and allows retry", async () => {
  let saves = 0;
  let analyses = 0;
  const { pane } = analysisPane(() => { analyses++; return { analysis: {}, reviewItems: {} }; });
  const tab = { body: "Draft", dirty: true };
  pane.activeTab = () => tab;
  pane.saveActiveNote = async () => {
    if (++saves === 1) return false;
    tab.dirty = false;
    return true;
  };
  await pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  assert.equal(pane.noteAnalysisRequest, null);
  assert.equal(pane.noteAiSuggestionsState.loading, false);
  await pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  assert.equal(saves, 2);
  assert.equal(analyses, 1);
});

test("dirty-note save exception stays visible and unlocks retry without running AI", async () => {
  let saves = 0;
  let analyses = 0;
  const { pane, statuses } = analysisPane(() => { analyses++; return { analysis: {}, reviewItems: {} }; });
  const tab = { body: "Draft", dirty: true };
  pane.activeTab = () => tab;
  pane.saveActiveNote = async () => {
    if (++saves === 1) throw new Error("Disk full");
    tab.dirty = false;
    return true;
  };
  await pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  assert.equal(analyses, 0);
  assert.equal(pane.noteAnalysisRequest, null);
  assert.equal(pane.noteAiSuggestionsState.loading, false);
  assert.match(pane.permanentRelationWorkspaceState.error, /Disk full/);
  assert.match(statuses.at(-1).message, /Disk full/);
  await pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  assert.equal(analyses, 1);
});

test("successful save normalization establishes the persisted analysis snapshot", async () => {
  let analyses = 0;
  const { pane } = analysisPane(() => { analyses++; return { analysis: {}, reviewItems: {} }; });
  const tab = { body: "Unformatted draft", dirty: true };
  pane.activeTab = () => tab;
  pane.saveActiveNote = async () => {
    tab.body = "Normalized saved draft";
    tab.savedBody = tab.body;
    tab.dirty = false;
  };
  await pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  assert.equal(analyses, 1);
  assert.equal(pane.noteAnalysisRequest.body, tab.savedBody);
});

test("void save result with an unsaved tab never starts provider preparation", async () => {
  let prepares = 0;
  const { pane, statuses } = analysisPane(() => assert.fail("unsaved draft must not be analyzed"));
  pane.activeTab = () => ({ body: "Draft", dirty: true });
  pane.saveActiveNote = async () => {};
  pane.onStateChange = async () => { prepares++; return { ready: true }; };
  await pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  assert.equal(prepares, 0);
  assert.equal(pane.noteAnalysisRequest, null);
  assert.equal(pane.noteAiSuggestionsState.loading, false);
  assert.match(statuses.at(-1).message, /笔记尚未保存/);
});

test("cancelled save completion cannot clear a newer analysis request", async () => {
  const finishSaves = [];
  let analyses = 0;
  const { pane } = analysisPane(() => { analyses++; return { analysis: {}, reviewItems: {} }; });
  const tab = { body: "Draft", dirty: true };
  pane.activeTab = () => tab;
  pane.saveActiveNote = () => new Promise(resolve => { finishSaves.push(resolve); });
  const oldRun = pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  cancelRelationAnalysisRequest(pane);
  const newRun = pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  const currentRequest = pane.noteAnalysisRequest;
  finishSaves[0](true);
  await oldRun;
  assert.equal(pane.noteAnalysisRequest, currentRequest);
  assert.equal(currentRequest.controller.signal.aborted, false);
  assert.equal(pane.noteAiSuggestionsState.loading, true);
  tab.dirty = false;
  finishSaves[1](true);
  await newRun;
  assert.equal(analyses, 1);
});

test("closing relation recommendations aborts transport and discards late analysis", async () => {
  let finish;
  let signal;
  const { pane, statuses } = analysisPane(payload => {
    signal = payload.signal;
    return new Promise(resolve => { finish = resolve; });
  });
  const pending = pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  await new Promise(resolve => setImmediate(resolve));
  pane.noteAiSuggestionsState.loading = false;
  cancelRelationAnalysisRequest(pane);
  assert.equal(signal.aborted, true);
  assert.equal(pane.noteAiSuggestionsState.loading, false);
  const statusCount = statuses.length;
  finish({ analysis: {}, reviewItems: { artifacts: [{ id: "late" }] } });
  await pending;
  assert.equal(pane.noteAiAnalysisByNoteId.size, 0);
  assert.equal(statuses.length, statusCount);
});

test("analysis for an inactive note never enters the editor cache", async () => {
  let finish;
  const { pane } = analysisPane(() => new Promise(resolve => { finish = resolve; }));
  const pending = pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  await new Promise(resolve => setImmediate(resolve));
  pane.isActiveNoteId = () => false;
  finish({ analysis: {}, reviewItems: {} });
  await pending;
  assert.equal(pane.noteAiAnalysisByNoteId.size, 0);
});

test("editing during analysis discards stale results and unlocks retry", async () => {
  let finish;
  const { pane } = analysisPane(() => new Promise(resolve => { finish = resolve; }));
  const tab = { body: "Before", dirty: false };
  pane.activeTab = () => tab;
  const pending = pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  await new Promise(resolve => setImmediate(resolve));
  tab.body = "After";
  finish({ analysis: {}, reviewItems: {} });
  await pending;
  assert.equal(pane.noteAiAnalysisByNoteId.size, 0);
  assert.equal(pane.noteAiSuggestionsState.loading, false);
  assert.equal(pane.noteAnalysisRequest, null);
});

test("closing while preparing AI prevents later provider execution", async () => {
  let finish;
  let calls = 0;
  const { pane } = analysisPane(() => { calls++; return {}; });
  pane.onStateChange = async reason => reason === "ensure-ai-ready-for-feature"
    ? new Promise(resolve => { finish = resolve; }) : (calls++, {});
  const pending = pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  await new Promise(resolve => setImmediate(resolve));
  await pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  cancelRelationAnalysisRequest(pane);
  finish({ ready: true });
  await pending;
  assert.equal(calls, 0);
  assert.equal(pane.noteAiSuggestionsState.loading, false);
});

test("AI preparation failure shows an error and permits retry", async () => {
  let attempts = 0;
  let calls = 0;
  const { pane, statuses } = analysisPane(() => ({}));
  pane.onStateChange = async reason => {
    if (reason === "ensure-ai-ready-for-feature") {
      if (++attempts === 1) throw new Error("Service unavailable");
      return { ready: true };
    }
    calls++;
    return { analysis: {}, reviewItems: {} };
  };
  await pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  assert.equal(pane.noteAiSuggestionsState.loading, false);
  assert.match(pane.permanentRelationWorkspaceState.error, /Service unavailable/);
  assert.match(statuses.at(-1).message, /AI 准备失败/);
  await pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  assert.equal(calls, 1);
});

function analysisPane(run) {
  const pane = Object.create(EditorPane.prototype);
  const statuses = [];
  const timers = [];
  pane.activeNote = () => ({ id: "source", title: "Source" });
  pane.activeTab = () => ({ dirty: false });
  pane.resolvedNoteType = () => "permanent";
  pane.isActiveNoteId = () => true;
  pane.setInspectorVisible = () => {};
  pane.activatePermanentWorkspaceTab = () => assert.fail("relation recommendations must not switch to viewpoint");
  pane.renderRelated = () => {};
  pane.renderEmbeddedAiWorkspaceMount = () => {};
  pane.syncPermanentRelationWorkspaceOverlay = () => {};
  pane.onStatus = (message, tone) => statuses.push({ message, tone });
  pane.onStateChange = async (reason, payload) => reason === "ensure-ai-ready-for-feature" ? { ready: true } : run(payload);
  pane.noteAiSuggestionsStateForNote = () => ({ noteId: "source" });
  pane.permanentRelationWorkspaceState = { open: true, noteId: "source", mode: "ai" };
  pane.permanentRelationWorkspaceAiCandidates = () => [];
  pane.relatedPermanentNoteIds = () => ["target"];
  pane.windowRef = { setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout: () => {} };
  pane.noteAiAnalysisByNoteId = new Map();
  pane.buildLocalRelationSignals = () => ({});
  pane.buildMainPathOverviewV2 = () => ({});
  pane.refreshPermanentWorkspaceSnapshot = () => {};
  pane.refreshNoteAiSuggestions = async () => {};
  return { pane, statuses, timers };
}

test("slow relation analysis stays a waiting state instead of claiming no matches", async () => {
  let finish;
  const { pane, timers } = analysisPane(() => new Promise(resolve => { finish = resolve; }));
  const pending = pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  await new Promise(resolve => setImmediate(resolve));
  timers[0]();
  assert.match(pane.permanentRelationWorkspaceState.notice, /仍在分析/);
  finish({ analysis: {}, reviewItems: { artifacts: [] } });
  await pending;
  assert.match(pane.permanentRelationWorkspaceState.notice, /没有可推荐/);
});

test("failed relation analysis retains the error and allows retry", async () => {
  let attempts = 0;
  const { pane, statuses } = analysisPane(payload => {
    assert.equal(payload.throwOnFailure, true);
    if (++attempts === 1) throw new Error("Local model timed out");
    return { analysis: {}, reviewItems: { artifacts: [] } };
  });
  await pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  assert.equal(pane.noteAiSuggestionsState.loading, false);
  assert.match(pane.permanentRelationWorkspaceState.error, /Local model timed out/);
  assert.equal(pane.permanentRelationWorkspaceState.notice, "");
  assert.equal(statuses.at(-1).tone, "warn");
  await pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  assert.equal(attempts, 2);
  assert.equal(pane.permanentRelationWorkspaceState.error, "");
  assert.equal(statuses.at(-1).tone, "ok");
});

test("malformed model output remains a warning after editor refresh", async () => {
  const { pane, statuses } = analysisPane(() => ({ analysis: { modelParseError: { code: "invalid" } }, reviewItems: {} }));
  await pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  assert.match(pane.permanentRelationWorkspaceState.notice, /无法解析/);
  assert.equal(statuses.at(-1).tone, "warn");
  assert.match(statuses.at(-1).message, /规则匹配/);
});

test("editor renders structured timeout errors in Chinese", async () => {
  const { pane, statuses } = analysisPane(() => {
    const error = new Error("AI request timed out");
    error.details = { providerErrorType: "timeout" };
    throw error;
  });
  await pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  assert.match(pane.permanentRelationWorkspaceState.error, /AI 响应超时/);
  assert.match(statuses.at(-1).message, /更轻量的模型/);
});

test("repeated analysis clicks do not start a second request for the active note", async () => {
  let calls = 0;
  let finish;
  const { pane } = analysisPane(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const first = pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  await new Promise(resolve => setImmediate(resolve));
  await pane.runPermanentNoteAnalysis({ analysisFocus: "relations" });
  assert.equal(calls, 1);
  finish({ analysis: {}, reviewItems: {} });
  await first;
});
