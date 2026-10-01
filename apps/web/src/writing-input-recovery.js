function storageFor(deps, context) {
  const vault = deps.getVaultPath?.() || "";
  const storage = deps.recoveryStorage === undefined
    ? (typeof window === "undefined" ? null : window.localStorage) : deps.recoveryStorage;
  if (!vault || !storage) return null;
  return { storage, key: `yansilu:writing-input:v1:${encodeURIComponent(vault)}:${encodeURIComponent(context)}` };
}

export function saveWritingInput(deps, context, record) {
  const target = storageFor(deps, context);
  if (target) target.storage.setItem(target.key, JSON.stringify(record));
}

export function readWritingInput(deps, context) {
  const target = storageFor(deps, context);
  if (!target) return null;
  const raw = target.storage.getItem(target.key);
  if (!raw) return null;
  let record;
  try { record = JSON.parse(raw); }
  catch { throw new Error("本机草稿恢复记录无法读取，请先保留当前内容。"); }
  if (!record || typeof record.markdown !== "string" || typeof record.noteId !== "string"
    || (record.savedBody !== undefined && typeof record.savedBody !== "string")) {
    throw new Error("本机草稿恢复记录不完整，请先保留当前内容。");
  }
  return record;
}

export function clearWritingInput(deps, context) {
  const target = storageFor(deps, context);
  target?.storage.removeItem(target.key);
}

export function checkpointArticleInput(deps) {
  const writing = deps.writingState;
  if (!writing?.project?.id || !writing.scaffold?.id) return;
  const baseline = writing.project.draft_note;
  saveWritingInput(deps, JSON.stringify(["article", writing.project.id, writing.scaffold.id]), {
    markdown: String(writing.draftMarkdown ?? ""), noteId: writing.project.draft_note_id || "",
    savedBody: baseline?.body, savedFileRevision: baseline?.fileRevision
  });
}

export function checkpointChapterInput(deps, chapter) {
  saveWritingInput(deps, JSON.stringify(["chapter", chapter.projectId, chapter.id]), {
    markdown: chapter.markdown, noteId: chapter.noteId || chapter.pendingNoteId || "",
    savedBody: chapter.savedBody, savedFileRevision: chapter.savedFileRevision
  });
}
