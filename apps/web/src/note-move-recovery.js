export function withMoveDeadline(work, timeoutMs) {
  let timer;
  return Promise.race([
    Promise.resolve().then(work),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error("等待移动结果超时");
        error.code = "request_timeout";
        reject(error);
      }, timeoutMs);
    })
  ]).finally(() => clearTimeout(timer));
}

export function syncNoteMoveReadOnly(state, documentRef = globalThis.document) {
  const active = (state.tabs || []).find(tab => tab.id === state.activeTabId);
  const blocked = Boolean(state.unresolvedNoteMove && active?.noteId === state.unresolvedNoteMove.noteId);
  const workspace = documentRef?.getElementById("editorWorkspace");
  if (workspace) workspace.inert = blocked;
  return blocked;
}

export function showNoteMoveRecovery(retry, documentRef = globalThis.document) {
  if (!documentRef?.body) return () => {};
  const banner = documentRef.createElement("div");
  banner.className = "note-move-recovery";
  banner.setAttribute("role", "status");
  const text = documentRef.createElement("span");
  text.textContent = "尚未确认笔记的实际位置，此笔记暂不能编辑。其他笔记和设置仍可使用。";
  const button = documentRef.createElement("button");
  button.type = "button";
  button.className = "mini-btn";
  button.textContent = "重新核查";
  button.onclick = async () => {
    button.disabled = true;
    text.textContent = "正在核查笔记位置...";
    try {
      if (!await retry()) text.textContent = "仍无法确认位置。请检查本地服务后重新核查；不会重复移动笔记。";
    } catch {
      text.textContent = "核查失败，请检查本地服务后重试。";
    } finally { button.disabled = false; }
  };
  banner.append(text, button);
  documentRef.body.append(banner);
  return () => banner.remove();
}
