function cleanText(value = "") {
  return String(value || "").trim();
}

function noteIdSet(notes = []) {
  return new Set((Array.isArray(notes) ? notes : []).map((note) => cleanText(note?.id)).filter(Boolean));
}

export const SMART_NOTES_DEMO_WALKTHROUGH_STEPS = [
  {
    key: "source-to-permanent",
    title: "看来源变判断",
    note: "从材料、转述看到永久笔记。",
    action: "open-demo-note",
    actionLabel: "打开 PN-SN-001",
    targetNoteId: "PN-SN-001",
    noteIds: ["GUIDE-SN-001", "SRC-SMART-NOTES", "FN-SN-001", "LN-SN-001", "PN-SN-001"]
  },
  {
    key: "connect-relation",
    title: "补一条关系理由",
    note: "让孤立永久笔记进入关系网。",
    action: "open-demo-note-relations",
    actionLabel: "连接 PN-SN-101",
    targetNoteId: "PN-SN-101",
    noteIds: ["PN-SN-101"]
  },
  {
    key: "theme-index",
    title: "读主题索引",
    note: "看中心问题和关键笔记。",
    action: "open-demo-note",
    actionLabel: "打开 IC-SN-001",
    targetNoteId: "IC-SN-001",
    noteIds: ["IC-SN-001", "IC-SN-005", "IC-SN-010"]
  },
  {
    key: "writing-outline",
    title: "进写作中心",
    note: "从可写主题生成文章提纲。",
    action: "open-demo-writing",
    actionLabel: "打开写作中心",
    targetNoteId: "WP-SN-PM-001",
    noteIds: ["WP-SN-PM-001", "DS-SN-PM-001"]
  },
  {
    key: "review-next",
    title: "做一次回顾",
    note: "看孤立笔记、宽标签、关系理由和可写主题。",
    action: "open-demo-review",
    actionLabel: "打开今日整理",
    targetNoteId: "",
    noteIds: []
  }
];

export function isSmartNotesDemoScope(notes = []) {
  const ids = noteIdSet(notes);
  return ids.has("GUIDE-SN-001") || ids.has("SRC-SMART-NOTES");
}

export function buildSmartNotesDemoWalkthrough({ notes = [], selectedNoteId = "" } = {}) {
  const ids = noteIdSet(notes);
  if (!isSmartNotesDemoScope(notes)) return null;
  const activeNoteId = cleanText(selectedNoteId);
  const availableSteps = SMART_NOTES_DEMO_WALKTHROUGH_STEPS.map((step) => ({
    ...step,
    available: step.noteIds.some((id) => ids.has(id)) || ids.has(step.targetNoteId)
  }));
  const activeIndex = Math.max(0, availableSteps.findIndex((step) => step.noteIds.includes(activeNoteId) || step.targetNoteId === activeNoteId));
  const steps = availableSteps.map((step, index) => ({
    ...step,
    done: index < activeIndex,
    active: index === activeIndex
  }));
  const active = steps[activeIndex] || steps[0] || null;
  return {
    kind: "smart-notes-demo",
    title: "Smart Notes 五步 walkthrough",
    note: active ? `下一步：${active.title}。${active.note}` : "按五步看完从材料到文章提纲的主路径。",
    activeStepKey: active?.key || "",
    steps
  };
}

export function renderSmartNotesDemoWalkthrough(flow = {}, deps = {}) {
  const { escapeHtml = (value) => String(value ?? "") } = deps;
  const steps = Array.isArray(flow.steps) ? flow.steps : [];
  return `
    <div class="sidebar-flow-card" data-smart-notes-demo-walkthrough>
      <div>
        <div class="sidebar-flow-kicker">Demo Walkthrough</div>
        <div class="sidebar-flow-title">${escapeHtml(flow.title || "Smart Notes 五步 walkthrough")}</div>
        <div class="sidebar-flow-note">${escapeHtml(flow.note || "下一步只做一个动作。")}</div>
      </div>
      <div class="sidebar-flow-steps" aria-label="Smart Notes demo 五步路线">
        ${steps.map((step, index) => `
          <button
            class="sidebar-flow-step ${step.done ? "is-done" : ""} ${step.active ? "is-active" : ""}"
            type="button"
            data-sidebar-flow-action="${escapeHtml(step.action)}"
            data-sidebar-flow-note-id="${escapeHtml(step.targetNoteId)}"
          >
            ${escapeHtml(index + 1)}. ${escapeHtml(step.title)}
          </button>
        `).join("")}
      </div>
      <div class="sidebar-flow-gaps">
        ${steps.map((step) => `<span>${escapeHtml(step.actionLabel)}</span>`).join("")}
      </div>
    </div>
  `;
}

export function writingBeginnerMainline({
  basketCount = 0,
  hasProject = false,
  hasScaffold = false,
  strongModelReady = false,
  projectEntry = null,
  basketReadiness = null
} = {}) {
  if (Number(basketCount || 0) <= 0) {
    return {
      stage: "material",
      label: "先补材料",
      title: "下一步只选相关笔记",
      body: "挑 2-5 条能回答同一问题的永久笔记。先不用生成提纲。",
      actionLabel: "加入相关笔记"
    };
  }
  if (!hasProject) {
    return {
      stage: "theme",
      label: "可保存主题",
      title: "这组笔记可以先确定可写主题",
      body: basketReadiness?.hint || "确认题目、中心问题和读者后，再保存为可写主题。",
      actionLabel: projectEntry?.actionLabel || "确定可写主题"
    };
  }
  if (!hasScaffold) {
    return {
      stage: "outline",
      label: "可生成提纲",
      title: "主题已确定，下一步生成文章提纲",
      body: "先让系统把章节、证据和缺口摊开，再决定是否开始草稿。",
      actionLabel: "生成文章提纲"
    };
  }
  if (strongModelReady) {
    return {
      stage: "ai-check",
      label: "可做 AI 写作检查",
      title: "提纲已具备，可以做 AI 写作检查",
      body: "AI 只给结构、证据和缺口建议；是否采纳仍由你确认。",
      actionLabel: "准备 AI 写作检查"
    };
  }
  return {
    stage: "outline",
    label: "可生成提纲",
    title: "先检查文章提纲",
    body: "当前还不适合做 AI 写作检查，先补缺口、反方或读者收益。",
    actionLabel: "检查文章提纲"
  };
}

export function renderWritingBeginnerMainlineView(mainline = {}, deps = {}) {
  const { escapeHtml = (value) => String(value ?? "") } = deps;
  return `
    <section class="writing-summary" data-writing-beginner-mainline data-stage="${escapeHtml(mainline.stage || "")}">
      <div class="sidebar-flow-kicker">新手主线</div>
      <strong>${escapeHtml(mainline.label || "下一步")}</strong>
      <div>${escapeHtml(mainline.title || "下一步只做一件事")}</div>
      <small>${escapeHtml(mainline.body || "")}</small>
      <span class="inspector-chip">${escapeHtml(mainline.actionLabel || "继续")}</span>
    </section>
  `;
}
