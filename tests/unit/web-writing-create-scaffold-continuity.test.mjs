import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource } from "./copy-source-helpers.mjs";

test("writing scaffold button stays enabled when the current basket already maps to a projected continuity target", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /const canContinueProjectedProject = Boolean\(projectEntry\?\.projectId\) && Boolean\(projectEntry\?\.actionLabel\);/);
  assert.match(source, /createScaffoldButton\.disabled = !\(writingState\.project\?\.id \|\| canContinueProjectedProject\);/);
});

test("writing scaffold handler reuses projected continuity before warning about a missing project", async () => {
  const source = await readPrototypeAppSource();
  const match = source.match(/\$\("btnWritingCreateScaffold"\)\?\.addEventListener\("click", async \(\) => \{([\s\S]*?)\n\}\);/);

  assert.ok(match, "expected writing create-scaffold handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const continuation = !writingProjectId \? currentWritingContinuationEntry\("当前写作篮"\) : null;/);
  assert.match(fnBody, /if \(!writingProjectId && continuation\?\.projectId\) \{/);
  assert.match(fnBody, /await continueWritingProjectEntry\(continuation\.projectId, \{/);
  assert.match(fnBody, /continuation\.action === "resume-scaffold"/);
  assert.match(fnBody, /continuation\.action === "resume-project"/);
  assert.match(fnBody, /if \(!writingProjectId\) return setStatus\("请先创建项目", "warn"\);/);
});
