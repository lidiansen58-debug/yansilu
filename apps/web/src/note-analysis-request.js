import { aiErrorMessage } from "./ai-error-message.js";

export async function prepareNoteAnalysisRequest(editor, request) {
  editor.noteAiSuggestionsState = {
    ...editor.noteAiSuggestionsStateForNote(request.noteId),
    noteId: request.noteId, loading: true, error: "", items: []
  };
  editor.renderEmbeddedAiWorkspaceMount(request.noteId);
  try {
    if (editor.activeTab()?.dirty) {
      editor.onStatus("正在先同步当前笔记，再运行 AI 分析...", "warn");
      const saved = await editor.saveActiveNote({ trigger: "ai-analysis" });
      if (editor.noteAnalysisRequest !== request || request.controller.signal.aborted || !editor.isActiveNoteId(request.noteId)) {
        discardNoteAnalysisRequest(editor, request);
        return null;
      }
      const tab = editor.activeTab();
      if (!tab || tab.dirty || saved === false || (saved && typeof saved === "object" && saved.ok === false)) {
        discardNoteAnalysisRequest(editor, request);
        editor.onStatus("笔记尚未保存，AI 分析未启动。", "warn");
        return null;
      }
      request.body = tab.body;
    }
    const ready = await editor.onStateChange("ensure-ai-ready-for-feature", {
      feature: "note_analysis", noteId: request.noteId,
      returnContext: { view: "note", noteId: request.noteId }
    });
    if (!isCurrentNoteAnalysisRequest(editor, request)) {
      discardNoteAnalysisRequest(editor, request);
      return null;
    }
    return ready || { ready: true };
  } catch (error) {
    if (!isCurrentNoteAnalysisRequest(editor, request)) {
      discardNoteAnalysisRequest(editor, request);
      return null;
    }
    const message = aiErrorMessage(error);
    discardNoteAnalysisRequest(editor, request);
    editor.noteAiSuggestionsState = { ...editor.noteAiSuggestionsState, error: message };
    editor.renderEmbeddedAiWorkspaceMount(request.noteId);
    if (editor.permanentRelationWorkspaceState?.noteId === request.noteId) {
      editor.permanentRelationWorkspaceState = { ...editor.permanentRelationWorkspaceState, aiLoading: false, error: message, notice: "" };
      editor.syncPermanentRelationWorkspaceOverlay();
    }
    editor.onStatus(`AI 准备失败：${message}`, "warn");
    return null;
  }
}

export function beginNoteAnalysisRequest(editor, noteId, relationsOnly) {
  editor.noteAnalysisRequest?.controller.abort();
  const request = { noteId, relationsOnly, pending: true, body: editor.activeTab()?.body, controller: new AbortController() };
  editor.noteAnalysisRequest = request;
  return request;
}

export function isCurrentNoteAnalysisRequest(editor, request) {
  return editor.noteAnalysisRequest === request && !request.controller.signal.aborted && editor.isActiveNoteId(request.noteId)
    && editor.activeTab()?.body === request.body;
}

export function cancelRelationAnalysisRequest(editor) {
  const request = editor.noteAnalysisRequest;
  if (!request?.relationsOnly || request.pending !== true) return false;
  discardNoteAnalysisRequest(editor, request);
  return true;
}

export function discardNoteAnalysisRequest(editor, request) {
  if (editor.noteAnalysisRequest !== request) return;
  request.controller.abort();
  editor.noteAnalysisRequest = null;
  if (editor.noteAiSuggestionsState?.noteId === request.noteId) {
    editor.noteAiSuggestionsState = { ...editor.noteAiSuggestionsState, loading: false, error: "", items: [] };
    editor.renderEmbeddedAiWorkspaceMount(request.noteId);
  }
}
