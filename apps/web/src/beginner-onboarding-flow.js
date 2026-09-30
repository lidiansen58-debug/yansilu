function cleanText(value = "") {
  return String(value || "").trim();
}

function noteIdSet(notes = []) {
  return new Set((Array.isArray(notes) ? notes : []).map((note) => cleanText(note?.id)).filter(Boolean));
}

export const SMART_NOTES_DEMO_WALKTHROUGH_STEPS = [
  {
    key: "first-judgment",
    title: "改写并保存一个观点",
    note: "在“打磨笔记”中改写当前观点，再点“保存当前观点”。原来的问题和来源仍可查看。",
    action: "open-demo-note",
    targetNoteId: "PERM-PERMANENT-NOTE-IS-JUDGMENT",
    noteIds: [
      "GUIDE-SMART-NOTES-START",
      "SRC-SMART-NOTES",
      "FN-PHONE-CAPTURE-UNPROCESSED",
      "LN-PARAPHRASE-IS-FIRST-CHECK",
      "PERM-PARAPHRASE-BEFORE-JUDGMENT",
      "PERM-PERMANENT-NOTE-IS-JUDGMENT"
    ]
  },
  {
    key: "first-relation",
    title: "保存一句关系理由",
    note: "选择一条笔记，写清它怎样支持或限制当前观点，再保存。正文链接和手动关联同样进入网络。",
    action: "open-demo-note-relations",
    targetNoteId: "PERM-UNLINKED-PRACTICE",
    noteIds: ["PERM-UNLINKED-PRACTICE"]
  },
  {
    key: "write-from-notes",
    title: "写一段并保存草稿",
    note: "在示例文章中写一段自己的解释，再点“保存草稿”。提纲中的来源可回到原笔记。",
    action: "open-demo-writing",
    targetNoteId: "WRITE-SMART-NOTES-DEMO",
    noteIds: ["WRITE-SMART-NOTES-DEMO", "DRAFT-SMART-NOTES-DEMO"]
  },
];

export const SMART_NOTES_SHORT_PRACTICE_STEPS = [
  ["practice-explain", "用自己的话检查理解", "PERM-PRACTICE-EXPLAIN"],
  ["practice-reuse", "留下可复用的判断", "PERM-PRACTICE-REUSE"],
  ["practice-write", "让阅读帮助写作", "PERM-PRACTICE-WRITE"]
].map(([key, title, targetNoteId]) => ({
  key, title, targetNoteId, noteIds: [targetNoteId], action: "open-demo-note",
  note: "读卡片中的材料。在“打磨笔记”中写自己的判断、理由和适用条件，再保存当前观点。"
})).concat([
  { key: "practice-relation", title: "说明两个观点为什么有关", targetNoteId: "PERM-PRACTICE-EXPLAIN", noteIds: ["PERM-PRACTICE-EXPLAIN"], action: "open-demo-note-relations", note: "选择“我的观点：怎样留下可复用的笔记”，说明它怎样支持或限制当前判断，再保存。正文链接和手动关联同样进入网络。" },
  { key: "practice-draft", title: "把三个观点写成一段正文", targetNoteId: "WRITE-SHORT-PRACTICE", noteIds: ["WRITE-SHORT-PRACTICE"], action: "open-demo-writing", note: "提纲来自刚保存的三个判断。看完提纲后开始写草稿，写一段自己的解释，再保存。" },
  { key: "practice-export", title: "导出你的短文", targetNoteId: "WRITE-SHORT-PRACTICE", noteIds: ["WRITE-SHORT-PRACTICE"], action: "open-demo-export", note: "打开草稿，在“更多”中选择“导出文章 .md”。选一个笔记库以外的目录，得到可分享的正文。" }
]);

export function smartNotesDemoJudgmentStep(key) {
  return key === "first-judgment" || SMART_NOTES_SHORT_PRACTICE_STEPS.slice(0, 3).some((step) => step.key === key);
}

function normalizedCompletedSteps(value = []) {
  const allowed = new Set([...SMART_NOTES_DEMO_WALKTHROUGH_STEPS, ...SMART_NOTES_SHORT_PRACTICE_STEPS].map((step) => step.key));
  return [...new Set((Array.isArray(value) ? value : []).map((item) => cleanText(item)).filter((key) => allowed.has(key)))];
}

export function completeSmartNotesDemoStep(completedSteps = [], stepKey = "") {
  const completed = normalizedCompletedSteps(completedSteps);
  const cleanKey = cleanText(stepKey);
  return cleanKey && [...SMART_NOTES_DEMO_WALKTHROUGH_STEPS, ...SMART_NOTES_SHORT_PRACTICE_STEPS].some((step) => step.key === cleanKey)
    ? [...new Set([...completed, cleanKey])]
    : completed;
}

export function isSmartNotesDemoScope(notes = []) {
  const ids = noteIdSet(notes);
  return ids.has("GUIDE-SHORT-PRACTICE") || ids.has("GUIDE-SMART-NOTES-START") || ids.has("GUIDE-SN-001") || ids.has("SRC-SMART-NOTES");
}

