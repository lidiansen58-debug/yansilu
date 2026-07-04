import {
  buildSmartNotesDemoWalkthrough,
  renderSmartNotesDemoWalkthrough
} from "./beginner-onboarding-flow.js";

export function sidebarFlowNoteHasNetworkSignal(note = null, deps = {}) {
  const {
    parseLinks = () => [],
    parseTags = () => []
  } = deps;
  const bodyLinks = parseLinks(note?.body || "");
  const bodyTags = parseTags(note?.body || "");
  return bodyLinks.length > 0 || bodyTags.length > 0;
}

export function distillationSummaryForSidebarFlow(notes = [], deps = {}) {
  const {
    distillationStatusOf = () => "",
    noteHasBoundarySignal = () => false
  } = deps;
  return notes.reduce(
    (acc, note) => {
      const thesis = String(note?.thesis || "").trim();
      const summary = Array.isArray(note?.threeLineSummary) ? note.threeLineSummary.filter((item) => String(item || "").trim()) : [];
      const confirmed = distillationStatusOf(note) === "confirmed";
      if (!thesis) acc.missingThesis += 1;
      if (summary.length < 3) acc.missingSummary += 1;
      if (!confirmed && thesis && summary.length >= 3) acc.needsConfirm += 1;
      if (!noteHasBoundarySignal(note)) acc.missingBoundary += 1;
      if (!confirmed) acc.pending += 1;
      if (confirmed) acc.confirmed += 1;
      if (confirmed && thesis && summary.length >= 3) acc.writingReady += 1;
      return acc;
    },
    {
      pending: 0,
      confirmed: 0,
      writingReady: 0,
      missingThesis: 0,
      missingSummary: 0,
      needsConfirm: 0,
      missingBoundary: 0
    }
  );
}

export function buildExplorerSidebarFlowState({ rootId = "", currentNotes = [], originalNotes = [], allNotes = [], selectedNoteId = "" } = {}, deps = {}) {
  const {
    noteHasGeneratedOriginal = () => false,
    isPermanentLikeNote = () => false
  } = deps;
  const demoWalkthrough = buildSmartNotesDemoWalkthrough({
    notes: [
      ...(Array.isArray(allNotes) ? allNotes : []),
      ...(Array.isArray(currentNotes) ? currentNotes : []),
      ...(Array.isArray(originalNotes) ? originalNotes : [])
    ],
    selectedNoteId
  });
  if (demoWalkthrough) return demoWalkthrough;
  const isOriginal = rootId === "dir_original_default";
  const isFleeting = rootId === "dir_fleeting_default";
  const isLiterature = rootId === "dir_literature_default";
  const linkedOriginalCount = originalNotes.filter((note) => sidebarFlowNoteHasNetworkSignal(note, deps)).length;
  const generatedMaterialCount = currentNotes.filter(noteHasGeneratedOriginal).length;
  const pendingMaterialCount = Math.max(0, currentNotes.length - generatedMaterialCount);
  const distillation = distillationSummaryForSidebarFlow(originalNotes.filter((note) => isPermanentLikeNote(note)), deps);
  const topGaps = [
    distillation.missingThesis ? `缺一句话判断 ${distillation.missingThesis}` : "",
    distillation.missingSummary ? `缺三句话压缩 ${distillation.missingSummary}` : "",
    distillation.needsConfirm ? `待确认观点 ${distillation.needsConfirm}` : "",
    distillation.missingBoundary ? `缺边界/反例 ${distillation.missingBoundary}` : ""
  ].filter(Boolean);
  const primaryAction = distillation.pending > 0 ? "continue-distillation" : distillation.writingReady > 0 ? "open-writing" : "create-permanent";
  const title = isOriginal
    ? "观点形成进度"
    : isLiterature
      ? "文献是证据入口"
      : isFleeting
        ? "随笔是想法入口"
        : "当前目录接入主路";
  const note = isOriginal
    ? topGaps.length
      ? `下一步：${topGaps.slice(0, 2).join("，")}。`
      : distillation.writingReady
        ? "当前观点已经可以进入写作中心。"
        : "先写出第一条可以被确认的观点。"
    : isLiterature
      ? "先写转述，再记录永久笔记。来源字段保留追溯能力，但不让资料管理盖过判断形成。"
      : isFleeting
        ? "先捕捉还不成熟的问题和材料，等它出现判断，再单独沉淀为永久笔记。"
        : "这一级目录会被放回永久笔记、关系网络、可写主题和写作中心的路径里理解。";
  const steps = isOriginal
    ? [
        ["写一句判断", distillation.missingThesis < originalNotes.length],
        ["压缩成三句话", distillation.missingSummary < originalNotes.length],
        ["确认观点", distillation.confirmed > 0],
        ["写作中心", distillation.writingReady > 0]
      ]
    : [
        ["素材入口", true],
        ["记录永久笔记", generatedMaterialCount > 0],
        ["关系网络", linkedOriginalCount > 0],
        ["写作中心", false]
      ];
  const metrics = isOriginal
    ? [
        [distillation.pending, "待提纯"],
        [distillation.confirmed, "已确认观点"],
        [distillation.writingReady, "可进入写作中心"]
      ]
    : [
        [currentNotes.length, "素材条目"],
        [generatedMaterialCount, "已生成永久笔记"],
        [pendingMaterialCount, "待处理"]
      ];

  return {
    isOriginal,
    title,
    note,
    steps,
    metrics,
    topGaps,
    primaryAction
  };
}

