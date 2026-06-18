import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("writing readiness blocks notes without authorship confirmation", () => {
  const pane = createPane();
  const readiness = pane.noteWritingReadinessV2(
    {
      status: "active",
      distillationStatus: "confirmed",
      authorship: { user_confirmed: false },
      body: "# Note\n\nConfirmed but not author-confirmed."
    },
    {}
  );

  assert.equal(readiness.level, "blocked_authorship");
  assert.match(readiness.status, /作者确认/);
  assert.equal(readiness.actionLabel, "先完成作者确认");
});

test("writing readiness asks draft notes to finish originality confirmation before writing-center", () => {
  const pane = createPane();
  const readiness = pane.noteWritingReadinessV2(
    {
      status: "draft",
      distillationStatus: "confirmed",
      authorship: { user_confirmed: true },
      body: "# Note\n\nStill a draft note."
    },
    {}
  );

  assert.equal(readiness.level, "blocked_draft");
  assert.match(readiness.status, /原创确认/);
  assert.equal(readiness.actionLabel, "先完成原创确认");
});

test("writing readiness asks unconfirmed notes to confirm the claim before writing-center", () => {
  const pane = createPane();
  const readiness = pane.noteWritingReadinessV2(
    {
      status: "active",
      distillationStatus: "draft",
      authorship: { user_confirmed: true },
      thesis: "A stable claim.",
      threeLineSummary: ["one", "two", "three"]
    },
    {}
  );

  assert.equal(readiness.level, "needs_distillation");
  assert.match(readiness.status, /确认观点/);
  assert.equal(readiness.actionLabel, "先确认观点/三句话");
});

test("writing readiness allows basket entry before boundary and relation are complete", () => {
  const pane = createPane();
  const readiness = pane.noteWritingReadinessV2(
    {
      status: "active",
      distillationStatus: "confirmed",
      authorship: { user_confirmed: true },
      body: "# Note\n\nConfirmed thesis without explicit boundary."
    },
    {
      relationState: "loaded",
      explicitRelationCount: 0,
      wikilinkCount: 0,
      themeSignalCount: 0
    }
  );

  assert.equal(readiness.level, "basket_ready");
  assert.match(readiness.status, /写作篮/);
});

test("writing readiness upgrades to project-ready once boundary and relation exist", () => {
  const pane = createPane();
  const readiness = pane.noteWritingReadinessV2(
    {
      status: "active",
      distillationStatus: "confirmed",
      authorship: { user_confirmed: true },
      boundaryOrCounterpoint: "Only holds in this constrained case.",
      body: "# Note\n\nConfirmed thesis with one relation."
    },
    {
      relationState: "loaded",
      explicitRelationCount: 1,
      wikilinkCount: 0,
      themeSignalCount: 1
    }
  );

  assert.equal(readiness.level, "project_ready");
  assert.match(readiness.status, /先创建项目/);
});

test("writing readiness upgrades to strong-model-ready once theme signals are richer", () => {
  const pane = createPane();
  const readiness = pane.noteWritingReadinessV2(
    {
      status: "active",
      distillationStatus: "confirmed",
      authorship: { user_confirmed: true },
      boundaryOrCounterpoint: "Only holds in this constrained case.",
      body: "# Note\n\nConfirmed thesis with relation and theme support."
    },
    {
      relationState: "loaded",
      explicitRelationCount: 1,
      wikilinkCount: 1,
      themeSignalCount: 3
    }
  );

  assert.equal(readiness.level, "strong_model_ready");
  assert.match(readiness.status, /先创建项目/);
});

test("main-path focuses boundary follow-up once a confirmed note already has an explicit relation", () => {
  const pane = createPane();
  const note = {
    id: "note-boundary-gap",
    folderId: "dir_original_default",
    noteType: "original",
    status: "active",
    distillationStatus: "confirmed",
    authorship: { user_confirmed: true },
    title: "Boundary Gap Note",
    body: "# Gap Note\n\nA confirmed note with one explicit relation but its limiting condition is still unstated.",
    thesis: "A structurally connected note still needs a boundary before it becomes truly writing-ready.",
    threeLineSummary: [
      "The judgment is already reusable.",
      "The explicit relation means the note is no longer isolated.",
      "What is still missing is the boundary that limits where the judgment holds."
    ]
  };
  const overview = {
    relationState: "loaded",
    explicitRelationCount: 1,
    wikilinkCount: 0,
    themeSignalCount: 1
  };

  const summary = pane.permanentNoteMainPathSummaryV2(note, overview);
  assert.match(summary.nextStep, /边界|反例/);
  assert.match(summary.summary, /边界|反例/);
  assert.match(summary.summary, /写作中心/);

  const html = pane.renderPermanentNoteMainPathSectionV2(note, overview).replace(/\s+/g, " ");
  assert.match(
    html,
    /data-note-main-route-action="distillation" data-note-main-route-focus="boundary">补边界\/反例<\/button>/
  );
  assert.match(html, /data-main-path-next-action="distillation"/);
  assert.match(html, /<strong>补边界\/反例<\/strong>/);
  assert.match(html, /<b>关系<\/b> <em>1 条正式关系<\/em>/);
});

