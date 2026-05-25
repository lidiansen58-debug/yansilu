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
  assert.ok(html.includes("先创建一个论文工作台"));
  assert.ok(html.includes("还没有候选"));
  assert.ok(html.includes("这里会先生成 literature 候选"));
  assert.ok(html.includes("先从左侧选一条候选"));
  assert.match(html, /id="btnSaveTranslation"[^>]*disabled/);
  assert.match(html, /id="confirmAuthorshipInput"[^>]*disabled/);
  assert.match(html, /id="permanentStatusInput"[^>]*disabled/);
  assert.match(html, /id="btnSavePermanentNote"[^>]*disabled/);
  assert.doesNotMatch(html, /id="confirmAuthorshipInput"[^>]*checked/);
  assert.match(html, /<option value="active" selected>/);
  assert.ok(html.includes("active，如果通过 originality 检查"));
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
        paper_candidate_id: "pwc_1",
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
  assert.ok(html.includes("这条候选的转述已经连上对应的永久笔记候选"));
  assert.ok(html.includes("你可以继续修改转述"));
  assert.ok(html.includes("回到 Step 4 检查 originality / authorship"));
  assert.ok(html.includes("再决定是否继续写 draft"));
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

  assert.ok(html.includes("先保存这条候选的用户转述，再进入永久笔记候选"));
  assert.ok(html.includes("关系和边界信息也会一起恢复"));
  assert.match(html, /id="btnCreatePermanentCandidate"[^>]*disabled>先保存转述</);
  assert.match(html, /id="btnCreatePermanentCandidate"[^>]*disabled/);
});

test("renderPaperWorkspacePage clarifies the next action from saved translation before a permanent candidate exists", () => {
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

  assert.ok(html.includes("这条候选已经保存过转述"));
  assert.match(html, /id="btnSaveTranslation"[^>]*disabled>已保存转述</);
  assert.ok(html.includes("如果要继续写 draft"));
  assert.ok(html.includes("先确认 relation 和 boundary 已经足够支撑下一步"));
});

test("renderPaperWorkspacePage keeps the next step blocked until saved translation has relation and boundary", () => {
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
        relationToQuestion: "",
        boundaryOrCondition: "Only when the sample is comparable."
      }
    ],
    permanentCandidates: []
  };
  state.selectedCandidateId = "pwc_1";
  state.form.paraphraseText = "My own wording.";
  state.form.relationToQuestion = "";
  state.form.boundaryOrCondition = "Only when the sample is comparable.";

  const html = renderPaperWorkspacePage(state);

  assert.ok(html.includes("relation 和 boundary 还不足以支撑下一步"));
  assert.match(html, /id="btnSaveTranslation"[^>]*disabled>已保存转述</);
  assert.match(html, /id="btnCreatePermanentCandidate"[^>]*disabled>先补 relation \/ boundary</);
  assert.ok(html.includes("relation 和 boundary 还不足以支撑 Step 4"));
});

test("renderPaperWorkspacePage disables permanent candidate creation while saved translation has unsaved edits", () => {
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
  state.form.relationToQuestion = "Updated relation before saving again.";
  state.form.boundaryOrCondition = "Only when the sample is comparable.";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /id="btnSaveTranslation"[^>]*>更新转述</);
  assert.match(html, /id="btnCreatePermanentCandidate"[^>]*disabled>先更新转述</);
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

  assert.ok(html.includes("还没有永久笔记候选"));
  assert.ok(html.includes("先在 Step 3 保存转述并生成候选"));
  assert.ok(html.includes("relation 和 boundary 还不足以支撑 Step 4"));
  assert.ok(html.includes("先补全它们，再生成永久笔记候选或继续写 draft"));
  assert.doesNotMatch(html, /保存转述后，可以为当前候选生成永久笔记候选/);
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

  assert.ok(html.includes("已恢复这条候选的本地未保存草稿"));
  assert.ok(html.includes("当前表单内容还没有写回已保存转述"));
  assert.ok(html.includes("保存后会更新这条候选的正式转述"));
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

  assert.ok(html.includes("已恢复这条候选的本地未保存转述草稿"));
  assert.ok(html.includes("可以继续修改后再保存"));
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

  assert.ok(html.includes("还没有永久笔记候选"));
  assert.ok(html.includes("先在 Step 3 保存转述并生成候选"));
  assert.ok(html.includes("保存转述后，可以为当前候选生成永久笔记候选"));
  assert.ok(html.includes("确认 authorship 之后才会真正保存为永久笔记"));
});

