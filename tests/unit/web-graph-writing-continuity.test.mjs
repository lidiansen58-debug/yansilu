import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function repoSource() {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  return fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
}

test("graph writing followup reuses the projected writing continuity entry when a matching project already exists", () => {
  const source = repoSource();
  const match = source.match(/if \(cleanAction === "writing"\) \{([\s\S]*?)return true;\r?\n  \}/);

  assert.ok(match, "expected graph writing followup handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /const continuation = graphWritingContinuationEntry\(graphBasketNoteIds, "当前图谱切片"\);/);
  assert.match(fnBody, /if \(continuation\?\.projectId\) \{/);
  assert.match(fnBody, /await continueWritingProjectEntry\(continuation\.projectId, \{/);
  assert.match(fnBody, /openDraft: continuation\.action === "open-draft"/);
});

test("graph writing followup keeps action-specific failure copy for continuity actions", () => {
  const source = repoSource();
  const match = source.match(/if \(cleanAction === "writing"\) \{([\s\S]*?)return true;\r?\n  \}/);

  assert.ok(match, "expected graph writing followup handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /catch \(error\) \{/);
  assert.match(fnBody, /continuation\.action === "open-draft"[\s\S]*已从图谱打开当前草稿|已从图谱回到草稿骨架|已从图谱继续当前项目/);
  assert.match(fnBody, /从图谱进入写作中心失败：\$\{String\(error\?\.message \|\| error\)\}/);
});

test("graph writing followup stops before opening the writing center when no candidate note is ready", () => {
  const source = repoSource();
  const match = source.match(/if \(cleanAction === "writing"\) \{([\s\S]*?)return true;\r?\n  \}/);

  assert.ok(match, "expected graph writing followup handler to exist");
  const fnBody = match[1];

  assert.match(fnBody, /if \(plan\.mode === "no-candidates" && !plan\.hasBasket\) \{/);
  assert.match(fnBody, /setStatus\(plan\.statusMessage, "warn"\);/);
});

test("graph next-action flow computes projected continuity from the visible writing candidates", () => {
  const source = repoSource();

  assert.match(source, /function graphWritingContinuationEntry\(candidateNoteIds = \[\], scopeLabel = "当前图谱切片"\) \{/);
  assert.match(source, /const projectedEntry = planWritingBasketEntry\(\{\s*existingNoteIds: parseWritingBasketIds\(\),\s*incomingNoteIds: candidateNoteIds\s*\}\);/);
  assert.match(source, /const continuation = graphWritingContinuationEntry\(graphBasketNoteIds, "当前图谱切片"\);/);
  assert.match(source, /if \(continuation\?\.projectId\) \{/);
});
