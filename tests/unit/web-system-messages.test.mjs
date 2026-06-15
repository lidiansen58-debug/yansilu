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
  assert.match(html, /id="systemMessagesButton"[^>]*title="[^"]*AI/);
  assert.match(html, /data-action="open-system-messages"/);
  assert.doesNotMatch(html, /data-module="aiInbox"/);
  assert.doesNotMatch(html, /data-module="distillation"/);
  assert.match(html, /id="systemMessageModal"/);
  assert.match(html, /aria-describedby="systemMessageModalNote"/);
  assert.match(html, /id="systemMessageList"/);
  assert.match(html, /id="systemMessageList"[^>]*aria-label="系统消息列表"[^>]*aria-live="polite"/);
  assert.match(html, /id="systemMessageDetail"[^>]*aria-label="系统消息详情"[^>]*aria-live="polite"/);
  assert.match(html, /id="btnSystemMessageOpenAiInbox"/);
  assert.ok(html.includes("查看 AI 建议复核"));
  assert.ok(html.includes("返回待审结果时会进入系统消息中的 AI 建议复核"));
  assert.doesNotMatch(html, /输出进入系统消息中的 AI 建议复核/);
  assert.doesNotMatch(html, /AI 待办/);
  assert.match(html, /AI 建议、关系提醒和系统提示会保留在这里/);
  assert.match(html, /\.rail-btn\.has-unread::before/);
  assert.match(html, /\.system-message-layout/);
  assert.match(html, /\.system-message-detail-card/);
  assert.match(html, /\.system-message-item\.is-unread/);
  assert.match(html, /\.system-message-item\.is-selected/);
  assert.match(html, /\.system-message-title:focus-visible/);
  assert.match(html, /\.system-message-actions \.mini-btn\s*\{/);
});

test("system messages are persisted, readable, and actionable", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");

  assert.match(source, /const SYSTEM_MESSAGES_KEY = "yansilu:system-messages:v1"/);
  assert.match(source, /function readStoredSystemMessages\(\)/);
  assert.match(source, /const aiInboxFilters = item\.aiInboxFilters/);
  assert.match(source, /\.\.\.\(aiInboxFilters \? \{ aiInboxFilters \} : \{\}\)/);
  assert.match(source, /function addSystemMessage\(message = \{\}, \{ interrupt = false \} = \{\}\)/);
  assert.match(source, /if \(interrupt\) openSystemMessages\(\{ latestOnly: true \}\)/);
  assert.match(source, /if \(message\.action === "open-ai-inbox"\) return "查看 AI 建议复核"/);
  assert.match(source, /let selectedSystemMessageId = systemMessages\[0\]\?\.id \|\| ""/);
  assert.match(source, /data-system-message-select/);
  assert.match(source, /selectedSystemMessageId = String\(selectButton\.dataset\.systemMessageSelect \|\| ""\)\.trim\(\)/);
  assert.match(source, /function markSystemMessagesRead\(\)/);
  assert.match(source, /const systemMessageLabel = "系统消息与 AI 建议"/);
  assert.match(source, /运行笔记 AI 分析、图谱初判或计划任务后，待审建议会先到这里/);
  assert.match(source, /没有采纳前，它不会改动笔记或图谱/);
  assert.match(source, /button\.setAttribute\("aria-label", unreadCount \? `\$\{systemMessageLabel\}，\$\{unreadCount\} 条未读` : systemMessageLabel\)/);
  assert.match(source, /markReadButton\.disabled = unreadCount === 0/);
  assert.match(source, /systemMessagesButton"\)\?\.addEventListener\("click"/);
  assert.match(source, /data-system-message-action/);
  assert.match(source, /action === "open-ai-inbox"/);
  assert.match(source, /function aiInboxFiltersForSystemMessage\(message = \{\}\)/);
  assert.match(source, /const messageFilters = aiInboxFiltersForSystemMessage\(message\)/);
});

