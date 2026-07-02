import test from "node:test";
import assert from "node:assert/strict";

import {
  renderWritingBookDesignDom,
  renderWritingFlowStepsDom,
  renderWritingPanelDom,
  renderWritingScaffoldPreviewDom,
  renderWritingStatusStripDom,
  renderWritingStrongModelRequestDetailDom,
  renderWritingNoteCardDom,
  renderWritingProjectCardDom,
  renderWritingThemeDetailDom,
  renderWritingThemeIndexCardDom
} from "../../apps/web/src/writing-panel-controller.js";

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

test("writing panel controller renders flow steps into the panel DOM", () => {
  const nodes = new Map([
    ["writingFlowSteps", { innerHTML: "" }]
  ]);

  renderWritingFlowStepsDom({
    $: (id) => nodes.get(id) || null,
    writingState: {
      project: {
        id: "project-1",
        scaffold_id: "",
        draft_note_id: "",
        preflight: { status: "ready", checks: [] }
      },
      scaffold: null
    },
    escapeHtml
  }, {
    basketCount: 2,
    hasProject: true,
    projectEntry: { canCreateProject: false }
  });

  const html = nodes.get("writingFlowSteps").innerHTML;
  assert.match(html, /writing-flow-step is-done/);
  assert.match(html, /writing-flow-step is-active/);
});

test("writing panel controller renders status strip from injected writing state", () => {
  const nodes = new Map([
    ["writingStatusStrip", { innerHTML: "" }]
  ]);

  renderWritingStatusStripDom({
    $: (id) => nodes.get(id) || null,
    writingState: {
      relationCounts: { n1: 2 },
      relationCountErrors: {},
      loadingRelationCounts: false,
      project: null,
      scaffold: null
    },
    parseWritingBasketIds: () => ["n1"],
    currentWritingBasketEligibility: () => ({ ineligible: [] }),
    writingRelationCountsReady: () => true,
    writingRelationCountsErrored: () => false,
    deriveBasketWritingReadiness: () => ({ level: "project_ready", status: "Material <ready>", hint: "Can create" }),
    writingKnownNoteById: (id) => ({ id }),
    describeWritingProjectPreflight: () => ({ level: "ready", status: "Ready", hint: "" }),
    describeWritingProjectEntryState: () => ({ status: "Project ready", hint: "Project hint" }),
    describeWritingMaterialStatus: () => ({ status: "Material <ready>", hint: "Use selected notes" }),
    writingIneligibleSummary: () => "Ineligible",
    isWritingStrongModelReady: () => true,
    describeWritingStrongModelStatus: () => ({ status: "Strong ready", hint: "Strong hint" }),
    escapeHtml
  });

  const html = nodes.get("writingStatusStrip").innerHTML;
  assert.match(html, /writing-status-card/);
  assert.match(html, /data-tone="good"/);
  assert.match(html, /Material &lt;ready&gt;/);
  assert.match(html, /Project ready/);
  assert.match(html, /Strong ready/);
});

test("writing panel controller shows entry recommendation reason in the first screen hint", () => {
  const nodes = new Map([
    ["writingCurrentNote", { textContent: "" }],
    ["writingScopeHint", { textContent: "" }]
  ]);

  renderWritingPanelDom({
    $: (id) => nodes.get(id) || null,
    state: { notes: [], selectedFileId: "", selectedFolderId: "dir" },
    writingState: {
      entryContextReason: "当前图谱范围有 2 条可写永久笔记，已作为相关笔记带入。",
      entryContextSourceLabel: "图谱"
    },
    folderById: () => ({ name: "永久笔记" }),
    rootBoxIdFromFolder: () => "root",
    writingCandidateNotes: () => [],
    writingSourceIndexSummary: () => "",
    writingBasketEntries: () => [],
    parseWritingBasketIds: () => [],
    buildWritingPanelState: () => ({
      currentLabel: "写作中心",
      candidateFocusPlan: {
        usingFocusedScope: true,
        scopeLabel: "当前图谱范围",
        addActionLabel: "加入当前图谱范围"
      },
      candidates: [],
      relationCountsReady: false,
      relationCountsErrored: false,
      basketReadiness: {},
      hasProject: false,
      hasScaffold: false,
      hasDraft: false,
      projectEntry: { canCreateProject: false, actionLabel: "先补相关笔记" },
      projectPreflightSummary: {},
      strongModelReady: false,
      strongModelState: {},
      openDraftButtonState: { disabled: true, text: "暂无草稿" },
      scaffoldButtonState: { disabled: true, text: "先补相关笔记" },
      strongModelButtonState: { disabled: true, text: "先补相关笔记" },
      toplineMetrics: []
    }),
    selectedWritingThemeIndex: () => null,
    clearWritingThemeRelationCounts: () => {},
    renderThinkingStatusBadge: () => "",
    escapeHtml
  });

  assert.match(nodes.get("writingScopeHint").textContent, /图谱推荐理由/);
  assert.match(nodes.get("writingScopeHint").textContent, /已作为相关笔记带入/);
});

