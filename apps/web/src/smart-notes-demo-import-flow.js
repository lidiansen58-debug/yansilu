export const SMART_NOTES_DEMO_IMPORT_CONFIRMATION =
  "添加卡片笔记写作法的示例笔记、关联、主题和文章，可通过普通功能查看与编辑。保留你的修改，补齐缺失示例，并更新未改动的旧版操作说明。\n\n确认导入吗？";

export function confirmSmartNotesDemoImport({ confirm = null, setStatus = () => {} } = {}) {
  if (typeof confirm !== "function") {
    setStatus("需要先确认，才会导入 Smart Notes Demo。", "warn");
    return false;
  }
  const confirmed = confirm(SMART_NOTES_DEMO_IMPORT_CONFIRMATION);
  if (!confirmed) {
    setStatus("已取消 Smart Notes Demo 导入。", "warn");
    return false;
  }
  return true;
}

export async function runConfirmedSmartNotesDemoImport(payload = {}, deps = {}) {
  const {
    confirm = null,
    setStatus = () => {},
    importSmartNotesDemo = async () => false
  } = deps;
  const importingMessage = "\u6b63\u5728\u5bfc\u5165 Smart Notes Demo\uff0c\u5b8c\u6210\u540e\u4f1a\u5237\u65b0\u9996\u9875\u3002";
  if (payload?.startup === true || payload?.confirmed === true) {
    setStatus(importingMessage, "busy");
    return importSmartNotesDemo({ ...payload, confirmed: true });
  }
  if (!confirmSmartNotesDemoImport({ confirm, setStatus })) return false;
  setStatus(importingMessage, "busy");
  return importSmartNotesDemo({ ...payload, confirmed: true });
}
