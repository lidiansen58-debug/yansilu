export const SMART_NOTES_DEMO_IMPORT_CONFIRMATION =
  "导入 Smart Notes Demo 示例库会创建一套可试错的卡片笔记样例，并打开第一条“从这里开始”。\n\n确认导入吗？";

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
  if (payload?.startup === true || payload?.confirmed === true) return importSmartNotesDemo({ ...payload, confirmed: true });
  if (!confirmSmartNotesDemoImport({ confirm, setStatus })) return false;
  return importSmartNotesDemo({ ...payload, confirmed: true });
}
