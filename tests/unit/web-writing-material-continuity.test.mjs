import test from "node:test";
import assert from "node:assert/strict";

import { describeWritingMaterialStatus } from "../../apps/web/src/writing-center-flow.js";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing material status reuses projected project continuity before a project is reopened", () => {
  const material = describeWritingMaterialStatus({
    readinessLevel: "strong_model_ready",
    readinessStatus: "可进行强模型分析",
    readinessHint: "当前材料已经到强模型分析前的就绪阶段。",
    hasProject: false,
    projectEntryProjectId: "wp_existing",
    projectEntryActionLabel: "继续当前项目"
  });

  assert.equal(material.status, "先继续当前项目");
  assert.match(material.hint, /继续当前项目/);
});

test("writing material status card passes projected continuity into the helper", async () => {
  const source = await readPrototypeAppSource();

  assert.match(
    source,
    /const projectEntry =\s*\(!hasProject && currentWritingContinuationEntry\("当前写作篮"\)\) \|\|\s*describeWritingProjectEntryState\(\{[\s\S]*?const materialStatus = describeWritingMaterialStatus\(\{/ 
  );
  assert.match(source, /const materialStatus = describeWritingMaterialStatus\(\{/);
  assert.match(source, /projectEntryProjectId: hasProject \? "" : String\(projectEntry\?\.projectId \|\| ""\)\.trim\(\),/);
  assert.match(source, /projectEntryActionLabel: hasProject \? "" : String\(projectEntry\?\.actionLabel \|\| ""\)\.trim\(\)/);
});
