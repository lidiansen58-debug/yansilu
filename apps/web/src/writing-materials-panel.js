import { renderWritingNoteCardDom } from "./writing-note-card-panel.js";

/** The existing list is the only place to choose and confirm writing materials. */
export function renderWritingMaterials(deps, { selectedNote, candidates, relatedEntries, candidateFocusPlan }) {
  const { $, writingState, parseWritingBasketIds, isWritingEligibleNote } = deps;
  const selected = new Set(parseWritingBasketIds());
  const displayed = new Set([...selected, ...relatedEntries.map(note => note.id)]);
  const materials = [...(deps.writingMaterialNotes?.() || candidates)];
  if (selectedNote?.noteType === "permanent" && !materials.some(note => note.id === selectedNote.id)) materials.push(selectedNote);
  const drafts = new Set([writingState.project?.draft_note_id,
    ...(writingState.project?.book_structure?.parts || []).flatMap(part => (part.chapters || []).map(chapter => chapter.draft_note_id))]);
  const available = materials.filter(note => !displayed.has(note.id) && !drafts.has(note.id)
    && (!candidateFocusPlan.usingFocusedScope || (candidateFocusPlan.noteIds || candidates.map(note => note.id)).includes(note.id)));
  const render = (note, options) => renderWritingNoteCardDom(deps, note, options);
  const basket = $("writingBasketList");
  if (basket) basket.innerHTML = relatedEntries.map(note => {
    const headings = (writingState.scaffold?.sections || []).filter(section => section.evidence_note_ids?.includes(note.id))
      .map(section => String(section.heading || "").trim()).filter(Boolean);
    return render(note, { selected: true, action: selected.has(note.id) ? "remove" : "open",
      actionLabel: "移出相关笔记", usageText: headings.length ? `用于：${headings.join("、")}` : "" });
  }).join("");
  const summary = $("writingCandidateSummary");
  if (summary) summary.textContent = writingState.materialsError || (available.length ? `可添加 ${available.length} 条笔记。`
    : writingState.loadingProjects ? "正在读取笔记…" : "还没有可添加的笔记。");
  const list = $("writingCandidateList");
  if (list) {
    const expanded = Boolean($("writingCandidateDetails")?.open);
    const visible = available.slice(0, expanded ? available.length : 12);
    list.innerHTML = available.length ? visible.map(note => {
      const eligible = isWritingEligibleNote(note);
      return render(note, { action: eligible ? "add" : "prepare", actionLabel: eligible ? "加入相关笔记" : "确认并加入相关笔记" });
    }).join("") + (available.length > visible.length ? `<div class="writing-empty">还有 ${available.length - visible.length} 条笔记。展开后可继续添加。</div>` : "")
      : "";
  }
  const bulk = $("btnWritingAddVisible");
  if (bulk) {
    bulk.textContent = $("writingCandidateDetails")?.open ? candidateFocusPlan.addActionLabel : "加入已显示笔记";
    bulk.disabled = !available.some(isWritingEligibleNote);
  }
}