export function buildSmartNotesDemoWalkthrough({ notes = [], completedSteps = [] } = {}) {
  const ids = noteIdSet(notes);
  if (!isSmartNotesDemoScope(notes)) return null;
  const short = ids.has("GUIDE-SHORT-PRACTICE");
  const definitions = short ? SMART_NOTES_SHORT_PRACTICE_STEPS : SMART_NOTES_DEMO_WALKTHROUGH_STEPS;
  const completed = normalizedCompletedSteps(completedSteps).filter((key) => definitions.some((step) => step.key === key));
  const availableSteps = definitions.map((step) => ({
    ...step,
    available: step.noteIds.some((id) => ids.has(id)) || ids.has(step.targetNoteId)
  }));
  const activeIndex = availableSteps.findIndex((step) => !completed.includes(step.key));
  const steps = availableSteps.map((step, index) => ({
    ...step,
    done: completed.includes(step.key),
    active: index === activeIndex && !completed.includes(step.key)
  }));
  const finished = activeIndex === -1;
  const active = finished ? null : steps[activeIndex] || null;
  return {
    kind: "smart-notes-demo",
    title: "从观点到文章",
    note: finished ? (short ? "三个判断、关系理由和正文已保存，短文已导出。接下来可以用自己的材料再做一遍。" : "观点、关系理由和草稿修改已保存。需要带走正文时，在写作的“更多”中导出文章。") : active.note,
    activeStepKey: active?.key || "",
    completedCount: completed.length,
    finished,
    steps
  };
}

export function smartNotesDemoActionLabel(step = {}, index = 0) {
  const action = cleanText(step.action);
  if (action === "open-demo-note-relations") return "打开并关联";
  if (action === "open-demo-writing") return step.key === "practice-draft" ? "查看短文提纲" : "继续示例草稿";
  if (action === "open-demo-export") return "打开短文草稿";
  if (action === "open-demo-review") return "回到首页";
  if (cleanText(step.key) === "first-judgment") return "改写示例观点";
  if (smartNotesDemoJudgmentStep(step.key)) return "写下我的判断";
  return `打开第 ${Number(index) + 1 || 1} 步笔记`;
}

function smartNotesDemoActionCanRun(step = {}) {
  const action = cleanText(step.action || "open-demo-note");
  if (action === "open-demo-note" || action === "open-demo-note-relations") {
    return !!cleanText(step.targetNoteId);
  }
  return !!action;
}

function walkthroughCurrent(flow = {}) {
  const steps = Array.isArray(flow.steps) ? flow.steps : [];
  const activeIndex = steps.findIndex((step) => step.active);
  if (activeIndex >= 0) return { steps, activeIndex, active: steps[activeIndex], finished: false };
  return {
    steps,
    activeIndex: steps.length,
    active: { action: "open-demo-review", title: "完成体验", targetNoteId: "" },
    finished: flow.finished === true
  };
}

export function renderSmartNotesDemoWalkthrough(flow = {}, deps = {}) {
  const { escapeHtml = (value) => String(value ?? "") } = deps;
  const { steps, activeIndex, active, finished } = walkthroughCurrent(flow);
  const action = active.action || "open-demo-note";
  const actionLabel = finished ? "回到首页" : smartNotesDemoActionLabel(active, activeIndex);
  const canRunAction = smartNotesDemoActionCanRun(active);
  return `
    <div class="sidebar-flow-card" data-smart-notes-demo-walkthrough>
      <div>
        <div class="sidebar-flow-kicker">动手练习</div>
        <div class="sidebar-flow-title">${escapeHtml(flow.title || "从记录到写作")}</div>
        <div class="sidebar-flow-note">${escapeHtml(flow.note || "下一步只做一个动作。")}</div>
      </div>
      <div class="sidebar-flow-current" aria-label="Smart Notes demo 当前步骤">
        <span>${finished ? "已完成" : `第 ${activeIndex + 1} / ${steps.length || 3} 步`}</span>
        <strong>${escapeHtml(active.title || "继续 Demo 导览")}</strong>
      </div>
      <button
        class="sidebar-flow-action primary"
        type="button"
        data-sidebar-flow-action="${escapeHtml(action)}"
        data-sidebar-flow-note-id="${escapeHtml(active.targetNoteId || "")}"
        data-sidebar-flow-step-key="${escapeHtml(active.key || "")}"
        ${canRunAction ? "" : "disabled"}
      >${escapeHtml(actionLabel)}</button>
    </div>
  `;
}

export function renderSmartNotesDemoGuidePanel(flow = {}, deps = {}) {
  const { escapeHtml = (value) => String(value ?? "") } = deps;
  const { steps, activeIndex, active, finished } = walkthroughCurrent(flow);
  const action = active.action || "open-demo-note";
  const actionLabel = finished ? "回到首页" : smartNotesDemoActionLabel(active, activeIndex);
  const canRunAction = smartNotesDemoActionCanRun(active);
  return `
    <section class="demo-guide-panel-card" data-smart-notes-demo-guide>
      <div class="demo-guide-copy">
        <span>动手练习</span>
        <strong>${escapeHtml(flow.title || "从记录到写作")}</strong>
        <p>${escapeHtml(flow.note || "下一步只做一个动作。")}</p>
      </div>
      <div class="demo-guide-current">
        <span>${finished ? "已完成" : `第 ${activeIndex + 1} / ${steps.length || 3} 步`}</span>
        <strong>${escapeHtml(active.title || "继续 Demo 导览")}</strong>
      </div>
      <button
        class="demo-guide-action"
        type="button"
        data-sidebar-flow-action="${escapeHtml(action)}"
        data-sidebar-flow-note-id="${escapeHtml(active.targetNoteId || "")}"
        data-sidebar-flow-step-key="${escapeHtml(active.key || "")}"
        ${canRunAction ? "" : "disabled"}
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