test("writing panel controller renders scaffold preview empty continuity guidance", () => {
  const nodes = new Map([
    ["writingScaffoldPreview", { innerHTML: "" }]
  ]);

  renderWritingScaffoldPreviewDom({
    $: (id) => nodes.get(id) || null,
    state: {},
    writingState: {
      project: null,
      scaffold: null
    },
    currentWritingContinuationEntry: () => ({
      projectId: "project-1",
      status: "Existing project",
      actionLabel: "Continue project"
    }),
    describeWritingProjectPreflight: () => ({ level: "ready", status: "Ready", hint: "" }),
    escapeHtml
  });

  const html = nodes.get("writingScaffoldPreview").innerHTML;
  assert.match(html, /writing-empty/);
  assert.match(html, /Existing project/);
  assert.match(html, /Continue project/);
});

test("writing panel controller renders scaffold sections preflight and markdown", () => {
  const nodes = new Map([
    ["writingScaffoldPreview", { innerHTML: "" }]
  ]);

  renderWritingScaffoldPreviewDom({
    $: (id) => nodes.get(id) || null,
    state: {},
    writingState: {
      project: {
        id: "project-1",
        draft_note_id: "",
        preflight: { checks: [{ status: "pass", label: "Project", message: "OK" }] }
      },
      scaffold: {
        id: "scaffold-1",
        sections: [
          {
            heading: "Opening <claim>",
            purpose: "Set direction",
            gaps: ["case"],
            counterpoints: ["risk"],
            open_questions: ["why now"]
          }
        ],
        open_questions: ["larger question"],
        preflight: {
          checks: [
            { status: "pass", label: "Structure", message: "OK" },
            { status: "warn", label: "Gap", message: "Add case" }
          ]
        }
      },
      scaffoldMarkdown: "# Draft"
    },
    currentWritingContinuationEntry: () => null,
    describeWritingProjectPreflight: () => ({ level: "ready", status: "Project ready", hint: "" }),
    describeProjectPreflight: () => ({ level: "has_gaps", status: "Needs work", hint: "Has gaps" }),
    groupWritingPreflightChecks: (preflight) => ({
      checks: preflight.checks,
      blocking: [],
      warnings: preflight.checks.filter((check) => check.status !== "pass"),
      passes: preflight.checks.filter((check) => check.status === "pass")
    }),
    writingDraftDirectoryId: () => "drafts",
    folderById: () => ({ name: "Draft Folder" }),
    parseWritingBasketIds: () => ["n1", "n2"],
    describeWritingNextActionFromState: () => ({ title: "Save draft", note: "Ready to write." }),
    escapeHtml
  });

  const html = nodes.get("writingScaffoldPreview").innerHTML;
  assert.match(html, /scaffold-1/);
  assert.match(html, /Draft Folder/);
  assert.match(html, /Save draft/);
  assert.match(html, /Opening &lt;claim&gt;/);
  assert.match(html, /case/);
  assert.match(html, /larger question/);
  assert.match(html, /# Draft/);
});

test("writing panel controller renders strong model request empty state", () => {
  const nodes = new Map([
    ["writingStrongModelRequestDetail", { innerHTML: "" }]
  ]);

  renderWritingStrongModelRequestDetailDom({
    $: (id) => nodes.get(id) || null,
    writingState: {},
    parseWritingBasketIds: () => [],
    writingKnownNoteById: () => null,
    writingBookProjectGoal: () => "",
    writingBookProjectAudience: () => "",
    escapeHtml
  });

  const html = nodes.get("writingStrongModelRequestDetail").innerHTML;
  assert.match(html, /writing-section-note/);
});

test("writing panel controller renders strong model request details", () => {
  const nodes = new Map([
    ["writingStrongModelRequestDetail", { innerHTML: "" }]
  ]);

  renderWritingStrongModelRequestDetailDom({
    $: (id) => nodes.get(id) || null,
    writingState: {
      strongModelResult: {
        request: {
          model: { model: "gpt-test" }
        }
      }
    },
    parseWritingBasketIds: () => ["n1"],
    writingKnownNoteById: (id) => ({ id, title: "Note <one>" }),
    writingBookProjectGoal: () => "Write <clearly>",
    writingBookProjectAudience: () => "Readers",
    escapeHtml
  }, {
    strongModelReady: true
  });

  const html = nodes.get("writingStrongModelRequestDetail").innerHTML;
  assert.match(html, /gpt-test/);
  assert.match(html, /Note &lt;one&gt;/);
  assert.match(html, /Write &lt;clearly&gt;/);
  assert.match(html, /Readers/);
  assert.match(html, /<ul>/);
});

test("writing panel controller renders book design empty state", () => {
  const nodes = new Map([
    ["writingBookDesignSummary", { textContent: "" }],
    ["writingBookStructure", { innerHTML: "" }],
    ["writingBookPools", { innerHTML: "" }],
    ["writingBookLocalIdeas", { innerHTML: "" }],
    ["btnWritingLocalBookIdeas", { disabled: false }]
  ]);

  renderWritingBookDesignDom({
    $: (id) => nodes.get(id) || null,
    writingState: {},
    writingBasketEntries: () => [],
    normalizeWritingBookStructure: () => ({ parts: [] }),
    deriveWritingBookDesign: () => ({ parts: [], pools: { cases: [], counterarguments: [], open_questions: [] }, direction_ideas: [] }),
    writingBookStructureStats: () => ({ partCount: 0, chapterCount: 0, sectionCount: 0 }),
    escapeHtml
  });

  assert.equal(nodes.get("btnWritingLocalBookIdeas").disabled, true);
  assert.match(nodes.get("writingBookStructure").innerHTML, /writing-empty/);
  assert.match(nodes.get("writingBookPools").innerHTML, /writing-book-pool-title/);
});

test("writing panel controller renders book design structure pools and ideas", () => {
  const nodes = new Map([
    ["writingBookDesignSummary", { textContent: "" }],
    ["writingBookStructure", { innerHTML: "" }],
    ["writingBookPools", { innerHTML: "" }],
    ["writingBookLocalIdeas", { innerHTML: "" }],
    ["btnWritingLocalBookIdeas", { disabled: true }]
  ]);
  const design = {
    mainline: "Main <line>",
    parts: [
      {
        label: "Part A",
        title: "Part <one>",
        chapters: [
          {
            title: "Chapter One",
            sections: [{ title: "Section A" }],
            evidence_note_ids: ["n1"]
          }
        ]
      }
    ],
    pools: {
      cases: [{ title: "Case One", note_ids: ["n1"] }],
      counterarguments: [{ title: "Counter One", note_ids: ["n2"] }],
      open_questions: ["Question One"]
    },
    direction_ideas: [
      {
        title: "Idea One",
        reader: "Reader",
        promise: "Promise",
        risk: "Risk",
        note_ids: ["n1"]
      }
    ]
  };

  renderWritingBookDesignDom({
    $: (id) => nodes.get(id) || null,
    writingState: {
      project: {},
      localBookIdeas: []
    },
    writingBasketEntries: () => [{ id: "n1" }],
    normalizeWritingBookStructure: () => ({ parts: [] }),
    deriveWritingBookDesign: () => design,
    writingBookStructureStats: () => ({ partCount: 1, chapterCount: 1, sectionCount: 1 }),
    escapeHtml
  });

  assert.equal(nodes.get("btnWritingLocalBookIdeas").disabled, false);
  assert.match(nodes.get("writingBookDesignSummary").textContent, /Main <line>/);
  assert.match(nodes.get("writingBookStructure").innerHTML, /Part &lt;one&gt;/);
  assert.match(nodes.get("writingBookPools").innerHTML, /Case One/);
  assert.match(nodes.get("writingBookLocalIdeas").innerHTML, /Idea One/);
});

test("writing panel controller renders theme index card continuation actions", () => {
  const html = renderWritingThemeIndexCardDom({
    writingState: {
      sourceIndexIds: ["theme-1"],
      selectedThemeIndexId: ""
    },
    writingThemeIndexNoteIds: () => ["n1", "n2"],
    findExistingWritingProjectForTheme: () => ({
      id: "project-1",
      scaffold_id: "scaffold-1",
      draft_note_id: ""
    }),
    describeWritingContinuationAction: () => ({
      projectId: "project-1",
      action: "resume-scaffold",
      actionLabel: "Resume scaffold"
    }),
    renderThinkingStatusBadge: () => "<b>status</b>",
    escapeHtml
  }, {
    id: "theme-1",
    title: "Theme <one>",
    index_type: "topic",
    directory_title: "Dir",
    summary: "Summary",
    items: [
      { note_id: "n1", short_label: "First" },
      { note_id: "n2", note: { title: "Second" } }
    ],
    note_count: 3
  });

  assert.match(html, /writing-note-card selected/);
  assert.match(html, /Theme &lt;one&gt;/);
  assert.match(html, /data-writing-index-action="use"/);
  assert.match(html, /data-writing-index-action="resume-scaffold"/);
  assert.match(html, /project-1/);
  assert.match(html, /<b>status<\/b>/);
});

test("writing panel controller renders writing note card actions", () => {
  const html = renderWritingNoteCardDom({
    renderThinkingStatusBadge: () => "<b>status</b>",
    writingNoteMeta: () => "note-1 · Permanent",
    writingNoteExcerpt: () => "Excerpt <line>",
    escapeHtml
  }, {
    id: "note-1",
    title: "Note <one>",
    thinkingStatus: { status: "ready" }
  }, {
    selected: true,
    action: "remove",
    actionLabel: "Remove <basket>"
  });

  assert.match(html, /writing-note-card selected/);
  assert.match(html, /data-writing-note-id="note-1"/);
  assert.match(html, /Note &lt;one&gt;/);
  assert.match(html, /note-1 · Permanent/);
  assert.match(html, /Excerpt &lt;line&gt;/);
  assert.match(html, /data-writing-action="remove"/);
  assert.match(html, /Remove &lt;basket&gt;/);
  assert.match(html, /data-writing-action="open"/);
  assert.match(html, /<b>status<\/b>/);
});

test("writing panel controller renders writing project card through workspace view deps", () => {
  const html = renderWritingProjectCardDom({
    renderThinkingStatusBadge: () => "<b>project-status</b>",
    writingProjectStatusLabel: (value) => `status:${value}`,
    escapeHtml
  }, {
    id: "project-1",
    title: "Project <one>",
    goal: "Goal",
    status: "active",
    basket_count: 2,
    scaffold_id: "scaffold-1",
    draft_note_id: "",
    thinkingStatus: { status: "ready" }
  });

  assert.match(html, /data-writing-project-id="project-1"/);
  assert.match(html, /Project &lt;one&gt;/);
  assert.match(html, /status:active/);
  assert.match(html, /相关笔记 2/);
  assert.match(html, /data-writing-project-action="resume-scaffold"/);
  assert.match(html, /data-writing-project-action="copy-scaffold"/);
  assert.match(html, /data-writing-project-action="export-scaffold"/);
  assert.match(html, /<b>project-status<\/b>/);
});

test("writing panel controller renders theme detail form and note actions", () => {
  const empty = renderWritingThemeDetailDom({
    writingThemeProjectEntry: () => ({ noteIds: [], readiness: {}, projectEntry: {} }),
    writingKnownNoteById: () => null,
    renderThinkingStatusBadge: () => "",
    escapeHtml
  }, null);
  assert.match(empty, /writing-empty/);

  const html = renderWritingThemeDetailDom({
    writingThemeProjectEntry: () => ({
      noteIds: ["n1"],
      readiness: { hint: "Ready" },
      projectEntry: {
        action: "create-project",
        projectId: "",
        canCreateProject: true,
        actionLabel: "Create project",
        status: "Project ready",
        hint: "Ready to create"
      }
    }),
    writingKnownNoteById: () => ({ id: "n1", title: "Note <one>" }),
    renderThinkingStatusBadge: () => "<b>theme</b>",
    escapeHtml
  }, {
    id: "theme-1",
    title: "Theme",
    index_type: "topic",
    note_count: 1,
    summary: "Summary",
    thesis: "Thesis",
    central_question: "Question",
    three_line_summary: ["One", "Two", "Three"],
    items: [{ note_id: "n1", rationale: "Because" }]
  });

  assert.match(html, /data-writing-theme-id="theme-1"/);
  assert.match(html, /data-writing-theme-action="create-project"/);
  assert.match(html, /writingThemeDetailTitle/);
  assert.match(html, /主题索引不是文章/);
  assert.match(html, /重新进入一个问题的入口/);
  assert.match(html, /Note &lt;one&gt;/);
  assert.match(html, /Because/);
  assert.match(html, /data-writing-theme-action="open-note"/);
  assert.match(html, /<b>theme<\/b>/);
});
