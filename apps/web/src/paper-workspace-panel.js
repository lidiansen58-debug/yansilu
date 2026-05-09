import {
  canSubmitNotebookDraft,
  candidateKindLabel,
  candidateLabel,
  candidateStatusLabel,
  paperWorkspaceProgress,
  selectedPaperCandidate,
  selectedPermanentCandidate,
  workspaceStageLabel
} from "./paper-workspace-model.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function valueAttr(value) {
  return escapeHtml(value ?? "");
}

function renderStatus(text = "", tone = "") {
  const cleanTone = String(tone || "").trim();
  return `<div class="paper-status ${cleanTone ? `paper-status-${escapeHtml(cleanTone)}` : ""}">${escapeHtml(text || "准备就绪")}</div>`;
}

function renderWorkspaceSummary(workspace = null) {
  if (!workspace) {
    return `
      <section class="paper-card paper-empty">
        <div class="paper-card-kicker">Step 0</div>
        <h2>先创建一个论文工作台</h2>
        <p>这个页面不会直接调用 NotebookLM；它承接你从 NotebookLM 复制出来的 summary、Q&A、study guide 或 notes，然后帮助你完成转述和原创笔记确认。</p>
      </section>
    `;
  }
  const progress = paperWorkspaceProgress(workspace);
  return `
    <section class="paper-card paper-summary-card">
      <div>
        <div class="paper-card-kicker">当前工作台</div>
        <h2>${escapeHtml(workspace.title || workspace.paperId)}</h2>
        <p>${escapeHtml(workspace.paperId)} · ${escapeHtml(workspaceStageLabel(workspace.stage))}</p>
      </div>
      <div class="paper-stats">
        <span>${progress.candidates} 候选</span>
        <span>${progress.translations} 转述</span>
        <span>${progress.permanentCandidates} 原创候选</span>
        <span>${progress.savedPermanentNotes} 已保存</span>
      </div>
    </section>
  `;
}

