function isSaveShortcut(event) {
  return !event.isComposing && event.keyCode !== 229 && (event.ctrlKey || event.metaKey)
    && String(event.key || "").toLowerCase() === "s";
}

function consumeSaveShortcut(event) {
  event.__yansiluSaveHandled = true;
  event.preventDefault();
  event.stopPropagation();
}

/** Writing owns its save event even when a note tab remains open behind it. */
export function createNoteSaveShortcutHandler({ state, activeTab, saveActiveNote, documentRef }) {
  return event => {
    if (!isSaveShortcut(event) || event.__yansiluSaveHandled || state.module === "writing"
      || state.pendingNoteMoveId || documentRef.getElementById("noteSearchDialog")?.hidden === false || !activeTab()) return;
    consumeSaveShortcut(event);
    saveActiveNote();
  };
}

/** Shared by the writing workspace, document, source mode and load fallback. */
export function createWritingSaveShortcutHandler({ source, getSaveButton, isActive = () => true }) {
  return event => {
    if (!isSaveShortcut(event) || event.__yansiluSaveHandled || !isActive()) return;
    consumeSaveShortcut(event);
    const button = getSaveButton();
    if (!source.disabled && button && !button.disabled) button.click();
  };
}
