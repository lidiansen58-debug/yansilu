import test from "node:test";
import assert from "node:assert/strict";

import { describeWritingStrongModelStatus } from "../../apps/web/src/writing-center-flow.js";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing strong-model status reuses projected project continuity before a project is reopened", () => {
  const strongModel = describeWritingStrongModelStatus({
    hasProject: false,
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "strong_model_ready",
    readinessHint: "当前材料已经到强模型分析前的就绪阶段。",
    projectEntryProjectId: "wp_existing",
    projectEntryActionLabel: "继续当前项目",
    projectPreflightLevel: "unknown",
    projectPreflightChecksLength: 0,
    strongModelReady: false
  });

  assert.equal(strongModel.status, "先继续当前项目");
  assert.equal(strongModel.buttonLabel, "先继续当前项目");
  assert.match(strongModel.hint, /继续当前项目/);
});

test("writing strong-model button and handler reuse projected continuity before running analysis", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const canContinueProjectedStrongModel =/);
  assert.match(source, /basketReadiness\.level === "strong_model_ready"/);
  assert.match(
    source,
    /strongModelButton\.disabled = writingState\.strongModelLoading \|\| strongModelBasketIds\.length === 0 \|\| !\(strongModelReady \|\| canContinueProjectedStrongModel\);/
  );

  const match = source.match(/\$\("btnWritingStrongModelAnalysis"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(match, "expected writing strong-model handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const continuation = !writingState\.project\?\.id \? currentWritingContinuationEntry\("当前写作篮"\) : null;/);
  assert.match(fnBody, /const basketReadiness = currentWritingBasketReadiness\(\);/);
  assert.match(fnBody, /if \(continuation\?\.projectId && basketReadiness\.level === "strong_model_ready"\) \{/);
  assert.match(fnBody, /await continueWritingProjectEntry\(continuation\.projectId, \{/);
  assert.match(fnBody, /await prepareWritingStrongModelAnalysis\(\);/);
});
