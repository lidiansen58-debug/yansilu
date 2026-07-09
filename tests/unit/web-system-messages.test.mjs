import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  aiInboxFiltersForSystemMessage,
  globalPendingAiInboxFilters,
  markSystemMessageRead,
  normalizeSystemMessage,
  noteAnalysisSystemMessageForResult,
  scheduledTaskSystemMessageForArtifacts,
  systemMessageActionLabel,
  systemMessageActionRoute,
  systemMessageDisplayTitle,
  writingAnalysisSystemMessageForResult
} from "../../apps/web/src/prototype-system-messages.js";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

const REVIEW_ACTION_LABEL = "\u5904\u7406\u5f85\u786e\u8ba4\u5efa\u8bae";
const OPEN_WORKFLOW_LABEL = "\u6253\u5f00\u5e76\u5904\u7406";
const NOTE_TITLE = "\u5173\u7cfb\u6574\u7406\u5165\u53e3";
const ISOLATED_TITLE = "\u6c38\u4e45\u7b14\u8bb0\u8fd8\u6ca1\u6709\u8fdb\u5165\u56fe\u8c31";
const ISOLATED_SUFFIX = "\u8fd8\u6ca1\u5173\u8054";

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

test("prototype exposes a system messages entry and history modal", () => {
  const html = readRepoFile("apps/web/src/prototype.html");
  const css = readRepoFile("apps/web/src/prototype.css");

  assert.match(html, /id="systemMessagesButton"/);
  assert.match(html, /data-action="open-system-messages"/);
  assert.doesNotMatch(html, /data-module="aiInbox"/);
  assert.match(html, /id="systemMessageModal"/);
  assert.match(html, /id="systemMessageList"/);
  assert.doesNotMatch(html, /id="systemMessageDetail"/);
  assert.match(html, /id="btnSystemMessageOpenAiInbox"/);
  assert.match(css, /\.rail-btn\.has-unread::before/);
  assert.match(css, /\.system-message-layout/);
  assert.match(css, /\.system-message-row-foot/);
  assert.match(css, /body\.system-message-modal-open \.editor-helper/);
  assert.match(css, /\.system-message-item\.is-unread/);
  assert.match(css, /\.system-message-item\.is-selected/);
});

test("system messages are normalized, readable, and actionable", () => {
  const message = normalizeSystemMessage({
    id: "message-1",
    action: "open-ai-inbox",
    noteId: "note-1",
    aiInboxFilters: { view: "reviewed", type: "field_suggestion" },
    workflowRoute: { focus: "graph", graph_selection_kind: "node" }
  });

  assert.equal(message.id, "message-1");
  assert.equal(message.noteId, "note-1");
  assert.equal(message.workflowRoute.focus, "graph");
  assert.equal(message.workflowRoute.graphSelectionKind, "node");
  assert.equal(systemMessageActionLabel(message), REVIEW_ACTION_LABEL);
  assert.equal(systemMessageActionLabel({ ...message, resolvedAt: "2026-01-01T00:00:00.000Z" }), "");
  assert.equal(systemMessageActionLabel({ action: "open-note-workflow" }), OPEN_WORKFLOW_LABEL);
});

test("system message titles and filters derive stable user-facing state", () => {
  const title = systemMessageDisplayTitle(
    {
      title: ISOLATED_TITLE,
      noteId: "note-1"
    },
    [{ id: "note-1", title: NOTE_TITLE }]
  );
  const filters = aiInboxFiltersForSystemMessage({ noteId: "note-1", aiInboxFilters: { view: "pending", type: "all" } });

  assert.equal(title, `${NOTE_TITLE} ${ISOLATED_SUFFIX}`);
  assert.deepEqual(filters, {
    view: "pending",
    type: "all",
    privacyMode: "",
    sourceNoteId: "note-1",
    limit: 50
  });
  assert.deepEqual(globalPendingAiInboxFilters(), {
    view: "pending",
    type: "all",
    privacyMode: "",
    sourceNoteId: "",
    limit: 50
  });
});

