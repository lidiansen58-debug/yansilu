import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

test("prototype exposes a system messages entry and history modal", () => {
  const html = readRepoFile("apps/web/src/prototype.html");

  assert.match(html, /id="systemMessagesButton"/);
  assert.match(html, /data-action="open-system-messages"/);
  assert.match(html, /id="systemMessageModal"/);
  assert.match(html, /id="systemMessageList"/);
  assert.match(html, /id="btnSystemMessageOpenAiInbox"/);
  assert.match(html, /AI 建议、关系提醒和系统提示会保留在这里/);
  assert.match(html, /\.rail-btn\.has-unread::before/);
  assert.match(html, /\.system-message-item\.is-unread/);
});

test("system messages are persisted, readable, and actionable", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");

  assert.match(source, /const SYSTEM_MESSAGES_KEY = "yansilu:system-messages:v1"/);
  assert.match(source, /function readStoredSystemMessages\(\)/);
  assert.match(source, /function addSystemMessage\(message = \{\}, \{ interrupt = false \} = \{\}\)/);
  assert.match(source, /if \(interrupt\) openSystemMessages\(\{ latestOnly: true \}\)/);
  assert.match(source, /function markSystemMessagesRead\(\)/);
  assert.match(source, /systemMessagesButton"\)\?\.addEventListener\("click"/);
  assert.match(source, /data-system-message-action/);
  assert.match(source, /action === "open-ai-inbox"/);
});

test("AI analysis writes an interrupting system message when suggestions are created", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const start = source.indexOf('  if (reason === "run-note-ai-analysis") {');
  const end = source.indexOf('  if (reason === "open-note-ai-inbox") {', start);

  assert.ok(start >= 0 && end > start, "expected run-note-ai-analysis handler");
  const handler = source.slice(start, end);

  assert.match(handler, /const artifactCount = Number/);
  assert.match(handler, /if \(artifactCount > 0\)/);
  assert.match(handler, /const relationCount = Number\(result\?\.analysis\?\.relationCandidates\?\.length \|\| 0\)/);
  assert.match(handler, /AI 产生了待审建议/);
  assert.match(handler, /包含潜在关联建议/);
  assert.match(handler, /action: "open-ai-inbox"/);
  assert.match(handler, /\{ interrupt: true \}/);
});
