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
        <strong>选一条笔记</strong>
        <p>推荐或搜索。</p>
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
    return `<div class="permanent-relation-empty">查找中...</div>`;
  }
  if (!candidates.length) {
    return `
      <div class="permanent-relation-empty">
        <strong>暂无推荐</strong>
        <p>也可以直接搜索。</p>
        <button class="mini-btn" type="button" data-permanent-relation-action="run-ai">刷新</button>
      </div>
    `;
  }
  const selectedId = cleanText(state.selectedTargetNoteId) || cleanText(candidates[0]?.targetNoteId);
  return `
    <div class="permanent-relation-candidate-list" data-permanent-relation-recommendations>
      ${candidates
        .slice(0, 8)
        .map((candidate) => {
          const target = noteById(notes, candidate.targetNoteId);
          const title = target?.title || candidate.targetTitle || candidate.targetNoteId;
          const score = candidateScoreText(candidate);
          const reason = candidateReasonText(candidate);
          const active = cleanText(candidate.targetNoteId) === selectedId;
          const existing = permanentRelationWorkspaceExistingLink(relations, state.noteId, candidate.targetNoteId);
          return `
            <button class="permanent-relation-candidate ${active ? "is-active" : ""}" type="button" data-permanent-relation-ai-target="${escapeHtml(candidate.targetNoteId)}">
              <span>${escapeHtml(existing ? "已有关系" : score ? `推荐 ${score}` : "推荐")}</span>
              <strong>${escapeHtml(title)}</strong>
              <p>${escapeHtml(reason)}</p>
            </button>
          `;
        })
        .join("")}
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
    return "";
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
              <p>${escapeHtml(shortText(target.thesis || target.body, 120) || "选中后写理由。")}</p>
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
        <button class="mini-btn primary" type="button" data-permanent-relation-action="continue">继续</button>
        <button class="mini-btn" type="button" data-permanent-relation-action="complete">完成</button>
      </div>
    </section>
  `;
}

function renderPolishTabs() {
  return `
    <div class="permanent-polish-tabs" role="tablist" aria-label="打磨笔记操作">
      <button class="permanent-polish-tab" type="button" role="tab" aria-selected="false" disabled>
        <span>提炼</span>
      </button>
      <button class="permanent-polish-tab is-active" type="button" role="tab" aria-selected="true">
        <span>关联</span>
      </button>
    </div>
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
  const isEditingExisting = Boolean(existing);
  const relationTypeValue = workspaceState.relationType || existing?.relationType || existing?.relation_type || selectedTarget?.candidate?.relationType || "associated_with";
  const rationaleValue = workspaceState.rationale || existing?.rationale || "";
  const canSave = permanentRelationWorkspaceCanSave({ state: workspaceState, relations, allowExistingUpdate: true });
  const softBlockedReasons = new Set(["missing_rationale"]);
  const saveDisabled = workspaceState.saveState === "saving" || (!canSave.ok && !softBlockedReasons.has(canSave.reason));
  const hasManualQuery = Boolean(cleanText(workspaceState.manualQuery));

  return `
    <div class="permanent-relation-overlay" data-permanent-relation-workspace data-note-id="${escapeHtml(note.id)}" role="dialog" aria-modal="true" aria-labelledby="permanentRelationWorkspaceTitle">
      <div class="permanent-relation-panel ${isEditingExisting ? "is-editing-existing" : ""}">
        <header class="permanent-relation-head">
          <div>
            <strong id="permanentRelationWorkspaceTitle">打磨笔记</strong>
            <span>${escapeHtml(note.title || note.id)}</span>
          </div>
          <button class="mini-btn is-ghost" type="button" data-permanent-relation-action="close">关闭</button>
        </header>
        ${renderPolishTabs()}
        <div class="permanent-relation-body ${isEditingExisting ? "is-editing-existing" : ""}">
          ${
            isEditingExisting
              ? ""
              : `<section class="permanent-relation-picker">
                  <label class="permanent-relation-search">
                    <span>选笔记</span>
                    <input type="search" data-permanent-relation-target-search value="${escapeHtml(workspaceState.manualQuery)}" placeholder="搜索标题" autocomplete="off" />
                  </label>
                  <div class="permanent-relation-results-head">
                    <strong>${hasManualQuery ? "结果" : "推荐"}</strong>
                    ${hasManualQuery ? "" : `<button class="mini-btn is-ghost" type="button" data-permanent-relation-action="run-ai">刷新</button>`}
                  </div>
                  <div data-permanent-relation-manual-results>
                    ${
                      hasManualQuery
                        ? renderPermanentRelationManualTargets({ state: workspaceState, deps })
                        : renderAiCandidates({ state: workspaceState, candidates: aiCandidates, relations, notes, deps })
                    }
                  </div>
                </section>`
          }
          <form class="permanent-relation-confirm ${isEditingExisting ? "is-editing-existing" : ""}" data-permanent-relation-form>
            ${
              isEditingExisting
                ? ""
                : `<div data-permanent-relation-target-preview-slot>
                    ${renderPermanentRelationTargetPreview(selectedTarget, deps, workspaceState)}
                  </div>`
            }
            <label>
              <span>关系</span>
              <select name="relationType" data-permanent-relation-field="relationType" required>${relationWorkspaceTypeOptions(relationTypeValue)}</select>
            </label>
            <label>
              <span>理由</span>
              <textarea name="rationale" data-permanent-relation-field="rationale" required placeholder="为什么相关？">${escapeHtml(rationaleValue)}</textarea>
            </label>
            <input type="hidden" name="insightQuestion" data-permanent-relation-field="insightQuestion" value="${escapeHtml(workspaceState.insightQuestion)}">
            ${workspaceState.error ? `<div class="semantic-relation-form-error">${escapeHtml(workspaceState.error)}</div>` : ""}
            ${workspaceState.notice ? `<div class="permanent-relation-notice">${escapeHtml(workspaceState.notice)}</div>` : ""}
            <div class="semantic-relation-actions">
              <button class="mini-btn primary" type="submit" ${saveDisabled ? "disabled" : ""}>${workspaceState.saveState === "saving" ? "保存中" : "保存"}</button>
              ${
                existing?.id || existing?.relationId
                  ? `<button class="mini-btn is-danger" type="button" data-relation-action="delete" data-relation-id="${escapeHtml(existing.id || existing.relationId)}">解除</button>`
                  : ""
              }
            </div>
            ${renderSavedResult(workspaceState)}
          </form>
        </div>
      </div>
    </div>
  `;
}
