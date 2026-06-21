import { escapeHtml } from "./editor-render-utils.js";
import { distillationDraftFromForm } from "./editor-template-workspace.js";
import {
  applyPermanentNoteDistillationToNote,
  currentPermanentNoteDistillationPrefill,
  emptyPermanentNoteDistillationPrefill,
  normalizePermanentNoteDistillationPrefill,
  permanentNoteDistillationFormValues
} from "./permanent-note-distillation-model.js";
import {
  renderPermanentNoteDistillationQuality,
  renderPermanentNoteDistillationSection as renderPermanentNoteDistillationSectionView
} from "./permanent-note-distillation-view.js";

export class PermanentNoteDistillationController {
  constructor(host) {
    this.host = host;
    this.prefillState = emptyPermanentNoteDistillationPrefill("");
  }

  setPrefill(noteId = "", options = {}) {
    const host = this.host;
    const cleanNoteId = String(noteId || "").trim();
    const preferredTemplateVariant = cleanNoteId
      ? host.readTemplateVariantPreference("distillation", options?.draftVariants || [], options?.selectedTemplateVariant || "")
      : "";
    const rememberedTemplateVariant = cleanNoteId
      ? host.templateVariantPreferenceMeta("distillation", options?.draftVariants || [])
      : { key: "", label: "" };
    this.prefillState = normalizePermanentNoteDistillationPrefill(cleanNoteId, options, {
      preferredTemplateVariant,
      rememberedTemplateVariant
    });
  }

  currentPrefill(noteId = "") {
    return currentPermanentNoteDistillationPrefill(this.prefillState, noteId);
  }

  renderSection(note) {
    const host = this.host;
    return renderPermanentNoteDistillationSectionView(note, {
      noteType: host.resolvedNoteType(note),
      distillationPrefill: this.currentPrefill(note?.id || ""),
      relationNetworkPromptHtml: host.renderRelationNetworkPrompt(note),
      embeddedAiWorkspaceHtml: host.renderNoteEmbeddedAiWorkspaceForNote(note?.id || "")
    });
  }

  showTemplateMergeChoice(picker, button) {
    const host = this.host;
    const choiceBox = picker?.querySelector?.("[data-distillation-template-merge-choice]");
    if (!choiceBox || !button) return;
    const label = String(button.textContent || "").trim();
    choiceBox.dataset.pendingVariantKey = String(button.dataset.distillationTemplateVariant || "").trim();
    choiceBox.dataset.pendingVariantLabel = label;
    choiceBox.dataset.pendingBoundaryDraft = String(button.dataset.boundaryDraft || "");
    choiceBox.hidden = false;
    choiceBox.innerHTML = `
      <p>你已经改过这段边界草稿了。切到“${escapeHtml(label)}”时，要直接替换，还是先追加成备选？</p>
      <div class="semantic-template-merge-actions">
        <button class="mini-btn primary" type="button" data-distillation-template-merge-action="replace">替换当前草稿</button>
        <button class="mini-btn" type="button" data-distillation-template-merge-action="append">追加为备选</button>
        <button class="mini-btn is-ghost" type="button" data-distillation-template-merge-action="cancel">先不切</button>
      </div>
    `;
  }

  updatePrefillFromForm(form, cleanKey = "") {
    const host = this.host;
    const noteId = String(form?.closest?.("[data-note-distillation-section]")?.getAttribute("data-note-id") || host.activeNote()?.id || "").trim();
    const boundary = form?.querySelector?.('textarea[name="boundaryOrCounterpoint"]');
    if (noteId && this.prefillState.noteId === noteId) {
      this.prefillState = {
        ...this.prefillState,
        selectedTemplateVariant: String(cleanKey || "").trim(),
        boundaryDraft: boundary?.value || ""
      };
    }
  }

  commitTemplateVariant(choiceBox, action = "replace") {
    const host = this.host;
    if (!choiceBox) return;
    if (action === "cancel") {
      host.clearTemplateMergeChoice(choiceBox);
      return;
    }
    const picker = choiceBox.closest("[data-distillation-template-picker]");
    const form = picker?.closest?.("[data-note-distillation-form]");
    if (!picker || !form) return;
    const cleanKey = String(choiceBox.dataset.pendingVariantKey || "").trim();
    const label = String(choiceBox.dataset.pendingVariantLabel || "").trim();
    const boundaryDraft = String(choiceBox.dataset.pendingBoundaryDraft || "");
    const targetButton =
      Array.from(picker.querySelectorAll("[data-distillation-template-variant]")).find(
        (item) => String(item.dataset.distillationTemplateVariant || "").trim() === cleanKey
      ) || picker.querySelector("[data-distillation-template-variant]");
    if (!targetButton) {
      host.clearTemplateMergeChoice(choiceBox);
      return;
    }
    const boundary = form.querySelector('textarea[name="boundaryOrCounterpoint"]');
    if (boundary) {
      boundary.value =
        action === "append"
          ? host.appendTemplateDraft(boundary.value, boundaryDraft, label, "备选边界视角")
          : boundaryDraft;
    }
    host.toggleTemplateVariantButtons(form.querySelectorAll("[data-distillation-template-variant]"), targetButton);
    this.updatePrefillFromForm(form, cleanKey);
    host.writeTemplateVariantPreference("distillation", cleanKey);
    host.clearTemplateMergeChoice(choiceBox);
    this.refreshQuality(form);
    boundary?.focus?.();
  }

