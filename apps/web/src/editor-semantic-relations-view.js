import { escapeHtml } from "./editor-render-utils.js";
import { highlightMatch, relationCreateDefaultTypeForNote, sortRelationTargetCandidatesForNote } from "./editor-link-picker.js";
import { typeFromFolder } from "./prototype-store.js";
import {
  explicitPermanentNoteRelations,
  permanentNoteSidebarExplicitRelationCount
} from "./permanent-note-sidebar-model.js";
import {
  isHiddenRelation,
  isMarkdownWikilinkRelation,
  noteTypeText,
  parseInlineRelationAnnotations,
  relationQualityEvaluation,
  relationQualityLabel,
  relationSourceLabel,
  relationStatusLabel,
  relationTone,
  RELATION_CREATE_TYPES,
  RELATION_EDIT_STATUSES,
  relationTypeGuidance,
  relationTypeLabel,
  renderRelationQualityMeter,
  renderRelationTemplateVariantSwitcher
} from "./editor-relation-helpers.js";

export class EditorSemanticRelationsView {
  constructor(host) {
    this.host = host;
  }

  relationEndpoint(link, direction) {
    const host = this.host;
    const endpointId = direction === "outgoing" ? link?.toNoteId : link?.fromNoteId;
    const apiNote = direction === "outgoing" ? link?.target : link?.source;
    const cached = host.state.notes.find((item) => item.id === endpointId) || null;
    return {
      id: endpointId || apiNote?.id || "",
      title: apiNote?.title || cached?.title || endpointId || "未命名笔记",
      noteType: apiNote?.noteType || cached?.noteType || "original",
      folderId: cached?.folderId || "",
      status: apiNote?.status || cached?.status || ""
    };
  }

  renderRelationFollowupSuggestion(noteId = "") {
    const suggestion = this.host.relationFollowupSuggestion;
    if (!suggestion || String(suggestion.noteId || "") !== String(noteId || "")) return "";
    return `
      <div class="relation-followup-suggestion" data-relation-followup-suggestion data-relation-id="${escapeHtml(suggestion.relationId)}">
        <div class="relation-followup-suggestion-text">${escapeHtml(suggestion.text || "这条关系还可以补理由。")}</div>
        <div class="relation-followup-suggestion-actions">
          <button class="mini-btn primary" type="button" data-relation-action="open-followup-reason" data-relation-id="${escapeHtml(suggestion.relationId)}">${escapeHtml(suggestion.actionLabel || "补理由")}</button>
          <button class="mini-btn is-ghost" type="button" data-relation-action="dismiss-followup">${escapeHtml(suggestion.laterLabel || "稍后")}</button>
        </div>
      </div>
    `;
  }

  renderSemanticRelationItem(link, direction) {
    const host = this.host;
    const endpoint = this.relationEndpoint(link, direction);
    const type = String(link?.relationType || "").trim().toLowerCase();
    const directionLabel = direction === "outgoing" ? "当前指向" : "指向当前";
    const createdByLabel = relationSourceLabel(String(link?.createdBy || "user").trim());
    const confidence =
      link?.confidence === null || link?.confidence === undefined || link?.confidence === ""
        ? ""
        : `可信度 ${Math.round(Number(link.confidence) * 100)}%`;
    const folderText = endpoint.folderId ? host.folderLabel(endpoint.folderId) : noteTypeText(endpoint.noteType);
    const insightQuestion = String(link?.insightQuestion || "").trim();
    const rationale = String(link?.rationale || "").trim();
    const preview = isMarkdownWikilinkRelation(link) ? "由正文链接建立的基础关联。" : rationale;

    return `
      <article class="related-item semantic-relation-item" data-relation-tone="${escapeHtml(relationTone(link))}" data-relation-id="${escapeHtml(link?.id || "")}">
        <button class="semantic-relation-open" type="button" data-preview-note="${escapeHtml(endpoint.id)}">
          <span class="related-item-title">${escapeHtml(endpoint.title)}</span>
          <span class="related-item-meta">${escapeHtml(directionLabel)} · ${escapeHtml(relationTypeLabel(type))} · ${escapeHtml(relationStatusLabel(link?.status))} · ${escapeHtml(folderText)}</span>
          ${preview ? `<span class="related-item-preview">${escapeHtml(preview)}</span>` : ""}
          ${insightQuestion ? `<span class="relation-question">${escapeHtml(insightQuestion)}</span>` : ""}
        </button>
        <div class="related-item-badges">
          <span class="related-item-badge">${escapeHtml(relationTypeLabel(type))}</span>
          <span class="related-item-badge">${escapeHtml(createdByLabel)}</span>
          <span class="related-item-badge">${escapeHtml(relationQualityLabel(link?.rationaleQualityLevel))}</span>
          ${confidence ? `<span class="related-item-badge">${escapeHtml(confidence)}</span>` : ""}
        </div>
        <div class="semantic-relation-card-actions">
          <button class="mini-btn is-ghost" type="button" data-relation-action="open-edit" data-relation-id="${escapeHtml(link?.id || "")}">编辑</button>
          <button class="mini-btn is-ghost" type="button" data-relation-action="delete" data-relation-id="${escapeHtml(link?.id || "")}">删除</button>
        </div>
      </article>
    `;
  }

