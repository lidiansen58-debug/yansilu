import test from "node:test";
import assert from "node:assert/strict";

import { describeWritingStrongModelStatus } from "../../apps/web/src/writing-center-flow.js";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing strong-model status keeps projected continuity out of the primary flow", () => {
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

  assert.equal(strongModel.status, "先创建项目");
  assert.equal(strongModel.buttonLabel, "先创建项目");
  assert.match(strongModel.hint, /先创建项目/);
  assert.doesNotMatch(strongModel.hint, /继续当前项目/);
});

test("writing strong-model button and handler require the current project before running analysis", async () => {
  const source = await readPrototypeAppSource();

  assert.doesNotMatch(source, /const canContinueProjectedStrongModel =\s*!hasProject/);
  assert.match(
    source,
    /strongModelButton\.disabled = writingState\.strongModelLoading \|\| strongModelBasketIds\.length === 0 \|\| !strongModelReady;/
  );

  const match = source.match(/\$\("btnWritingStrongModelAnalysis"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(match, "expected writing strong-model handler to exist");
  const fnBody = match[1];

  assert.doesNotMatch(fnBody, /currentWritingContinuationEntry\(/);
  assert.doesNotMatch(fnBody, /continueWritingProjectEntry\(/);
  assert.match(fnBody, /await prepareWritingStrongModelAnalysis\(\);/);
});

test("writing create-project primary action no longer opens an existing continuation", async () => {
  const source = await readPrototypeAppSource();
  const createFn = source.match(/async function createWritingProjectFromCurrentBasket\(\) \{([\s\S]*?)\n\}/);
  const handler = source.match(/\$\("btnWritingCreateProject"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(createFn, "expected createWritingProjectFromCurrentBasket() to exist");
  assert.ok(handler, "expected writing create-project handler to exist");
  assert.doesNotMatch(createFn[1], /currentWritingContinuationEntry\(/);
  assert.doesNotMatch(createFn[1], /continueWritingProjectEntry\(/);
  assert.doesNotMatch(handler[1], /currentWritingContinuationEntry\(/);
  assert.doesNotMatch(handler[1], /continueWritingProjectEntry\(/);
  assert.match(handler[1], /await createWritingProjectFromCurrentBasket\(\);/);
  assert.match(source, /if \(writingState\.project\?\.id\) \{/);
  assert.match(source, /createProjectButton\.disabled = hasProject \|\| !projectEntry\.canCreateProject;/);
  assert.match(source, /createProjectButton\.textContent = hasProject \? "项目已创建" : projectEntry\.actionLabel;/);
});
