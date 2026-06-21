import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("main-path project-ready card reuses continuity wording when the note already maps to a current draft", () => {
  const pane = createPane();
  pane.state = { notes: [] };
  pane.resolveNoteWritingContinuation = () => ({
    status: "打开当前草稿",
    hint: "当前笔记已经对应项目 wp_existing，而且当前草稿也已存在。直接打开当前草稿继续写，会比重新创建项目更连续。",
    actionLabel: "打开当前草稿",
    action: "open-draft",
    projectId: "wp_existing"
  });

  const note = {
    id: "pn_project_ready_continuity",
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
  assert.equal(summary.nextStep, "打开当前草稿");
  assert.match(summary.summary, /wp_existing|当前草稿/);

  const html = pane.renderPermanentNoteMainPathSectionV2(note, overview).replace(/\s+/g, " ");
  assert.match(html, /data-main-path-next-action="writing"/);
  assert.match(html, /<span>写作中心<\/span> <strong>打开当前草稿<\/strong>/);
  assert.match(html, /<b>写作准备<\/b> <em>打开当前草稿<\/em>/);
  assert.match(html, /data-note-main-route-mode="project">打开当前草稿<\/button>/);
});

test("main-path strong-model-ready card also reuses continuity wording when an existing project already matches", () => {
  const pane = createPane();
  pane.state = { notes: [] };
  pane.resolveNoteWritingContinuation = () => ({
    status: "继续当前项目",
    hint: "当前笔记已经对应项目 wp_existing。直接回到这个项目继续推进，会比重新创建项目更连续。",
    actionLabel: "继续当前项目",
    action: "resume-project",
    projectId: "wp_existing"
  });

  const note = {
    id: "pn_strong_model_ready_continuity",
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
  assert.equal(summary.nextStep, "继续当前项目");
  assert.match(summary.summary, /wp_existing|继续当前项目/);

  const html = pane.renderPermanentNoteMainPathSectionV2(note, overview).replace(/\s+/g, " ");
  assert.match(html, /data-main-path-next-action="writing"/);
  assert.match(html, /<span>写作中心<\/span> <strong>继续当前项目<\/strong>/);
  assert.match(html, /<b>写作准备<\/b> <em>继续当前项目<\/em>/);
  assert.match(html, /data-note-main-route-mode="project">继续当前项目<\/button>/);
});
