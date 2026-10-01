import { recordSourceNotePromotion } from "./source-note-promotion-controller.js";

function creationFailure(setStatus, error) {
  if (error?.code === "vault_changed") return false;
  if (error?.code === "creation_pending") {
    setStatus(error.message, "warn", { notify: true, force: true, holdMs: 12000 });
    return false;
  }
  setStatus(`未能创建笔记：${String(error?.message || error || "本地服务没有返回保存结果")}。正在编辑的内容已保留，请检查笔记库和本地服务后重试。`, "bad", { notify: true, force: true, holdMs: 12000 });
  return false;
}

export async function handleCreatePrimaryNoteStateChange(payload = {}, deps = {}) {
  const {
    createPrimaryOriginalNote = async () => ({}),
    setStatus = () => {}
  } = deps;
  setStatus("正在创建笔记...", "busy", { notify: true, force: true });
  let result;
  try {
    result = await createPrimaryOriginalNote({ preferTitleSelection: true });
  } catch (error) { return creationFailure(setStatus, error); }
  if (result?.error) return creationFailure(setStatus, result.error);
  if (result.reused) {
    setStatus(
      result.cleanedCount
        ? `已打开永久笔记占位，并清理 ${result.cleanedCount} 条空白占位`
        : "已打开永久笔记占位",
      result.cleanedCount ? "warn" : "ok"
    );
  } else if (result.remote) {
    setStatus("笔记已保存到本地", "ok", { notify: true, force: true });
  } else {
    return creationFailure(setStatus, result.error);
  }
  return result || true;
}

export async function handleCreateNoteInSelectedFolderStateChange(payload = {}, deps = {}) {
  const {
    applyExplorerSelectionContext = () => {},
    createNoteInSelectedFolder = async () => ({}),
    setStatus = () => {}
  } = deps;

  if (payload.folderId) {
    applyExplorerSelectionContext({
      folderId: String(payload.folderId || "").trim(),
      clearSelectedFile: true,
      expandFolder: true
    });
  }

  setStatus("正在创建笔记...", "busy", { notify: true, force: true });
  let result;
  try {
    result = await createNoteInSelectedFolder({ preferTitleSelection: true });
  } catch (error) { return creationFailure(setStatus, error); }
  if (result?.error) return creationFailure(setStatus, result.error);
  if (result.reused) {
    setStatus(
      result.cleanedCount
        ? `已打开现有未命名笔记，并清理 ${result.cleanedCount} 条空白占位`
        : "已打开现有未命名笔记",
      result.cleanedCount ? "warn" : "ok"
    );
  } else if (result.remote) {
    setStatus("笔记已保存到本地", "ok", { notify: true, force: true });
  } else {
    return creationFailure(setStatus, result.error);
  }
  return result || true;
}

export function handleRecordOriginalFromNoteStateChange(payload = {}, deps = {}) {
  return recordSourceNotePromotion(payload, deps);
}
