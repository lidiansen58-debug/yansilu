import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing scaffold button stays continuity-aware while respecting project preflight readiness", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const canContinueProjectedProject = Boolean\(projectEntry\?\.projectId\) && Boolean\(projectEntry\?\.actionLabel\);/);
  assert.match(source, /const canGenerateScaffold = Boolean\(writingState\.project\?\.id\) && projectPreflightSummary\.level === "ready";/);
  assert.match(source, /createScaffoldButton\.disabled = !\(canGenerateScaffold \|\| canContinueProjectedProject\);/);
  assert.match(source, /projectPreflightSummary\.level === "needs_clarification"/);
  assert.match(source, /projectPreflightSummary\.level === "has_gaps"/);
});

test("writing scaffold handler reuses projected continuity before warning about a missing or unready project", async () => {
  const source = await readPrototypeAppSource();
  const match = source.match(/\$\("btnWritingCreateScaffold"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writing create-scaffold handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const projectPreflightSummary = describeWritingProjectPreflight\(writingState\.project\?\.preflight \|\| null\);/);
  assert.match(fnBody, /const continuation = !writingProjectId \? currentWritingContinuationEntry\("当前写作篮"\) : null;/);
  assert.match(fnBody, /const missingProjectLabel = String\(\$\("btnWritingCreateScaffold"\)\?\.textContent \|\| ""\)\.trim\(\);/);
  assert.match(fnBody, /if \(!writingProjectId && continuation\?\.projectId\) \{/);
  assert.match(fnBody, /await continueWritingProjectEntry\(continuation\.projectId, \{/);
  assert.match(fnBody, /if \(!writingProjectId\) return setStatus\(missingProjectLabel \|\| "先补写作材料", "warn"\);/);
  assert.match(fnBody, /if \(projectPreflightSummary\.level !== "ready"\) \{/);
  assert.match(fnBody, /projectPreflightSummary\.level === "needs_clarification"/);
  assert.match(fnBody, /先澄清项目关键问题，再生成草稿骨架。/);
  assert.match(fnBody, /projectPreflightSummary\.level === "has_gaps"/);
  assert.match(fnBody, /先补项目缺口，再生成草稿骨架。/);
  assert.match(fnBody, /先检查项目条件，再生成草稿骨架。/);
});
