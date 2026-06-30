import { escapeHtml } from "./editor-render-utils.js";
import {
  collectDistillationWarnings,
  distillationNextStepGuide,
  distillationStatusText,
  renderDistillationQualityContent,
  renderDistillationReadinessList
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
  const qualityWarnings = collectDistillationWarnings({
    title: note.title,
    body: note.body,
    thesis,
    threeLineSummary: summaryLines,
    boundaryOrCounterpoint
  });
  const filledCount = (thesis ? 1 : 0) + summaryLines.filter(Boolean).length;
  const statusLabel = String(note.distillationStatus || "").trim() || (filledCount ? "draft" : "missing");
  const statusValue = ["missing", "draft", "confirmed"].includes(statusLabel) ? statusLabel : filledCount ? "draft" : "missing";
  const nextGuide = distillationNextStepGuide({
    ...note,
    thesis,
    threeLineSummary: summaryLines,
    boundaryOrCounterpoint,
    distillationStatus: statusValue
  });

  return `
      <section class="inspector-section semantic-relations-section" data-note-distillation-section data-note-id="${escapeHtml(note.id)}">
          <div class="inspector-section-head">
            <div>
              <div class="inspector-section-title">提炼观点</div>
              <div class="inspector-section-note">这不是让 AI 总结一遍，而是把笔记整理成可写作的判断：观点、理由、边界、追问和主题方向。</div>
            </div>
            <span class="inspector-chip">${escapeHtml(distillationStatusText(statusValue))}</span>
          </div>
        <form class="semantic-relation-form" data-note-distillation-form>
          <div class="distillation-purpose-card" aria-label="观点提炼目标">
            <strong>提炼目标</strong>
            <ul>
              <li>一句话观点</li>
              <li>支撑理由</li>
              <li>边界 / 反例</li>
              <li>可继续追问的问题</li>
              <li>可进入写作的主题</li>
            </ul>
          </div>
          <div class="distillation-next-card" data-note-distillation-next>
            <div>
              <span>当前下一步</span>
              <strong>${escapeHtml(nextGuide.title)}</strong>
              <p>${escapeHtml(nextGuide.body)}</p>
            </div>
            <button class="mini-btn primary" type="button" data-note-distillation-focus="${escapeHtml(nextGuide.key)}">${escapeHtml(nextGuide.actionLabel)}</button>
          </div>
          ${renderDistillationReadinessList({
            thesis,
            summaryLines,
            boundaryOrCounterpoint,
            statusValue,
            qualityWarnings
          })}
          ${options.relationNetworkPromptHtml || ""}
          <label>
            一句话判断
            <span class="distillation-field-hint">写成“我认为 X，因为 Y”，而不是把标题重复一遍。</span>
            <textarea name="thesis" rows="3" placeholder="这条永久笔记到底主张什么？">${escapeHtml(thesis)}</textarea>
          </label>
          <label>
            三句话压缩
            <span class="distillation-field-hint">第一句说观点，第二句说支撑理由，第三句说它能进入哪个写作主题。</span>
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
            <span class="distillation-field-hint">补一条会让这条判断失效的条件，后续写作时更容易处理反驳。</span>
            <textarea name="boundaryOrCounterpoint" rows="3" placeholder="这条判断在哪些条件下不成立？最需要防的反例或反方是什么？">${escapeHtml(boundaryOrCounterpoint)}</textarea>
          </label>
          <label>
            观点状态
            <select name="distillationStatus">
              <option value="missing"${statusValue === "missing" ? " selected" : ""}>待提纯</option>
              <option value="draft"${statusValue === "draft" ? " selected" : ""}>待确认</option>
              <option value="confirmed"${statusValue === "confirmed" ? " selected" : ""}>已确认</option>
            </select>
          </label>
          <div class="semantic-relation-actions">
            <button class="mini-btn primary" type="submit">保存草稿</button>
            <button class="mini-btn" type="button" data-note-distillation-confirm>确认观点</button>
          </div>
          <div class="semantic-relation-group" data-note-distillation-quality>
            <div class="semantic-relation-group-head"><strong>质量提示</strong><span>${escapeHtml(qualityWarnings.length ? `${qualityWarnings.length} 项` : "OK")}</span></div>
            ${renderDistillationQualityContent({
              title: note.title,
              body: note.body,
              thesis,
              threeLineSummary: summaryLines,
              boundaryOrCounterpoint
            })}
          </div>
          <div data-note-embedded-ai-workspace data-note-id="${escapeHtml(note.id)}">
            ${options.embeddedAiWorkspaceHtml || ""}
          </div>
        </form>
      </section>
    `;
}

export function renderPermanentNoteDistillationQuality(draft = {}) {
  const warnings = collectDistillationWarnings(draft);
  return `
      <div class="semantic-relation-group-head"><strong>质量提示</strong><span>${escapeHtml(warnings.length || "OK")}</span></div>
      ${renderDistillationQualityContent(draft)}
    `;
}
