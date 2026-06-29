import { escapeHtml } from "./editor-render-utils.js";

export function sourceNotePromotionState({
  note = {},
  noteType = "",
  generatedOriginal = null,
  generatedOriginalId = "",
  generatedDirectoryLabel = "",
  isOpen = false,
  literatureCompletion = null,
  showFleetingCleanup = false
} = {}) {
  const cleanType = String(noteType || note?.noteType || "").trim().toLowerCase();
  const isLiterature = cleanType === "literature";
  const isFleeting = cleanType === "fleeting";
  if (!isLiterature && !isFleeting) return null;

  const generatedId = String(generatedOriginal?.id || generatedOriginalId || "").trim();
  const generatedTitle = String(generatedOriginal?.title || "").trim();
  const hasGenerated = Boolean(generatedId);
  const readyForOriginal = isLiterature ? Boolean(literatureCompletion?.readyForOriginal) : true;
  const canUpdate = hasGenerated;
  const status = hasGenerated ? "generated" : readyForOriginal ? "ready" : "not_ready";
  const statusLabel = hasGenerated ? "已生成" : readyForOriginal ? "未生成" : "未准备好";
  const kindLabel = isLiterature ? "文献笔记" : "随笔";

  const headline = hasGenerated
    ? "已经生成永久笔记"
    : readyForOriginal
      ? "可以生成永久笔记"
      : "先补齐材料再生成永久笔记";

  const guidance = hasGenerated
    ? "后续的关联、观点提纯和写作准备，都在生成出的永久笔记里继续。"
    : isLiterature
      ? (literatureCompletion?.hint || "把文献中的出处、转述和判断种子补清楚，再沉淀成永久笔记。")
      : "随笔只负责抓住线索；值得长期保留时，把它写成一条可以被关联的永久判断。";

  const primaryActionLabel = hasGenerated ? "打开永久笔记" : "生成永久笔记";
  const secondaryActionLabel = hasGenerated ? "重新生成" : "";

  return {
    noteId: String(note?.id || "").trim(),
    noteTitle: String(note?.title || "").trim() || "未命名笔记",
    noteType: cleanType,
    kindLabel,
    status,
    statusLabel,
    headline,
    guidance,
    hasGenerated,
    canUpdate,
    readyForOriginal,
    showFleetingCleanup: Boolean(showFleetingCleanup && isFleeting && !hasGenerated),
    generated: {
      id: generatedId,
      title: generatedTitle || generatedId,
      directoryLabel: String(generatedDirectoryLabel || "").trim(),
      isOpen: Boolean(isOpen)
    },
    primaryActionLabel,
    secondaryActionLabel
  };
}

export function renderSourceNotePromotionPanel(input = {}) {
  const state = sourceNotePromotionState(input);
  if (!state) return "";

  const resultRows = state.hasGenerated
    ? `
      <div class="source-promotion-result">
        <div class="source-promotion-result-title">${escapeHtml(state.generated.title || "未命名永久笔记")}</div>
        <div class="source-promotion-result-meta">
          ${state.generated.directoryLabel ? `<span>${escapeHtml(state.generated.directoryLabel)}</span>` : ""}
          <span>${state.generated.isOpen ? "当前已打开" : "尚未打开"}</span>
        </div>
      </div>
    `
    : "";

  return `
    <section class="inspector-section source-promotion-panel" data-source-note-flow-section data-note-id="${escapeHtml(state.noteId)}" data-source-promotion-status="${escapeHtml(state.status)}">
      <div class="source-promotion-head">
        <div>
          <div class="source-promotion-eyebrow">生成永久笔记</div>
          <div class="source-promotion-title">${escapeHtml(state.headline)}</div>
        </div>
        <span class="inspector-chip ${state.hasGenerated ? "is-success" : state.readyForOriginal ? "is-warning" : ""}">${escapeHtml(state.statusLabel)}</span>
      </div>
      <p class="source-promotion-copy">${escapeHtml(state.guidance)}</p>
      <div class="source-promotion-state-grid">
        <div>
          <span>当前材料</span>
          <strong>${escapeHtml(state.kindLabel)}</strong>
        </div>
        <div>
          <span>生成状态</span>
          <strong>${escapeHtml(state.statusLabel)}</strong>
        </div>
        ${
          state.canUpdate
            ? `
              <div>
                <span>后续动作</span>
                <strong>可更新</strong>
              </div>
            `
            : ""
        }
      </div>
      ${resultRows}
      ${
        state.showFleetingCleanup
          ? `
            <div class="source-promotion-cleanup" data-fleeting-cleanup-prompt>
              <strong>暂时不生成？</strong>
              <span>如果只是临时记录，可以先标记稍后清理，不影响继续编辑。</span>
              <button class="mini-btn" type="button" data-source-note-action="dismiss-fleeting-cleanup">标记稍后清理</button>
            </div>
          `
          : ""
      }
      <div class="source-promotion-actions">
        ${
          state.hasGenerated
            ? `<button class="mini-btn primary" type="button" data-open-linked-note="${escapeHtml(state.generated.id)}">${escapeHtml(state.primaryActionLabel)}</button>`
            : `<button class="mini-btn primary create-original-cta" type="button" data-source-note-action="record-permanent">${escapeHtml(state.primaryActionLabel)}</button>`
        }
        ${
          state.hasGenerated
            ? `<button class="mini-btn" type="button" data-source-note-action="record-permanent">${escapeHtml(state.secondaryActionLabel)}</button>`
            : ""
        }
      </div>
    </section>
  `;
}
