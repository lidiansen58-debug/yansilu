export function writingBeginnerMainline({
  basketCount = 0,
  hasProject = false,
  hasScaffold = false,
  projectEntry = null,
  basketReadiness = null
} = {}) {
  if (Number(basketCount || 0) <= 0) {
    return {
      stage: "material",
      label: "选相关笔记",
      title: "下一步只选能放进同一篇文章的笔记",
      body: "先挑 2-5 条能回答同一个问题的永久笔记，不急着生成提纲。",
      actionLabel: "加入相关笔记"
    };
  }
  if (!hasProject) {
    return {
      stage: "theme",
      label: "确定可写主题",
      title: "这组笔记可以先确定一个可写主题",
      body: basketReadiness?.hint || "确认题目、中心问题和读者后，再保存为可写主题。",
      actionLabel: projectEntry?.actionLabel || "确定可写主题"
    };
  }
  if (!hasScaffold) {
    return {
      stage: "outline",
      label: "生成提纲",
      title: "主题已确定，下一步生成文章提纲",
      body: "先把章节、证据和缺口摊开，再决定是否开始草稿。",
      actionLabel: "生成文章提纲"
    };
  }
  return {
    stage: "draft",
    label: "保存草稿",
    title: "提纲已生成，下一步保存为草稿笔记",
    body: "确认提纲的证据、缺口和反方后，把它保存成可以继续写的草稿。",
    actionLabel: "保存为草稿笔记"
  };
}

export function renderWritingBeginnerMainlineView(mainline = {}, deps = {}) {
  const { escapeHtml = (value) => String(value ?? "") } = deps;
  return `
    <section class="writing-summary" data-writing-beginner-mainline data-stage="${escapeHtml(mainline.stage || "")}">
      <div class="sidebar-flow-kicker">新手四步主线</div>
      <strong>${escapeHtml(mainline.label || "下一步")}</strong>
      <div>${escapeHtml(mainline.title || "下一步只做一件事")}</div>
      <small>${escapeHtml(mainline.body || "")}</small>
      <span class="inspector-chip">${escapeHtml(mainline.actionLabel || "继续")}</span>
    </section>
  `;
}
