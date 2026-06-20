import test from "node:test";
import assert from "node:assert/strict";

import { describeWritingMaterialStatus } from "../../apps/web/src/writing-center-flow.js";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing material status keeps projected project continuity out of the primary flow", () => {
  const material = describeWritingMaterialStatus({
    readinessLevel: "strong_model_ready",
    readinessStatus: "可进行强模型分析",
    readinessHint: "当前材料已经到强模型分析前的就绪阶段。",
    hasProject: false,
    projectEntryProjectId: "wp_existing",
    projectEntryActionLabel: "继续当前项目"
  });

  assert.equal(material.status, "先创建项目");
  assert.match(material.hint, /先创建项目/);
  assert.doesNotMatch(material.hint, /继续当前项目/);
});

test("writing material status card uses project-entry readiness without implicit continuation", async () => {
  const source = await readPrototypeAppSource();
  const statusStripBlock = source.slice(
    source.indexOf("function renderWritingStatusStrip()"),
    source.indexOf("function renderWritingFlowSteps(")
  );

  assert.match(statusStripBlock, /const projectEntry = describeWritingProjectEntryState\(\{/);
  assert.doesNotMatch(statusStripBlock, /currentWritingContinuationEntry\("当前写作篮"\)\) \|\|/);
  assert.match(statusStripBlock, /const materialStatus = describeWritingMaterialStatus\(\{/);
});
