export async function openAiSuggestionTargetNote(deps, noteId) {
  const { settingsState = { ai: {} }, activateModule = () => {}, openNoteById = () => {},
    openFreshNote, setStatus = () => {} } = deps;
  const id = String(noteId || '').trim();
  if (!id) { setStatus('这条建议还没有指向目标笔记', 'warn'); return false; }
  if (openFreshNote) {
    const selectedId = settingsState.ai?.selectedSuggestionId;
    try {
      if (!await openFreshNote(id, { isCurrent: () => settingsState.ai?.selectedSuggestionId === selectedId })) {
        setStatus('当前笔记库或建议已变化，请重新打开核对', 'warn');
        return false;
      }
    } catch (error) {
      setStatus(`未能打开目标笔记：${String(error?.message || error)}`, 'bad');
      return false;
    }
  } else {
    activateModule('explorer');
    await openNoteById(id, { preferTitleSelection: false });
  }
  setStatus('已打开目标笔记，你可以继续审阅这条已采纳的草稿', 'ok');
  return true;
}