  renderSemanticRelationsLoadingSection(noteId) {
    return `
      <section class="inspector-section semantic-relations-section" data-note-relations-section data-note-id="${escapeHtml(noteId)}">
        <div class="inspector-section-head">
          <div class="inspector-section-title">关系网络</div>
          <div class="semantic-relation-head-actions">
            <button class="mini-btn is-ghost" type="button" data-relation-action="open-create">新建关联</button>
            <div class="inspector-count">读取中</div>
          </div>
        </div>
        <div class="related-empty">正在读取已保存的正式关联。</div>
      </section>
    `;
  }

  renderInlineDraftRelationSection(note, tab) {
    const host = this.host;
    const drafts = parseInlineRelationAnnotations(tab?.body || "");
    if (!drafts.length) return "";
    const scoped = host.scopedLinkCandidates();
    const items = drafts
      .map((draft, index) => {
        const resolved = host.resolveLinkToken(draft.token, scoped);
        const endpoint = resolved?.note || { id: draft.token, title: draft.token, noteType: "original", folderId: "" };
        const quality = relationQualityEvaluation(draft.rationale, "");
        return `
          <article class="related-item semantic-relation-item" data-relation-tone="${escapeHtml(relationTone({ relationType: draft.relationType }))}" data-inline-relation-index="${index}">
            <button class="semantic-relation-open" type="button" data-preview-note="${escapeHtml(endpoint.id || "")}">
              <span class="related-item-title">${escapeHtml(endpoint.title || draft.token)}</span>
              <span class="related-item-meta">${escapeHtml("刚写入正文")} · ${escapeHtml(relationTypeLabel(draft.relationType))} · ${escapeHtml(endpoint.folderId ? host.folderLabel(endpoint.folderId) : noteTypeText(endpoint.noteType))}</span>
              ${draft.rationale ? `<span class="related-item-preview">${escapeHtml(draft.rationale)}</span>` : ""}
            </button>
            <div class="related-item-badges">
              <span class="related-item-badge">${escapeHtml(relationTypeLabel(draft.relationType))}</span>
              <span class="related-item-badge">${escapeHtml(relationSourceLabel(draft.manager))}</span>
              <span class="related-item-badge">${escapeHtml(relationQualityLabel(quality.level))}</span>
            </div>
            <div class="semantic-relation-card-actions">
              <button class="mini-btn primary" type="button" data-relation-action="promote-inline" data-inline-relation-index="${index}">升级为正式关系</button>
            </div>
          </article>
        `;
      })
      .join("");
    return `
      <section class="inspector-section semantic-relations-section">
        <div class="inspector-section-head">
          <div class="inspector-section-title">正文里的新关联</div>
          <div class="inspector-count">${drafts.length}</div>
        </div>
        <div class="inspector-section-note">这些链接刚写进正文；确认后会进入现有关联。</div>
        <div class="inspector-list">${items}</div>
      </section>
    `;
  }

  relationCreateDefaultType(note = this.host.activeNote()) {
    return relationCreateDefaultTypeForNote(note);
  }

  sortRelationTargetCandidates(candidates = [], note = this.host.activeNote()) {
    return sortRelationTargetCandidatesForNote(candidates, note);
  }

