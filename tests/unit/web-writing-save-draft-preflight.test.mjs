import test from "node:test";
import assert from "node:assert/strict";

import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing save-draft button respects project preflight readiness", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const canSaveDraft = Boolean\(writingState\.scaffold\?\.id\) && projectPreflightSummary\.level === "ready";/);
  assert.match(source, /saveDraftButton\.disabled = !canSaveDraft;/);
  assert.match(source, /projectEntry\?\.projectId && projectEntry\?\.actionLabel/);
  assert.match(source, /projectPreflightSummary\.level === "needs_clarification"/);
  assert.match(source, /projectPreflightSummary\.level === "has_gaps"/);
});

test("writing save-draft handler blocks draft creation until project preflight is ready", async () => {
  const source = await readPrototypeAppSource();
  const match = source.match(/\$\("btnWritingSaveDraft"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writing save-draft handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const missingScaffoldLabel = String\(\$\("btnWritingSaveDraft"\)\?\.textContent \|\| ""\)\.trim\(\);/);
  assert.match(fnBody, /if \(!writingState\.scaffold \|\| !String\(writingState\.scaffoldMarkdown \|\| ""\)\.trim\(\)\) \{/);
  assert.match(fnBody, /return setStatus\(missingScaffoldLabel \|\| "先生成草稿骨架", "warn"\);/);
  assert.match(fnBody, /const projectPreflightSummary = describeWritingProjectPreflight\(writingState\.project\?\.preflight \|\| null\);/);
  assert.match(fnBody, /if \(writingState\.project\?\.id && projectPreflightSummary\.level !== "ready"\) \{/);
  assert.match(fnBody, /setStatus\(projectPreflightSummary\.hint \|\| "先补项目条件，再保存草稿。", "warn"\)/);
});
