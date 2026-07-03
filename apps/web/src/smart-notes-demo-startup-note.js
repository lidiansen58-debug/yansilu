export function smartNotesDemoStartupNoteId({ result = {}, notes = [] } = {}) {
  const firstNoteId = String(result?.firstNoteId || "").trim();
  const guideById = firstNoteId
    ? (Array.isArray(notes) ? notes : []).find((note) => String(note?.id || "").trim() === firstNoteId)
    : null;
  if (guideById) return firstNoteId;
  const guideByTitle = (Array.isArray(notes) ? notes : []).find((note) =>
    /^00\s+从这里开始/.test(String(note?.title || "").trim())
  );
  return String(guideByTitle?.id || firstNoteId || "").trim();
}

export function smartNotesDemoExistingFolder(folders = []) {
  return (Array.isArray(folders) ? folders : []).find((folder) => {
    const name = String(folder?.name || folder?.title || "").toLowerCase();
    return name.includes("smart notes") || name.includes("产品思考") || name.includes("寫作 demo") || name.includes("写作 demo");
  }) || null;
}

export function smartNotesDemoOpenedExistingGuideStatus() {
  return "Smart Notes Demo 已存在，已为你打开导览笔记。可以继续按 10 分钟导览体验卡片笔记写作法。";
}