  renderRelationTargetOptions(candidates = [], selectedId = "") {
    const host = this.host;
    const selected = String(selectedId || "").trim();
    const selectedNote = selected ? host.state.notes.find((item) => item?.id === selected) || null : null;
    const sorted = this.sortRelationTargetCandidates(candidates);
    const items = selected && !sorted.some((candidate) => candidate?.id === selected)
      ? [...(selectedNote ? [selectedNote] : []), ...sorted]
      : sorted;
    return items
      .filter(Boolean)
      .map((note) => {
        const meta = `${noteTypeText(note.noteType || typeFromFolder(host.state, note.folderId))} · ${host.folderLabel(note.folderId)}`;
        return `<option value="${escapeHtml(note.id)}"${note.id === selected ? " selected" : ""}>${escapeHtml(note.title || note.id)} · ${escapeHtml(meta)}</option>`;
      })
      .join("");
  }

  renderRelationTargetChoices(candidates = [], selectedId = "", query = "", activeId = "") {
    const host = this.host;
    const selected = String(selectedId || "").trim();
    const active = String(activeId || "").trim();
    const selectedNote = selected ? host.state.notes.find((item) => item?.id === selected) || null : null;
    const q = String(query || "").trim().toLowerCase();
    const sorted = this.sortRelationTargetCandidates(candidates);
    const filtered = q ? sorted.filter((candidate) => String(candidate?.title || "").toLowerCase().includes(q)) : sorted;
    const items = selected && !filtered.some((candidate) => candidate?.id === selected)
      ? [...(selectedNote ? [selectedNote] : []), ...filtered]
      : filtered;
    if (!items.length) return `<div class="picker-empty">没有匹配笔记</div>`;
    return items
      .slice(0, 10)
      .map((candidate) => {
        const isActive = candidate?.id === active;
        const resolvedType = noteTypeText(candidate?.noteType || typeFromFolder(host.state, candidate?.folderId || ""));
        const location = host.folderLabel(candidate?.folderId || "");
        return `
          <button
            class="link-picker-item ${isActive ? "active" : ""}"
            type="button"
            data-relation-target-choice
            data-note-id="${escapeHtml(candidate?.id || "")}"
            data-note-title="${escapeHtml(candidate?.title || candidate?.id || "")}"
            aria-selected="${isActive ? "true" : "false"}"
            title="${escapeHtml(`${candidate?.title || candidate?.id || ""} · ${resolvedType} · ${location}`)}"
          >
            <span class="picker-headline">
              <strong>${highlightMatch(candidate?.title || candidate?.id || "", q)}</strong>
            </span>
          </button>
        `;
      })
      .join("");
  }