function renderCandidateList(workspace = null, selectedCandidateId = "") {
  const candidates = Array.isArray(workspace?.candidates) ? workspace.candidates : [];
  if (!candidates.length) {
    return `<div class="paper-muted-box">还没有候选。粘贴 NotebookLM 内容后，系统会先生成 Literature 候选，不会直接生成原创笔记。</div>`;
  }
  return `
    <div class="paper-candidate-list">
      ${candidates
        .map((candidate) => {
          const active = candidate.id === selectedCandidateId;
          return `
            <button class="paper-candidate ${active ? "is-active" : ""}" type="button" data-paper-candidate-id="${escapeHtml(candidate.id)}">
              <span class="paper-candidate-title">${escapeHtml(candidateLabel(candidate))}</span>
              <span class="paper-candidate-meta">${escapeHtml(candidateKindLabel(candidate.candidateKind))} · ${escapeHtml(candidateStatusLabel(candidate.status))}</span>
              <span class="paper-candidate-quote">${escapeHtml(candidate.quoteText || "")}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPermanentCandidate(candidate = null) {
  if (!candidate) {
    return `<div class="paper-muted-box">保存转述后，可以生成原创候选。候选只是草稿骨架，必须确认 authorship 后才会保存为永久笔记。</div>`;
  }
  const citation = Array.isArray(candidate.citations) ? candidate.citations[0] || {} : {};
  return `
    <div class="paper-permanent-preview">
      <div class="paper-preview-head">
        <strong>${escapeHtml(candidate.title || candidate.id)}</strong>
        <span class="paper-risk paper-risk-${escapeHtml(candidate.originality_status || "warning")}">${escapeHtml(candidate.originality_status || "warning")}</span>
      </div>
      <div class="paper-preview-row">
        <span>核心判断</span>
        <p>${escapeHtml(candidate.core_claim || "")}</p>
      </div>
      <div class="paper-preview-row">
        <span>理由</span>
        <p>${escapeHtml(candidate.rationale || "")}</p>
      </div>
      <div class="paper-preview-row">
        <span>边界</span>
        <p>${escapeHtml(candidate.boundary_or_counterpoint || "未填写")}</p>
      </div>
      <div class="paper-preview-row">
        <span>引用</span>
        <p>${escapeHtml(citation.source_id || "unknown")} ${citation.locator ? `· ${escapeHtml(citation.locator)}` : ""}</p>
      </div>
      ${candidate.savedPermanentNoteId ? `<div class="paper-saved-note">已保存为：${escapeHtml(candidate.savedPermanentNoteId)}</div>` : ""}
    </div>
  `;
}

function renderLastResult(result = null) {
  if (!result) return `<div class="paper-result-empty">操作结果会显示在这里。</div>`;
  return `<pre class="paper-result-json">${escapeHtml(JSON.stringify(result, null, 2))}</pre>`;
}

export function renderPaperWorkspacePage(state = {}) {
  const form = state.form || {};
  const workspace = state.workspace || null;
  const selectedCandidate = selectedPaperCandidate(workspace, state.selectedCandidateId);
  const selectedPermanent = selectedPermanentCandidate(workspace, state.selectedPermanentCandidateId);
  const notebookDisabled = !canSubmitNotebookDraft(form, workspace);
  return `
    <div class="paper-shell">
      <header class="paper-hero">
        <div>
          <div class="paper-eyebrow">NotebookLM assisted paper workflow</div>
          <h1>从论文阅读，到自己的原创笔记</h1>
          <p>把 NotebookLM 当作阅读加速器，而不是代写器。这里强制经过候选、转述、原创候选、确认保存四步。</p>
        </div>
        ${renderStatus(state.statusText, state.statusTone)}
      </header>

      ${renderWorkspaceSummary(workspace)}

      <main class="paper-grid">
        <section class="paper-card">
          <div class="paper-card-kicker">Step 1</div>
          <h2>论文工作台</h2>
          <div class="paper-form-grid">
            <label>Paper ID<input id="paperIdInput" value="${valueAttr(form.paperId)}" placeholder="paper_retrieval_practice" /></label>
            <label>Source ID<input id="paperSourceIdInput" value="${valueAttr(form.sourceId)}" placeholder="src_paper_optional" /></label>
            <label class="paper-span-2">标题<input id="paperTitleInput" value="${valueAttr(form.title)}" placeholder="例如：Retrieval Practice and Long-term Recall" /></label>
          </div>
          <div class="paper-actions">
            <button id="btnCreatePaperWorkspace" type="button">创建工作台</button>
            <button id="btnLoadPaperWorkspace" type="button">读取工作台</button>
          </div>
        </section>

        <section class="paper-card">
          <div class="paper-card-kicker">Step 2</div>
          <h2>粘贴 NotebookLM 输出</h2>
          <label>Notebook 名称<input id="notebookNameInput" value="${valueAttr(form.notebookName)}" /></label>
          <label>Summary<textarea id="notebookSummaryInput" placeholder="粘贴 NotebookLM summary">${escapeHtml(form.summary || "")}</textarea></label>
          <label>Q&A<textarea id="notebookQaInput" placeholder="粘贴 Q&A，可直接放整段文本">${escapeHtml(form.qa || "")}</textarea></label>
          <label>Study guide<textarea id="notebookStudyGuideInput" placeholder="粘贴 study guide / outline">${escapeHtml(form.studyGuide || "")}</textarea></label>
          <label>Notes<textarea id="notebookNotesInput" placeholder="粘贴 NotebookLM notes">${escapeHtml(form.notes || "")}</textarea></label>
          <div class="paper-actions">
            <button id="btnAddNotebookDraft" type="button" ${notebookDisabled ? "disabled" : ""}>生成 Literature 候选</button>
          </div>
        </section>

        <section class="paper-card paper-span-2">
          <div class="paper-card-kicker">Step 3</div>
          <h2>候选与用户转述</h2>
          <div class="paper-two-col">
            <div>${renderCandidateList(workspace, selectedCandidate?.id || "")}</div>
            <div class="paper-translation-box">
              <div class="paper-selected-note">
                <strong>${escapeHtml(selectedCandidate ? candidateLabel(selectedCandidate) : "尚未选择候选")}</strong>
                <p>${escapeHtml(selectedCandidate?.quoteText || "先选择一条候选，再写成你自己的理解。")}</p>
              </div>
              <label>我的转述<textarea id="translationParaphraseInput" placeholder="必须写成自己的话">${escapeHtml(form.paraphraseText || selectedCandidate?.paraphraseText || "")}</textarea></label>
              <label>它和我的问题有什么关系？<textarea id="translationRelationInput">${escapeHtml(form.relationToQuestion || "")}</textarea></label>
              <label>边界或反例<textarea id="translationBoundaryInput">${escapeHtml(form.boundaryOrCondition || "")}</textarea></label>
              <div class="paper-actions">
                <button id="btnSaveTranslation" type="button" ${selectedCandidate ? "" : "disabled"}>保存转述</button>
                <button id="btnCreatePermanentCandidate" type="button" ${selectedCandidate ? "" : "disabled"}>生成原创候选</button>
              </div>
            </div>
          </div>
        </section>

        <section class="paper-card paper-span-2">
          <div class="paper-card-kicker">Step 4</div>
          <h2>原创候选与确认保存</h2>
          ${renderPermanentCandidate(selectedPermanent)}
          <div class="paper-save-row">
            <label class="paper-checkbox"><input id="confirmAuthorshipInput" type="checkbox" ${form.confirmAuthorship ? "checked" : ""} /> 我确认这是我自己的判断，不是 NotebookLM 原文或论文原句。</label>
            <label>保存状态
              <select id="permanentStatusInput">
                <option value="active" ${form.saveStatus === "active" ? "selected" : ""}>active，如果通过检查</option>
                <option value="draft" ${form.saveStatus === "draft" ? "selected" : ""}>draft</option>
              </select>
            </label>
            <button id="btnSavePermanentNote" type="button" ${selectedPermanent ? "" : "disabled"}>确认保存为永久笔记</button>
          </div>
        </section>

        <section class="paper-card paper-span-2">
          <div class="paper-card-kicker">Debug</div>
          <h2>最近操作</h2>
          ${renderLastResult(state.lastResult)}
        </section>
      </main>
    </div>
  `;
}
