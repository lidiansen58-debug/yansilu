const failedBodies = new WeakMap();

export function syncRichEditorValue(host, text, { force = false } = {}) {
  if (!host.richEditor) return true;
  const noteId = host.activeTab()?.noteId || "";
  const previous = failedBodies.get(host);
  const fallback = () => {
    const changed = host.state.previewMode !== "source" || host.state.forcedSourcePreviewNoteId !== noteId;
    host.state.previewMode = "source";
    host.state.forcedSourcePreviewNoteId = noteId;
    if (changed) host.onStatus("所见即所得暂时无法显示这条笔记，已切换到源码。原文未改动。", "warn");
    return false;
  };
  if (previous?.noteId === noteId && previous.text === text) return fallback();
  const suppressed = { editor: host.suppressEditorChange, rich: host.suppressRichEditorChange };
  host.suppressEditorChange = true;
  host.suppressRichEditorChange = true;
  try {
    if (force) host.richEditor.editor.setMarkdown(text, false);
    else if (host.richEditor.getValue() !== text) host.richEditor.setValue(text);
    if (host.state.forcedSourcePreviewNoteId && host.state.forcedSourcePreviewNoteId !== noteId) {
      host.state.previewMode = "wysiwyg";
      host.state.forcedSourcePreviewNoteId = "";
    }
    failedBodies.delete(host);
    return true;
  } catch {
    failedBodies.set(host, { noteId, text });
    return fallback();
  } finally {
    host.suppressEditorChange = suppressed.editor;
    host.suppressRichEditorChange = suppressed.rich;
  }
}
