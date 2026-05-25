import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { graphNextActionForSummary } from "../../apps/web/src/graph-followup.js";

function appSource() {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
}

test("graph next action names already-basket writing entry explicitly", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    writingEntryPlan: {
      mode: "already-in-basket",
      candidateCount: 2,
      addedCount: 0,
      hasBasket: true
    }
  });

  assert.equal(nextAction.action, "writing");
  assert.equal(nextAction.title, "下一步：继续当前写作篮");
  assert.equal(nextAction.actionLabel, "继续当前写作篮");
  assert.match(nextAction.note, /已经都在写作篮中|继续当前写作篮推进/);
});

test("graph next action previews auto-prefill when the visible slice is small", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    writingEntryPlan: {
      mode: "prefill-visible",
      candidateCount: 2,
      addedCount: 2,
      hasBasket: false
    }
  });

  assert.equal(nextAction.action, "writing");
  assert.equal(nextAction.title, "下一步：带入 2 条永久笔记");
  assert.equal(nextAction.actionLabel, "带入写作篮");
  assert.match(nextAction.note, /一起带入写作篮/);
});

test("graph next action keeps the user in the current basket when there are no new candidates", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    writingEntryPlan: {
      mode: "no-candidates",
      candidateCount: 0,
      addedCount: 0,
      hasBasket: true
    }
  });

  assert.equal(nextAction.action, "writing");
  assert.equal(nextAction.title, "下一步：继续当前写作篮");
  assert.equal(nextAction.actionLabel, "继续当前写作篮");
  assert.match(nextAction.note, /暂时没有适合新增到写作篮的永久笔记/);
  assert.match(nextAction.note, /直接继续当前写作篮/);
});

test("graph next action previews manual picking when the visible slice is too large to auto-prefill", () => {
  const nextAction = graphNextActionForSummary({
    hasNodes: true,
    hasEdges: true,
    writingEntryPlan: {
      mode: "pick-manually",
      candidateCount: 6,
      addedCount: 6,
      hasBasket: false
    }
  });

  assert.equal(nextAction.action, "writing");
  assert.equal(nextAction.title, "下一步：先挑 2-5 条加入写作篮");
  assert.equal(nextAction.actionLabel, "先挑 2-5 条");
  assert.match(nextAction.note, /6 条可用永久笔记/);
});

test("graph panel passes the current writing entry plan into graph next-action planning", () => {
  const source = appSource();

  assert.match(source, /const graphWritingPlan = graphWritingFollowupEntryPlan\(\{/);
  assert.match(source, /writingEntryPlan: graphWritingPlan/);
});
