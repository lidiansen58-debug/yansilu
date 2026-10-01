import { titleFromBody } from "./editor-template-workspace.js";

// The directory dialog is asynchronous: never read another note's editor after it closes.
export async function recordEditorSourceAsPermanent(editor, draft = {}) {
  const note = editor.activeNote();
  if (!note || !editor.isOriginalRecordableSource(note)) return false;
  const scope = editor.state.noteMoveVaultScope;
  const directoryId = await editor.pickPermanentDirectoryForNote(note);
  if (!directoryId || editor.activeNote()?.id !== note.id || editor.state.noteMoveVaultScope !== scope) return false;
  const sourceBody = editor.getEditorValue();
  editor.updateActiveTabFromEditor?.();
  return editor.onStateChange("record-original-from-note", {
    sourceNoteId: note.id,
    sourceType: editor.resolvedNoteType(note),
    sourceTitle: titleFromBody(sourceBody),
    sourceBody,
    ...draft,
    directoryId
  });
}