  renderCreateRelationFormSection(noteId, prefill = {}) {
    const host = this.host;
    const activeNote = host.activeNote();
    const candidates = host.scopedLinkCandidates();
    const defaultType = this.relationCreateDefaultType(activeNote);
    const selectedTargetId = String(prefill?.targetNoteId || "").trim();
    const selectedTarget = selectedTargetId ? host.state.notes.find((item) => item?.id === selectedTargetId) || null : null;
    const selectedRelationType = String(prefill?.relationType || "").trim().toLowerCase() || defaultType;
    const targetQuery = String(prefill?.targetQuery || selectedTarget?.title || "").trim();
    const rationaleDraft = String(prefill?.rationaleDraft || "").trim();
    const insightQuestionDraft = String(prefill?.insightQuestionDraft || "").trim();
    const defaultGuidance = relationTypeGuidance(selectedRelationType);
    const scopeFolderLabel = activeNote?.folderId ? host.folderLabel(activeNote.folderId) : "当前目录";
    const typeOptions = RELATION_CREATE_TYPES.map(
      (type) => `<option value="${escapeHtml(type)}"${type === selectedRelationType ? " selected" : ""}>${escapeHtml(relationTypeLabel(type))}</option>`
    ).join("");
    const targetChoices = this.renderRelationTargetChoices(candidates, selectedTargetId, targetQuery, selectedTargetId);
    const targetStatus = selectedTarget
      ? `已选：${selectedTarget.title || selectedTarget.id}`
      : candidates.length
        ? "输入标题后选择一条笔记"
        : "当前范围没有可连接笔记";
    const templateVariants = prefill?.draftVariants || [];
    const selectedTemplateVariant = prefill?.selectedTemplateVariant || "";
    const rememberedTemplateVariantLabel = String(prefill?.rememberedTemplateVariantLabel || "").trim();

    return `
      <section class="inspector-section semantic-relations-section" data-note-relations-section data-note-id="${escapeHtml(noteId)}">
        <div class="inspector-section-head">
          <div>
            <div class="inspector-section-title">关联到另一条永久笔记</div>
            <div class="inspector-section-note">选择一条笔记，说明它和当前笔记是什么关系。保存后这条连接会进入图谱。</div>
          </div>
          <button class="mini-btn is-ghost" type="button" data-relation-action="cancel-create">取消</button>
        </div>
        <div class="semantic-relation-status relation-create-summary">
          <span class="inspector-chip">范围 ${escapeHtml(scopeFolderLabel)}</span>
          <span class="inspector-chip">当前笔记发起</span>
        </div>
        ${prefill?.entryHint ? `<div class="inspector-section-note" data-relation-entry-hint>${escapeHtml(prefill.entryHint)}</div>` : ""}
        <form class="semantic-relation-form" data-create-relation-form data-note-id="${escapeHtml(noteId)}">
          ${renderRelationTemplateVariantSwitcher(templateVariants, selectedTemplateVariant, rememberedTemplateVariantLabel)}
          <label>
            <span>要关联哪条笔记</span>
            <input id="targetQuery" class="semantic-relation-target-search" name="targetQuery" data-relation-target-search data-autofocus-relation-target autocomplete="off" placeholder="输入标题关键词" value="${escapeHtml(targetQuery)}" autofocus />
            <input type="hidden" name="toNoteId" data-relation-target-id value="${escapeHtml(selectedTargetId)}" />
            <div class="link-picker-list semantic-relation-target-list" data-relation-target-list hidden>${targetChoices}</div>
            <small class="semantic-relation-target-status" data-relation-target-status>${escapeHtml(targetStatus)}</small>
          </label>
          <label>
            <span>它们是什么关系</span>
            <select name="relationType" required>${typeOptions}</select>
          </label>
          <label>
            <span>为什么要关联</span>
            <textarea name="rationale" required aria-describedby="relation-rationale-guidance-create" placeholder="${escapeHtml(defaultGuidance.rationalePlaceholder)}">${escapeHtml(rationaleDraft)}</textarea>
            <small class="semantic-relation-quality-guidance" id="relation-rationale-guidance-create">${escapeHtml(defaultGuidance.rationaleHint)}</small>
          </label>
          <label>
            <span>继续追问（可选）</span>
            <textarea name="insightQuestion" aria-describedby="relation-question-guidance-create" placeholder="${escapeHtml(defaultGuidance.questionPlaceholder)}">${escapeHtml(insightQuestionDraft)}</textarea>
            <small class="semantic-relation-quality-guidance" id="relation-question-guidance-create">${escapeHtml(defaultGuidance.questionHint)}</small>
          </label>
          ${renderRelationQualityMeter(rationaleDraft, insightQuestionDraft)}
          <div class="semantic-relation-form-error" data-relation-form-error></div>
          <div class="semantic-relation-actions">
            <button class="mini-btn primary" type="submit" ${selectedTargetId ? "" : "disabled"}>保存关联</button>
          </div>
        </form>
      </section>
    `;
  }

  renderRelationTypeOptions(selectedType = "") {
    const selected = String(selectedType || "").trim().toLowerCase();
    return RELATION_CREATE_TYPES.map(
      (type) => `<option value="${escapeHtml(type)}"${type === selected ? " selected" : ""}>${escapeHtml(relationTypeLabel(type))}</option>`
    ).join("");
  }

  renderRelationStatusOptions(selectedStatus = "confirmed") {
    const selected = String(selectedStatus || "confirmed").trim().toLowerCase();
    return RELATION_EDIT_STATUSES.map(
      (status) => `<option value="${escapeHtml(status)}"${status === selected ? " selected" : ""}>${escapeHtml(relationStatusLabel(status))}</option>`
    ).join("");
  }

