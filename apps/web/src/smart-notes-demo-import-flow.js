import { captureActionConfirmationContext, confirmCurrentAction } from "./action-confirmation-context.js";

const pendingImports = new WeakSet();

export const SMART_NOTES_DEMO_IMPORT_CONFIRMATION =
  "添加卡片笔记写作法的示例笔记、关联、主题和文章，可通过普通功能查看与编辑。保留你的修改，补齐缺失示例，并更新未改动的旧版操作说明。\n\n确认导入吗？";

export async function confirmSmartNotesDemoImport({ confirm = null, setStatus = () => {}, owner = confirm, isCurrent = () => true } = {}) {
  if (typeof confirm !== "function") {
    setStatus("需要先确认，才会导入 Smart Notes Demo。", "warn");
    return false;
  }
  return confirmCurrentAction(owner, {
    confirm, message: SMART_NOTES_DEMO_IMPORT_CONFIRMATION, isCurrent,
    onDecline: () => setStatus("已取消 Smart Notes Demo 导入。", "warn"),
    onError: error => setStatus(`确认未完成：${String(error?.message || error)}`, "warn")
  });
}

export async function runConfirmedSmartNotesDemoImport(payload = {}, deps = {}) {
  const {
    confirm = null,
    setStatus = () => {},
    importSmartNotesDemo = async () => false
  } = deps;
  const owner = deps.state || importSmartNotesDemo;
  const isCurrent = captureActionConfirmationContext(() => deps);
  if (pendingImports.has(owner) || !isCurrent()) return false;
  pendingImports.add(owner);
  try {
    const importingMessage = "正在导入 Smart Notes Demo，完成后会刷新首页。";
    if (payload?.startup !== true && payload?.confirmed !== true
      && !await confirmSmartNotesDemoImport({ confirm, setStatus, owner, isCurrent })) return false;
    setStatus(importingMessage, "busy");
    return await importSmartNotesDemo({ ...payload, confirmed: true });
  } finally { pendingImports.delete(owner); }
}
