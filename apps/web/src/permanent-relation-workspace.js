import { escapeHtml } from "./editor-render-utils.js";
import { relationWorkspaceAvailableTargetCandidates } from "./relation-workspace-shared.js";
import { renderRelationPairPreview } from "./relation-pair-preview.js";
import {
  noteTypeText,
  COMMON_RELATION_CHOICES,
  RELATION_CREATE_TYPES,
  relationTypeLabel
} from "./editor-relation-helpers.js";
import {
  normalizePermanentRelationWorkspaceState,
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

function noteMeta(note = {}, deps = {}) {
  const type = noteTypeText(note.noteType || deps.typeFromFolder?.(note.folderId) || "");
  const folder = deps.folderLabel?.(note.folderId) || "";
  const visibleFolder = folder && folder !== "未知目录" ? folder : "";
  return [type, visibleFolder].filter(Boolean).join(" · ");
}

const PERMANENT_RELATION_WORKSPACE_TYPES = RELATION_CREATE_TYPES.filter((type) => type !== "appears_in_draft");
const PAIR_RELATION_DESCRIPTIONS = {
  associated_with: "两条笔记有关，暂不判断具体关系。",
  supports: "上方笔记为下方观点提供证据或理由。",
  contradicts: "上方笔记对下方观点提出反例或不同判断。",
  qualifies: "上方笔记说明下方观点的适用条件。",
  example_of: "上方笔记是下方观点的一个例子。"
};

function relationWorkspaceTypeOptions(selected = "associated_with") {
  const active = cleanText(selected).toLowerCase() || "associated_with";
  return PERMANENT_RELATION_WORKSPACE_TYPES.map(
    (type) => `<option value="${escapeHtml(type)}"${type === active ? " selected" : ""}>${escapeHtml(relationTypeLabel(type))}</option>`
  ).join("");
}

function renderCommonRelationChoices(selected = "associated_with") {
  const active = cleanText(selected).toLowerCase() || "associated_with";
  const commonActive = COMMON_RELATION_CHOICES.some((choice) => choice.type === active);
  return `
    <section class="permanent-relation-type-choice" aria-label="选择关系">
      <span>这两条笔记是什么关系？</span>
      <div class="permanent-relation-type-choice-grid">
        ${COMMON_RELATION_CHOICES.map((choice) => `
          <button
            class="permanent-relation-type-card${choice.type === active ? " is-active" : ""}"
            type="button"
            data-permanent-relation-type-choice="${escapeHtml(choice.type)}"
            aria-pressed="${choice.type === active ? "true" : "false"}"
          >
            <strong>${escapeHtml(choice.title)}</strong>
            <small>${escapeHtml(PAIR_RELATION_DESCRIPTIONS[choice.type] || choice.note)}</small>
          </button>
        `).join("")}
      </div>
      <details class="permanent-relation-more-types"${commonActive ? "" : " open"}>
        <summary>更多关系</summary>
        <label>
          <span>需要更具体时再选</span>
          <select name="relationType" data-permanent-relation-field="relationType" required>${relationWorkspaceTypeOptions(active)}</select>
        </label>
      </details>
    </section>
  `;
}

export function renderPermanentRelationManualTargets({ state, deps = {} } = {}) {
  if (state.searchState === "loading") return `<div class="permanent-relation-dropdown-empty">正在搜索笔记...</div>`;
  if (state.searchState === "error") {
    return `
      <div class="permanent-relation-dropdown-empty is-error">
        <strong>搜索暂时失败</strong>
        <p>${escapeHtml(state.error || "请稍后重试，或换一个关键词。")}</p>
      </div>
    `;
  }
  const targets = Array.isArray(state.manualTargets) ? state.manualTargets : [];
  if (cleanText(state.selectedTargetNoteId)) return "";
  if (!cleanText(state.manualQuery)) {
    return "";
  }
  if (!targets.length) {
    return `<div class="permanent-relation-dropdown-empty">没有匹配笔记。</div>`;
  }
  return `
    <div class="permanent-relation-candidate-list is-dropdown">
      ${targets
        .slice(0, 12)
        .map((target) => {
          const active = target.id === state.selectedTargetNoteId;
          return `
            <button class="permanent-relation-candidate ${active ? "is-active" : ""}" type="button" data-permanent-relation-manual-target="${escapeHtml(target.id)}">
              <strong>${escapeHtml(target.title || target.id)}</strong>
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
        <button class="mini-btn primary" type="button" data-permanent-relation-action="complete">完成</button>
        <button class="mini-btn" type="button" data-permanent-relation-action="continue">继续关联</button>
      </div>
    </section>
  `;
}

function renderAiTargets({ state = {}, aiCandidates = [], relations = null, deps = {} } = {}) {
  if (state.mode !== "ai") return "";
  const candidates = relationWorkspaceAvailableTargetCandidates(aiCandidates, {
    sourceNoteId: state.sourceNoteId || state.noteId,
    edges: permanentRelationWorkspaceExistingLinks(relations)
  }).slice(0, 5);
  if (state.error) {
    return `
      <section class="permanent-relation-picker">
        <div class="permanent-relation-empty is-error">
          <strong>推荐失败</strong>
          <p>${escapeHtml(state.error || "可以改用搜索笔记。")}</p>
          <div class="semantic-relation-actions">
            <button class="mini-btn" type="button" data-permanent-relation-action="recommend">重试</button>
            <button class="mini-btn" type="button" data-permanent-relation-mode="manual">搜索笔记</button>
          </div>
        </div>
      </section>
    `;
  }
  if (!candidates.length && !state.aiLoading && (state.notice || (Array.isArray(aiCandidates) && aiCandidates.length))) {
    return `
      <section class="permanent-relation-picker">
        <div class="permanent-relation-empty" aria-live="polite">
          <strong>暂时没有推荐</strong>
          <p>${escapeHtml(state.notice || "可以改用搜索笔记。")}</p>
          <div class="semantic-relation-actions">
            <button class="mini-btn" type="button" data-permanent-relation-mode="manual">搜索笔记</button>
          </div>
        </div>
      </section>
    `;
  }
  if (!candidates.length) {
    return `
      <section class="permanent-relation-picker">
        <div class="permanent-relation-empty is-loading" aria-live="polite">
          <div class="permanent-relation-loading-head">
            <strong>正在准备推荐</strong>
            <span class="permanent-relation-loading-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          </div>
          <p>${escapeHtml(state.notice || "正在分析当前笔记，可能需要等一下。没有可用推荐时，可以改用搜索笔记。")}</p>
          <div class="semantic-relation-actions">
            <button class="mini-btn" type="button" data-permanent-relation-mode="manual">搜索笔记</button>
          </div>
        </div>
      </section>
    `;
  }
  return `
    <section class="permanent-relation-picker">
      <div class="permanent-relation-candidate-list" data-permanent-relation-ai-results>
        ${candidates
          .map((candidate) => {
            const knownNote =
              Array.isArray(deps.notes)
                ? deps.notes.find((note) => cleanText(note?.id) === cleanText(candidate.targetNoteId))
                : null;
            const title = cleanText(knownNote?.title || candidate.targetTitle || candidate.targetNoteId);
            const meta = noteMeta(candidate, deps) || "永久笔记";
            return `
              <button
                class="permanent-relation-candidate"
                type="button"
                data-permanent-relation-ai-target="${escapeHtml(candidate.targetNoteId)}"
                data-relation-type="${escapeHtml(candidate.relationType || "associated_with")}"
                data-relation-rationale-draft="${escapeHtml(candidate.rationaleDraft || "")}"
                data-relation-insight-question-draft="${escapeHtml(candidate.insightQuestionDraft || "")}"
              >
                <span>${escapeHtml(meta)}</span>
                <strong>${escapeHtml(title)}</strong>
                <p>${escapeHtml(shortText(candidate.rationaleDraft || candidate.insightQuestionDraft || "选择后继续写关系理由。", 120))}</p>
              </button>
            `;
          })
          .join("")}
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
  const selectedTarget = permanentRelationWorkspaceSelectedTarget({
    state: workspaceState,
    aiCandidates,
    notes
  });
  const existing = selectedTarget ? permanentRelationWorkspaceExistingLink(relations, note.id, selectedTarget.id, workspaceState.editingRelationId) : null;
  const isEditingExisting = Boolean(existing || workspaceState.editingRelationId);
  const relationTypeValue = workspaceState.relationType || existing?.relationType || existing?.relation_type || selectedTarget?.candidate?.relationType || "associated_with";
  const rawRationale = workspaceState.rationale || existing?.rationale || "";
  const rationaleValue = rawRationale === "markdown_wikilink" ? "" : rawRationale;
  const canSave = permanentRelationWorkspaceCanSave({ state: workspaceState, relations, allowExistingUpdate: true });
  const softBlockedReasons = new Set(["missing_rationale"]);
  if (!relations) softBlockedReasons.add("missing_relation");
  const pairBlocked = ["loading", "error"].includes(workspaceState.pairPreviewState);
  const saveDisabled = pairBlocked || workspaceState.saveState === "saving" || (!canSave.ok && !softBlockedReasons.has(canSave.reason));
  const hasManualQuery = Boolean(cleanText(workspaceState.manualQuery));
  const showingAiTargets = workspaceState.mode === "ai" && !selectedTarget;
  return `
    <div class="permanent-relation-overlay" data-permanent-relation-workspace data-note-id="${escapeHtml(note.id)}" role="dialog" aria-modal="true" aria-labelledby="permanentRelationWorkspaceTitle">
      <div class="permanent-relation-panel ${isEditingExisting ? "is-editing-existing" : ""}">
        <header class="permanent-relation-head">
          <div>
            <strong id="permanentRelationWorkspaceTitle">${isEditingExisting ? "编辑关联" : showingAiTargets ? "AI推荐" : "关联"}</strong>
          </div>
          <button class="mini-btn is-ghost" type="button" data-permanent-relation-action="close">关闭</button>
        </header>
        <div class="permanent-relation-body ${isEditingExisting ? "is-editing-existing" : ""}">
          ${workspaceState.result
            ? `${renderRelationPairPreview({ note, target: selectedTarget, existing, relationType: relationTypeValue })}${renderSavedResult(workspaceState)}`
            : `
          ${
            isEditingExisting
              ? ""
              : showingAiTargets
                ? renderAiTargets({ state: workspaceState, aiCandidates, relations, deps: { ...deps, notes } })
                : selectedTarget
                  ? `<button class="mini-btn is-ghost" type="button" data-permanent-relation-mode="manual">重选笔记</button>`
                  : `<section class="permanent-relation-picker">
                  <div class="semantic-relation-actions">
                    <button class="mini-btn" type="button" data-permanent-relation-action="recommend">AI推荐</button>
                  </div>
                  <div class="permanent-relation-search">
                    <label for="permanentRelationTargetSearch">关联到哪条笔记？</label>
                    <input id="permanentRelationTargetSearch" type="search" data-permanent-relation-target-search value="${escapeHtml(workspaceState.manualQuery)}" placeholder="输入关键词，选择要关联的永久笔记" autocomplete="off" autofocus />
                    <div class="permanent-relation-dropdown" data-permanent-relation-manual-results${selectedTarget || !hasManualQuery ? " hidden" : ""}>
                      ${
                        selectedTarget
                          ? ""
                          : hasManualQuery
                            ? renderPermanentRelationManualTargets({ state: workspaceState, deps })
                            : ""
                      }
                    </div>
                  </div>
                </section>`
          }
          <form class="permanent-relation-confirm ${isEditingExisting ? "is-editing-existing" : ""}" data-permanent-relation-form ${showingAiTargets || (!selectedTarget && !isEditingExisting) ? "hidden" : ""}>
            ${renderRelationPairPreview({ note, target: selectedTarget, existing, relationType: relationTypeValue })}
            ${workspaceState.pairPreviewState === "loading" ? `<div class="permanent-relation-notice" role="status">正在读取双方笔记...</div>` : ""}
            ${workspaceState.pairPreviewState === "error" ? `<div class="semantic-relation-form-error" role="alert">${escapeHtml(workspaceState.pairPreviewError)} <button class="mini-btn" type="button" data-permanent-relation-preview-retry>重试读取</button></div>` : ""}
            ${renderCommonRelationChoices(relationTypeValue)}
            <label>
              <span>为什么？</span>
              <textarea name="rationale" data-permanent-relation-field="rationale" required placeholder="用一句话说明两条笔记为什么有这个关系。">${escapeHtml(rationaleValue)}</textarea>
            </label>
            <input type="hidden" name="insightQuestion" data-permanent-relation-field="insightQuestion" value="${escapeHtml(workspaceState.insightQuestion)}">
            ${workspaceState.error ? `<div class="semantic-relation-form-error">${escapeHtml(workspaceState.error)}</div>` : ""}
            ${workspaceState.notice ? `<div class="permanent-relation-notice">${escapeHtml(workspaceState.notice)}</div>` : ""}
            <div class="semantic-relation-actions">
              <button class="mini-btn primary" type="submit" ${saveDisabled ? "disabled" : ""}>${workspaceState.saveState === "saving" ? "保存中" : isEditingExisting ? "保存修改" : "关联"}</button>
              ${
                existing?.id || existing?.relationId
                  ? `<button class="mini-btn is-danger" type="button" data-relation-action="delete" data-relation-id="${escapeHtml(existing.id || existing.relationId)}">解除</button>`
                  : ""
              }
            </div>
          </form>
          `}
        </div>
      </div>
    </div>
  `;
}
