import { graphDirectNetworkEdgeCount } from "./graph-relation-state-query.js";

function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isolatedQueueItemMeta(item = {}) {
  const parts = [];
  if (Number(item.aiCount || 0) > 0) parts.push(`AI 候选 ${Number(item.aiCount || 0)}`);
  if (Number(item.localCount || 0) > 0) parts.push(`本地线索 ${Number(item.localCount || 0)}`);
  if (!parts.length) parts.push(item.decision?.label || "待关联");
  return parts.join(" · ");
}

export function createGraphIsolatedWorkflowShellRenderer({
  escapeHtml = defaultEscapeHtml,
  isolatedQueueItems = () => [],
  nextIsolatedQueueItem = () => null,
  resolveIsolatedSelection = () => null,
  allNotes = () => [],
  fullNoteById = () => null,
  nodeTitle = (_nodeMap, id = "", fallback = "") => fallback || id,
  noteTypeLabel = (value = "") => value || "永久笔记",
  decisionMeta = () => ({ tone: "bridge" }),
  relationStatusCountsAsNetworkEdge = () => true,
  renderSelectionShell = () => "",
  renderRelationWorkspaceForNote = () => "",
  renderJoinNetworkFlow = () => "",
  renderNextStepActions = () => ""
} = {}) {
  const noteFromSources = (noteId = "", nodeMap = new Map()) => {
    const cleanNoteId = String(noteId || "").trim();
    return nodeMap.get(cleanNoteId) || allNotes().find((item) => String(item?.id || "").trim() === cleanNoteId) || {};
  };

  const renderQueue = ({ isolatedNotes = [], nodeMap = new Map(), edges = [], currentNoteId = "", compact = false, limit = 8, queueItems: providedQueueItems = null } = {}) => {
    const queueItems = Array.isArray(providedQueueItems)
      ? providedQueueItems
      : isolatedQueueItems({ isolatedNotes, nodeMap, edges, currentNoteId, limit });
    if (!queueItems.length) return "";
    const cleanCurrentNoteId = String(currentNoteId || "").trim();
    const nextItem = nextIsolatedQueueItem(queueItems, cleanCurrentNoteId);
    const total = queueItems.length;
    const currentIndex = queueItems.findIndex((item) => item.noteId === cleanCurrentNoteId);
    const title = compact ? "继续处理待关联笔记" : "待关联的永久笔记";
    const note = compact
      ? currentIndex >= 0
        ? `当前第 ${currentIndex + 1} 条。确认关系后，再处理下一条。`
        : "先从最可能找到关系的笔记开始。"
      : `${total} 条永久笔记还需要确认关系。优先处理已有候选线索的笔记。`;
    return `
      <section class="graph-isolated-queue${compact ? " is-compact" : ""}" aria-label="${escapeHtml(title)}">
        <div class="graph-isolated-queue-head">
          <div>
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(note)}</span>
          </div>
          ${
            nextItem
              ? `<button class="graph-selection-action is-queue" type="button" data-graph-select-isolated="${escapeHtml(nextItem.isolatedKey)}" data-graph-isolated-note="${escapeHtml(nextItem.noteId)}">${escapeHtml(cleanCurrentNoteId ? "处理下一条" : "处理第一条")}</button>`
              : ""
          }
        </div>
        <div class="graph-isolated-queue-list">
          ${queueItems
            .map(
              (item, index) => `
                <article class="graph-isolated-queue-item${item.current ? " is-current" : ""} is-${escapeHtml(item.decision?.tone || "bridge")}">
                  <button class="graph-isolated-queue-main" type="button" data-graph-select-isolated="${escapeHtml(item.isolatedKey)}" data-graph-isolated-note="${escapeHtml(item.noteId)}">
                    <span>${escapeHtml(`第 ${index + 1} 条待关联`)}</span>
                    <strong>${escapeHtml(item.title)}</strong>
                    <small>${escapeHtml(item.firstCandidateTitle ? `可能关联到：${item.firstCandidateTitle}` : item.thesis || item.decision?.next || "需要判断：建立关系、暂存观察，还是先重写这条笔记。")}</small>
                  </button>
                  <em>${escapeHtml(isolatedQueueItemMeta(item))}</em>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  };

  const renderQueueStrip = ({ isolatedNotes = [], nodeMap = new Map(), edges = [], currentNoteId = "", queueItems: providedQueueItems = null } = {}) => {
    const queueItems = Array.isArray(providedQueueItems)
      ? providedQueueItems
      : isolatedQueueItems({ isolatedNotes, nodeMap, edges, currentNoteId, limit: 6 });
    if (!queueItems.length) return "";
    const nextItem = nextIsolatedQueueItem(queueItems, currentNoteId);
    if (!nextItem) return "";
    const total = queueItems.length;
    return `
      <div class="graph-isolated-queue-strip" aria-label="待关联笔记连续整理入口">
        <div>
          <strong>${escapeHtml(`${String(total)} 条笔记待关联`)}</strong>
          <span>${escapeHtml(`下一条：${nextItem.title}`)}</span>
        </div>
        <button class="graph-selection-action is-primary is-queue" type="button" data-graph-select-isolated="${escapeHtml(nextItem.isolatedKey)}" data-graph-isolated-note="${escapeHtml(nextItem.noteId)}">处理下一条</button>
        <button class="graph-selection-action is-queue" type="button" data-graph-open-workbench-entry="organize">查看待关联笔记</button>
      </div>
    `;
  };

  const renderWorkflowTabs = ({ noteId = "", nodeMap = new Map(), edges = [], visibleEdgeCount = 0 } = {}) => {
    const cleanNoteId = String(noteId || "").trim();
    if (!cleanNoteId) return "";
    return `
      <section class="graph-isolated-workflow" aria-label="待关联笔记处理">
        <div class="graph-isolated-workflow-head">
          <div>
            <strong>把这条笔记接入关系网</strong>
            <p>只做一件事：选目标笔记、选关系类型、写理由，然后保存。</p>
          </div>
          <span>${escapeHtml(visibleEdgeCount ? "已有关系" : "未关联")}</span>
        </div>
        ${renderJoinNetworkFlow(cleanNoteId, { nodeMap, edges, visibleEdgeCount })}
      </section>
    `;
  };

  const renderSelectionPanel = ({ selection = null, isolatedNotes = [], nodeMap = new Map(), edges = [] } = {}) => {
    const isolated = resolveIsolatedSelection(selection, isolatedNotes, [...nodeMap.values()]);
    if (!isolated) return "";
    const noteId = String(isolated.noteId || "").trim();
    const note = noteFromSources(noteId, nodeMap);
    const title = String(isolated.title || note?.title || noteId || "待关联笔记").trim() || "待关联笔记";
    const item = isolated.item || {};
    const thesis = String(item?.thesis || note?.thesis || "").trim();
    const decision = decisionMeta(item, note);
    const visibleEdgeCount = graphDirectNetworkEdgeCount(noteId, edges, { relationStatusCountsAsNetworkEdge });
    const isolatedQueueMarkup = renderQueue({ isolatedNotes, nodeMap, edges, currentNoteId: noteId, compact: true, limit: 6 });
    return renderSelectionShell({
      className: `is-isolated is-${decision.tone}`,
      ariaLabel: "待关联笔记整理详情",
      kicker: "待关联笔记",
      title,
      meta: visibleEdgeCount ? `已保存 ${visibleEdgeCount} 条关系` : "还没有正式关系",
      closeLabel: "收起待关联笔记整理",
      roleLabel: "",
      roleDetail: "",
      task: null,
      body: `
        ${thesis ? `<section class="graph-selection-reason"><small>当前判断</small><p>${escapeHtml(thesis)}</p></section>` : ""}
        ${visibleEdgeCount
          ? `${renderRelationWorkspaceForNote(noteId, { nodeMap, edges, title: "已保存的关系" })}${renderNextStepActions(noteId, { isolatedNotes, nodeMap, edges })}`
          : renderWorkflowTabs({ noteId, isolatedQueueMarkup, nodeMap, edges, visibleEdgeCount })}`,
      actions: ""
    });
  };

  const renderCompletePanel = ({ selection = null, isolatedNotes = [], nodeMap = new Map(), edges = [] } = {}) => {
    const noteId = String(selection?.noteId || selection?.nodeId || "").trim();
    if (!noteId) return "";
    const note = fullNoteById(noteId, nodeMap) || {};
    const title = nodeTitle(nodeMap, noteId, note.title || "当前笔记");
    const result = selection?.saveResult || {};
    const queueItems = isolatedQueueItems({ isolatedNotes, nodeMap, edges, currentNoteId: noteId, limit: 8 });
    const nextItem = nextIsolatedQueueItem(queueItems, noteId);
    const directRelationCount = graphDirectNetworkEdgeCount(noteId, edges, { relationStatusCountsAsNetworkEdge });
    return renderSelectionShell({
      className: "is-isolated is-complete",
      ariaLabel: "待关联笔记已处理",
      kicker: "已接入关系网",
      title,
      meta: `${noteTypeLabel(note.noteType)} · 当前关系 ${directRelationCount} 条`,
      closeLabel: "收起处理结果",
      body: `
        <section class="graph-isolated-complete-card">
          <small>关系已保存</small>
          <strong>${escapeHtml(result.targetTitle ? `已关联到：${result.targetTitle}` : "这条笔记已退出未关联状态")}</strong>
          <p>${escapeHtml(result.relationLabel ? `关系类型：${result.relationLabel}。现在可以继续处理下一条，或者查看当前笔记周边关系。` : "现在可以继续处理下一条，或者查看当前笔记周边关系。")}</p>
        </section>
        <div class="graph-isolated-complete-actions">
          ${
            nextItem
              ? `<button class="graph-selection-action is-primary" type="button" data-graph-select-isolated="${escapeHtml(nextItem.isolatedKey)}" data-graph-isolated-note="${escapeHtml(nextItem.noteId)}">处理下一条：${escapeHtml(nextItem.title)}</button>`
              : `<span class="graph-isolated-complete-empty">当前范围没有其它待关联笔记。</span>`
          }
        </div>
        ${renderRelationWorkspaceForNote(noteId, { nodeMap, edges, title: "已保存关系" })}`,
      actions: ""
    });
  };

  return {
    renderQueue,
    renderQueueStrip,
    renderWorkflowTabs,
    renderSelectionPanel,
    renderCompletePanel
  };
}
