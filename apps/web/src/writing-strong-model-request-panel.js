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
  const modelName = request?.model?.model || "strong_model";
  const goal = writingBookProjectGoal() || "请 AI 检查书稿主线、章节结构、材料缺口和反方压力。";
  const audience = writingBookProjectAudience() || "尚未填写";
  if (!notes.length) {
    el.innerHTML = `
      <strong>AI 写作检查请求</strong>
      <div class="writing-section-note">先选择相关笔记并确定主题后，这里会显示用了哪些笔记、准备问模型什么，以及哪些内容不会发送。</div>
    `;
    return;
  }
  const plannedQuestions = [
    "这组易经材料适合写成哪三种书？各自的读者、主线和风险是什么？",
    "如果写《AI时代易经与人生》，部 / 章 / 节应该如何重排？",
    "哪些案例、反方和开放问题必须补齐，才像完整书稿而不是长文大纲？",
    "哪些材料只适合放入案例池或反方池，不应该进入主线？"
  ];
  const notSent = [
    "不会发送未选为相关笔记的其它笔记、其它草稿或整个库。",
    "不会发送本地设置、系统消息、图谱 UI 状态和无关文件路径。",
    "不会自动写入笔记、不会自动改图谱，也不会自动采纳模型建议。",
    "当前实现先准备请求；只有你确认后才进入远程模型流程。"
  ];
  el.innerHTML = `
    <strong>AI 写作检查请求${request ? `：${escapeHtml(modelName)}` : ""}</strong>
    <ul>
      <li>使用笔记：${escapeHtml(notes.map((note) => `${note.title || note.id}（${note.id}）`).join("；"))}</li>
      <li>写作目标：${escapeHtml(goal)}</li>
      <li>目标读者：${escapeHtml(audience)}</li>
      <li>状态：${escapeHtml(request ? "写作检查建议已准备，确认后处理返回建议" : strongModelReady ? "条件已满足，可以准备写作检查" : "等待可写主题、关系读取或相关笔记成熟度满足")}</li>
    </ul>
    <strong>准备问模型什么</strong>
    <ul>${plannedQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>
    <strong>不会发送 / 不会自动做</strong>
    <ul>${notSent.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  `;
}