export function renderExplorerSidebarFlowMarkup(flowState = {}, deps = {}) {
  const { escapeHtml = (value) => String(value ?? "") } = deps;
  if (flowState?.kind === "smart-notes-demo") {
    return renderSmartNotesDemoWalkthrough(flowState, { escapeHtml });
  }
  const {
    isOriginal = false,
    title = "",
    note = "",
    steps = [],
    metrics = [],
    topGaps = [],
    primaryAction = ""
  } = flowState;
  return `
    <div class="sidebar-flow-card">
      <div>
        <div class="sidebar-flow-kicker">${isOriginal ? "Main Route" : "Material Route"}</div>
        <div class="sidebar-flow-title">${escapeHtml(title)}</div>
        <div class="sidebar-flow-note">${escapeHtml(note)}</div>
      </div>
      <div class="sidebar-flow-steps" aria-label="当前工作路径">
        ${steps.map(([label, active]) => `<div class="sidebar-flow-step ${active ? "is-active" : ""}">${escapeHtml(label)}</div>`).join("")}
      </div>
      <div class="sidebar-flow-metrics">
        ${metrics
          .map(
            ([value, label]) => `
              <div class="sidebar-flow-metric">
                <strong>${Number(value) || 0}</strong>
                <span>${escapeHtml(label)}</span>
              </div>
            `
          )
          .join("")}
      </div>
      ${
        isOriginal
          ? `<div class="sidebar-flow-gaps">${topGaps.length ? topGaps.map((gap) => `<span>${escapeHtml(gap)}</span>`).join("") : `<span>观点链路已清爽</span>`}</div>
             <button class="mini-btn primary sidebar-flow-action" type="button" data-sidebar-flow-action="${escapeHtml(primaryAction)}">${escapeHtml(
               primaryAction === "continue-distillation" ? "继续整理观点" : primaryAction === "open-writing" ? "进入写作中心" : "新建永久笔记"
             )}</button>`
          : ""
      }
    </div>
  `;
}

export function renderExplorerSidebarFlowForRuntime({ rootId = "", element = null, currentNotes = [], originalNotes = [], allNotes = [], selectedNoteId = "" } = {}, deps = {}) {
  if (!element) return null;
  element.innerHTML = "";
  element.classList?.add?.("hidden");
  return null;
}

export async function handleSidebarFlowAction(event, deps = {}) {
  const {
    activateModule = () => {},
    openDistillationModule = async () => {},
    openWritingModule = async () => {},
    state = {},
    handleStateChange = async () => {},
    openNoteById = () => false,
    dismissSafeOverlaysForNavigation = () => ({ ok: true })
  } = deps;
  const button = event?.target?.closest?.("[data-sidebar-flow-action]");
  if (!button) return false;
  const action = String(button.dataset?.sidebarFlowAction || button.getAttribute?.("data-sidebar-flow-action") || "").trim();
  const dismissed = dismissSafeOverlaysForNavigation();
  if (dismissed && dismissed.ok === false) return false;
  if (action === "continue-distillation") {
    activateModule("distillation");
    await openDistillationModule();
    return true;
  }
  if (action === "open-writing") {
    activateModule("writing");
    await openWritingModule();
    return true;
  }
  if (action === "create-permanent") {
    state.browserRootId = "dir_original_default";
    state.selectedFolderId = "dir_original_default";
    await handleStateChange("create-note-in-selected-folder");
    return true;
  }
  if (action === "open-demo-note" || action === "open-demo-note-relations") {
    const noteId = String(button.dataset?.sidebarFlowNoteId || button.getAttribute?.("data-sidebar-flow-note-id") || "").trim();
    if (!noteId) return false;
    activateModule("explorer");
    openNoteById(noteId, { preferTitleSelection: false });
    if (action === "open-demo-note-relations") {
      await handleStateChange("open-note-relations", { noteId, source: "smart-notes-demo-walkthrough" });
    }
    return true;
  }
  if (action === "open-demo-writing") {
    activateModule("writing");
    await openWritingModule();
    return true;
  }
  if (action === "open-demo-review") {
    activateModule("today");
    return true;
  }
  return false;
}

export function installSidebarFlowEventHandler(options = {}) {
  const { $ = () => null, depsProvider = () => ({}) } = options;
  const handler = async (event) => {
    await handleSidebarFlowAction(event, depsProvider());
  };
  return ["demoGuidePanel"].map((id) => {
    const element = $(id);
    element?.addEventListener?.("click", handler);
    return { id, eventName: "click", handler, installed: !!element };
  });
}