test("main-path writing action uses project mode once a note is project-ready", () => {
  const pane = createPane();
  pane.state = { notes: [] };
  const note = {
    id: "pn_project_ready",
    noteType: "permanent",
    thesis: "A stable claim.",
    threeLineSummary: ["one", "two", "three"],
    distillationStatus: "confirmed",
    authorship: { user_confirmed: true },
    status: "active",
    boundaryOrCounterpoint: "Only holds in this constrained case."
  };
  const overview = {
    relationState: "loaded",
    explicitRelationCount: 1,
    wikilinkCount: 0,
    tagRelatedCount: 0,
    themeSignalCount: 1
  };
  const summary = pane.permanentNoteMainPathSummaryV2(note, overview);
  assert.match(summary.nextStep, /先创建项目/);
  assert.match(summary.summary, /先创建项目/);

  const html = pane.renderPermanentNoteMainPathSectionV2(
    note,
    overview
  );

  assert.match(html, /data-note-main-route-action="writing"/);
  assert.match(html, /data-note-main-route-mode="project"/);
  assert.match(html, />创建项目<\/button>/);
});

test("main-path project-ready card aligns chip and writing-step wording to create-project", () => {
  const pane = createPane();
  pane.state = { notes: [] };
  const html = pane.renderPermanentNoteMainPathSectionV2(
    {
      id: "pn_project_ready_alignment",
      noteType: "permanent",
      thesis: "A stable claim.",
      threeLineSummary: ["one", "two", "three"],
      distillationStatus: "confirmed",
      authorship: { user_confirmed: true },
      status: "active",
      boundaryOrCounterpoint: "Only holds in this constrained case."
    },
    {
      relationState: "loaded",
      explicitRelationCount: 1,
      wikilinkCount: 0,
      tagRelatedCount: 0,
      themeSignalCount: 1
    }
  ).replace(/\s+/g, " ");

  assert.match(html, /data-main-path-next-action="writing"/);
  assert.match(html, /<strong>先创建项目<\/strong>/);
  assert.match(html, /<b>去向<\/b> <em>先创建项目<\/em>/);
  assert.match(html, /data-note-main-route-mode="project">创建项目<\/button>/);
});

test("main-path reframes strong-model-ready notes to create-project wording before project exists", () => {
  const pane = createPane();
  pane.state = { notes: [] };
  const note = {
    id: "pn_strong_model_ready",
    noteType: "permanent",
    thesis: "A stable claim.",
    threeLineSummary: ["one", "two", "three"],
    distillationStatus: "confirmed",
    authorship: { user_confirmed: true },
    status: "active",
    boundaryOrCounterpoint: "Only holds in this constrained case."
  };
  const overview = {
    relationState: "loaded",
    explicitRelationCount: 1,
    wikilinkCount: 1,
    tagRelatedCount: 0,
    themeSignalCount: 3
  };

  const summary = pane.permanentNoteMainPathSummaryV2(note, overview);
  assert.match(summary.nextStep, /先创建项目/);
  assert.match(summary.summary, /强模型分析前|先创建项目/);

  const html = pane.renderPermanentNoteMainPathSectionV2(note, overview).replace(/\s+/g, " ");
  assert.match(html, /data-note-main-route-mode="project"/);
  assert.match(html, /data-main-path-next-action="writing"/);
  assert.match(html, /<strong>先创建项目<\/strong>/);
  assert.match(html, />创建项目<\/button>/);
});

test("main-path writing step uses requirements mode for authorship-blocked notes", () => {
  const pane = createPane();
  pane.state = { notes: [] };
  const html = pane.renderPermanentNoteMainPathSectionV2(
    {
      id: "pn_blocked_authorship",
      noteType: "permanent",
      thesis: "A stable claim.",
      threeLineSummary: ["one", "two", "three"],
      distillationStatus: "confirmed",
      authorship: { user_confirmed: false },
      status: "active",
      boundaryOrCounterpoint: "Only holds in this constrained case."
    },
    {
      relationState: "loaded",
      explicitRelationCount: 1,
      wikilinkCount: 0,
      tagRelatedCount: 0,
      themeSignalCount: 1
    }
  ).replace(/\s+/g, " ");

  assert.match(html, /data-note-main-route-mode="requirements"/);
  assert.match(html, /先完成作者确认/);
});

test("main-path basket-ready card labels the writing step as 可加入写作篮", () => {
  const pane = createPane();
  pane.state = { notes: [] };
  const html = pane.renderPermanentNoteMainPathSectionV2(
    {
      id: "pn_basket_ready_label",
      noteType: "permanent",
      thesis: "A stable claim.",
      threeLineSummary: ["one", "two", "three"],
      distillationStatus: "confirmed",
      authorship: { user_confirmed: true },
      status: "active"
    },
    {
      relationState: "loaded",
      explicitRelationCount: 0,
      wikilinkCount: 0,
      tagRelatedCount: 0,
      themeSignalCount: 0
    }
  ).replace(/\s+/g, " ");

  assert.match(html, /<b>去向<\/b> <em>可加入写作篮<\/em>/);
  assert.match(html, /加入写作篮<\/button>/);
});

test("main-path writing step uses distillation mode when the note still needs distillation", () => {
  const pane = createPane();
  pane.state = { notes: [] };
  const html = pane.renderPermanentNoteMainPathSectionV2(
    {
      id: "pn_needs_distillation",
      noteType: "permanent",
      thesis: "A stable claim.",
      threeLineSummary: ["one", "two", "three"],
      distillationStatus: "draft",
      authorship: { user_confirmed: true },
      status: "active",
      boundaryOrCounterpoint: "Only holds in this constrained case."
    },
    {
      relationState: "loaded",
      explicitRelationCount: 1,
      wikilinkCount: 0,
      tagRelatedCount: 0,
      themeSignalCount: 1
    }
  ).replace(/\s+/g, " ");

  assert.match(html, /data-main-path-next-action="distillation"/);
  assert.match(html, /data-note-main-route-focus="thesis"/);
  assert.match(html, /<b>去向<\/b> <em>先确认观点<\/em>/);
});
