import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

test("Yijing rich demo startup lands in the graph after seeding", () => {
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const start = source.indexOf("async function importYijingRichAcceptanceDemo");
  const end = source.indexOf("async function importSmartNotesProductThinkingDemo", start);

  assert.ok(start >= 0 && end > start, "expected importYijingRichAcceptanceDemo() to exist");
  const handler = source.slice(start, end);

  assert.match(handler, /resetGraphDemoPresentationState\(\)/);
  assert.match(handler, /await refreshDirectoryGraph\(\)/);
  assert.match(handler, /if \(startup\) \{\s*activateModule\("graph"\);\s*\}/);
  assert.doesNotMatch(handler, /if \(startup\) activateModule\("explorer"\)/);
});
