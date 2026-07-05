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
  if (Number(item.aiCount || 0) > 0) parts.push(`AI 推荐 ${Number(item.aiCount || 0)}`);
  if (Number(item.localCount || 0) > 0) parts.push(`可选笔记 ${Number(item.localCount || 0)}`);
  if (!parts.length) parts.push(item.decision?.label || "待关联");
  return parts.join(" - ");
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
    const title = compact ? "继续关联其它笔记" : "还没有进入关系网的永久笔记";
    const note = compact
      ? currentIndex >= 0
        ? `当前第 ${currentIndex + 1} 条。保存关系后，可以继续下一条。`
        : "先从最容易找到关联的笔记开始。"
      : `${total} 条永久笔记还没有进入关系网。逐条找到一条合适关系即可。`;
    return `
      <section class="graph-isolated-queue${compact ? " is-compact" : ""}" aria-label="${escapeHtml(title)}">
        <div class="graph-isolated-queue-head">
          <div>
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(note)}</span>
          </div>
          ${
            nextItem
              ? `<button class="graph-selection-action is-queue" type="button" data-graph-select-isolated="${escapeHtml(nextItem.isolatedKey)}" data-graph-isolated-note="${escapeHtml(nextItem.noteId)}">${escapeHtml(cleanCurrentNoteId ? "关联下一条" : "关联")}</button>`
              : ""
          }
        </div>
        <div class="graph-isolated-queue-list">
          ${queueItems
            .map(
              (item, index) => `
                <article class="graph-isolated-queue-item${item.current ? " is-current" : ""} is-${escapeHtml(item.decision?.tone || "bridge")}">
                  <button class="graph-isolated-queue-main" type="button" data-graph-select-isolated="${escapeHtml(item.isolatedKey)}" data-graph-isolated-note="${escapeHtml(item.noteId)}">
                    <span>${escapeHtml(`第 ${index + 1} 条`)}</span>
                    <strong>${escapeHtml(item.title)}</strong>
                    <small>${escapeHtml(item.firstCandidateTitle ? `可能关联到：${item.firstCandidateTitle}` : item.thesis || item.decision?.next || "为它找到一条合适的永久笔记关系。")}</small>
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

  const renderQueueStrip = ({ isolatedNotes = [], nodeMap = new Map(), edges = [], currentNoteId = "", queueItems: providedQueueItems = null, collapsed = false } = {}) => {
    const queueItems = Array.isArray(providedQueueItems)
      ? providedQueueItems
      : isolatedQueueItems({ isolatedNotes, nodeMap, edges, currentNoteId, limit: 6 });
    if (!queueItems.length) return "";
    const nextItem = nextIsolatedQueueItem(queueItems, currentNoteId);
    if (!nextItem) return "";
    const total = queueItems.length;
    return `
      <div class="graph-isolated-queue-strip${collapsed ? " is-collapsed" : ""}" data-graph-isolated-queue-strip aria-label="待关联笔记连续整理入口">
        <div>
          <strong>${escapeHtml(`${String(total)} 条笔记还没进入关系网`)}</strong>
          <span class="graph-isolated-queue-detail">${escapeHtml(`下一条：${nextItem.title}`)}</span>
        </div>
        <button class="graph-selection-action is-primary is-queue" type="button" data-graph-select-isolated="${escapeHtml(nextItem.isolatedKey)}" data-graph-isolated-note="${escapeHtml(nextItem.noteId)}">关联</button>
        <button class="graph-selection-action is-queue" type="button" data-graph-open-workbench-entry="organize">查看</button>
        <button class="graph-isolated-queue-toggle" type="button" data-graph-queue-strip-toggle aria-expanded="${collapsed ? "false" : "true"}">${collapsed ? "展开" : "收起"}</button>
      </div>
    `;
  };

  const renderWorkflowTabs = ({ noteId = "", nodeMap = new Map(), edges = [], visibleEdgeCount = 0 } = {}) => {
    const cleanNoteId = String(noteId || "").trim();
    if (!cleanNoteId) return "";
    return `
      <section class="graph-isolated-workflow" aria-label="孤立永久笔记关联">
        <div class="graph-isolated-workflow-head">
          <div>
            <strong>这条永久笔记还没有进入关系网</strong>
            <p>只做一件事：找到一条合适关系并保存。</p>
          </div>
          <span>${escapeHtml(visibleEdgeCount ? "已有关系" : "未关联")}</span>
        </div>
        ${renderJoinNetworkFlow(cleanNoteId, { nodeMap, edges, visibleEdgeCount })}
      </section>
    `;
  };

  const renderSelectionPanel = ({ selection = null, isolatedNotes = [], nodeMap = new Map(), edges = [] } = {}) => {
    const isolated = resolveIsolatedSelection(selection, isolatedNotes, [...nodeMap.values()]) || (selection?.noteId
      ? {
          noteId: String(selection.noteId || "").trim(),
          isolatedKey: String(selection.isolatedKey || selection.noteId || "").trim(),
          title: String(selection.title || "").trim(),
          item: {}
        }
      : null);
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
      ariaLabel: "孤立永久笔记关联",
      kicker: "孤立笔记",
      title,
      meta: visibleEdgeCount ? `已保存 ${visibleEdgeCount} 条关系` : "还没有进入关系网",
      closeLabel: "收起关联面板",
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
    const queuedNextItem = nextIsolatedQueueItem(queueItems, noteId);
    const connected = new Set();
    for (const edge of Array.isArray(edges) ? edges : []) {
      const fromNoteId = String(edge?.fromNoteId || edge?.from || edge?.source || "").trim();
      const toNoteId = String(edge?.toNoteId || edge?.to || edge?.target || "").trim();
      if (fromNoteId) connected.add(fromNoteId);
      if (toNoteId) connected.add(toNoteId);
    }
    const fallbackNextNode = queuedNextItem ? null : [...nodeMap.values()].find((node) => {
      const candidateNoteId = String(node?.id || node?.noteId || "").trim();
      if (!candidateNoteId || candidateNoteId === noteId) return false;
      return !connected.has(candidateNoteId) && Number(node?.degree || 0) <= 0;
    });
    const nextItem = queuedNextItem || (fallbackNextNode
      ? {
          noteId: String(fallbackNextNode.id || fallbackNextNode.noteId || "").trim(),
          isolatedKey: String(fallbackNextNode.isolatedKey || fallbackNextNode.id || fallbackNextNode.noteId || "").trim(),
          title: String(fallbackNextNode.title || fallbackNextNode.label || fallbackNextNode.id || "").trim()
        }
      : null);
    const directRelationCount = graphDirectNetworkEdgeCount(noteId, edges, { relationStatusCountsAsNetworkEdge });
    return renderSelectionShell({
      className: "is-isolated is-complete",
      ariaLabel: "孤立笔记已接入关系网",
      kicker: "已接入关系网",
      title,
      meta: `${noteTypeLabel(note.noteType)} - 已保存 ${directRelationCount} 条关系`,
      closeLabel: "收起处理结果",
      body: `
        <section class="graph-isolated-complete-card">
          <small>已建立关系</small>
          <strong>${escapeHtml(result.targetTitle ? `已关联到：${result.targetTitle}` : "这条笔记已退出未关联状态")}</strong>
          <p>${escapeHtml(result.relationLabel ? `关系类型：${result.relationLabel}。这条笔记已经进入关系网。` : "这条笔记已经进入关系网。")}</p>
        </section>
        <div class="graph-isolated-complete-actions">
          ${
            nextItem
              ? `<button class="graph-selection-action is-primary" type="button" data-graph-select-isolated="${escapeHtml(nextItem.isolatedKey)}" data-graph-isolated-note="${escapeHtml(nextItem.noteId)}">继续关联：${escapeHtml(nextItem.title)}</button>`
              : `<span class="graph-isolated-complete-empty">当前范围没有其它孤立笔记。</span>`
          }
        </div>
        ${renderRelationWorkspaceForNote(noteId, { nodeMap, edges, title: "已保存关系" })}`,
      actions: ""
    });
  };

  const renderCompletePanelClean = ({ selection = null, isolatedNotes = [], nodeMap = new Map(), edges = [] } = {}) => {
    const noteId = String(selection?.noteId || selection?.nodeId || "").trim();
    if (!noteId) return "";
    const note = fullNoteById(noteId, nodeMap) || {};
    const title = nodeTitle(nodeMap, noteId, note.title || "当前笔记");
    const result = selection?.saveResult || {};
    const resultNext = result?.nextIsolated && typeof result.nextIsolated === "object"
      ? {
          noteId: String(result.nextIsolated.noteId || result.nextIsolated.nodeId || "").trim(),
          isolatedKey: String(result.nextIsolated.isolatedKey || result.nextIsolated.noteId || result.nextIsolated.nodeId || "").trim(),
          title: String(result.nextIsolated.title || "").trim()
        }
      : null;
    const queueItems = isolatedQueueItems({ isolatedNotes, nodeMap, edges, currentNoteId: noteId, limit: 8 });
    const queuedNextItem = nextIsolatedQueueItem(queueItems, noteId);
    const connected = new Set();
    for (const edge of Array.isArray(edges) ? edges : []) {
      const fromNoteId = String(edge?.fromNoteId || edge?.from || edge?.source || "").trim();
      const toNoteId = String(edge?.toNoteId || edge?.to || edge?.target || "").trim();
      if (fromNoteId) connected.add(fromNoteId);
      if (toNoteId) connected.add(toNoteId);
    }
    const fallbackNextNode = resultNext?.noteId || queuedNextItem ? null : [...nodeMap.values()].find((node) => {
      const candidateNoteId = String(node?.id || node?.noteId || "").trim();
      if (!candidateNoteId || candidateNoteId === noteId) return false;
      return !connected.has(candidateNoteId) && Number(node?.degree || 0) <= 0;
    });
    const nextItem = (resultNext?.noteId ? resultNext : null) || queuedNextItem || (fallbackNextNode
      ? {
          noteId: String(fallbackNextNode.id || fallbackNextNode.noteId || "").trim(),
          isolatedKey: String(fallbackNextNode.isolatedKey || fallbackNextNode.id || fallbackNextNode.noteId || "").trim(),
          title: String(fallbackNextNode.title || fallbackNextNode.label || fallbackNextNode.id || "").trim()
        }
      : null);
    const directRelationCount = graphDirectNetworkEdgeCount(noteId, edges, { relationStatusCountsAsNetworkEdge });
    return renderSelectionShell({
      className: "is-isolated is-complete",
      ariaLabel: "孤立笔记已接入关系网",
      kicker: "已接入关系网",
      title,
      meta: `${noteTypeLabel(note.noteType)} · 已保存 ${directRelationCount} 条关系`,
      closeLabel: "收起处理结果",
      body: `
        <section class="graph-isolated-complete-card">
          <small>关系已保存</small>
          <strong>${escapeHtml(result.targetTitle ? `已关联到：${result.targetTitle}` : "这条笔记已经进入关系网")}</strong>
          <p>${escapeHtml(result.relationLabel ? `关系类型：${result.relationLabel}。这条笔记已经退出未关联状态。` : "这条笔记已经退出未关联状态。")}</p>
        </section>
        <div class="graph-isolated-complete-actions">
          ${
            nextItem
              ? `<button class="graph-selection-action is-primary" type="button" data-graph-open-relation-form data-graph-relation-source="${escapeHtml(nextItem.noteId)}" data-graph-select-isolated="${escapeHtml(nextItem.isolatedKey)}" data-graph-isolated-note="${escapeHtml(nextItem.noteId)}">继续处理：${escapeHtml(nextItem.title || nextItem.noteId)}</button>`
              : `<span class="graph-isolated-complete-empty">当前范围没有其它未关联笔记。</span>`
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
    renderCompletePanel: renderCompletePanelClean
  };
}
