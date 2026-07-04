function cleanText(value = "") {
  return String(value || "").trim();
}

function noteIdSet(notes = []) {
  return new Set((Array.isArray(notes) ? notes : []).map((note) => cleanText(note?.id)).filter(Boolean));
}

export const SMART_NOTES_DEMO_WALKTHROUGH_STEPS = [
  {
    key: "source-to-permanent",
    title: "从记录到永久笔记",
    note: "先看一条材料怎样经过转述，变成用户自己的判断。",
    action: "open-demo-note",
    actionLabel: "打开“写作不是最后一步”",
    targetNoteId: "PERM-WRITING-STARTS-BEFORE-DRAFT",
    noteIds: [
      "GUIDE-SMART-NOTES-START",
      "SRC-SMART-NOTES",
      "FN-PHONE-CAPTURE-UNPROCESSED",
      "LN-WRITING-AS-DAILY-PRACTICE",
      "PERM-WRITING-STARTS-BEFORE-DRAFT"
    ]
  },
  {
    key: "connect-relation",
    title: "补一条关系理由",
    note: "让一条孤立永久笔记进入关系网，并写清楚为什么相关。",
    action: "open-demo-note-relations",
    actionLabel: "打开“待关联练习”",
    targetNoteId: "PERM-UNLINKED-PRACTICE",
    noteIds: ["PERM-UNLINKED-PRACTICE"]
  },
  {
    key: "theme-index",
    title: "读主题索引",
    note: "看中心问题和关键笔记，而不是把索引当文件夹。",
    action: "open-demo-note",
    actionLabel: "打开“为什么要关联笔记？”",
    targetNoteId: "THEME-WHY-LINK-NOTES",
    noteIds: ["THEME-WHY-LINK-NOTES", "THEME-WHAT-IS-PERMANENT-NOTE", "THEME-INDEX-TO-WRITING"]
  },
  {
    key: "writing-outline",
    title: "进入写作中心",
    note: "从主题索引和已确认永久笔记生成文章提纲。",
    action: "open-demo-writing",
    actionLabel: "打开写作中心",
    targetNoteId: "WRITE-SMART-NOTES-DEMO",
    noteIds: ["WRITE-SMART-NOTES-DEMO", "DRAFT-SMART-NOTES-DEMO"]
  },
  {
    key: "review-next",
    title: "做一次今日整理",
    note: "只找下一步动作，不做大扫除。",
    action: "open-demo-review",
    actionLabel: "打开今日整理",
    targetNoteId: "GUIDE-TODAY-NEXT-STEP",
    noteIds: ["GUIDE-TODAY-NEXT-STEP", "FN-PHONE-CAPTURE-UNPROCESSED", "LN-AI-KEEPS-CANDIDATE-STATE"]
  }
];

export function isSmartNotesDemoScope(notes = []) {
  const ids = noteIdSet(notes);
  return ids.has("GUIDE-SMART-NOTES-START") || ids.has("GUIDE-SN-001") || ids.has("SRC-SMART-NOTES");
}

export function buildSmartNotesDemoWalkthrough({ notes = [], selectedNoteId = "" } = {}) {
  const ids = noteIdSet(notes);
  if (!isSmartNotesDemoScope(notes)) return null;
  const activeNoteId = cleanText(selectedNoteId);
  const availableSteps = SMART_NOTES_DEMO_WALKTHROUGH_STEPS.map((step) => ({
    ...step,
    available: step.noteIds.some((id) => ids.has(id)) || ids.has(step.targetNoteId)
  }));
  const activeIndex = Math.max(
    0,
    availableSteps.findIndex((step) => step.noteIds.includes(activeNoteId) || step.targetNoteId === activeNoteId)
  );
  const steps = availableSteps.map((step, index) => ({
    ...step,
    done: index < activeIndex,
    active: index === activeIndex
  }));
  const active = steps[activeIndex] || steps[0] || null;
  return {
    kind: "smart-notes-demo",
    title: "Smart Notes Demo 导览",
    note: active ? `下一步：${active.title}。${active.note}` : "按五步看完从材料到文章提纲的主路径。",
    activeStepKey: active?.key || "",
    steps
  };
}

export function renderSmartNotesDemoWalkthrough(flow = {}, deps = {}) {
  const { escapeHtml = (value) => String(value ?? "") } = deps;
  const steps = Array.isArray(flow.steps) ? flow.steps : [];
  const activeIndex = Math.max(0, steps.findIndex((step) => step.active));
  const active = steps[activeIndex] || steps[0] || {};
  const action = active.action || "open-demo-note";
  const actionLabel = active.actionLabel || "继续导览";
  return `
    <div class="sidebar-flow-card" data-smart-notes-demo-walkthrough>
      <div>
        <div class="sidebar-flow-kicker">Demo Walkthrough</div>
        <div class="sidebar-flow-title">${escapeHtml(flow.title || "Smart Notes Demo 导览")}</div>
        <div class="sidebar-flow-note">${escapeHtml(flow.note || "下一步只做一个动作。")}</div>
      </div>
      <div class="sidebar-flow-current" aria-label="Smart Notes demo 当前步骤">
        <span>第 ${escapeHtml(activeIndex + 1)} / ${escapeHtml(steps.length || 5)} 步</span>
        <strong>${escapeHtml(active.title || "继续 Demo 导览")}</strong>
      </div>
      <button
        class="sidebar-flow-action primary"
        type="button"
        data-sidebar-flow-action="${escapeHtml(action)}"
        data-sidebar-flow-note-id="${escapeHtml(active.targetNoteId || "")}"
      >${escapeHtml(actionLabel)}</button>
    </div>
  `;
}

export function renderSmartNotesDemoGuidePanel(flow = {}, deps = {}) {
  const { escapeHtml = (value) => String(value ?? "") } = deps;
  const steps = Array.isArray(flow.steps) ? flow.steps : [];
  const activeIndex = Math.max(0, steps.findIndex((step) => step.active));
  const active = steps[activeIndex] || steps[0] || {};
  const action = active.action || "open-demo-note";
  const actionLabel = active.actionLabel || "继续导览";
  return `
    <section class="demo-guide-panel-card" data-smart-notes-demo-guide>
      <div class="demo-guide-copy">
        <span>Demo 导览</span>
        <strong>${escapeHtml(flow.title || "Smart Notes Demo 导览")}</strong>
        <p>${escapeHtml(flow.note || "下一步只做一个动作。")}</p>
      </div>
      <div class="demo-guide-current">
        <span>第 ${escapeHtml(activeIndex + 1)} / ${escapeHtml(steps.length || 5)} 步</span>
        <strong>${escapeHtml(active.title || "继续 Demo 导览")}</strong>
      </div>
      <button
        class="demo-guide-action"
        type="button"
        data-sidebar-flow-action="${escapeHtml(action)}"
        data-sidebar-flow-note-id="${escapeHtml(active.targetNoteId || "")}"
      >${escapeHtml(actionLabel)}</button>
    </section>
  `;
}

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
