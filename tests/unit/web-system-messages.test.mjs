import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function extractBlockBody(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `expected signature to exist: ${signature}`);
  let depth = 1;
  const bodyStart = start + signature.length;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(bodyStart, index);
  }
  assert.fail(`expected block body to close: ${signature}`);
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
  assert.ok(html.includes("查看全部待确认建议"));
  assert.ok(html.includes("返回结果会进入系统消息，等待你复核后再进入笔记或图谱"));
  assert.doesNotMatch(html, /输出进入系统消息中的 AI 建议复核/);
  assert.doesNotMatch(html, /AI 待办/);
  assert.match(html, /这里汇总需要你确认的关系、问题和写作建议/);
  assert.match(html, /\.rail-btn\.has-unread::before/);
  assert.match(html, /\.system-message-layout/);
  assert.match(html, /\.system-message-detail-card/);
  assert.match(html, /body\.system-message-modal-open \.editor-helper/);
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
  assert.match(source, /if \(message\.action === "open-ai-inbox"\) return "查看待确认建议"/);
  assert.match(source, /if \(message\.action === "open-graph"\) return "查看候选并确认关系"/);
  assert.match(source, /if \(message\.action === "open-writing"\) return "继续整理主题"/);
  assert.match(source, /function systemMessageDisplayTitle\(message = \{\}\)/);
  assert.match(source, /title === "孤立笔记发现了潜在关联"/);
  assert.match(source, /`\$\{subject\} 发现了潜在关联`/);
  assert.match(source, /title === "永久笔记还没有进入图谱"/);
  assert.match(source, /`\$\{subject\} 还没有进入图谱`/);
  assert.match(source, /let selectedSystemMessageId = systemMessages\[0\]\?\.id \|\| ""/);
  assert.match(source, /data-system-message-select/);
  assert.match(source, /selectedSystemMessageId = String\(selectButton\.dataset\.systemMessageSelect \|\| ""\)\.trim\(\)/);
  assert.match(source, /function markSystemMessagesRead\(\)/);
  assert.match(source, /hideEditorHelper\(\);\s*document\.body\?\.classList\.add\("system-message-modal-open"\);\s*modal\.classList\.remove\("hidden"\)/);
  assert.match(source, /document\.body\?\.classList\.remove\("system-message-modal-open"\);\s*\$\("systemMessageModal"\)\?\.classList\.add\("hidden"\)/);
  assert.match(source, /const systemMessageLabel = "系统消息与 AI 建议"/);
  assert.match(source, /AI 分析、图谱扫描或计划任务产生待审内容后，会显示在这里/);
  assert.match(source, /采纳前不会改动笔记或图谱/);
  assert.match(source, /button\.setAttribute\("aria-label", unreadCount \? `\$\{systemMessageLabel\}，\$\{unreadCount\} 条未读` : systemMessageLabel\)/);
  assert.match(source, /markReadButton\.disabled = unreadCount === 0/);
  assert.match(source, /systemMessagesButton"\)\?\.addEventListener\("click"/);
  assert.match(source, /data-system-message-action/);
  assert.match(source, /action === "open-ai-inbox"/);
  assert.match(source, /action === "open-graph" \|\| action === "open-writing"/);
  assert.match(source, /function aiInboxFiltersForSystemMessage\(message = \{\}\)/);
  assert.match(source, /const messageFilters = aiInboxFiltersForSystemMessage\(message\)/);
});

test("relation-network system messages name the isolated permanent note", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const helper = extractBlockBody(source, "function relationNetworkWorkflowMessageForNote(note = null, overview = {}) {");

  assert.match(helper, /const noteTitle = String\(note\.title \|\| note\.id \|\| "未命名笔记"\)/);
  assert.match(helper, /title: `\$\{noteTitle\} 还没有进入图谱`/);
  assert.match(helper, /actionLabel: "关联一条笔记"/);
  assert.doesNotMatch(helper, /title: "永久笔记还没有进入图谱"/);
});

