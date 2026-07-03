export const SMART_NOTES_DEMO_IMPORT_CONFIRMATION =
  "导入 Smart Notes Demo 会自动创建一组示例笔记、关系和写作项目，并在完成后打开“00 从这里开始：10 分钟走完研思录”。\n\n确认导入吗？";

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
