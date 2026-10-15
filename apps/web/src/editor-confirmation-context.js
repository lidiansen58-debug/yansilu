const pendingConfirmations = new WeakSet();

function tabSnapshot(tab, includeBaseline) {
  return JSON.stringify([tab.id, tab.noteId, tab.title, tab.body, tab.authorshipState,
    ...(includeBaseline ? [tab.dirty, tab.savedBody, tab.savedTitle, tab.savedFileRevision] : [])]);
}

export function captureEditorConfirmationGuard(host, tabs, { allTabs = false, includeBaseline = false } = {}) {
  const state = host.state;
  const scope = state.noteMoveVaultScope;
  const vaultPath = host.vaultScope?.() || "";
  const activeId = state.activeTabId;
  const originals = [...tabs];
  const snapshots = originals.map(tab => tabSnapshot(tab, includeBaseline));
  return () => host.state === state && state.noteMoveVaultScope === scope
    && (host.vaultScope?.() || "") === vaultPath && state.activeTabId === activeId
    && !state.noteMoveVaultSwitching && !state.noteMoveVaultUncertain
    && (!allTabs || (state.tabs.length === originals.length && state.tabs.every((tab, index) => tab === originals[index])))
    && originals.every((tab, index) => state.tabs.includes(tab) && tabSnapshot(tab, includeBaseline) === snapshots[index]);
}

async function awaitEditorDecision(host, message, isCurrent) {
  if (pendingConfirmations.has(host) || !isCurrent()) return null;
  pendingConfirmations.add(host);
  try {
    const approved = await window.confirm(message);
    if (!isCurrent()) return null;
    // Capture text that was typed while the native dialog was waiting.
    host.updateActiveTabFromEditor?.();
    if (!isCurrent()) return null;
    return approved === true;
  } catch (error) {
    if (isCurrent()) host.onStatus?.(`确认未完成：${String(error?.message || error)}`, "warn");
    return null;
  } finally {
    pendingConfirmations.delete(host);
  }
}

export async function confirmEditorDiscard(host, tabs, message, { allTabs = false } = {}) {
  const isCurrent = captureEditorConfirmationGuard(host, tabs, { allTabs });
  if (!isCurrent() || pendingConfirmations.has(host)) return false;
  if (!tabs.some(tab => tab.dirty)) return true;
  return await awaitEditorDecision(host, message, isCurrent) === true;
}

export async function confirmEditorDraftRestore(host, tab, note, draft, message) {
  const tabIsCurrent = captureEditorConfirmationGuard(host, [tab], { includeBaseline: true });
  const noteSnapshot = JSON.stringify([note.title, note.body, note.fileRevision]);
  const draftSnapshot = JSON.stringify(draft);
  const isCurrent = () => {
    const currentNote = host.state.notes?.find(item => item.id === note.id);
    return tabIsCurrent() && currentNote
      && JSON.stringify([currentNote.title, currentNote.body, currentNote.fileRevision]) === noteSnapshot
      && JSON.stringify(host.readDraft(note.id)) === draftSnapshot;
  };
  return awaitEditorDecision(host, message, isCurrent);
}