test("system message graph and writing actions route through workflow metadata", async () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const handlerBody = extractBlockBody(source, '$("systemMessageModal")?.addEventListener("click", async (event) => {');
  const calls = [];
  const statuses = [];
  const context = {
    selectedSystemMessageId: "",
    systemMessages: [
      { id: "message-graph", action: "open-graph", noteId: "note-graph", read: false, workflowRoute: { focus: "graph" } },
      { id: "message-writing", action: "open-writing", read: false, workflowRoute: { focus: "writing", indexCardId: "idx_1" } }
    ],
    aiInboxState: {},
    closeSystemMessages: () => calls.push("closeSystemMessages"),
    activateModule: (module) => calls.push(`activateModule:${module}`),
    openNoteById: () => false,
    persistSystemMessages: () => calls.push("persistSystemMessages"),
    openAiInboxModule: async () => calls.push("openAiInboxModule"),
    aiInboxFiltersForSystemMessage: () => null,
    openSystemMessageWorkflow: async (message) => {
      calls.push(["openSystemMessageWorkflow", message.id, message.workflowRoute?.focus]);
      return true;
    },
    setStatus: (message, type) => statuses.push({ message, type }),
    renderSystemMessages: () => calls.push("renderSystemMessages")
  };
  const handler = vm.runInNewContext(`(async (event) => {${handlerBody}})`, context);
  const makeEvent = (messageId, action) => ({
    target: {
      id: "",
      closest: (selector) =>
        selector === "[data-system-message-action]"
          ? { dataset: { systemMessageId: messageId, systemMessageAction: action } }
          : null
    }
  });

  await handler(makeEvent("message-graph", "open-graph"));
  await handler(makeEvent("message-writing", "open-writing"));

  assert.deepEqual(calls, [
    "persistSystemMessages",
    ["openSystemMessageWorkflow", "message-graph", "graph"],
    "persistSystemMessages",
    ["openSystemMessageWorkflow", "message-writing", "writing"]
  ]);
  assert.equal(context.systemMessages[0].read, true);
  assert.equal(context.systemMessages[1].read, true);
  assert.equal(statuses.length, 2);
  assert.ok(statuses.every((item) => item.type === "ok"));
});

test("system message note actions report missing notes instead of optimistic success", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const openNoteStart = source.indexOf("function openNoteById(id, options = {}) {");
  const openNoteEnd = source.indexOf("function openNoteRelationEditor", openNoteStart);
  const openNoteHelper = source.slice(openNoteStart, openNoteEnd);

  assert.ok(openNoteStart >= 0 && openNoteEnd > openNoteStart, "expected openNoteById() to exist");
  assert.match(openNoteHelper, /const note = state\.notes\.find\(\(n\) => n\.id === id\)/);
  assert.match(openNoteHelper, /if \(!note\) return false/);

  const modalStart = source.indexOf('$("systemMessageModal")?.addEventListener("click"');
  const modalEnd = source.indexOf('$("distillationPanel")?.addEventListener', modalStart);
  const modalHandler = source.slice(modalStart, modalEnd);

  assert.ok(modalStart >= 0 && modalEnd > modalStart, "expected system message modal handler");
  assert.match(modalHandler, /if \(action === "open-note"\)/);
  assert.match(modalHandler, /const opened = openNoteById\(message\.noteId, \{ preferTitleSelection: false \}\)/);
  assert.match(modalHandler, /if \(opened\) \{[\s\S]*?closeSystemMessages\(\);[\s\S]*?activateModule\("explorer"\);[\s\S]*?\}/);
  assert.match(modalHandler, /setStatus\(opened \? "[^"]+" : "[^"]+", opened \? "ok" : "warn"\)/);
});

test("system message note action keeps the modal open when the target note is missing", async () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const handlerBody = extractBlockBody(source, '$("systemMessageModal")?.addEventListener("click", async (event) => {');
  const calls = [];
  const statuses = [];
  const context = {
    selectedSystemMessageId: "",
    systemMessages: [{ id: "message-1", action: "open-note", noteId: "missing-note", read: false }],
    aiInboxState: {},
    closeSystemMessages: () => calls.push("closeSystemMessages"),
    activateModule: (module) => calls.push(`activateModule:${module}`),
    openNoteById: (noteId) => {
      calls.push(`openNoteById:${noteId}`);
      return false;
    },
    persistSystemMessages: () => calls.push("persistSystemMessages"),
    openAiInboxModule: async () => calls.push("openAiInboxModule"),
    aiInboxFiltersForSystemMessage: () => null,
    openSystemMessageWorkflow: async () => false,
    setStatus: (message, type) => statuses.push({ message, type }),
    renderSystemMessages: () => calls.push("renderSystemMessages")
  };
  const handler = vm.runInNewContext(`(async (event) => {${handlerBody}})`, context);
  const actionButton = {
    dataset: {
      systemMessageId: "message-1",
      systemMessageAction: "open-note"
    }
  };
  const event = {
    target: {
      id: "",
      closest: (selector) => (selector === "[data-system-message-action]" ? actionButton : null)
    }
  };

  await handler(event);

  assert.deepEqual(calls, ["persistSystemMessages", "openNoteById:missing-note"]);
  assert.equal(context.systemMessages[0].read, true);
  assert.deepEqual(statuses, [{ message: "没有找到这条系统消息对应的笔记", type: "warn" }]);
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
  assert.match(handler, /产生了待确认建议/);
  assert.match(handler, /包含潜在关联/);
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
  assert.match(handler, /title: "计划任务产生了待确认建议"/);
  assert.match(handler, /action: "open-ai-inbox"/);
  assert.match(handler, /actionLabel: "查看待确认建议"/);
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
  assert.match(handler, /title: "写作分析产生了待确认建议"/);
  assert.match(handler, /action: "open-ai-inbox"/);
  assert.match(handler, /actionLabel: "查看待确认建议"/);
  assert.match(handler, /aiInboxFilters: \{ view: "pending", type: "all", sourceNoteId: "" \}/);
  assert.match(handler, /\{ interrupt: true \}/);
});
