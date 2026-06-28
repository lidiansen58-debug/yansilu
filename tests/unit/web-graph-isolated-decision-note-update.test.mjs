import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphIsolatedDecisionNoteUpdate
} from "../../apps/web/src/graph-isolated-decision-note-update.js";

function upsertSection(body = "", heading = "", content = "") {
  return `${body.trimEnd()}\n\n## ${heading}\n\n${content}`.trimEnd();
}

const deps = {
  ensureEditableNoteBody: (body) => String(body || "").trimEnd(),
  graphUpsertMarkdownSection: upsertSection,
  graphIsolatedDecisionTitle: (mode) => mode === "hold" ? "暂存观察" : "保留独立"
};

test("graph isolated decision note update appends keep or hold note", () => {
  const result = buildGraphIsolatedDecisionNoteUpdate({
    note: { title: "Alpha", body: "# Alpha", thesis: "old" },
    mode: "hold",
    text: "wait for clearer claim"
  }, deps);

  assert.equal(result.decisionTitle, "暂存观察");
  assert.equal(result.nextThesis, "old");
  assert.match(result.nextBody, /## 关联整理备注/);
  assert.match(result.nextBody, /暂存观察：wait for clearer claim/);
});

test("graph isolated decision note update rewrites thesis and relation note", () => {
  const result = buildGraphIsolatedDecisionNoteUpdate({
    note: { title: "Alpha", body: "# Alpha", thesis: "old" },
    mode: "rewrite",
    text: "new central claim"
  }, {
    ...deps,
    graphIsolatedDecisionTitle: () => "重写中心判断"
  });

  assert.equal(result.decisionTitle, "重写中心判断");
  assert.equal(result.nextThesis, "new central claim");
  assert.match(result.nextBody, /## 一句话论点/);
  assert.match(result.nextBody, /new central claim/);
  assert.match(result.nextBody, /## 关联整理备注/);
  assert.match(result.nextBody, /已重写中心判断/);
});

test("graph isolated decision note update creates a fallback titled body", () => {
  const result = buildGraphIsolatedDecisionNoteUpdate({
    note: { title: "Untitled" },
    mode: "keep",
    text: "still useful alone"
  }, deps);

  assert.match(result.originalBody, /^# Untitled/);
  assert.match(result.nextBody, /保留独立：still useful alone/);
});