test("system message AI review action defaults to global pending filters", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const start = source.indexOf("function aiInboxFiltersForSystemMessage(message = {}) {");
  const end = source.indexOf("function scheduledTaskReviewArtifactCount", start);

  assert.ok(start >= 0 && end > start, "expected aiInboxFiltersForSystemMessage() to exist");
  const helper = source.slice(start, end);

  assert.doesNotMatch(helper, /return null/);
  assert.doesNotMatch(helper, /\.\.\.aiInboxState\.filters/);
  assert.match(helper, /view: String\(filters\.view \|\| "pending"\)\.trim\(\) \|\| "pending"/);
  assert.match(helper, /type: String\(filters\.type \|\| "all"\)\.trim\(\) \|\| "all"/);
  assert.match(helper, /privacyMode: String\(filters\.privacyMode \|\| ""\)\.trim\(\)/);
  assert.match(helper, /sourceNoteId: hasSourceNote/);
});

test("system message modal can be dismissed with Escape", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");

  assert.match(source, /function isSystemMessageModalOpen\(\)/);
  assert.match(source, /e\.key === "Escape" && isSystemMessageModalOpen\(\)/);
  assert.match(source, /closeSystemMessages\(\);\s*e\.preventDefault\(\);/);
});

test("system message footer opens global pending AI review instead of stale filters", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const start = source.indexOf('$("btnSystemMessageOpenAiInbox")?.addEventListener("click"');
  const end = source.indexOf('$("systemMessageModal")?.addEventListener("click"', start);

  assert.ok(start >= 0 && end > start, "expected system message footer AI review handler");
  const handler = source.slice(start, end);

  assert.match(handler, /aiInboxState\.filters = normalizeAiInboxFilters\(\{/);
  assert.match(handler, /view: "pending"/);
  assert.match(handler, /type: "all"/);
  assert.match(handler, /privacyMode: ""/);
  assert.match(handler, /sourceNoteId: ""/);
  assert.match(handler, /aiInboxState\.detail = null/);
  assert.match(handler, /aiInboxState\.selectedArtifactId = ""/);
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
  assert.match(handler, /openSystemMessages\(\{ latestOnly: true \}\)/);
  assert.doesNotMatch(handler, /activateModule\("aiInbox"\)/);
  assert.match(handler, /\{ interrupt: true \}/);
});

test("scheduled task runs create a system message for review artifacts", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const start = source.indexOf("async function runDueScheduledTasksFromUi() {");
  const end = source.indexOf("function normalizeOptionalNumber", start);

  assert.ok(start >= 0 && end > start, "expected runDueScheduledTasksFromUi() to exist");
  const handler = source.slice(start, end);

  assert.match(source, /function scheduledTaskReviewArtifactCount\(summary = \{\}\)/);
  assert.match(handler, /const artifactCount = scheduledTaskReviewArtifactCount\(summary\)/);
  assert.match(handler, /if \(artifactCount > 0\)/);
  assert.match(handler, /title: "计划任务产生了待审建议"/);
  assert.match(handler, /action: "open-ai-inbox"/);
  assert.match(handler, /actionLabel: "查看 AI 建议复核"/);
  assert.match(handler, /aiInboxFilters: \{ view: "pending", sourceNoteId: "" \}/);
  assert.match(handler, /\{ interrupt: true \}/);
});

test("writing strong-model analysis persists review artifacts into system messages", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const start = source.indexOf("async function prepareWritingStrongModelAnalysis() {");
  const end = source.indexOf("async function scaffoldBundleForProject", start);

  assert.ok(start >= 0 && end > start, "expected prepareWritingStrongModelAnalysis() to exist");
  const handler = source.slice(start, end);

  assert.match(handler, /persistArtifacts: true/);
  assert.doesNotMatch(handler, /persistArtifacts: false/);
  assert.doesNotMatch(handler, /executeRemoteModel: true/);
  assert.doesNotMatch(handler, /modelResponse:/);
  assert.match(handler, /const artifactCount = Number\(result\?\.result\?\.storedArtifactIds\?\.length/);
  assert.match(handler, /if \(artifactCount > 0\)/);
  assert.match(handler, /title: "写作分析产生了待审建议"/);
  assert.match(handler, /action: "open-ai-inbox"/);
  assert.match(handler, /actionLabel: "查看 AI 建议复核"/);
  assert.match(handler, /aiInboxFilters: \{ view: "pending", type: "all", sourceNoteId: "" \}/);
  assert.match(handler, /\{ interrupt: true \}/);
});
