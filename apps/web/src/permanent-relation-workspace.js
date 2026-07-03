import { escapeHtml } from "./editor-render-utils.js";
import { graphCandidatePercent } from "./graph-ai-candidates.js";
import {
  noteTypeText,
  RELATION_CREATE_TYPES,
  relationTypeLabel
} from "./editor-relation-helpers.js";
import {
  normalizePermanentRelationWorkspaceState,
  permanentRelationCandidateRationale,
  permanentRelationWorkspaceCanSave,
  permanentRelationWorkspaceExistingLink,
  permanentRelationWorkspaceExistingLinks,
  permanentRelationWorkspaceSelectedTarget
} from "./permanent-relation-workspace-model.js";

function cleanText(value = "") {
  return String(value || "").trim();
}

function shortText(value = "", limit = 150) {
  const text = cleanText(value).replace(/\s+/g, " ");
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function noteSummary(note = {}) {
  const thesis = cleanText(note.thesis);
  if (thesis) return thesis;
  const summary = Array.isArray(note.threeLineSummary) ? note.threeLineSummary.map(cleanText).filter(Boolean) : [];
  if (summary.length) return summary[0];
  return shortText(cleanText(note.body).replace(/^#+\s*/gm, ""), 160) || "这条笔记还没有可展示的判断。";
}

function noteMeta(note = {}, deps = {}) {
  const type = noteTypeText(note.noteType || deps.typeFromFolder?.(note.folderId) || "");
  const folder = deps.folderLabel?.(note.folderId) || "";
  const visibleFolder = folder && folder !== "未知目录" ? folder : "";
  return [type, visibleFolder].filter(Boolean).join(" · ");
}

function noteById(notes = [], noteId = "") {
  const id = cleanText(noteId);
  return (Array.isArray(notes) ? notes : []).find((note) => cleanText(note?.id) === id) || null;
}

function candidateScoreText(candidate = {}) {
  const hasScore = [
    candidate.aiConfidence,
    candidate.confidence,
    candidate.coarseScore,
    candidate.coarse_score
  ].some((value) => Number.isFinite(Number(value)) && Number(value) > 0);
  return hasScore ? `${graphCandidatePercent(candidate)}%` : "";
}

function candidateReasonText(candidate = {}) {
  const direct = cleanText(candidate.rationaleDraft || candidate.rationale || candidate.aiRationale || candidate.reviewQuestion);
  if (direct && !/^本地初判发现/.test(direct)) return shortText(direct, 96);
  const rawReasons = candidate.coarseReasons || candidate.coarse_reasons;
  const reasons = Array.isArray(rawReasons)
    ? rawReasons.map(cleanText).filter(Boolean)
    : [];
  if (reasons.length) return shortText(reasons.slice(0, 2).join("；"), 96);
  return "标题、标签或摘要有接近之处，请确认是否真的需要建立关系。";
}

const PERMANENT_RELATION_WORKSPACE_TYPES = RELATION_CREATE_TYPES.filter((type) => type !== "appears_in_draft");

function relationWorkspaceTypeOptions(selected = "associated_with") {
  const active = cleanText(selected).toLowerCase() || "associated_with";
  return PERMANENT_RELATION_WORKSPACE_TYPES.map(
    (type) => `<option value="${escapeHtml(type)}"${type === active ? " selected" : ""}>${escapeHtml(relationTypeLabel(type))}</option>`
  ).join("");
}

export function renderPermanentRelationTargetPreview(target = null, deps = {}, state = {}) {
  if (!target) {
    return `
      <section class="permanent-relation-preview is-empty">
        <strong>还没有选择目标笔记</strong>
        <p>先从推荐里选一条，或搜索一条你确定相关的永久笔记。</p>
      </section>
    `;
  }
  const preview = shortText(target.thesis || target.body, 180) || "这条目标笔记还没有可展示的摘要。";
  const previewOpen = cleanText(state.previewTargetNoteId) === cleanText(target.id);
  const detail = shortText(target.body || target.thesis, 600) || preview;
  return `
    <section class="permanent-relation-preview">
      <span>目标笔记</span>
      <strong>${escapeHtml(target.title || target.id)}</strong>
      ${noteMeta(target, deps) ? `<small>${escapeHtml(noteMeta(target, deps))}</small>` : ""}
      <p>${escapeHtml(preview)}</p>
      <button class="mini-btn is-ghost" type="button" data-permanent-relation-action="preview-target" data-note-id="${escapeHtml(target.id)}">${previewOpen ? "收起内容" : "查看内容"}</button>
      ${
        previewOpen
          ? `<div class="permanent-relation-preview-detail" data-permanent-relation-target-preview>
              <span>内容预览</span>
              <p>${escapeHtml(detail)}</p>
            </div>`
          : ""
      }
    </section>
  `;
}

function renderAiCandidates({ state, candidates = [], relations = null, notes = [], deps = {} } = {}) {
  if (state.saveState === "analysis-loading") {
    return `<div class="permanent-relation-empty">正在查找可能相关的笔记...</div>`;
  }
  if (!candidates.length) {
    return `
      <div class="permanent-relation-empty">
        <strong>暂时没有可靠推荐</strong>
        <p>可以切到“搜索目标”，直接选择你确认相关的笔记。</p>
        <button class="mini-btn" type="button" data-permanent-relation-action="run-ai">刷新推荐</button>
      </div>
    `;
  }
  const selectedId = cleanText(state.selectedTargetNoteId) || cleanText(candidates[0]?.targetNoteId);
  const selectedCandidate = candidates.find((candidate) => cleanText(candidate.targetNoteId) === selectedId) || candidates[0] || null;
  const selectedTarget = selectedCandidate ? noteById(notes, selectedCandidate.targetNoteId) : null;
  const selectedTitle = selectedTarget?.title || selectedCandidate?.targetTitle || selectedCandidate?.targetNoteId || "";
  const selectedScore = selectedCandidate ? candidateScoreText(selectedCandidate) : "";
  const selectedReason = selectedCandidate ? candidateReasonText(selectedCandidate) : "";
  const existing = selectedCandidate ? permanentRelationWorkspaceExistingLink(relations, state.noteId, selectedCandidate.targetNoteId) : null;
  return `
    <div class="permanent-relation-ai-picker">
      <label class="permanent-relation-search">
        <span>推荐目标</span>
        <select data-permanent-relation-ai-select>
          ${candidates
            .map((candidate) => {
              const target = noteById(notes, candidate.targetNoteId);
              const title = target?.title || candidate.targetTitle || candidate.targetNoteId;
              const score = candidateScoreText(candidate);
              return `<option value="${escapeHtml(candidate.targetNoteId)}"${candidate.targetNoteId === selectedId ? " selected" : ""}>${escapeHtml(`${title}${score ? ` · ${score}` : ""}`)}</option>`;
            })
            .join("")}
        </select>
      </label>
      <div class="permanent-relation-selected-candidate">
        <strong>${escapeHtml(selectedTitle)}</strong>
        ${selectedScore ? `<span>相关性 ${escapeHtml(selectedScore)}</span>` : ""}
        <p>${escapeHtml(selectedReason)}</p>
        ${existing ? "<small>这两条笔记已经有正式关系，可以在右侧修改后保存。</small>" : "<small>推荐只作为候选；保存前请确认关系类型和理由。</small>"}
      </div>
    </div>
  `;
}

export function renderPermanentRelationManualTargets({ state, deps = {} } = {}) {
  if (state.searchState === "loading") return `<div class="permanent-relation-empty">正在搜索笔记...</div>`;
  if (state.searchState === "error") {
    return `
      <div class="permanent-relation-empty is-error">
        <strong>搜索暂时失败</strong>
        <p>${escapeHtml(state.error || "请稍后重试，或换一个关键词。")}</p>
      </div>
    `;
  }
  const targets = Array.isArray(state.manualTargets) ? state.manualTargets : [];
  if (!cleanText(state.manualQuery)) {
    return `<div class="permanent-relation-empty">输入标题关键词后选择一条笔记。</div>`;
  }
  if (!targets.length) {
    return `<div class="permanent-relation-empty">没有匹配笔记。</div>`;
  }
  return `
    <div class="permanent-relation-candidate-list">
      ${targets
        .slice(0, 12)
        .map((target) => {
          const active = target.id === state.selectedTargetNoteId;
          return `
            <button class="permanent-relation-candidate ${active ? "is-active" : ""}" type="button" data-permanent-relation-manual-target="${escapeHtml(target.id)}">
              <span>${escapeHtml(noteMeta(target, deps) || "永久笔记")}</span>
              <strong>${escapeHtml(target.title || target.id)}</strong>
              <p>${escapeHtml(shortText(target.thesis || target.body, 120) || "选择后在右侧写清为什么要关联。")}</p>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderSavedResult(state = {}) {
  if (!state.result) return "";
  const result = state.result;
  const resultTitle = result.updated ? "关系已更新" : result.created === false ? "关系已存在，已复用" : "关系已保存";
  return `
    <section class="permanent-relation-result">
      <strong>${escapeHtml(resultTitle)}</strong>
      <p>${escapeHtml(`${relationTypeLabel(result.relationType)}：${result.targetTitle || result.targetNoteId}`)}</p>
      <div class="semantic-relation-actions">
        <button class="mini-btn primary" type="button" data-permanent-relation-action="continue">继续关联下一条</button>
        <button class="mini-btn" type="button" data-permanent-relation-action="complete">完成</button>
      </div>
    </section>
  `;
}

export function renderPermanentRelationWorkspace({
  note = {},
  state = {},
  relations = null,
  aiCandidates = [],
  notes = [],
  deps = {}
} = {}) {
  let workspaceState = normalizePermanentRelationWorkspaceState(state, note?.id);
  if (!workspaceState.open || !note?.id) return "";
  const defaultAiCandidate = workspaceState.mode === "ai" && !workspaceState.selectedTargetNoteId
    ? aiCandidates[0] || null
    : null;
  if (defaultAiCandidate) {
    workspaceState = normalizePermanentRelationWorkspaceState({
      ...workspaceState,
      selectedTargetNoteId: defaultAiCandidate.targetNoteId,
      relationType: workspaceState.relationType || defaultAiCandidate.relationType || "associated_with",
      rationale: workspaceState.rationale || permanentRelationCandidateRationale(defaultAiCandidate),
      insightQuestion: workspaceState.insightQuestion || defaultAiCandidate.insightQuestionDraft || ""
    }, note.id);
  }
  const selectedTarget = permanentRelationWorkspaceSelectedTarget({
    state: workspaceState,
    aiCandidates,
    notes
  });
  const existing = selectedTarget ? permanentRelationWorkspaceExistingLink(relations, note.id, selectedTarget.id) : null;
  const canSave = permanentRelationWorkspaceCanSave({ state: workspaceState, relations, allowExistingUpdate: true });
  const modeAi = workspaceState.mode === "ai";
  const softBlockedReasons = new Set(["missing_rationale"]);
  const saveDisabled = workspaceState.saveState === "saving" || (!canSave.ok && !softBlockedReasons.has(canSave.reason));
  const explicitRelationCount = relations ? permanentRelationWorkspaceExistingLinks(relations).length : 0;
  const explicitRelationText = relations
    ? explicitRelationCount > 0
      ? `${explicitRelationCount} 条已保存关系`
      : "还没有保存关系"
    : "关系读取中";

  return `
    <div class="permanent-relation-overlay" data-permanent-relation-workspace data-note-id="${escapeHtml(note.id)}" role="dialog" aria-modal="true" aria-labelledby="permanentRelationWorkspaceTitle">
      <div class="permanent-relation-panel">
        <header class="permanent-relation-head">
          <div>
            <strong id="permanentRelationWorkspaceTitle">建立笔记关联</strong>
            <span>先选一条相关笔记，再写一句：这条关系让哪个判断更清楚。</span>
          </div>
          <button class="mini-btn is-ghost" type="button" data-permanent-relation-action="close">关闭</button>
        </header>
        <div class="permanent-relation-body">
          <aside class="permanent-relation-source">
            <span>当前笔记</span>
            <strong>${escapeHtml(note.title || note.id)}</strong>
            <small>${escapeHtml(noteMeta(note, deps))}</small>
            <p>${escapeHtml(noteSummary(note))}</p>
            <div class="permanent-relation-source-status">
              <span>${escapeHtml(explicitRelationText)}</span>
            </div>
          </aside>
          <section class="permanent-relation-picker">
            <div class="permanent-relation-mode" role="tablist" aria-label="选择目标笔记方式">
              <button class="${modeAi ? "is-active" : ""}" type="button" role="tab" aria-selected="${modeAi ? "true" : "false"}" data-permanent-relation-mode="ai">推荐目标</button>
              <button class="${!modeAi ? "is-active" : ""}" type="button" role="tab" aria-selected="${!modeAi ? "true" : "false"}" data-permanent-relation-mode="manual">搜索目标</button>
            </div>
            ${
              modeAi
                ? renderAiCandidates({ state: workspaceState, candidates: aiCandidates, relations, notes, deps })
                : `
                  <label class="permanent-relation-search">
                    <span>搜索目标笔记</span>
                    <input type="search" data-permanent-relation-target-search value="${escapeHtml(workspaceState.manualQuery)}" placeholder="输入标题关键词" autocomplete="off" />
                  </label>
                  <div data-permanent-relation-manual-results>
                    ${renderPermanentRelationManualTargets({ state: workspaceState, deps })}
                  </div>
                `
            }
          </section>
          <form class="permanent-relation-confirm" data-permanent-relation-form>
            <div data-permanent-relation-target-preview-slot>
              ${renderPermanentRelationTargetPreview(selectedTarget, deps, workspaceState)}
            </div>
            ${existing ? `<div class="permanent-relation-existing">这两条笔记已经有关系。你可以在这里修改关系类型和理由，然后保存修改。</div>` : ""}
            <label>
              <span>它们是什么关系</span>
              <select name="relationType" data-permanent-relation-field="relationType" required>${relationWorkspaceTypeOptions(workspaceState.relationType || selectedTarget?.candidate?.relationType || "associated_with")}</select>
            </label>
            <label>
              <span>为什么要关联</span>
              <textarea name="rationale" data-permanent-relation-field="rationale" required placeholder="这条关系让哪个判断更清楚？因为...">${escapeHtml(workspaceState.rationale)}</textarea>
            </label>
            <label>
              <span>补充问题（可选）</span>
              <textarea name="insightQuestion" data-permanent-relation-field="insightQuestion" placeholder="这条连接还提示了什么问题？">${escapeHtml(workspaceState.insightQuestion)}</textarea>
            </label>
            ${workspaceState.error ? `<div class="semantic-relation-form-error">${escapeHtml(workspaceState.error)}</div>` : ""}
            ${workspaceState.notice ? `<div class="permanent-relation-notice">${escapeHtml(workspaceState.notice)}</div>` : ""}
            <div class="semantic-relation-actions">
              <button class="mini-btn primary" type="submit" ${saveDisabled ? "disabled" : ""}>${workspaceState.saveState === "saving" ? "保存中" : existing ? "保存修改" : "保存关系"}</button>
            </div>
            ${renderSavedResult(workspaceState)}
          </form>
        </div>
      </div>
    </div>
  `;
}
