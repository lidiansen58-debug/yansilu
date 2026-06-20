import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("graph writing followup keeps graph-scoped success copy for projected draft continuity", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const match = source.match(/if \(cleanAction === "writing"\) \{([\s\S]*?)return true;\r?\n  \}/);

  assert.ok(match, "expected graph writing followup handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /continuation\.action === "open-draft"/);
  assert.match(fnBody, /已从图谱打开当前草稿：\$\{continuation\.projectId\}/);
});
