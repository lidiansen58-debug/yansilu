export function renderWritingStrongModelRequestDetailDom(deps = {}, { noteIds = null, strongModelReady = false } = {}) {
  const {
    $,
    writingState,
    parseWritingBasketIds,
    writingKnownNoteById,
    writingBookProjectGoal,
    writingBookProjectAudience,
    escapeHtml
  } = deps;
  const resolvedNoteIds = Array.isArray(noteIds) ? noteIds : parseWritingBasketIds();
  const el = $("writingStrongModelRequestDetail");
  if (!el) return;
  const notes = resolvedNoteIds.map((noteId) => writingKnownNoteById(noteId) || { id: noteId, title: noteId });
  const result = writingState.strongModelResult;
  const request = result?.request || null;
  const goal = writingBookProjectGoal() || "检查主线、章节结构、材料缺口和反方压力。";
  const audience = writingBookProjectAudience() || "尚未填写";
  if (!notes.length) {
    el.innerHTML = `
      <strong>检查提纲</strong>
      <div class="writing-section-note">先选择相关笔记并确定主题。</div>
    `;
    return;
  }
  const checkItems = [
    "主线是否清楚",
    "章节是否重复或跳跃",
    "证据、反例和过渡是否缺失"
  ];
  const safetyNotes = [
    "只使用已选相关笔记和当前提纲。",
    "不会自动修改正文、关系或主题。"
  ];
  el.innerHTML = `
    <strong>检查提纲</strong>
    <ul>
      <li>相关笔记：${escapeHtml(notes.map((note) => note.title || note.id).join("；"))}</li>
      <li>写作目标：${escapeHtml(goal)}</li>
      <li>目标读者：${escapeHtml(audience)}</li>
      <li>状态：${escapeHtml(request ? "已准备检查，确认后返回建议" : strongModelReady ? "可以检查" : "等待相关笔记满足条件")}</li>
    </ul>
    <strong>检查内容</strong>
    <ul>${checkItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <strong>处理边界</strong>
    <ul>${safetyNotes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  `;
}
