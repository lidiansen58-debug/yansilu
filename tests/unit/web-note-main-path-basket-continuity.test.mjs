import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("main-path basket-ready card keeps boundary guidance while reusing continuity wording for the writing step", () => {
  const pane = createPane();
  pane.state = { notes: [] };
  pane.resolveNoteWritingContinuation = () => ({
    status: "继续文章提纲",
    hint: "当前笔记已经对应项目 wp_existing，文章提纲也已存在。先回到文章提纲，再继续检查证据、缺口和开放问题。",
    actionLabel: "继续文章提纲",
    action: "resume-scaffold",
    projectId: "wp_existing"
  });

  const note = {
    id: "pn_basket_ready_continuity",
    noteType: "permanent",
    thesis: "A stable claim.",
    threeLineSummary: ["one", "two", "three"],
    distillationStatus: "confirmed",
    authorship: { user_confirmed: true },
    status: "active"
  };
  const overview = {
    relationState: "loaded",
    explicitRelationCount: 1,
    wikilinkCount: 0,
    tagRelatedCount: 0,
    themeSignalCount: 1
  };

  const summary = pane.permanentNoteMainPathSummaryV2(note, overview);
  assert.match(summary.nextStep, /补边界\/反例/);

  const html = pane.renderPermanentNoteMainPathSectionV2(note, overview).replace(/\s+/g, " ");
  assert.match(html, /data-main-path-next-action="distillation"/);
  assert.match(html, /data-note-main-route-focus="boundary">补边界\/反例<\/button>/);
  assert.doesNotMatch(html, /main-path-progress/);
});
