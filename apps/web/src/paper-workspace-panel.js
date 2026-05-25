import {
  canCreatePermanentCandidate,
  permanentCandidateActionState,
  canSavePermanentNote,
  canSubmitNotebookDraft,
  candidateKindLabel,
  candidateLabel,
  candidateStatusLabel,
  draftBriefActionState,
  draftContinuationBrief,
  draftContinuationActionState,
  permanentNoteContinuityState,
  paperWorkspaceProgress,
  permanentNoteActionState,
  selectedPermanentCandidate,
  translationSaveActionState,
  translationDraftForCandidate,
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
  return `<div class="paper-status ${cleanTone ? `paper-status-${escapeHtml(cleanTone)}` : ""}">${escapeHtml(
    text || "\u51c6\u5907\u5c31\u7eea"
  )}</div>`;
}

function renderWorkspaceSummary(workspace = null) {
  if (!workspace) {
    return `
      <section class="paper-card paper-empty">
        <div class="paper-card-kicker">Step 0</div>
        <h2>\u5148\u521b\u5efa\u4e00\u4e2a\u8bba\u6587\u5de5\u4f5c\u53f0</h2>
        <p>\u8fd9\u4e2a\u9875\u9762\u4e0d\u4f1a\u76f4\u63a5\u8c03\u7528 NotebookLM\u3002\u5b83\u627f\u63a5\u4f60\u4ece NotebookLM \u590d\u5236\u51fa\u6765\u7684 summary\u3001Q&amp;A\u3001study guide \u6216 notes\uff0c\u518d\u628a\u5b83\u4eec\u63a8\u8fdb\u5230\u201c\u5019\u9009 -> \u7528\u6237\u8f6c\u8ff0 -> \u6c38\u4e45\u7b14\u8bb0\u5019\u9009 -> \u660e\u786e\u786e\u8ba4\u4fdd\u5b58\u201d\u8fd9\u6761\u94fe\u8def\u91cc\u3002</p>
      </section>
    `;
  }

  const progress = paperWorkspaceProgress(workspace);
  return `
    <section class="paper-card paper-summary-card">
      <div>
        <div class="paper-card-kicker">\u5f53\u524d\u5de5\u4f5c\u53f0</div>
        <h2>${escapeHtml(workspace.title || workspace.paperId)}</h2>
        <p>${escapeHtml(workspace.paperId)} \u00b7 ${escapeHtml(workspaceStageLabel(workspace.stage))}</p>
      </div>
      <div class="paper-stats">
        <span>${progress.candidates} \u5019\u9009</span>
        <span>${progress.translations} \u8f6c\u8ff0</span>
        <span>${progress.permanentCandidates} \u6c38\u4e45\u7b14\u8bb0\u5019\u9009</span>
        <span>${progress.savedPermanentNotes} \u5df2\u4fdd\u5b58</span>
      </div>
    </section>
  `;
}

