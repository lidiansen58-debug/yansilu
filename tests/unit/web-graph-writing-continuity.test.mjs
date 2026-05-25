import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("graph writing followup reuses the unified writing continuity entry when a matching project already exists", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/if \(cleanAction === "writing"\) \{([\s\S]*?)return true;\n  \}/);

  assert.ok(match, "expected graph writing followup handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const continuation = currentWritingContinuationEntry\("当前图谱切片"\);/);
  assert.match(fnBody, /if \(continuation\?\.projectId\) \{/);
  assert.match(fnBody, /await continueWritingProjectEntry\(continuation\.projectId, \{/);
  assert.match(fnBody, /openDraft: continuation\.action === "open-draft"/);
});
