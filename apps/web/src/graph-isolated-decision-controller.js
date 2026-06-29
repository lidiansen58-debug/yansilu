import {
  graphIsolatedDecisionFormInput
} from "./graph-isolated-decision-form-model.js";
import {
  buildGraphIsolatedDecisionNoteUpdate
} from "./graph-isolated-decision-note-update.js";

export function createGraphIsolatedDecisionController(depsProvider = () => ({})) {
  async function saveGraphIsolatedDecision(button = null) {
    const {
      document = globalThis.document,
      ensureEditableNoteBody = (body = "") => String(body || ""),
      graphIsolatedDecisionMode = (value = "") => String(value || "").trim().toLowerCase(),
      graphIsolatedDecisionTitle = (value = "") => String(value || ""),
      graphUpsertMarkdownSection = (body = "") => String(body || ""),
      isLocalOnlyNote = () => false,
      loadGraphEditableNote = async () => null,
      mapNoteItem = (value) => value,
      noteTabFor = () => null,
      parseLinks = () => [],
      parseTags = () => [],
      renderGraphPanel = () => {},
      setGraphIsolatedWorkflowActiveTab = () => {},
      setStatus = () => {},
      updateNote = async () => null
    } = depsProvider() || {};
    const { noteId, mode, text } = graphIsolatedDecisionFormInput(button, {
      document,
      graphIsolatedDecisionMode
    });
    if (!noteId) return false;
    if (!text) {
      setStatus("请先写一句说明，再保存这个处理决定", "warn");
      return false;
    }
    const note = await loadGraphEditableNote(noteId);
    if (!note) {
      setStatus("没有找到这条笔记，无法保存说明", "bad");
      return false;
    }
    const previousText = button.textContent || "";
    button.disabled = true;
    button.textContent = "正在保存";
    const decisionUpdate = buildGraphIsolatedDecisionNoteUpdate({ note, mode, text }, {
      ensureEditableNoteBody,
      graphUpsertMarkdownSection,
      graphIsolatedDecisionTitle
    });
    const { nextBody, decisionTitle } = decisionUpdate;
    try {
      let updated = null;
      if (isLocalOnlyNote(note)) {
        note.body = nextBody;
        note.tags = parseTags(nextBody);
        note.links = parseLinks(nextBody);
        note.thesis = decisionUpdate.nextThesis;
        note.updatedAt = new Date().toISOString();
        note.bodyLoaded = true;
        updated = note;
      } else {
        updated = await updateNote(note.id, {
          title: note.title,
          body: nextBody,
          status: note.status || "draft",
          generatedOriginalNoteId: note.generatedOriginalNoteId || undefined,
          originalityStatus: note.originalityStatus || undefined,
          originalitySimilarity: note.originalitySimilarity ?? undefined
        });
        if (updated) Object.assign(note, mapNoteItem(updated), { bodyLoaded: true });
      }
      const tab = noteTabFor(note.id);
      if (tab) {
        tab.body = note.body;
        tab.savedBody = note.body;
        tab.title = note.title;
        tab.savedTitle = note.title;
        tab.dirty = false;
      }
      setGraphIsolatedWorkflowActiveTab(noteId, "queue");
      renderGraphPanel();
      setStatus(`${decisionTitle}已保存到当前笔记`, "ok");
      return Boolean(updated);
    } catch (error) {
      button.disabled = false;
      button.textContent = previousText || "保存说明";
      setStatus(`保存说明失败：${String(error?.message || error)}`, "bad");
      return false;
    }
  }

  return { saveGraphIsolatedDecision };
}