function renderCandidateList(workspace = null, selectedCandidateId = "") {
  const candidates = Array.isArray(workspace?.candidates) ? workspace.candidates : [];
  if (!candidates.length) {
    return `<div class="paper-muted-box">\u8fd8\u6ca1\u6709\u5019\u9009\u3002\u7c98\u8d34 NotebookLM \u8f93\u51fa\u540e\uff0c\u8fd9\u91cc\u4f1a\u5148\u751f\u6210 literature \u5019\u9009\uff0c\u800c\u4e0d\u662f\u76f4\u63a5\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u3002</div>`;
  }

  return `
    <div class="paper-candidate-list">
      ${candidates
        .map((candidate) => {
          const active = candidate.id === selectedCandidateId;
          return `
            <button class="paper-candidate ${active ? "is-active" : ""}" type="button" data-paper-candidate-id="${escapeHtml(candidate.id)}">
              <span class="paper-candidate-title">${escapeHtml(candidateLabel(candidate))}</span>
              <span class="paper-candidate-meta">${escapeHtml(candidateKindLabel(candidate.candidateKind))} \u00b7 ${escapeHtml(candidateStatusLabel(candidate.status))}</span>
              <span class="paper-candidate-quote">${escapeHtml(candidate.quoteText || "")}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderTranslationHint(draft = null, options = {}) {
  const hasAlignedPermanentCandidate = Boolean(options.hasAlignedPermanentCandidate);
  const hasSavedPermanentNote = Boolean(options.hasSavedPermanentNote);
  const hasStaleAlignedPermanentCandidate = Boolean(options.hasStaleAlignedPermanentCandidate);
  const supportsNextStep = Boolean(draft && String(draft.relationToQuestion || "").trim() && String(draft.boundaryOrCondition || "").trim());
  if (!draft?.candidate) {
    return `<div class="paper-muted-box">\u5148\u4ece\u5de6\u4fa7\u9009\u4e00\u6761\u5019\u9009\uff0c\u518d\u7528\u4f60\u81ea\u5df1\u7684\u8bdd\u5b8c\u6210\u8f6c\u8ff0\u3002</div>`;
  }
  if (draft.hasSavedTranslation && draft.hasLocalChanges) {
    return `<div class="paper-muted-box">\u5df2\u6062\u590d\u8fd9\u6761\u5019\u9009\u7684\u672c\u5730\u672a\u4fdd\u5b58\u8349\u7a3f\u3002\u5f53\u524d\u8868\u5355\u5185\u5bb9\u8fd8\u6ca1\u6709\u5199\u56de\u5df2\u4fdd\u5b58\u8f6c\u8ff0\uff0c\u4fdd\u5b58\u540e\u4f1a\u66f4\u65b0\u8fd9\u6761\u5019\u9009\u7684\u6b63\u5f0f\u8f6c\u8ff0\u3002</div>`;
  }
  if (draft.hasSavedTranslation) {
    if (!supportsNextStep) {
      return `<div class="paper-muted-box">\u8fd9\u6761\u5019\u9009\u7684\u8f6c\u8ff0\u5df2\u7ecf\u4fdd\u5b58\uff0c\u4f46 relation \u548c boundary \u8fd8\u4e0d\u8db3\u4ee5\u652f\u6491\u4e0b\u4e00\u6b65\u3002\u5148\u8865\u5168\u5b83\u4eec\uff0c\u518d\u8fdb\u5165\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u6216\u7ee7\u7eed\u5199 draft\u3002</div>`;
    }
    if (hasStaleAlignedPermanentCandidate) {
      return `<div class="paper-muted-box">\u8fd9\u6761\u5019\u9009\u7684\u8f6c\u8ff0\u5df2\u7ecf\u66f4\u65b0\u8fc7\uff0c\u4f46\u5f53\u524d Step 4 \u91cc\u7684\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u4ecd\u7136\u5bf9\u5e94\u65e7\u7248\u8f6c\u8ff0\u3002\u4e0b\u4e00\u6b65\u5148\u91cd\u65b0\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\uff0c\u518d\u51b3\u5b9a\u662f\u5426\u7ee7\u7eed\u5199 draft \u6216\u4fdd\u5b58\u3002</div>`;
    }
    if (hasSavedPermanentNote) {
      return `<div class="paper-muted-box">\u8fd9\u6761\u5019\u9009\u7684\u8f6c\u8ff0\u5df2\u7ecf\u8fde\u4e0a\u5df2\u4fdd\u5b58\u7684\u6c38\u4e45\u7b14\u8bb0\u8def\u5f84\u3002\u4f60\u53ef\u4ee5\u7ee7\u7eed\u4fee\u6539\u8f6c\u8ff0\uff0c\u6216\u56de\u5230 Step 4 \u590d\u6838 originality / authorship\uff0c\u518d\u51b3\u5b9a\u662f\u5426\u7ee7\u7eed\u5199 draft\u3002</div>`;
    }
    if (hasAlignedPermanentCandidate) {
      return `<div class="paper-muted-box">\u8fd9\u6761\u5019\u9009\u7684\u8f6c\u8ff0\u5df2\u7ecf\u8fde\u4e0a\u5bf9\u5e94\u7684\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u3002\u4f60\u53ef\u4ee5\u7ee7\u7eed\u4fee\u6539\u8f6c\u8ff0\uff0c\u6216\u56de\u5230 Step 4 \u68c0\u67e5 originality / authorship\uff0c\u7136\u540e\u518d\u51b3\u5b9a\u662f\u5426\u7ee7\u7eed\u5199 draft\u3002</div>`;
    }
    return `<div class="paper-muted-box">\u8fd9\u6761\u5019\u9009\u5df2\u7ecf\u4fdd\u5b58\u8fc7\u8f6c\u8ff0\u3002\u4f60\u53ef\u4ee5\u7ee7\u7eed\u4fee\u6539\uff0c\u4e5f\u53ef\u4ee5\u76f4\u63a5\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\uff1b\u5982\u679c\u8981\u7ee7\u7eed\u5199 draft\uff0c\u5148\u786e\u8ba4 relation \u548c boundary \u5df2\u7ecf\u8db3\u591f\u652f\u6491\u4e0b\u4e00\u6b65\u3002</div>`;
  }
  if (draft.hasLocalChanges) {
    return `<div class="paper-muted-box">\u5df2\u6062\u590d\u8fd9\u6761\u5019\u9009\u7684\u672c\u5730\u672a\u4fdd\u5b58\u8f6c\u8ff0\u8349\u7a3f\u3002\u53ef\u4ee5\u7ee7\u7eed\u4fee\u6539\u540e\u518d\u4fdd\u5b58\u3002</div>`;
  }
  return `<div class="paper-muted-box">\u5148\u4fdd\u5b58\u8fd9\u6761\u5019\u9009\u7684\u7528\u6237\u8f6c\u8ff0\uff0c\u518d\u8fdb\u5165\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u3002\u8fd9\u6837\u56de\u5230\u8fd9\u4e2a\u5de5\u4f5c\u53f0\u65f6\uff0c\u5173\u7cfb\u548c\u8fb9\u754c\u4fe1\u606f\u4e5f\u4f1a\u4e00\u8d77\u6062\u590d\u3002</div>`;
}

function renderPermanentCandidateList(workspace = null, selectedPermanentCandidateId = "") {
  const candidates = Array.isArray(workspace?.permanentCandidates) ? workspace.permanentCandidates : [];
  if (!candidates.length) {
    return `<div class="paper-muted-box">\u8fd8\u6ca1\u6709\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u3002\u5148\u5728 Step 3 \u4fdd\u5b58\u8f6c\u8ff0\u5e76\u751f\u6210\u5019\u9009\u3002</div>`;
  }

  return `
    <div class="paper-candidate-list">
      ${candidates
        .map((candidate) => {
          const active = candidate.id === selectedPermanentCandidateId;
          return `
            <button class="paper-candidate ${active ? "is-active" : ""}" type="button" data-paper-permanent-candidate-id="${escapeHtml(candidate.id)}">
              <span class="paper-candidate-title">${escapeHtml(candidate.title || candidate.id)}</span>
              <span class="paper-candidate-meta">${escapeHtml(candidate.originality_status || "warning")} \u00b7 ${escapeHtml(candidate.status || "draft")}</span>
              <span class="paper-candidate-quote">${escapeHtml(candidate.core_claim || candidate.rationale || "")}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPermanentCandidate(candidate = null, options = {}) {
  const hasOtherPermanentCandidates = Boolean(options.hasOtherPermanentCandidates);
  const hasCurrentCandidate = Boolean(options.hasCurrentCandidate);
  const canCreateCurrentPermanentCandidate = Boolean(options.canCreateCurrentPermanentCandidate);
  const currentPermanentCandidateActionLabel = String(options.currentPermanentCandidateActionLabel || "").trim();
  const isAlignedToSelectedCandidate = Boolean(options.isAlignedToSelectedCandidate);
  const hasUnsavedAlignedTranslationChanges = Boolean(options.hasUnsavedAlignedTranslationChanges);
  const hasStaleAlignedPermanentCandidate = Boolean(options.hasStaleAlignedPermanentCandidate);
  if (!candidate) {
    if (hasCurrentCandidate && currentPermanentCandidateActionLabel === "先保存转述") {
      return `<div class="paper-muted-box">当前这条候选只有本地未保存的转述草稿。先保存这条转述，再进入永久笔记候选或继续写 draft。</div>`;
    }
    if (hasCurrentCandidate && currentPermanentCandidateActionLabel === "先补 relation / boundary") {
      return `<div class="paper-muted-box">这条候选的转述已经保存，但 relation 和 boundary 还不足以支撑 Step 4。先补全它们，再生成永久笔记候选或继续写 draft。</div>`;
    }
    if (hasCurrentCandidate && currentPermanentCandidateActionLabel === "先更新转述") {
      return `<div class="paper-muted-box">当前 Step 3 还有未保存改动。先更新这条转述，再生成对应的永久笔记候选。</div>`;
    }
    if (hasCurrentCandidate && hasOtherPermanentCandidates && canCreateCurrentPermanentCandidate) {
      return `<div class="paper-muted-box">\u5f53\u524d\u5019\u9009\u7684\u8f6c\u8ff0\u5df2\u7ecf\u5c31\u7eea\uff0c\u4f46\u8fd8\u6ca1\u6709\u751f\u6210\u5bf9\u5e94\u7684\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u3002\u4e0b\u65b9\u5217\u8868\u91cc\u7684\u6761\u76ee\u5c5e\u4e8e\u5176\u4ed6\u5019\u9009\uff0c\u9700\u8981\u7684\u8bdd\u53ef\u4ee5\u5148\u56de\u770b\uff0c\u4f46\u5f53\u524d\u8def\u5f84\u7684\u4e0b\u4e00\u6b65\u662f\u70b9\u51fb\u201c\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u201d\u3002</div>`;
    }
    return `<div class="paper-muted-box">\u4fdd\u5b58\u8f6c\u8ff0\u540e\uff0c\u53ef\u4ee5\u4e3a\u5f53\u524d\u5019\u9009\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u3002\u5019\u9009\u53ea\u662f\u4e00\u4efd\u8349\u7a3f\u9aa8\u67b6\uff0c\u786e\u8ba4 authorship \u4e4b\u540e\u624d\u4f1a\u771f\u6b63\u4fdd\u5b58\u4e3a\u6c38\u4e45\u7b14\u8bb0\u3002</div>`;
  }

  const citation = Array.isArray(candidate.citations) ? candidate.citations[0] || {} : {};
  return `
    <div class="paper-permanent-preview">
      ${
        hasCurrentCandidate && isAlignedToSelectedCandidate
          ? `<div class="paper-muted-box">${
              hasUnsavedAlignedTranslationChanges
                ? "\u5f53\u524d Step 3 \u7684\u8f6c\u8ff0\u53c8\u6709\u4e86\u672a\u4fdd\u5b58\u6539\u52a8\u3002\u5148\u91cd\u65b0\u4fdd\u5b58\u8fd9\u6761\u8f6c\u8ff0\uff0c\u518d\u66f4\u65b0\u6216\u786e\u8ba4\u8fd9\u4efd\u6c38\u4e45\u7b14\u8bb0\u8def\u5f84\u3002"
                : hasStaleAlignedPermanentCandidate
                ? "\u8fd9\u6761 Step 4 \u5019\u9009\u4ecd\u7136\u5bf9\u5e94\u65e7\u7248\u8f6c\u8ff0\u3002Step 3 \u5df2\u7ecf\u6362\u6210\u65b0\u7684\u5df2\u4fdd\u5b58\u7248\u672c\uff0c\u6240\u4ee5\u4e0b\u4e00\u6b65\u662f\u91cd\u65b0\u751f\u6210\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\uff0c\u800c\u4e0d\u662f\u76f4\u63a5\u4fdd\u5b58\u8fd9\u4efd\u65e7\u8349\u7a3f\u3002"
                : candidate.savedPermanentNoteId
                ? "\u8fd9\u6761\u5019\u9009\u5df2\u7ecf\u8fde\u4e0a\u81ea\u5df1\u7684\u6c38\u4e45\u7b14\u8bb0\u8def\u5f84\u3002\u4f60\u53ef\u4ee5\u56de\u770b originality \u98ce\u9669\u3001\u5f15\u7528\u8fb9\u754c\uff0c\u6216\u76f4\u63a5\u786e\u8ba4\u8fd9\u4efd\u4fdd\u5b58\u7ed3\u679c\u3002"
                : "\u8fd9\u6761\u5019\u9009\u5df2\u7ecf\u751f\u6210\u5bf9\u5e94\u7684\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u3002\u4e0b\u4e00\u6b65\u5c31\u662f\u68c0\u67e5 originality \u98ce\u9669\u3001\u5f15\u7528\u4e0e authorship \u786e\u8ba4\uff0c\u7136\u540e\u518d\u51b3\u5b9a\u662f\u5426\u4fdd\u5b58\u3002"
            }</div>`
          : ""
      }
      <div class="paper-preview-head">
        <strong>${escapeHtml(candidate.title || candidate.id)}</strong>
        <span class="paper-risk paper-risk-${escapeHtml(candidate.originality_status || "warning")}">${escapeHtml(candidate.originality_status || "warning")}</span>
      </div>
      <div class="paper-preview-row">
        <span>\u6838\u5fc3\u5224\u65ad</span>
        <p>${escapeHtml(candidate.core_claim || "")}</p>
      </div>
      <div class="paper-preview-row">
        <span>\u7406\u7531</span>
        <p>${escapeHtml(candidate.rationale || "")}</p>
      </div>
      <div class="paper-preview-row">
        <span>\u8fb9\u754c</span>
        <p>${escapeHtml(candidate.boundary_or_counterpoint || "\u672a\u586b\u5199")}</p>
      </div>
      <div class="paper-preview-row">
        <span>\u5f15\u7528</span>
        <p>${escapeHtml(citation.source_id || "unknown")}${citation.locator ? ` \u00b7 ${escapeHtml(citation.locator)}` : ""}</p>
      </div>
      ${candidate.savedPermanentNoteId ? `<div class="paper-saved-note">\u5df2\u4fdd\u5b58\u4e3a\uff1a${escapeHtml(candidate.savedPermanentNoteId)}</div>` : ""}
    </div>
  `;
}

function renderDraftContinuationNotice(actionState = null) {
  const tone = String(actionState?.tone || "").trim();
  const key = String(actionState?.key || "").trim() || "save_translation";
  const label = String(actionState?.label || "").trim() || "先保存这条转述，再继续写 draft。";
  return `<div class="paper-muted-box${tone ? ` paper-status-${escapeHtml(tone)}` : ""}" data-paper-draft-continuity="${escapeHtml(
    key
  )}">${escapeHtml(label)}</div>`;
}

function renderDraftBriefCard(actionState = null, brief = null, recentCopy = null) {
  if (!String(brief?.title || "").trim()) return "";
  return `
    <div class="paper-preview-row" data-paper-draft-brief>
      <span>Draft handoff</span>
      <p data-paper-draft-brief-step-four>${escapeHtml(brief.stepFourLabel || "")}</p>
      <p data-paper-draft-brief-next-action>Next action: ${escapeHtml(brief.nextAction || "")}</p>
      ${
        brief.savedPermanentNoteId
          ? `<p data-paper-draft-brief-saved-note>Saved note: ${escapeHtml(brief.savedPermanentNoteId)}</p>`
          : ""
      }
      <p>${escapeHtml(brief.preview || "")}</p>
      <div class="paper-actions">
        <button id="btnCopyDraftBrief" type="button" ${actionState?.enabled ? "" : "disabled"}>${escapeHtml(
          actionState?.label || "复制 draft brief"
        )}</button>
      </div>
      ${
        recentCopy?.nextAction
          ? `<div class="paper-result-empty" data-paper-draft-brief-copy>最近一次已复制。下一步：${escapeHtml(
              recentCopy.nextAction
            )}</div>`
          : ""
      }
    </div>
  `;
}

function renderLastResult(result = null) {
  if (!result) return `<div class="paper-result-empty">\u6700\u8fd1\u4e00\u6b21\u64cd\u4f5c\u7684\u8fd4\u56de\u7ed3\u679c\u4f1a\u663e\u793a\u5728\u8fd9\u91cc\u3002</div>`;
  return `<pre class="paper-result-json">${escapeHtml(JSON.stringify(result, null, 2))}</pre>`;
}

export function renderPaperWorkspacePage(state = {}) {
  const form = state.form || {};
  const workspace = state.workspace || null;
  const selectedDraft = translationDraftForCandidate(workspace, state.selectedCandidateId, {
    paraphraseText: form.paraphraseText,
    relationToQuestion: form.relationToQuestion,
    boundaryOrCondition: form.boundaryOrCondition
  });
  const translationSaveAction = translationSaveActionState(workspace, state.selectedCandidateId, {
    paraphraseText: form.paraphraseText,
    relationToQuestion: form.relationToQuestion,
    boundaryOrCondition: form.boundaryOrCondition
  });
  const selectedCandidate = selectedDraft.candidate;
  const selectedPermanent = state.selectedPermanentCandidateId
    ? selectedPermanentCandidate(workspace, state.selectedPermanentCandidateId)
    : null;
  const notebookDisabled = !canSubmitNotebookDraft(form, workspace);
  const permanentCandidateDisabled = !canCreatePermanentCandidate(workspace, selectedCandidate?.id || "", {
    paraphraseText: form.paraphraseText,
    relationToQuestion: form.relationToQuestion,
    boundaryOrCondition: form.boundaryOrCondition
  });
  const permanentCandidateAction = permanentCandidateActionState(
    workspace,
    state.workspaceSelection || null,
    selectedCandidate?.id || "",
    selectedPermanent?.id || "",
    {
      paraphraseText: form.paraphraseText,
      relationToQuestion: form.relationToQuestion,
      boundaryOrCondition: form.boundaryOrCondition
    }
  );
  const permanentNoteAlreadySaved = Boolean(String(selectedPermanent?.savedPermanentNoteId || "").trim());
  const hasAlignedPermanentCandidate = Boolean(
    selectedCandidate?.id &&
      selectedPermanent?.paper_candidate_id &&
      selectedPermanent.paper_candidate_id === selectedCandidate.id
  );
  const permanentNoteContinuity = permanentNoteContinuityState(
    workspace,
    state.workspaceSelection || null,
    selectedPermanent?.id || "",
    selectedCandidate?.id || "",
    {
      paraphraseText: form.paraphraseText,
      relationToQuestion: form.relationToQuestion,
      boundaryOrCondition: form.boundaryOrCondition
    }
  );
  const permanentNoteAction = permanentNoteActionState(
    workspace,
    state.workspaceSelection || null,
    selectedPermanent?.id || "",
    selectedCandidate?.id || "",
    {
      paraphraseText: form.paraphraseText,
      relationToQuestion: form.relationToQuestion,
      boundaryOrCondition: form.boundaryOrCondition
    }
  );
  const permanentNoteFormDisabled = !permanentNoteAction.enabled;
  const draftContinuationAction = draftContinuationActionState(
    {
      selectedCandidateId: selectedCandidate?.id || "",
      hasSavedTranslation: selectedDraft.hasSavedTranslation,
      hasLocalChanges: selectedDraft.hasLocalChanges,
      supportsNextStep: Boolean(
        String(selectedDraft.relationToQuestion || "").trim() &&
          String(selectedDraft.boundaryOrCondition || "").trim()
      )
    },
    {
      selectedPermanentCandidateId: selectedPermanent?.id || "",
      permanentNoteContinuityReason: permanentNoteContinuity.reason
    }
  );
  const draftBriefAction = draftBriefActionState(
    {
      selectedCandidateId: selectedCandidate?.id || "",
      hasSavedTranslation: selectedDraft.hasSavedTranslation,
      hasLocalChanges: selectedDraft.hasLocalChanges,
      supportsNextStep: Boolean(
        String(selectedDraft.relationToQuestion || "").trim() &&
          String(selectedDraft.boundaryOrCondition || "").trim()
      )
    },
    {
      selectedPermanentCandidateId: selectedPermanent?.id || "",
      permanentNoteContinuityReason: permanentNoteContinuity.reason
    }
  );
  const draftBrief = draftContinuationBrief(
    workspace,
    state.workspaceSelection || null,
    selectedCandidate?.id || "",
    selectedPermanent?.id || "",
    {
      paraphraseText: form.paraphraseText,
      relationToQuestion: form.relationToQuestion,
      boundaryOrCondition: form.boundaryOrCondition
    }
  );

  return `
    <div class="paper-shell">
      <header class="paper-hero">
        <div>
          <div class="paper-eyebrow">NotebookLM assisted paper workflow</div>
          <h1>\u4ece\u8bba\u6587\u9605\u8bfb\uff0c\u5230\u81ea\u5df1\u7684\u6c38\u4e45\u7b14\u8bb0</h1>
          <p>\u628a NotebookLM \u5f53\u4f5c\u9605\u8bfb\u52a0\u901f\u5668\uff0c\u800c\u4e0d\u662f\u4ee3\u5199\u5668\u3002\u8fd9\u91cc\u5f3a\u5236\u7ecf\u8fc7\u5019\u9009\u3001\u8f6c\u8ff0\u3001\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u3001\u786e\u8ba4\u4fdd\u5b58\u56db\u6b65\uff0c\u907f\u514d\u628a\u5916\u90e8\u6750\u6599\u76f4\u63a5\u5f53\u6210\u81ea\u5df1\u7684\u5224\u65ad\u3002</p>
        </div>
        ${renderStatus(state.statusText, state.statusTone)}
      </header>

      ${renderWorkspaceSummary(workspace)}

      <main class="paper-grid">
        <section class="paper-card">
          <div class="paper-card-kicker">Step 1</div>
          <h2>\u8bba\u6587\u5de5\u4f5c\u53f0</h2>
          <div class="paper-form-grid">
            <label>Paper ID<input id="paperIdInput" value="${valueAttr(form.paperId)}" placeholder="paper_retrieval_practice" /></label>
            <label>Source ID<input id="paperSourceIdInput" value="${valueAttr(form.sourceId)}" placeholder="src_paper_optional" /></label>
            <label class="paper-span-2">\u6807\u9898<input id="paperTitleInput" value="${valueAttr(form.title)}" placeholder="\u4f8b\u5982\uff1aRetrieval Practice and Long-term Recall" /></label>
          </div>
          <div class="paper-actions">
            <button id="btnCreatePaperWorkspace" type="button">\u521b\u5efa\u5de5\u4f5c\u53f0</button>
            <button id="btnLoadPaperWorkspace" type="button">\u8bfb\u53d6\u5de5\u4f5c\u53f0</button>
          </div>
        </section>

        <section class="paper-card">
          <div class="paper-card-kicker">Step 2</div>
          <h2>\u7c98\u8d34 NotebookLM \u8f93\u51fa</h2>
          <label>Notebook \u540d\u79f0<input id="notebookNameInput" value="${valueAttr(form.notebookName)}" /></label>
          <label>Summary<textarea id="notebookSummaryInput" placeholder="\u7c98\u8d34 NotebookLM summary">${escapeHtml(form.summary || "")}</textarea></label>
          <label>Q&amp;A<textarea id="notebookQaInput" placeholder="\u7c98\u8d34 Q&amp;A\uff0c\u53ef\u76f4\u63a5\u653e\u6574\u6bb5\u6587\u672c">${escapeHtml(form.qa || "")}</textarea></label>
          <label>Study guide<textarea id="notebookStudyGuideInput" placeholder="\u7c98\u8d34 study guide / outline">${escapeHtml(form.studyGuide || "")}</textarea></label>
          <label>Notes<textarea id="notebookNotesInput" placeholder="\u7c98\u8d34 NotebookLM notes">${escapeHtml(form.notes || "")}</textarea></label>
          <div class="paper-actions">
            <button id="btnAddNotebookDraft" type="button" ${notebookDisabled ? "disabled" : ""}>\u751f\u6210 literature \u5019\u9009</button>
          </div>
        </section>

        <section class="paper-card paper-span-2">
          <div class="paper-card-kicker">Step 3</div>
          <h2>\u5019\u9009\u4e0e\u7528\u6237\u8f6c\u8ff0</h2>
          <div class="paper-two-col">
            <div>${renderCandidateList(workspace, selectedCandidate?.id || "")}</div>
            <div class="paper-translation-box">
              <div class="paper-selected-note">
                <strong>${escapeHtml(selectedCandidate ? candidateLabel(selectedCandidate) : "\u5c1a\u672a\u9009\u62e9\u5019\u9009")}</strong>
                <p>${escapeHtml(selectedCandidate?.quoteText || "\u5148\u9009\u62e9\u4e00\u6761\u5019\u9009\uff0c\u518d\u628a\u5b83\u6539\u5199\u6210\u4f60\u81ea\u5df1\u7684\u7406\u89e3\u3002")}</p>
              </div>
              ${renderTranslationHint(selectedDraft, {
                hasAlignedPermanentCandidate,
                hasSavedPermanentNote: permanentNoteAlreadySaved,
                hasStaleAlignedPermanentCandidate:
                  hasAlignedPermanentCandidate && permanentNoteContinuity.reason === "stale_translation_signature"
              })}
              <label>\u6211\u7684\u8f6c\u8ff0<textarea id="translationParaphraseInput" placeholder="\u5fc5\u987b\u5199\u6210\u81ea\u5df1\u7684\u8bdd">${escapeHtml(form.paraphraseText || "")}</textarea></label>
              <label>\u5b83\u548c\u6211\u7684\u95ee\u9898\u6709\u4ec0\u4e48\u5173\u7cfb\uff1f<textarea id="translationRelationInput">${escapeHtml(form.relationToQuestion || "")}</textarea></label>
              <label>\u8fb9\u754c\u6216\u53cd\u4f8b<textarea id="translationBoundaryInput">${escapeHtml(form.boundaryOrCondition || "")}</textarea></label>
              <div class="paper-actions">
                <button id="btnSaveTranslation" type="button" ${translationSaveAction.enabled ? "" : "disabled"}>${translationSaveAction.label}</button>
                <button id="btnCreatePermanentCandidate" type="button" ${permanentCandidateAction.enabled ? "" : "disabled"}>${permanentCandidateAction.label}</button>
              </div>
              ${renderDraftContinuationNotice(draftContinuationAction)}
              ${renderDraftBriefCard(draftBriefAction, draftBrief, state.lastCopiedDraftBrief)}
            </div>
          </div>
        </section>

        <section class="paper-card paper-span-2">
          <div class="paper-card-kicker">Step 4</div>
          <h2>\u6c38\u4e45\u7b14\u8bb0\u5019\u9009\u4e0e\u786e\u8ba4\u4fdd\u5b58</h2>
          ${renderPermanentCandidateList(workspace, selectedPermanent?.id || "")}
          ${renderPermanentCandidate(selectedPermanent, {
            hasOtherPermanentCandidates: Array.isArray(workspace?.permanentCandidates) && workspace.permanentCandidates.length > 0,
            hasCurrentCandidate: Boolean(selectedCandidate?.id),
            canCreateCurrentPermanentCandidate: !permanentCandidateDisabled,
            currentPermanentCandidateActionLabel: permanentCandidateAction.label,
            isAlignedToSelectedCandidate: hasAlignedPermanentCandidate,
            hasUnsavedAlignedTranslationChanges: hasAlignedPermanentCandidate && selectedDraft.hasLocalChanges,
            hasStaleAlignedPermanentCandidate:
              hasAlignedPermanentCandidate && permanentNoteContinuity.reason === "stale_translation_signature"
          })}
          <div class="paper-save-row">
            <label class="paper-checkbox"><input id="confirmAuthorshipInput" type="checkbox" ${form.confirmAuthorship ? "checked" : ""} ${permanentNoteFormDisabled ? "disabled" : ""} /> \u6211\u786e\u8ba4\u8fd9\u5df2\u7ecf\u662f\u6211\u81ea\u5df1\u7684\u5224\u65ad\uff0c\u800c\u4e0d\u662f NotebookLM \u539f\u6587\u6216\u8bba\u6587\u539f\u53e5\u3002</label>
            <label>\u4fdd\u5b58\u72b6\u6001
              <select id="permanentStatusInput" ${permanentNoteFormDisabled ? "disabled" : ""}>
                <option value="active" ${form.saveStatus === "active" ? "selected" : ""}>active\uff0c\u5982\u679c\u901a\u8fc7 originality \u68c0\u67e5</option>
                <option value="draft" ${form.saveStatus === "draft" ? "selected" : ""}>draft</option>
              </select>
            </label>
            <button id="btnSavePermanentNote" type="button" ${permanentNoteAction.enabled ? "" : "disabled"}>${permanentNoteAction.label}</button>
          </div>
        </section>

        <section class="paper-card paper-span-2">
          <div class="paper-card-kicker">Debug</div>
          <h2>\u6700\u8fd1\u64cd\u4f5c</h2>
          ${renderLastResult(state.lastResult)}
        </section>
      </main>
    </div>
  `;
}
