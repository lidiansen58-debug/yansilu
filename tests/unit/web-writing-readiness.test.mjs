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
  assert.match(readiness.status, /创建写作项目/);
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
  assert.match(readiness.status, /强模型分析/);
});
