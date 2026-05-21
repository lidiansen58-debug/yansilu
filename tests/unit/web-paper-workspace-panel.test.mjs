import test from "node:test";
import assert from "node:assert/strict";

import { createInitialPaperWorkspaceState } from "../../apps/web/src/paper-workspace-model.js";
import { renderPaperWorkspacePage } from "../../apps/web/src/paper-workspace-panel.js";

test("renderPaperWorkspacePage exposes the four-step paper workflow", () => {
  const state = createInitialPaperWorkspaceState();
  const html = renderPaperWorkspacePage(state);

  assert.match(html, /NotebookLM assisted paper workflow/);
  assert.match(html, /id="btnCreatePaperWorkspace"/);
  assert.match(html, /id="btnAddNotebookDraft"/);
  assert.match(html, /id="btnSaveTranslation"/);
  assert.match(html, /id="btnCreatePermanentCandidate"/);
  assert.match(html, /id="btnSavePermanentNote"/);
  assert.match(html, /先创建一个论文工作台/);
  assert.match(html, /还没有候选/);
  assert.match(html, /粘贴 NotebookLM 输出后，这里会先生成 literature 候选，而不是直接生成永久笔记/);
  assert.match(html, /先从左侧选一条候选，再用你自己的话完成转述/);
  assert.match(html, /id="btnSaveTranslation"[^>]*disabled/);
  assert.match(html, /id="btnSavePermanentNote"[^>]*disabled/);
  assert.doesNotMatch(html, /id="confirmAuthorshipInput"[^>]*checked/);
  assert.match(html, /<option value="active" selected>/);
  assert.match(html, /active，如果通过 originality 检查/);
});

test("renderPaperWorkspacePage restores saved translation context and unlocks the next step", () => {
  const state = createInitialPaperWorkspaceState();
  state.workspace = {
    paperId: "paper_test",
    title: "Paper Test",
    stage: "permanent_candidates",
    candidates: [
      {
        id: "pwc_1",
        title: "Candidate One",
        quoteText: "NotebookLM candidate text",
        candidateKind: "claim",
        status: "translated"
      }
    ],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "My own wording.",
        relationToQuestion: "This matters for the writing question.",
        boundaryOrCondition: "Only when the sample is comparable."
      }
    ],
    permanentCandidates: [
      {
        id: "pn_1",
        title: "Permanent One",
        core_claim: "My claim.",
        rationale: "My reason.",
        originality_status: "warning",
        citations: [{ source_id: "src_1" }]
      }
    ]
  };
  state.selectedCandidateId = "pwc_1";
  state.selectedPermanentCandidateId = "pn_1";
  state.form.paraphraseText = "My own wording.";
  state.form.relationToQuestion = "This matters for the writing question.";
  state.form.boundaryOrCondition = "Only when the sample is comparable.";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /Candidate One/);
  assert.match(html, /NotebookLM candidate text/);
  assert.match(html, /这条候选已经保存过转述/);
  assert.match(html, /你可以继续修改，也可以直接生成永久笔记候选/);
  assert.match(html, /My own wording\./);
  assert.match(html, /This matters for the writing question\./);
  assert.match(html, /Only when the sample is comparable\./);
  assert.doesNotMatch(html, /id="btnCreatePermanentCandidate"[^>]*disabled/);
  assert.match(html, /Permanent One/);
  assert.match(html, /paper-risk-warning/);
  assert.match(html, /confirmAuthorshipInput/);
  assert.match(html, /<option value="active" selected>/);
});

test("renderPaperWorkspacePage keeps permanent candidate action disabled before translation is saved", () => {
  const state = createInitialPaperWorkspaceState();
  state.workspace = {
    paperId: "paper_test",
    title: "Paper Test",
    stage: "candidates",
    candidates: [
      {
        id: "pwc_1",
        title: "Candidate One",
        quoteText: "NotebookLM candidate text",
        candidateKind: "claim",
        status: "new"
      }
    ],
    translations: [],
    permanentCandidates: []
  };
  state.selectedCandidateId = "pwc_1";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /先保存这条候选的用户转述，再进入永久笔记候选/);
  assert.match(html, /这样回到这个工作台时，关系和边界信息也会一起恢复/);
  assert.match(html, /id="btnCreatePermanentCandidate"[^>]*disabled/);
});

