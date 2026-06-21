import {
  aiCandidateDraftFromSelect,
  captureGraphIsolatedRelationDraftForState,
  graphIsolatedRelationDraftForState
} from "./graph-relation-drafts.js";
import {
  readGraphIsolatedRelationFormValues,
  validateGraphIsolatedRelationFormValues
} from "./graph-relation-confirmation.js";

function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function graphIsolatedRelationFormError(form = null, message = "") {
  const error = form?.querySelector?.("[data-graph-isolated-form-error]");
  if (error) error.textContent = String(message || "");
}

export function createGraphIsolatedRelationController({
  graphState = {},
  normalizeMode = (value = "") => String(value || "").trim().toLowerCase() || "ai",
  setWorkflowActiveTab = (_noteId = "", tabKey = "") => normalizeMode(tabKey),
  confirmableRelationTypes = new Set(),
  rationaleIsActionable = (value = "") => Boolean(String(value || "").trim()),
  saveConfirmedRelation = async () => false,
  escapeHtml = defaultEscapeHtml
} = {}) {
  const relationDraftForNote = (noteId = "") => graphIsolatedRelationDraftForState(graphState, noteId);

  const captureDraftFromForm = (form = null) => captureGraphIsolatedRelationDraftForState(graphState, form, {
    normalizeMode
  });

  const clearFormError = (form = null) => graphIsolatedRelationFormError(form, "");

  const updateInlinePreview = (form = null, source = null) => {
    const panel = form?.closest?.(".graph-isolated-join")?.querySelector?.("[data-graph-isolated-preview]");
    if (!panel) return false;
    const title = String(source?.getAttribute?.("data-graph-preview-title") || "").trim();
    const type = String(source?.getAttribute?.("data-graph-preview-type") || "").trim();
    const text = String(source?.getAttribute?.("data-graph-preview-text") || "").trim();
    const tags = String(source?.getAttribute?.("data-graph-preview-tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 5);
    panel.classList.toggle("is-active", Boolean(title));
    const kickerEl = panel.querySelector("[data-graph-preview-kicker]");
    const titleEl = panel.querySelector("[data-graph-preview-title]");
    const typeEl = panel.querySelector("[data-graph-preview-type]");
    const textEl = panel.querySelector("[data-graph-preview-text]");
    const tagsEl = panel.querySelector("[data-graph-preview-tags]");
    const clearButton = panel.querySelector("[data-graph-clear-candidate-preview]");
    if (kickerEl) kickerEl.textContent = title ? "正在预览" : "目标预览";
    if (titleEl) titleEl.textContent = title || "先选择一个目标笔记";
    if (typeEl) {
      typeEl.textContent = type;
      typeEl.hidden = !type;
    }
    if (textEl) textEl.textContent = text || "选择 AI 推荐目标或手工搜索结果后，这里会显示目标笔记摘要。保存关系和继续处理都留在当前浮窗内。";
    if (tagsEl) {
      tagsEl.innerHTML = tags.map((tag) => `<em>${escapeHtml(`#${tag}`)}</em>`).join("");
      tagsEl.hidden = tags.length === 0;
    }
    const noteId = String(form?.getAttribute?.("data-source-note") || "").trim();
    const targetId = String(source?.value || source?.getAttribute?.("data-graph-pick-manual-target") || "").trim();
    if (clearButton) clearButton.hidden = !title;
    if (noteId && targetId) {
      graphState.isolatedCandidatePreviewByNoteId = graphState.isolatedCandidatePreviewByNoteId || {};
      graphState.isolatedCandidatePreviewByNoteId[noteId] = targetId;
    } else if (noteId && graphState.isolatedCandidatePreviewByNoteId) {
      delete graphState.isolatedCandidatePreviewByNoteId[noteId];
    }
    return true;
  };

  const markRationaleUserEdited = (input = null) => {
    const form = input?.closest?.("[data-graph-isolated-relation-form]");
    if (!form || !input) return false;
    input.setAttribute("data-graph-rationale-source", "user");
    clearFormError(form);
    return true;
  };

  const syncAiCandidateForm = (select = null) => {
    const form = select?.closest?.("[data-graph-isolated-relation-form]");
    if (!form || !select) return false;
    const noteId = String(form.getAttribute?.("data-source-note") || "").trim();
    const draft = relationDraftForNote(noteId);
    const nextDraft = aiCandidateDraftFromSelect(select, draft);
    const relationSelect = form.querySelector("[data-graph-isolated-relation-type]");
    const rationaleInput = form.querySelector("[data-graph-isolated-rationale]");
    const questionInput = form.querySelector("[data-graph-isolated-insight-question]");
    if (relationSelect && nextDraft.relationType) relationSelect.value = nextDraft.relationType;
    if (rationaleInput) {
      rationaleInput.value = nextDraft.rationale;
      rationaleInput.setAttribute("data-graph-rationale-source", nextDraft.rationaleSource);
    }
    if (questionInput) questionInput.value = nextDraft.insightQuestion;
    updateInlinePreview(form, nextDraft.option);
    clearFormError(form);
    captureDraftFromForm(form);
    return true;
  };

  const filterManualRelationTargets = (input = null) => {
    const form = input?.closest?.("[data-graph-isolated-relation-form]");
    const list = form?.querySelector?.("[data-graph-manual-target-list]");
    if (!form || !list) return false;
    const query = String(input?.value || "").trim().toLowerCase();
    const selectedTitle = String(input?.getAttribute?.("data-selected-title") || "").trim();
    if (selectedTitle && String(input?.value || "").trim() !== selectedTitle) {
      const hidden = form.querySelector("[data-graph-manual-target-id]");
      const rationaleInput = form.querySelector("[data-graph-isolated-rationale]");
      if (hidden) hidden.value = "";
      if (rationaleInput?.getAttribute("data-graph-rationale-source") === "manual") {
        rationaleInput.value = "";
        rationaleInput.setAttribute("data-graph-rationale-source", "");
      }
      input.removeAttribute("data-selected-title");
      form.querySelectorAll("[data-graph-pick-manual-target]").forEach((button) => {
        button.classList.remove("is-selected");
      });
      updateInlinePreview(form, null);
    }
    let shown = 0;
    list.querySelectorAll("[data-graph-pick-manual-target]").forEach((button) => {
      const haystack = String(button.getAttribute("data-graph-manual-search-text") || "").toLowerCase();
      const match = !query || haystack.includes(query);
      const visible = match && shown < 8;
      button.hidden = !visible;
      button.classList.toggle("is-hidden", !visible);
      if (visible) shown += 1;
    });
    const status = form.querySelector("[data-graph-manual-target-status]");
    if (status) status.textContent = shown ? "选择一条搜索结果，然后填写关系类型和理由。" : "没有找到匹配的永久笔记。";
    clearFormError(form);
    captureDraftFromForm(form);
    return true;
  };

  const pickManualRelationTarget = (button = null) => {
    const form = button?.closest?.("[data-graph-isolated-relation-form]");
    if (!form || !button) return false;
    const targetId = String(button.getAttribute("data-graph-pick-manual-target") || "").trim();
    const title = String(button.getAttribute("data-graph-manual-title") || button.textContent || "").trim();
    const hidden = form.querySelector("[data-graph-manual-target-id]");
    const input = form.querySelector("[data-graph-manual-target-search]");
    const status = form.querySelector("[data-graph-manual-target-status]");
    const rationaleInput = form.querySelector("[data-graph-isolated-rationale]");
    const relationSelect = form.querySelector("[data-graph-isolated-relation-type]");
    const questionInput = form.querySelector("[data-graph-isolated-insight-question]");
    if (hidden) hidden.value = targetId;
    if (input) {
      input.value = title;
      input.setAttribute("data-selected-title", title);
    }
    if (relationSelect && !String(relationSelect.value || "").trim()) {
      relationSelect.value = String(relationSelect.getAttribute("data-graph-default-relation-type") || "associated_with").trim().toLowerCase() || "associated_with";
    }
    if (questionInput) questionInput.value = "";
    if (rationaleInput) {
      const source = rationaleInput.getAttribute("data-graph-rationale-source");
      if (!String(rationaleInput.value || "").trim() || source === "ai" || source === "manual") {
        rationaleInput.value = String(button.getAttribute("data-graph-manual-rationale") || "").trim();
        rationaleInput.setAttribute("data-graph-rationale-source", "manual");
      }
    }
    form.querySelectorAll("[data-graph-pick-manual-target]").forEach((item) => {
      item.classList.toggle("is-selected", item === button);
    });
    if (status) status.textContent = targetId ? `已选择：${title}` : "请选择一条永久笔记。";
    updateInlinePreview(form, button);
    clearFormError(form);
    captureDraftFromForm(form);
    return true;
  };

  const activateWorkflowTab = (tabButton = null, { focus = false } = {}) => {
    if (!tabButton) return false;
    const workflow = tabButton.closest?.(".graph-isolated-workflow");
    const tabKey = String(tabButton.getAttribute?.("data-graph-isolated-tab") || "").trim();
    if (!workflow || !tabKey) return false;
    const noteId = String(tabButton.getAttribute?.("data-graph-isolated-note") || "").trim();
    const form = workflow.querySelector("[data-graph-isolated-relation-form]");
    captureDraftFromForm(form);
    const activeKey = noteId ? setWorkflowActiveTab(noteId, tabKey) : normalizeMode(tabKey);
    workflow.querySelectorAll("[data-graph-isolated-tab]").forEach((button) => {
      const active = normalizeMode(button.getAttribute?.("data-graph-isolated-tab") || "") === activeKey;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.setAttribute("tabindex", active ? "0" : "-1");
    });
    workflow.querySelectorAll("[data-graph-target-panel]").forEach((panel) => {
      panel.hidden = String(panel.getAttribute("data-graph-target-panel") || "") !== activeKey;
    });
    const modeInput = workflow.querySelector("[data-graph-relation-source-mode]");
    if (modeInput) modeInput.value = activeKey;
    if (activeKey === "manual") {
      const draft = relationDraftForNote(noteId);
      const rationaleInput = form?.querySelector?.("[data-graph-isolated-rationale]");
      const relationSelect = form?.querySelector?.("[data-graph-isolated-relation-type]");
      const questionInput = form?.querySelector?.("[data-graph-isolated-insight-question]");
      const manualTarget = form?.querySelector?.("[data-graph-manual-target-id]");
      const selectedManualButton = form?.querySelector?.("[data-graph-pick-manual-target].is-selected");
      const manualRelationType = String(draft.manualRelationType || "").trim().toLowerCase();
      if (relationSelect) {
        relationSelect.value = manualRelationType || String(relationSelect.getAttribute("data-graph-default-relation-type") || "associated_with").trim().toLowerCase() || "associated_with";
      }
      if (questionInput) questionInput.value = String(draft.manualInsightQuestion || "").trim();
      if (rationaleInput) {
        rationaleInput.value = String(draft.manualRationale || "").trim();
        rationaleInput.setAttribute("data-graph-rationale-source", String(draft.manualRationaleSource || "").trim().toLowerCase());
      }
      if (manualTarget?.value && selectedManualButton) updateInlinePreview(form, selectedManualButton);
      else updateInlinePreview(form, null);
    } else {
      const aiSelect = form?.querySelector?.("[data-graph-ai-candidate-select]");
      if (aiSelect) syncAiCandidateForm(aiSelect);
    }
    captureDraftFromForm(form);
    if (focus) tabButton.focus?.();
    return true;
  };

  const moveWorkflowTab = (currentButton = null, direction = 1) => {
    const workflow = currentButton?.closest?.(".graph-isolated-workflow");
    if (!workflow) return false;
    const tabs = [...workflow.querySelectorAll("[data-graph-isolated-tab]")];
    const currentIndex = tabs.indexOf(currentButton);
    if (currentIndex < 0 || !tabs.length) return false;
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    return activateWorkflowTab(tabs[nextIndex], { focus: true });
  };

  const saveRelationForm = async (button = null) => {
    const form = button?.closest?.("[data-graph-isolated-relation-form]");
    if (!form) return false;
    const values = readGraphIsolatedRelationFormValues(form, { normalizeMode });
    const validation = validateGraphIsolatedRelationFormValues(values, {
      confirmableRelationTypes,
      rationaleIsActionable
    });
    if (!validation.ok) {
      const messages = {
        invalid_relation_type: "请选择一种可以保存为正式关系的类型。",
        missing_manual_target: "请先搜索并选择一条目标笔记。",
        missing_ai_target: "请先选择一条 AI 推荐目标。",
        self_relation: "不能把笔记关联到它自己，请重新选择目标笔记。",
        missing_rationale: "请写一句关联理由。",
        placeholder_rationale: "请把关联理由写完整，不要保留模板占位。"
      };
      graphIsolatedRelationFormError(form, messages[validation.errorKey] || "");
      return false;
    }
    clearFormError(form);
    return saveConfirmedRelation({ ...values, button });
  };

  return {
    relationDraftForNote,
    captureDraftFromForm,
    formError: graphIsolatedRelationFormError,
    clearFormError,
    updateInlinePreview,
    markRationaleUserEdited,
    syncAiCandidateForm,
    filterManualRelationTargets,
    pickManualRelationTarget,
    activateWorkflowTab,
    moveWorkflowTab,
    saveRelationForm
  };
}
