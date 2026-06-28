export function editorHelperShouldHide({ elementsReady = true, dismissed = false, muted = false, module = "" } = {}) {
  if (!elementsReady) return { hide: true, reason: "missing-elements" };
  if (dismissed) return { hide: true, reason: "dismissed" };
  if (muted) return { hide: true, reason: "muted" };
  if (String(module || "").trim() !== "explorer") return { hide: true, reason: "module" };
  return { hide: false, reason: "" };
}

export function editorHelperNoteType(note = null, { typeFromFolder = () => "" } = {}) {
  return String((note?.folderId ? typeFromFolder(note.folderId) : "") || note?.noteType || "")
    .trim()
    .toLowerCase();
}