  applyTemplateVariant(button) {
    const host = this.host;
    const cleanKey = String(button?.dataset?.distillationTemplateVariant || "").trim();
    if (!cleanKey) return;
    const form = button.closest("[data-note-distillation-form]");
    if (!form) return;
    const picker = button.closest("[data-distillation-template-picker]");
    const activeButton = form.querySelector("[data-distillation-template-variant].is-active");
    if (activeButton === button) {
      host.clearTemplateMergeChoice(picker?.querySelector?.("[data-distillation-template-merge-choice]"));
      return;
    }
    const boundary = form.querySelector('textarea[name="boundaryOrCounterpoint"]');
    const shouldConfirm = host.templateDraftHasConflict(
      boundary?.value || "",
      activeButton?.dataset?.boundaryDraft || "",
      button.dataset.boundaryDraft || ""
    );
    if (shouldConfirm) {
      this.showTemplateMergeChoice(picker, button);
      return;
    }
    if (boundary) boundary.value = String(button.dataset.boundaryDraft || "");
    host.toggleTemplateVariantButtons(form.querySelectorAll("[data-distillation-template-variant]"), button);
    this.updatePrefillFromForm(form, cleanKey);
    host.writeTemplateVariantPreference("distillation", cleanKey);
    host.clearTemplateMergeChoice(picker?.querySelector?.("[data-distillation-template-merge-choice]"));
    this.refreshQuality(form);
    boundary?.focus?.();
  }

  focusTemporaryIsolatedBoundary() {
    const host = this.host;
    const sectionSelector = "[data-note-distillation-section]";
    const focusSelector = '[data-note-distillation-form] textarea[name="boundaryOrCounterpoint"]';
    const applyDraft = () => {
      const section = host.els.result?.querySelector?.(sectionSelector);
      const textarea = section?.querySelector?.(focusSelector);
      if (!textarea) return false;
      if (!String(textarea.value || "").trim()) {
        textarea.value = "暂时独立：";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        const form = textarea.closest("[data-note-distillation-form]");
        if (form) this.refreshQuality(form);
      }
      textarea.focus?.();
      return true;
    };
    host.jumpToInspectorSection(sectionSelector, { focus: true, focusSelector });
    if (!applyDraft()) window.setTimeout(applyDraft, 40);
    host.onStatus("已定位到边界说明：写明为什么暂时不建立关系。", "ok");
  }

  refreshQuality(form) {
    const note = this.host.activeNote();
    const mount = form?.querySelector?.("[data-note-distillation-quality]");
    if (!note || !mount) return;
    const draft = distillationDraftFromForm(form, note);
    mount.innerHTML = renderPermanentNoteDistillationQuality(draft);
  }

  async handleForm(form) {
    const host = this.host;
    const note = host.activeNote();
    const noteId = String(note?.id || "").trim();
    if (!noteId) return;
    const noteType = host.resolvedNoteType(note);
    if (noteType !== "permanent" && noteType !== "original") {
      host.onStatus("观点提纯面板只支持永久笔记", "warn");
      return;
    }
    const values = permanentNoteDistillationFormValues(form);
    const savedEditor = await host.autoSaveActiveNote("distillation");
    if (savedEditor === false) return;
    if (!host.isActiveNoteId(noteId)) return;
    const saved = await host.onStateChange("save-note-distillation", {
      noteId,
      thesis: values.thesis,
      threeLineSummary: values.threeLineSummary,
      boundaryOrCounterpoint: values.boundaryOrCounterpoint,
      distillationStatus: values.distillationStatus,
      authorship: values.distillationStatus === "confirmed" ? { user_confirmed: true, ai_assisted: false } : undefined
    });
    if (!saved) return;
    if (!host.isActiveNoteId(noteId)) return;
    applyPermanentNoteDistillationToNote(note, values, {
      confirmAuthorship: values.distillationStatus === "confirmed"
    });
    this.setPrefill(noteId, { boundaryDraft: "" });
    host.renderThinkingStatus();
    host.permanentNoteWorkspace?.().reset(noteId);
    host.renderRelated();
  }

  async confirm() {
    const host = this.host;
    const note = host.activeNote();
    const noteId = String(note?.id || "").trim();
    if (!noteId) return;
    const noteType = host.resolvedNoteType(note);
    if (noteType !== "permanent" && noteType !== "original") {
      host.onStatus("观点提纯面板只支持永久笔记", "warn");
      return;
    }
    const form = host.els.result?.querySelector?.("[data-note-distillation-form]");
    if (form) {
      const values = permanentNoteDistillationFormValues(form);
      if (!values.thesis || values.threeLineSummary.length !== 3) {
        host.onStatus("确认前需要补全一句话判断和三句话压缩", "warn");
        return;
      }
      const savedEditor = await host.autoSaveActiveNote("distillation-confirm");
      if (savedEditor === false) return;
      if (!host.isActiveNoteId(noteId)) return;
      const saved = await host.onStateChange("save-note-distillation", {
        noteId,
        thesis: values.thesis,
        threeLineSummary: values.threeLineSummary,
        boundaryOrCounterpoint: values.boundaryOrCounterpoint,
        distillationStatus: "draft"
      });
      if (!saved) return;
      if (!host.isActiveNoteId(noteId)) return;
      applyPermanentNoteDistillationToNote(note, {
        ...values,
        distillationStatus: ""
      });
      this.setPrefill(noteId, { boundaryDraft: "" });
    }
    const confirmed = await host.onStateChange("confirm-note-distillation", { noteId });
    if (!confirmed) return;
    if (!host.isActiveNoteId(noteId)) return;
    note.distillationStatus = "confirmed";
    note.authorship = { ...(note.authorship || {}), user_confirmed: true };
    host.renderThinkingStatus();
    host.renderRelated();
  }
}