test("renderPaperWorkspacePage keeps step four aligned to the selected paper candidate", () => {
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
      },
      {
        id: "pwc_2",
        title: "Candidate Two",
        quoteText: "Second candidate text",
        candidateKind: "claim",
        status: "translated"
      }
    ],
    translations: [
      {
        id: "ptr_1",
        candidateId: "pwc_1",
        paraphraseText: "Saved wording one.",
        relationToQuestion: "Saved relation one.",
        boundaryOrCondition: "Saved boundary one."
      },
      {
        id: "ptr_2",
        candidateId: "pwc_2",
        paraphraseText: "Saved wording two.",
        relationToQuestion: "Saved relation two.",
        boundaryOrCondition: "Saved boundary two."
      }
    ],
    permanentCandidates: [
      {
        id: "pn_1",
        paper_candidate_id: "pwc_1",
        title: "Permanent One",
        core_claim: "First claim.",
        rationale: "First reason.",
        originality_status: "warning",
        status: "draft",
        citations: [{ source_id: "src_1" }]
      }
    ]
  };
  state.selectedCandidateId = "pwc_2";
  state.selectedPermanentCandidateId = "";
  state.form.paraphraseText = "Saved wording two.";
  state.form.relationToQuestion = "Saved relation two.";
  state.form.boundaryOrCondition = "Saved boundary two.";

  const html = renderPaperWorkspacePage(state);

  assert.ok(html.includes("当前候选的转述已经就绪"));
  assert.ok(html.includes("列表里的条目属于其他候选"));
  assert.ok(html.includes("生成永久笔记候选"));
  assert.doesNotMatch(html, /paper-permanent-preview/);
  assert.doesNotMatch(html, /First reason\./);
  assert.match(html, /id="btnSavePermanentNote"[^>]*disabled/);
});

test("renderPaperWorkspacePage blocks permanent-note save while aligned translation has unsaved edits", () => {
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
        paraphraseText: "Saved wording.",
        relationToQuestion: "Saved relation.",
        boundaryOrCondition: "Saved boundary."
      }
    ],
    permanentCandidates: [
      {
        id: "pn_1",
        paper_candidate_id: "pwc_1",
        title: "Permanent One",
        core_claim: "My claim.",
        rationale: "My reason.",
        originality_status: "warning",
        status: "draft",
        citations: [{ source_id: "src_1" }]
      }
    ]
  };
  state.selectedCandidateId = "pwc_1";
  state.selectedPermanentCandidateId = "pn_1";
  state.form.paraphraseText = "Saved wording.";
  state.form.relationToQuestion = "Updated relation before saving again.";
  state.form.boundaryOrCondition = "Saved boundary.";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /id="btnSavePermanentNote"[^>]*disabled/);
});

test("renderPaperWorkspacePage blocks permanent-note save when the aligned permanent candidate is stale against a re-saved translation", () => {
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
        paraphraseText: "Saved wording v2.",
        relationToQuestion: "Saved relation v2.",
        boundaryOrCondition: "Saved boundary v2."
      }
    ],
    permanentCandidates: [
      {
        id: "pn_1",
        paper_candidate_id: "pwc_1",
        title: "Permanent One",
        core_claim: "My claim.",
        rationale: "My reason.",
        originality_status: "warning",
        status: "draft",
        citations: [{ source_id: "src_1" }]
      }
    ]
  };
  state.workspaceSelection = {
    translationSignatureByPermanentCandidate: {
      pn_1: JSON.stringify({
        candidateId: "pwc_1",
        translationId: "ptr_1",
        paraphraseText: "Saved wording v1.",
        relationToQuestion: "Saved relation v1.",
        boundaryOrCondition: "Saved boundary v1."
      })
    }
  };
  state.selectedCandidateId = "pwc_1";
  state.selectedPermanentCandidateId = "pn_1";
  state.form.paraphraseText = "Saved wording v2.";
  state.form.relationToQuestion = "Saved relation v2.";
  state.form.boundaryOrCondition = "Saved boundary v2.";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /旧版转述|重新生成永久笔记候选/);
  assert.match(html, /id="btnCreatePermanentCandidate"[^>]*>重新生成永久笔记候选</);
  assert.ok(html.includes("先重新生成永久笔记候选"));
  assert.match(html, /id="btnSavePermanentNote"[^>]*disabled/);
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
        paraphraseText: "My own wording.",
        relationToQuestion: "This matters for the writing question.",
        boundaryOrCondition: "Only when the sample is comparable."
      }
    ],
    permanentCandidates: [
      {
        id: "pn_1",
        paper_candidate_id: "pwc_1",
        title: "Permanent One",
        core_claim: "First claim.",
        rationale: "First reason.",
        originality_status: "warning",
        status: "draft",
        citations: [{ source_id: "src_1" }]
      },
      {
        id: "pn_2",
        paper_candidate_id: "pwc_1",
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
  state.form.relationToQuestion = "This matters for the writing question.";
  state.form.boundaryOrCondition = "Only when the sample is comparable.";

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
  assert.ok(html.includes("这条候选已经生成对应的永久笔记候选"));
  assert.ok(html.includes("下一步就是检查 originality 风险"));
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
        paper_candidate_id: "pwc_1",
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
  state.form.relationToQuestion = "This matters for the writing question.";
  state.form.boundaryOrCondition = "Only when the sample is comparable.";
  state.form.relationToQuestion = "This matters for the writing question.";
  state.form.boundaryOrCondition = "Only when the sample is comparable.";

  const html = renderPaperWorkspacePage(state);

  assert.ok(html.includes("未填写"));
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
        paper_candidate_id: "pwc_1",
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
  assert.ok(html.includes("已保存的永久笔记路径") || html.includes("永久笔记路径"));
  assert.ok(html.includes("回看 originality 风险") || html.includes("确认这份保存结果"));
  assert.ok(html.includes("这条候选已经连上自己的永久笔记路径"));
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
        paper_candidate_id: "pwc_1",
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

  assert.match(html, /active\uff0c\u5982\u679c\u901a\u8fc7 originality \u68c0\u67e5/);
  assert.match(html, /<option value="draft" selected>/);
});