  renderEditRelationFormSection(noteId, link, context = {}) {
    const endpoint = this.relationEndpoint(link, link?.fromNoteId === noteId ? "outgoing" : "incoming");
    const defaultGuidance = relationTypeGuidance(link?.relationType || "supports");
    const rationaleDraft = String(link?.rationale || "").trim() || String(context?.rationaleDraft || "").trim();
    const insightQuestionDraft = String(link?.insightQuestion || "").trim() || String(context?.insightQuestionDraft || "").trim();
    const templateVariants = context?.draftVariants || [];
    const selectedTemplateVariant = context?.selectedTemplateVariant || "";
    const rememberedTemplateVariantLabel = String(context?.rememberedTemplateVariantLabel || "").trim();
    return `
      <section class="inspector-section semantic-relations-section" data-note-relations-section data-note-id="${escapeHtml(noteId)}">
        <div class="inspector-section-head">
          <div>
            <div class="inspector-section-title">编辑正式关联</div>
            <div class="inspector-section-note">${escapeHtml(endpoint.title || "未命名笔记")}</div>
          </div>
          <button class="mini-btn is-ghost" type="button" data-relation-action="cancel-edit">取消</button>
        </div>
        ${context?.entryHint ? `<div class="inspector-section-note" data-relation-entry-hint>${escapeHtml(context.entryHint)}</div>` : ""}
        <form class="semantic-relation-form" data-edit-relation-form data-note-id="${escapeHtml(noteId)}" data-relation-id="${escapeHtml(link?.id || "")}">
          ${renderRelationTemplateVariantSwitcher(templateVariants, selectedTemplateVariant, rememberedTemplateVariantLabel)}
          <label>
            <span>关系类型</span>
            <select name="relationType" required>${this.renderRelationTypeOptions(link?.relationType || "supports")}</select>
          </label>
          <label>
            <span>关系状态</span>
            <select name="status" required>${this.renderRelationStatusOptions(link?.status || "confirmed")}</select>
          </label>
          <label>
            <span>为什么要关联</span>
            <textarea name="rationale" required aria-describedby="relation-rationale-guidance-edit" placeholder="${escapeHtml(defaultGuidance.rationalePlaceholder)}">${escapeHtml(rationaleDraft)}</textarea>
            <small class="semantic-relation-quality-guidance" id="relation-rationale-guidance-edit">${escapeHtml(defaultGuidance.rationaleHint)}</small>
          </label>
          <label>
            <span>继续追问（可选）</span>
            <textarea name="insightQuestion" aria-describedby="relation-question-guidance-edit" placeholder="${escapeHtml(defaultGuidance.questionPlaceholder)}">${escapeHtml(insightQuestionDraft)}</textarea>
            <small class="semantic-relation-quality-guidance" id="relation-question-guidance-edit">${escapeHtml(defaultGuidance.questionHint)}</small>
          </label>
          ${renderRelationQualityMeter(rationaleDraft, insightQuestionDraft)}
          <div class="semantic-relation-form-error" data-relation-form-error></div>
          <div class="semantic-relation-actions">
            <button class="mini-btn primary" type="submit">保存修改</button>
          </div>
        </form>
      </section>
    `;
  }

