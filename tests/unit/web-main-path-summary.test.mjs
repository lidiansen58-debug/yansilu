import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function createPane() {
  return Object.create(EditorPane.prototype);
}

test("main-path summary prefers concise thesis guidance before distillation exists", () => {
  const pane = createPane();
  const result = pane.permanentNoteMainPathSummaryV2(
    {
      thesis: "",
      threeLineSummary: [],
      distillationStatus: "draft"
    },
    {}
  );

  assert.equal(result.nextStep, "先写一句判断");
  assert.match(result.summary, /可复用的判断/);
});

test("main-path summary calls for first explicit relation once note is confirmed but isolated", () => {
  const pane = createPane();
  const result = pane.permanentNoteMainPathSummaryV2(
    {
      thesis: "A stable claim.",
      threeLineSummary: ["one", "two", "three"],
      distillationStatus: "confirmed",
      authorship: { user_confirmed: true },
      status: "active",
      boundaryOrCounterpoint: "Only holds in one constrained case."
    },
    {
      relationState: "loaded",
      explicitRelationCount: 0,
      wikilinkCount: 0,
      themeSignalCount: 0
    }
  );

  assert.equal(result.nextStep, "补关系，不要让它孤立");
  assert.match(result.summary, /第一条有理由的关系/);
});

test("main-path summary distinguishes wikilink-only notes from fully isolated notes", () => {
  const pane = createPane();
  const result = pane.permanentNoteMainPathSummaryV2(
    {
      thesis: "A stable claim.",
      threeLineSummary: ["one", "two", "three"],
      distillationStatus: "confirmed",
      authorship: { user_confirmed: true },
      status: "active",
      boundaryOrCounterpoint: "Only holds in one constrained case."
    },
    {
      relationState: "loaded",
      explicitRelationCount: 0,
      wikilinkCount: 2,
      tagRelatedCount: 0,
      themeSignalCount: 2
    }
  );

  assert.equal(result.nextStep, "补关系理由");
  assert.match(result.summary, /\u6b63\u6587\u94fe\u63a5/);
  assert.match(result.summary, /显式关系/);
});

test("main-path summary distinguishes tag-only theme hints from actual network connections", () => {
  const pane = createPane();
  const result = pane.permanentNoteMainPathSummaryV2(
    {
      thesis: "A stable claim.",
      threeLineSummary: ["one", "two", "three"],
      distillationStatus: "confirmed",
      authorship: { user_confirmed: true },
      status: "active",
      boundaryOrCounterpoint: "Only holds in one constrained case."
    },
    {
      relationState: "loaded",
      explicitRelationCount: 0,
      wikilinkCount: 0,
      tagRelatedCount: 2,
      themeSignalCount: 2
    }
  );

  assert.equal(result.nextStep, "别只停在标签重合");
  assert.match(result.summary, /标签/);
  assert.match(result.summary, /关系/);
});

test("main-path summary asks to create a project once note is project-ready", () => {
  const pane = createPane();
  const result = pane.permanentNoteMainPathSummaryV2(
    {
      thesis: "A stable claim.",
      threeLineSummary: ["one", "two", "three"],
      distillationStatus: "confirmed",
      authorship: { user_confirmed: true },
      status: "active",
      boundaryOrCounterpoint: "Only holds in one constrained case."
    },
    {
      relationState: "loaded",
      explicitRelationCount: 1,
      wikilinkCount: 0,
      themeSignalCount: 1
    }
  );

  assert.equal(result.nextStep, "先创建项目");
  assert.match(result.summary, /先创建项目/);
});

test("main-path card relation badge counts only explicit relations", () => {
  const pane = createPane();
  pane.state = { notes: [] };
  const html = pane.renderPermanentNoteMainPathSectionV2(
    {
      id: "pn_1",
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
      explicitRelationCount: 0,
      wikilinkCount: 1,
      tagRelatedCount: 0,
      themeSignalCount: 1
    }
  );

  assert.match(html, /关系 0/);
  assert.match(html, /链接线索 1/);
});