test("renderPaperWorkspacePage shows an empty-state hint before any permanent candidate exists", () => {
  const state = createInitialPaperWorkspaceState();
  state.workspace = {
    paperId: "paper_test",
    title: "Paper Test",
    stage: "translations",
    candidates: [
      {
        id: "pwc_1",
        title: "Candidate One",
        quoteText: "NotebookLM candidate text",
        candidateKind: "claim",
        status: "translated"
      }
    ],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "My own wording."
      }
    ],
    permanentCandidates: []
  };
  state.selectedCandidateId = "pwc_1";
  state.form.paraphraseText = "My own wording.";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /还没有永久笔记候选/);
  assert.match(html, /先在 Step 3 保存转述并生成候选/);
  assert.match(html, /保存转述后，可以为当前候选生成永久笔记候选/);
  assert.match(html, /候选只是一份草稿骨架/);
  assert.match(html, /确认 authorship 之后才会真正保存为永久笔记/);
});

test("renderPaperWorkspacePage explains when an unsaved local translation draft has been restored", () => {
  const state = createInitialPaperWorkspaceState();
  state.workspace = {
    paperId: "paper_test",
    title: "Paper Test",
    stage: "translations",
    candidates: [
      {
        id: "pwc_1",
        title: "Candidate One",
        quoteText: "NotebookLM candidate text",
        candidateKind: "claim",
        status: "translated"
      }
    ],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "Saved wording.",
        relationToQuestion: "Saved relation.",
        boundaryOrCondition: "Saved boundary."
      }
    ],
    permanentCandidates: []
  };
  state.selectedCandidateId = "pwc_1";
  state.form.paraphraseText = "Unsaved wording.";
  state.form.relationToQuestion = "Unsaved relation.";
  state.form.boundaryOrCondition = "Unsaved boundary.";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /已恢复这条候选的本地未保存草稿/);
  assert.match(html, /当前表单内容还没有写回已保存转述/);
  assert.match(html, /保存后会更新这条候选的正式转述/);
  assert.match(html, /Unsaved wording\./);
});

test("renderPaperWorkspacePage explains when only a local translation draft exists", () => {
  const state = createInitialPaperWorkspaceState();
  state.workspace = {
    paperId: "paper_test",
    title: "Paper Test",
    stage: "translations",
    candidates: [
      {
        id: "pwc_1",
        title: "Candidate One",
        quoteText: "NotebookLM candidate text",
        candidateKind: "claim",
        status: "new"
      }
    ],
    translations: [],
    permanentCandidates: []
  };
  state.selectedCandidateId = "pwc_1";
  state.form.paraphraseText = "Unsaved wording.";
  state.form.relationToQuestion = "Unsaved relation.";
  state.form.boundaryOrCondition = "Unsaved boundary.";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /已恢复这条候选的本地未保存转述草稿/);
  assert.match(html, /可以继续修改后再保存/);
  assert.match(html, /Unsaved wording\./);
});

test("renderPaperWorkspacePage shows the permanent-candidate empty state after translation is ready", () => {
  const state = createInitialPaperWorkspaceState();
  state.workspace = {
    paperId: "paper_test",
    title: "Paper Test",
    stage: "translations",
    candidates: [
      {
        id: "pwc_1",
        title: "Candidate One",
        quoteText: "NotebookLM candidate text",
        candidateKind: "claim",
        status: "translated"
      }
    ],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "My own wording.",
        relationToQuestion: "This matters for the writing question.",
        boundaryOrCondition: "Only when the sample is comparable."
      }
    ],
    permanentCandidates: []
  };
  state.selectedCandidateId = "pwc_1";
  state.form.paraphraseText = "My own wording.";
  state.form.relationToQuestion = "This matters for the writing question.";
  state.form.boundaryOrCondition = "Only when the sample is comparable.";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /还没有永久笔记候选/);
  assert.match(html, /先在 Step 3 保存转述并生成候选/);
  assert.match(html, /保存转述后，可以为当前候选生成永久笔记候选/);
  assert.match(html, /确认 authorship 之后才会真正保存为永久笔记/);
});