test("renderPaperWorkspacePage warns in step three when the aligned permanent candidate is stale", () => {
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
        paraphraseText: "Saved wording v2.",
        relationToQuestion: "Saved relation v2.",
        boundaryOrCondition: "Saved boundary v2."
      }
    ],
    permanentCandidates: [
      {
        id: "pn_1",
        paper_candidate_id: "pwc_1",
        title: "Permanent One",
        core_claim: "Saved claim.",
        rationale: "Saved reason.",
        originality_status: "warning",
        status: "draft",
        savedPermanentNoteId: "note_1",
        citations: [{ source_id: "src_1" }]
      }
    ]
  };
  state.workspaceSelection = {
    translationSignatureByPermanentCandidate: {
      pn_1: JSON.stringify({
        candidateId: "pwc_1",
        translationId: "ptr_1",
        paraphraseText: "Saved wording v1.",
        relationToQuestion: "Saved relation v1.",
        boundaryOrCondition: "Saved boundary v1."
      })
    }
  };
  state.selectedCandidateId = "pwc_1";
  state.selectedPermanentCandidateId = "pn_1";
  state.form.paraphraseText = "Saved wording v2.";
  state.form.relationToQuestion = "Saved relation v2.";
  state.form.boundaryOrCondition = "Saved boundary v2.";

  const html = renderPaperWorkspacePage(state);

  assert.match(html, /Step 4 .*旧版转述|下一步先重新生成永久笔记候选/);
  assert.match(html, /id="btnCreatePermanentCandidate"[^>]*>重新生成永久笔记候选</);
  assert.ok(html.includes("先重新生成永久笔记候选"));
  assert.match(html, /id="btnSavePermanentNote"[^>]*disabled/);
});

test("renderPaperWorkspacePage disables step-four form fields when the permanent path is stale or already saved", () => {
  const staleState = createInitialPaperWorkspaceState();
  staleState.workspace = {
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
        paraphraseText: "Saved wording v2.",
        relationToQuestion: "Saved relation v2.",
        boundaryOrCondition: "Saved boundary v2."
      }
    ],
    permanentCandidates: [
      {
        id: "pn_1",
        paper_candidate_id: "pwc_1",
        title: "Permanent One",
        core_claim: "Saved claim.",
        rationale: "Saved reason.",
        originality_status: "warning",
        status: "draft",
        citations: [{ source_id: "src_1" }]
      }
    ]
  };
  staleState.workspaceSelection = {
    translationSignatureByPermanentCandidate: {
      pn_1: JSON.stringify({
        candidateId: "pwc_1",
        translationId: "ptr_1",
        paraphraseText: "Saved wording v1.",
        relationToQuestion: "Saved relation v1.",
        boundaryOrCondition: "Saved boundary v1."
      })
    }
  };
  staleState.selectedCandidateId = "pwc_1";
  staleState.selectedPermanentCandidateId = "pn_1";
  staleState.form.paraphraseText = "Saved wording v2.";
  staleState.form.relationToQuestion = "Saved relation v2.";
  staleState.form.boundaryOrCondition = "Saved boundary v2.";

  const staleHtml = renderPaperWorkspacePage(staleState);

  assert.match(staleHtml, /id="confirmAuthorshipInput"[^>]*disabled/);
  assert.match(staleHtml, /id="permanentStatusInput"[^>]*disabled/);
  assert.match(staleHtml, /id="btnSavePermanentNote"[^>]*disabled/);

  const savedState = createInitialPaperWorkspaceState();
  savedState.workspace = {
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
        paper_candidate_id: "pwc_1",
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
  savedState.selectedCandidateId = "pwc_1";
  savedState.selectedPermanentCandidateId = "pn_1";
  savedState.form.paraphraseText = "My own wording.";

  const savedHtml = renderPaperWorkspacePage(savedState);

  assert.match(savedHtml, /id="confirmAuthorshipInput"[^>]*disabled/);
  assert.match(savedHtml, /id="permanentStatusInput"[^>]*disabled/);
  assert.match(savedHtml, /id="btnSavePermanentNote"[^>]*disabled/);
});
