const itemOf = detail => detail?.item || detail;
const sameReview = (a, b) => a?.id === b?.id && a?.status === b?.status && a?.updatedAt === b?.updatedAt &&
  JSON.stringify(a?.content) === JSON.stringify(b?.content);

// Keep the displayed note baseline across sequential field writes. Only our successful
// response may advance it; fetching another detail must not bless a later human edit.
export async function applySuggestionGroup({ settingsAiState: state, loadAiSuggestionDetail, applyAiSuggestionStatus, render }, ids, status) {
  if (state.suggestionGroupActionLoading || state.suggestionActionLoading) return;
  state.suggestionGroupActionLoading = true;
  const previews = new Map((state.suggestions || []).map(item => [item.id, item]));
  const initial = state.suggestionDetail;
  let noteBase = initial?.writeBase;
  try {
    for (const id of ids) {
      if (itemOf(state.suggestionDetail)?.id !== id) await loadAiSuggestionDetail(id);
      const detail = state.suggestionDetail;
      const item = itemOf(detail);
      if (item?.id !== id || (previews.has(id) && !sameReview(previews.get(id), item))) {
        state.suggestionActionSuggestionId = id;
        state.suggestionActionError = '建议已经变化，本次未保存。请重新打开核对。';
        render();
        return;
      }
      const writesNote = status === 'adopted_as_draft' && item?.target?.type === 'permanent_note' &&
        ['thesis', 'threeLineSummary', 'three_line_summary'].includes(item.target.field);
      const options = writesNote ? {
        writeBase: noteBase && detail.writeBase && { ...detail.writeBase, vaultPath: noteBase.vaultPath,
          noteId: noteBase.noteId, fileRevision: noteBase.fileRevision },
        onNoteWritten(base) { noteBase = base; }
      } : {};
      if (writesNote && !options.writeBase) {
        state.suggestionActionSuggestionId = id;
        state.suggestionActionError = '缺少笔记版本，本次未保存。请重新打开建议。';
        render();
        return;
      }
      const result = await applyAiSuggestionStatus(id, status, options);
      if (!result) { render(); return; }
    }
    state.selectedSuggestionId = '';
    state.suggestionDetail = null;
    state.suggestionDetailSuggestionId = '';
    render();
  } finally {
    state.suggestionGroupActionLoading = false;
  }
}
