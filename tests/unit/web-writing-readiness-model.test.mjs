import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveBasketWritingReadiness,
  deriveNoteWritingReadiness,
  describeProjectPreflight
} from "../../apps/web/src/writing-readiness.js";

test("note writing readiness blocks notes without authorship confirmation", () => {
  const readiness = deriveNoteWritingReadiness(
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

test("note writing readiness stays basket-ready before boundary and relation are complete", () => {
  const readiness = deriveNoteWritingReadiness(
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

test("note writing readiness becomes project-ready once boundary and relation exist", () => {
  const readiness = deriveNoteWritingReadiness(
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

test("note writing readiness stays basket-ready when there are only wikilinks but no explicit relations", () => {
  const readiness = deriveNoteWritingReadiness(
    {
      status: "active",
      distillationStatus: "confirmed",
      authorship: { user_confirmed: true },
      boundaryOrCounterpoint: "Only holds in this constrained case.",
      body: "# Note\n\n[[Linked Note]]"
    },
    {
      relationState: "loaded",
      explicitRelationCount: 0,
      wikilinkCount: 1,
      themeSignalCount: 1
    }
  );

  assert.equal(readiness.level, "basket_ready");
  assert.match(readiness.hint, /显式关系/);
});

test("note writing readiness becomes strong-model-ready once theme signals are richer", () => {
  const readiness = deriveNoteWritingReadiness(
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

test("basket writing readiness blocks unconfirmed authorship before anything else", () => {
  const notesById = new Map([
    ["n1", { id: "n1", authorship: { user_confirmed: false }, status: "active", distillationStatus: "confirmed", body: "# A" }]
  ]);

  const readiness = deriveBasketWritingReadiness(["n1"], (id) => notesById.get(id), {});
  assert.equal(readiness.level, "blocked_authorship");
});

test("basket writing readiness stays basket-ready when boundary or relation is still missing", () => {
  const notesById = new Map([
    ["n1", { id: "n1", authorship: { user_confirmed: true }, status: "active", distillationStatus: "confirmed", body: "# A" }],
    ["n2", { id: "n2", authorship: { user_confirmed: true }, status: "active", distillationStatus: "confirmed", body: "# B\n\nBoundary: only in this case.", boundaryOrCounterpoint: "Only in this case." }]
  ]);

  const readiness = deriveBasketWritingReadiness(["n1", "n2"], (id) => notesById.get(id), { n1: 0, n2: 0 });
  assert.equal(readiness.level, "basket_ready");
  assert.match(readiness.status, /写作篮/);
});

test("basket writing readiness becomes project-ready before strong-model-ready when theme signal is still thin", () => {
  const notesById = new Map([
    ["n1", { id: "n1", authorship: { user_confirmed: true }, status: "active", distillationStatus: "confirmed", body: "# A\n\nBoundary: yes.", boundaryOrCounterpoint: "yes" }],
    ["n2", { id: "n2", authorship: { user_confirmed: true }, status: "active", distillationStatus: "confirmed", body: "# B\n\nBoundary: yes.", boundaryOrCounterpoint: "yes" }]
  ]);

  const readiness = deriveBasketWritingReadiness(["n1", "n2"], (id) => notesById.get(id), { n1: 1, n2: 1 });
  assert.equal(readiness.level, "project_ready");
});

test("basket writing readiness becomes strong-model-ready once relation and theme signals are strong enough", () => {
  const notesById = new Map([
    ["n1", { id: "n1", authorship: { user_confirmed: true }, status: "active", distillationStatus: "confirmed", body: "# A\n\n[[B]] #theme", boundaryOrCounterpoint: "yes" }],
    ["n2", { id: "n2", authorship: { user_confirmed: true }, status: "active", distillationStatus: "confirmed", body: "# B\n\n[[A]] #theme", boundaryOrCounterpoint: "yes" }]
  ]);

  const readiness = deriveBasketWritingReadiness(["n1", "n2"], (id) => notesById.get(id), { n1: 1, n2: 1 });
  assert.equal(readiness.level, "strong_model_ready");
});

test("project preflight description reports ready status clearly", () => {
  const summary = describeProjectPreflight({
    status: "ready",
    warningCount: 0
  });

  assert.equal(summary.level, "ready");
  assert.match(summary.status, /结构准备较完整/);
});

test("project preflight description reports warning count when attention is still needed", () => {
  const summary = describeProjectPreflight({
    status: "needs_attention",
    warningCount: 3
  });

  assert.equal(summary.level, "needs_attention");
  assert.match(summary.hint, /3 项需要注意/);
});