test("renderPaperWorkspacePage renders a selectable permanent candidate list", () => {
  const state = createInitialPaperWorkspaceState();
  state.workspace = {
    paperId: "paper_test",
    title: "Paper Test",
    stage: "permanent_candidates",
    candidates: [
      {
        id: "pwc_1",
        title: "Candidate One",
        quoteText: "NotebookLM candidate text",
        candidateKind: "claim",
        status: "converted"
      }
    ],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "My own wording."
      }
    ],
    permanentCandidates: [
      {
        id: "pn_1",
        title: "Permanent One",
        core_claim: "First claim.",
        rationale: "First reason.",
        originality_status: "warning",
        status: "draft",
        citations: [{ source_id: "src_1" }]
      },
      {
        id: "pn_2",
        title: "Permanent Two",
        core_claim: "Second claim.",
        rationale: "Second reason.",
        originality_status: "pass",
        status: "active",
        citations: [{ source_id: "src_2" }]
      }
    ]
  };
  state.selectedCandidateId = "pwc_1";
  state.selectedPermanentCandidateId = "pn_2";
  state.form.paraphraseText = "My own wording.";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /data-paper-permanent-candidate-id="pn_1"/);
  assert.match(html, /data-paper-permanent-candidate-id="pn_2"/);
  assert.match(html, /Permanent Two/);
  assert.match(html, /Second claim\./);
  assert.match(html, /Second reason\./);
  assert.match(html, /核心判断/);
  assert.match(html, /理由/);
  assert.match(html, /边界/);
  assert.match(html, /引用/);
  assert.match(html, /src_2/);
  assert.match(html, /class="paper-candidate is-active" type="button" data-paper-permanent-candidate-id="pn_2"/);
});

test("renderPaperWorkspacePage falls back when permanent preview boundary or citation are missing", () => {
  const state = createInitialPaperWorkspaceState();
  state.workspace = {
    paperId: "paper_test",
    title: "Paper Test",
    stage: "permanent_candidates",
    candidates: [
      {
        id: "pwc_1",
        title: "Candidate One",
        quoteText: "NotebookLM candidate text",
        candidateKind: "claim",
        status: "converted"
      }
    ],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "My own wording."
      }
    ],
    permanentCandidates: [
      {
        id: "pn_1",
        title: "Permanent One",
        core_claim: "First claim.",
        rationale: "First reason.",
        originality_status: "warning",
        status: "draft",
        citations: []
      }
    ]
  };
  state.selectedCandidateId = "pwc_1";
  state.selectedPermanentCandidateId = "pn_1";
  state.form.paraphraseText = "My own wording.";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /未填写/);
  assert.match(html, /unknown/);
});

test("renderPaperWorkspacePage disables permanent-note save after the selected permanent candidate is already saved", () => {
  const state = createInitialPaperWorkspaceState();
  state.workspace = {
    paperId: "paper_test",
    title: "Paper Test",
    stage: "saved",
    candidates: [
      {
        id: "pwc_1",
        title: "Candidate One",
        quoteText: "NotebookLM candidate text",
        candidateKind: "claim",
        status: "saved"
      }
    ],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "My own wording."
      }
    ],
    permanentCandidates: [
      {
        id: "pn_1",
        title: "Permanent One",
        core_claim: "Saved claim.",
        rationale: "Saved reason.",
        originality_status: "pass",
        status: "active",
        savedPermanentNoteId: "pn_1",
        citations: [{ source_id: "src_1" }]
      }
    ]
  };
  state.selectedCandidateId = "pwc_1";
  state.selectedPermanentCandidateId = "pn_1";
  state.form.paraphraseText = "My own wording.";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /\u5df2\u4fdd\u5b58\u4e3a\uff1apn_1/);
  assert.match(html, /Saved claim\./);
  assert.match(html, /Saved reason\./);
  assert.match(html, /src_1/);
  assert.match(html, /paper-risk-pass/);
  assert.match(html, /\u5df2\u4fdd\u5b58\u4e3a\u6c38\u4e45\u7b14\u8bb0/);
  assert.match(html, /id="btnSavePermanentNote"[^>]*disabled/);
});

test("renderPaperWorkspacePage keeps the selected permanent-note save status", () => {
  const state = createInitialPaperWorkspaceState();
  state.workspace = {
    paperId: "paper_test",
    title: "Paper Test",
    stage: "permanent_candidates",
    candidates: [
      {
        id: "pwc_1",
        title: "Candidate One",
        quoteText: "NotebookLM candidate text",
        candidateKind: "claim",
        status: "converted"
      }
    ],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "My own wording."
      }
    ],
    permanentCandidates: [
      {
        id: "pn_1",
        title: "Permanent One",
        core_claim: "Saved claim.",
        rationale: "Saved reason.",
        originality_status: "pass",
        status: "draft",
        citations: [{ source_id: "src_1" }]
      }
    ]
  };
  state.selectedCandidateId = "pwc_1";
  state.selectedPermanentCandidateId = "pn_1";
  state.form.paraphraseText = "My own wording.";
  state.form.saveStatus = "draft";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /<option value="draft" selected>/);
});
