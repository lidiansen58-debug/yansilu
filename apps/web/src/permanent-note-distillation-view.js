import { escapeHtml } from "./editor-render-utils.js";
import {
  collectDistillationWarnings
} from "./editor-template-workspace.js";
import {
  normalizeDistillationTemplateVariants,
  renderDistillationTemplateVariantSwitcher
} from "./editor-relation-helpers.js";

export function renderPermanentNoteDistillationSection(note, options = {}) {
  const noteType = String(options.noteType || "").trim();
  if (!note?.id || (noteType !== "permanent" && noteType !== "original")) return "";
  const thesis = String(note.thesis || "").trim();
  const summary = Array.isArray(note.threeLineSummary) ? note.threeLineSummary : [];
  const summaryLines = [0, 1, 2].map((idx) => String(summary[idx] || "").trim());
  const distillationPrefill = options.distillationPrefill || {};
  const distillationVariants = normalizeDistillationTemplateVariants(
    distillationPrefill.draftVariants || [],
    distillationPrefill.selectedTemplateVariant || ""
  );
  const rememberedTemplateVariantLabel = String(distillationPrefill.rememberedTemplateVariantLabel || "").trim();
  const boundaryOrCounterpoint = String(note.boundaryOrCounterpoint || "").trim() || String(distillationPrefill.boundaryDraft || "").trim();

  return `
      <section class="inspector-section semantic-relations-section" data-note-distillation-section data-note-id="${escapeHtml(note.id)}">
        <div class="distillation-form-head">
          <strong>提炼观点</strong>
          <button class="mini-btn is-ghost" type="button" data-note-distillation-close aria-label="关闭提炼观点">关闭</button>
        </div>
        <form class="semantic-relation-form" data-note-distillation-form>
          ${options.relationNetworkPromptHtml || ""}
          <label>
            一句话判断
            <textarea name="thesis" rows="3" placeholder="这条笔记最想说明什么？">${escapeHtml(thesis)}</textarea>
          </label>
          <label>
            三句话压缩
            <textarea name="summary1" rows="2" placeholder="1. 这条观点在说什么？">${escapeHtml(summaryLines[0])}</textarea>
          </label>
          <label>
            <span class="sr-only">三句话压缩第二句</span>
            <textarea name="summary2" rows="2" placeholder="2. 为什么它成立或重要？">${escapeHtml(summaryLines[1])}</textarea>
          </label>
          <label>
            <span class="sr-only">三句话压缩第三句</span>
            <textarea name="summary3" rows="2" placeholder="3. 它可以进入哪个主题或写作方向？">${escapeHtml(summaryLines[2])}</textarea>
          </label>
          ${renderDistillationTemplateVariantSwitcher(
            distillationVariants.items,
            distillationVariants.selectedKey,
            rememberedTemplateVariantLabel
          )}
          <label>
            边界 / 反例 / 不适用条件
            <textarea name="boundaryOrCounterpoint" rows="3" placeholder="这条判断在哪些条件下不成立？">${escapeHtml(boundaryOrCounterpoint)}</textarea>
          </label>
          <div class="semantic-relation-actions">
            <button class="mini-btn" type="submit">保存草稿</button>
            <button class="mini-btn primary" type="button" data-note-distillation-confirm>整理到正文</button>
          </div>
        </form>
      </section>
    `;
}

export function renderPermanentNoteDistillationQuality(draft = {}) {
  const warnings = collectDistillationWarnings(draft);
  return `
      <div class="semantic-relation-group-head"><strong>质量提示</strong><span>${escapeHtml(warnings.length || "OK")}</span></div>
      <div class="related-empty">${escapeHtml(warnings.length ? warnings.join("；") : "OK")}</div>
    `;
}
