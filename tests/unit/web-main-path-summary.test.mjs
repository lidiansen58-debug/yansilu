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
  assert.match(result.summary, /写成一句可复用的判断/);
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

test("main-path summary reuses writing readiness hint after note is connected", () => {
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

  assert.equal(result.nextStep, "可创建写作项目");
  assert.match(result.summary, /补更多主题线索后再做强模型分析/);
});
