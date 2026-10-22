import { captureAppNavigation } from "./app-navigation-intent.js";

const requests = new WeakMap();

// Commit a fetched theme only while its original page, vault and project own it.
export async function selectWritingThemeForRuntime(indexId, deps, { isCurrent = () => true } = {}) {
  const id = String(indexId || "").trim();
  if (!id) return null;
  const { state, writingState, getVaultPath, assertWritingDraftCanLeave, fetchIndexCard,
    writingThemeIndexNoteIds, shouldPreserveWritingThemeContext, sameUniqueStringSet,
    ensureNotesLoaded, upsertWritingThemeIndex, setSelectedWritingThemeIndex,
    clearWritingThemeRelationCounts, renderWritingPanel } = deps;
  const request = {};
  requests.set(writingState, request);
  const ownsNavigation = captureAppNavigation(state);
  const scope = state.noteMoveVaultScope, module = state.module, vaultPath = getVaultPath();
  const selected = writingState.selectedThemeIndexId, revision = writingState.projectOpenRevision;
  const current = () => requests.get(writingState) === request && ownsNavigation() && isCurrent()
    && state.noteMoveVaultScope === scope && state.module === module && getVaultPath() === vaultPath
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain && !state.unresolvedNoteMove
    && writingState.selectedThemeIndexId === selected && writingState.projectOpenRevision === revision;
  if (!current()) return null;
  if (id !== selected) assertWritingDraftCanLeave(writingState);
  try {
    const fetched = await fetchIndexCard(id);
    if (!current() || fetched?.id !== id) return null;
    const noteIds = writingThemeIndexNoteIds(fetched);
    const preserve = shouldPreserveWritingThemeContext({ noteIds,
      loadedThemeNoteIds: writingState.themeNoteDetailIds,
      relationThemeNoteIds: writingState.themeRelationNoteIds, sameSet: sameUniqueStringSet });
    await ensureNotesLoaded(noteIds);
    if (!current()) return null;
    if (id !== writingState.selectedThemeIndexId) assertWritingDraftCanLeave(writingState);
    upsertWritingThemeIndex(fetched);
    setSelectedWritingThemeIndex(fetched.id);
    writingState.themeNoteDetailIds = noteIds;
    writingState.loadingThemeNoteDetails = false;
    if (!preserve) clearWritingThemeRelationCounts(noteIds);
    renderWritingPanel();
    return fetched;
  } catch (error) {
    if (current()) throw error;
    return null;
  }
}
