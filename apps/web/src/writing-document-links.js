import { looksLikeStableNoteId, wikilinkTargetFromRaw, normalizeText,
  markdownReferencePathCandidates, noteMatchesMarkdownReferencePath, noteMatchesLinkAlias } from "./editor-link-picker.js";

function resolveTarget(raw, deps) {
  const target = wikilinkTargetFromRaw(raw);
  // IDs remain usable even when the target has not been loaded into the sidebar.
  if (looksLikeStableNoteId(target)) return target;
  const notes = new Map();
  for (const note of [...(deps.state?.notes || []), ...(deps.writingState?.project?.basket_notes || []),
    ...(deps.writingState?.scaffold?.evidence_notes || [])]) {
    if (note?.id && !notes.has(note.id)) notes.set(note.id, note);
  }
  const candidates = [...notes.values()];
  const byId = candidates.find(note => normalizeText(note.id) === normalizeText(target));
  if (byId) return byId.id;
  const unique = matches => {
    if (matches.length > 1) throw new Error("多条笔记使用了这个名称，请在 Markdown 中改用笔记 ID 或完整路径。");
    return matches[0]?.id;
  };
  for (const path of markdownReferencePathCandidates(target)) {
    const id = unique(candidates.filter(note => noteMatchesMarkdownReferencePath(note, path) || noteMatchesLinkAlias(note, path)));
    if (id) return id;
  }
  const id = unique(candidates.filter(note => normalizeText(note.title) === normalizeText(target) || noteMatchesLinkAlias(note, target)));
  if (!id) throw new Error("找不到这条笔记，请在 Markdown 中核对链接。");
  return id;
}

/** A delayed source lookup must not interrupt a new chapter or newer typing. */
export function createWritingDocumentLinkOpener(depsProvider = () => ({})) {
  let revision = 0;
  return async token => {
    if (!token.startsWith("[[")) return;
    const deps = depsProvider(), request = ++revision;
    const projectId = deps.writingState?.project?.id, chapter = deps.writingState?.bookChapter;
    const body = chapter?.markdown ?? deps.writingState?.draftMarkdown;
    const vault = deps.getVaultPath?.(), scope = deps.state ? (deps.state.noteMoveVaultScope ||= {}) : undefined;
    const isCurrent = () => {
      const current = depsProvider();
      return request === revision && current.writingState?.project?.id === projectId
        && current.writingState?.bookChapter === chapter
        && (chapter?.markdown ?? current.writingState?.draftMarkdown) === body
        && current.getVaultPath?.() === vault && current.state?.noteMoveVaultScope === scope
        && !current.state?.noteMoveVaultSwitching && !current.state?.noteMoveVaultUncertain
        && current.state?.module === "writing";
    };
    try {
      if (!isCurrent()) return;
      const id = resolveTarget(token.slice(2, -2), deps);
      if (!deps.openWritingSourceNote) throw new Error("笔记入口暂不可用，请稍后重试。");
      await deps.openWritingSourceNote(id, { isCurrent });
    } catch (error) {
      if (isCurrent()) deps.setStatus?.(String(error.message || error), "warn", { notify: true });
    }
  };
}