  renderSemanticRelationsSection(relations, noteId) {
    const outgoing = Array.isArray(relations?.outgoingLinks) ? relations.outgoingLinks.filter((link) => !isHiddenRelation(link)) : [];
    const backlinks = Array.isArray(relations?.backlinks) ? relations.backlinks.filter((link) => !isHiddenRelation(link)) : [];
    const visibleLinks = [...outgoing, ...backlinks];
    const { outgoing: explicitOutgoing, backlinks: explicitBacklinks, all: explicitLinks } = explicitPermanentNoteRelations(relations);
    const markdownCount = visibleLinks.length - explicitLinks.length;
    const confirmedCount = explicitLinks.filter((link) => String(link?.status || "confirmed") === "confirmed").length;
    const tensionCount = explicitLinks.filter((link) => relationTone(link) === "tension").length;
    const bridgeCount = explicitLinks.filter((link) => relationTone(link) === "bridge").length;
    const networkState = confirmedCount ? "已接入" : explicitLinks.length ? "待确认" : "未安置";
    const statusChips = [
      explicitLinks.length ? `${explicitLinks.length} 条正式关系` : "还没有正式关系",
      confirmedCount ? `已确认 ${confirmedCount}` : "",
      tensionCount ? `张力 ${tensionCount}` : "",
      bridgeCount ? `桥接 ${bridgeCount}` : "",
      markdownCount ? `正文链接 ${markdownCount}` : "",
      networkState !== "未安置" ? networkState : ""
    ].filter(Boolean);
    const group = (title, direction, list, emptyText) => `
      <div class="semantic-relation-group">
        <div class="semantic-relation-group-head">
          <span>${escapeHtml(title)}</span>
          <span>${list.length}</span>
        </div>
        ${
          list.length
            ? `<div class="inspector-list">${list.map((link) => this.renderSemanticRelationItem(link, direction)).join("")}</div>`
            : `<div class="related-empty">${escapeHtml(emptyText)}</div>`
        }
      </div>
    `;
    return `
      <section class="inspector-section semantic-relations-section" data-note-relations-section data-note-id="${escapeHtml(noteId)}">
        <div class="inspector-section-head">
          <div>
            <div class="inspector-section-title">关系网络</div>
            <div class="inspector-section-note">已保存的正式关系，图谱以这里为准。</div>
          </div>
          <div class="semantic-relation-head-actions">
            <button class="mini-btn is-ghost" type="button" data-relation-action="open-create">新建关联</button>
            <div class="inspector-count">${explicitLinks.length}</div>
          </div>
        </div>
        <div class="semantic-relation-status">
          ${statusChips.map((chip) => `<span class="inspector-chip">${escapeHtml(chip)}</span>`).join("")}
        </div>
        ${this.renderRelationFollowupSuggestion(noteId)}
        ${
          explicitLinks.length
            ? `
              <div class="semantic-relation-groups">
                ${group("向外连接", "outgoing", explicitOutgoing, "当前笔记还没有向外建立带理由的关系。")}
                ${group("被它连接", "incoming", explicitBacklinks, "还没有其他笔记以带理由的关系指向当前笔记。")}
              </div>
            `
            : `<div class="related-empty">${markdownCount ? "已有正文链接线索，但还没保存成正式关联。" : "还没有已保存的正式关联。"}</div>`
        }
      </section>
    `;
  }

  renderSemanticRelationsErrorSection(noteId, error) {
    return `
      <section class="inspector-section semantic-relations-section" data-note-relations-section data-note-id="${escapeHtml(noteId)}">
        <div class="inspector-section-head">
          <div class="inspector-section-title">关系网络</div>
          <div class="inspector-count">不可用</div>
        </div>
        <div class="related-empty bad">关系读取失败：${escapeHtml(String(error?.message || error || "未知错误"))}</div>
      </section>
    `;
  }

  renderCurrentRelationSection(noteId, { relations = this.host.currentSemanticRelations, relationState = this.host.semanticRelationsState, error = null } = {}) {
    const panelState = this.host.currentRelationPanelState(noteId);
    if (panelState.mode === "create") {
      return this.renderCreateRelationFormSection(noteId, {
        targetNoteId: panelState.targetNoteId,
        relationType: panelState.relationType,
        entryHint: panelState.entryHint,
        rationaleDraft: panelState.rationaleDraft,
        insightQuestionDraft: panelState.insightQuestionDraft,
        draftVariants: panelState.draftVariants,
        selectedTemplateVariant: panelState.selectedTemplateVariant,
        rememberedTemplateVariantLabel: panelState.rememberedTemplateVariantLabel
      });
    }
    if (panelState.mode === "edit") {
      const link =
        relationState === "loaded" && relations
          ? [...(Array.isArray(relations?.outgoingLinks) ? relations.outgoingLinks : []), ...(Array.isArray(relations?.backlinks) ? relations.backlinks : [])].find(
              (item) => item?.id === panelState.relationId
            ) || null
          : this.host.findSemanticRelation(panelState.relationId);
      if (link) {
        return this.renderEditRelationFormSection(noteId, link, {
          entryHint: panelState.entryHint,
          rationaleDraft: panelState.rationaleDraft,
          insightQuestionDraft: panelState.insightQuestionDraft,
          draftVariants: panelState.draftVariants,
          selectedTemplateVariant: panelState.selectedTemplateVariant,
          rememberedTemplateVariantLabel: panelState.rememberedTemplateVariantLabel
        });
      }
    }
    if (relationState === "error") return this.renderSemanticRelationsErrorSection(noteId, error);
    if (relationState !== "loaded" || !relations) return this.renderSemanticRelationsLoadingSection(noteId);
    return this.renderSemanticRelationsSection(relations, noteId);
  }

  currentExplicitRelationCount() {
    return permanentNoteSidebarExplicitRelationCount({
      relationState: this.host.semanticRelationsState,
      relations: this.host.currentSemanticRelations
    });
  }
}