test("system message action routes describe modal side effects without reading prototype handlers", () => {
  assert.deepEqual(systemMessageActionRoute("open-ai-inbox"), {
    kind: "ai-inbox",
    statusType: "ok",
    statusMessage: "\u5df2\u6253\u5f00\u8fd9\u6761\u6d88\u606f\u5bf9\u5e94\u7684\u5f85\u786e\u8ba4\u5efa\u8bae"
  });
  assert.equal(systemMessageActionRoute("open-settings-update").kind, "settings-update");
  assert.equal(systemMessageActionRoute("open-note").kind, "note");
  assert.equal(systemMessageActionRoute("open-note-workflow").kind, "workflow");
  assert.equal(systemMessageActionRoute("open-graph").kind, "workflow-entry");
  assert.equal(systemMessageActionRoute("open-writing").kind, "workflow-entry");
  assert.equal(systemMessageActionRoute("unknown").kind, "");
});

test("system message read state updates one message without touching siblings", () => {
  const messages = markSystemMessageRead([
    { id: "a", read: false },
    { id: "b", read: false }
  ], "b");

  assert.deepEqual(messages, [
    { id: "a", read: false },
    { id: "b", read: true }
  ]);
});

test("relation-network system messages keep a note-specific action route", () => {
  const source = readRepoFile("apps/web/src/prototype-note-state-helpers.js");
  const helperStart = source.indexOf("export function relationNetworkWorkflowMessageForNote(note = null, overview = {}, {");
  const nextExport = source.indexOf("\nexport function", helperStart + 1);
  const helperEnd = nextExport > helperStart ? nextExport : source.length;
  const helper = source.slice(helperStart, helperEnd);

  assert.match(helper, /note\.title \|\| note\.id/);
  assert.match(helper, /action: "open-note-workflow"/);
  assert.match(helper, /workflowRoute/);
  assert.doesNotMatch(helper, /action: "open-ai-inbox"/);
});

test("system message note actions report missing notes instead of optimistic success", () => {
  const route = systemMessageActionRoute("open-note");

  assert.equal(route.successStatus, "\u5df2\u6253\u5f00\u8fd9\u6761\u7cfb\u7edf\u6d88\u606f\u5bf9\u5e94\u7684\u7b14\u8bb0");
  assert.equal(route.failureStatus, "\u6ca1\u6709\u627e\u5230\u8fd9\u6761\u7cfb\u7edf\u6d88\u606f\u5bf9\u5e94\u7684\u7b14\u8bb0");
});

test("AI analysis writes an interrupting system message when suggestions are created", () => {
  const message = noteAnalysisSystemMessageForResult({
    noteId: "note-1",
    noteTitle: NOTE_TITLE,
    now: () => 123,
    result: {
      reviewItems: { storedArtifactIds: ["a1", "a2"] },
      analysis: { relationCandidates: [{}] }
    }
  });

  assert.equal(message.id, "ai-analysis:note-1:123");
  assert.equal(message.title, `${NOTE_TITLE} \u627e\u5230\u53ef\u80fd\u5173\u7cfb`);
  assert.match(message.body, /\u53ef\u80fd\u5173\u7cfb/);
  assert.equal(message.action, "open-ai-inbox");
  assert.equal(message.actionLabel, "\u786e\u8ba4\u5173\u7cfb\u5efa\u8bae");
  assert.equal(message.artifactCount, 2);
  assert.equal(message.aiInboxFilters.sourceNoteId, "note-1");
});

test("generic scheduled task artifacts do not create system messages", () => {
  const message = scheduledTaskSystemMessageForArtifacts(3, { now: () => 456 });

  assert.equal(message, null);
});

test("writing strong-model analysis persists review artifacts into system messages", () => {
  const artifactMessage = writingAnalysisSystemMessageForResult({
    projectId: "wp_1",
    noteIds: ["n1", "n2"],
    model: "strong_model",
    artifactCount: 2,
    now: () => 789
  });
  const requestMessage = writingAnalysisSystemMessageForResult({
    projectId: "wp_1",
    noteIds: ["n1", "n2"],
    model: "strong_model",
    artifactCount: 0,
    now: () => 790
  });

  assert.equal(artifactMessage.id, "writing-ai-analysis:wp_1:789");
  assert.equal(artifactMessage.title, "wp_1 \u53ef\u4ee5\u7ee7\u7eed\u6574\u7406\u6210\u4e3b\u9898");
  assert.equal(artifactMessage.action, "open-ai-inbox");
  assert.equal(artifactMessage.actionLabel, "\u67e5\u770b\u4e3b\u9898\u5efa\u8bae");
  assert.deepEqual(artifactMessage.aiInboxFilters, {
    view: "pending",
    type: "all",
    privacyMode: "",
    sourceNoteId: "",
    limit: 50
  });
  assert.equal(requestMessage, null);
});
