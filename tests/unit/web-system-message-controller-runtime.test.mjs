import test from "node:test";
import assert from "node:assert/strict";

import {
  handleSystemMessageActionForRuntime,
  openSystemMessageActionForRuntime,
  systemMessageById
} from "../../apps/web/src/system-message-controller.js";
import {
  systemMessageActionRoute
} from "../../apps/web/src/system-message-route-model.js";

function controllerHarness(overrides = {}) {
  const calls = [];
  const state = {
    messages: [
      { id: "ai", action: "open-ai-inbox", noteId: "note-1", read: false },
      { id: "note", action: "open-note", noteId: "note-2", read: false },
      { id: "missing", action: "open-note", noteId: "", read: false },
      { id: "workflow", action: "open-note-workflow", noteId: "note-3", read: false }
    ],
    selectedId: ""
  };
  return {
    calls,
    state,
    deps: {
      systemMessageActionRoute,
      aiInboxFiltersForSystemMessage: (message) => ({ sourceNoteId: message?.noteId || "" }),
      setAiInboxFilters: (filters) => calls.push(["setAiInboxFilters", filters]),
      resetAiInboxDetail: () => calls.push(["resetAiInboxDetail"]),
      closeSystemMessages: () => calls.push(["closeSystemMessages"]),
      activateModule: (moduleId) => calls.push(["activateModule", moduleId]),
      openAiInboxModule: async () => calls.push(["openAiInboxModule"]),
      setSettingsItem: (item, options) => calls.push(["setSettingsItem", item, options]),
      openNoteById: (noteId, options) => {
        calls.push(["openNoteById", noteId, options]);
        return noteId !== "gone";
      },
      openSystemMessageWorkflow: async (message) => {
        calls.push(["openSystemMessageWorkflow", message?.id || ""]);
        return message?.id !== "workflow-fail";
      },
      renderSystemMessages: () => calls.push(["renderSystemMessages"]),
      setStatus: (message, type) => calls.push(["setStatus", message, type]),
      setSelectedMessageId: (messageId) => {
        state.selectedId = messageId;
        calls.push(["setSelectedMessageId", messageId]);
      },
      markSystemMessageRead: (messages, messageId) =>
        messages.map((message) => (message.id === messageId ? { ...message, read: true } : message)),
      setMessages: (messages) => {
        state.messages = messages;
        calls.push(["setMessages", messages.map((message) => `${message.id}:${message.read}`)]);
      },
      persistSystemMessages: () => calls.push(["persistSystemMessages"]),
      ...overrides
    }
  };
}

test("system message route model describes supported action destinations", () => {
  assert.equal(systemMessageActionRoute("open-ai-inbox").kind, "ai-inbox");
  assert.equal(systemMessageActionRoute("open-settings-update").kind, "settings-update");
  assert.equal(systemMessageActionRoute("open-note").kind, "note");
  assert.equal(systemMessageActionRoute("open-note-workflow").kind, "workflow");
  assert.equal(systemMessageActionRoute("open-graph").kind, "workflow-entry");
  assert.equal(systemMessageActionRoute("unknown").kind, "");
});

test("system message controller opens AI inbox with message scoped filters", async () => {
  const { calls, deps } = controllerHarness();

  const result = await openSystemMessageActionForRuntime({
    message: { id: "ai", action: "open-ai-inbox", noteId: "note-1" },
    action: "open-ai-inbox"
  }, deps);

  assert.deepEqual(result, { handled: true, kind: "ai-inbox", messageId: "ai" });
  assert.deepEqual(calls.slice(0, 4), [
    ["setAiInboxFilters", { sourceNoteId: "note-1" }],
    ["resetAiInboxDetail"],
    ["closeSystemMessages"],
    ["activateModule", "aiInbox"]
  ]);
  assert.deepEqual(calls.at(-1)[0], "setStatus");
});

test("system message controller opens notes and guards missing targets", async () => {
  const { calls, deps } = controllerHarness();

  const opened = await openSystemMessageActionForRuntime({
    message: { id: "note", action: "open-note", noteId: "note-2" },
    action: "open-note"
  }, deps);

  assert.equal(opened.opened, true);
  assert.ok(calls.some((call) => call[0] === "openNoteById" && call[1] === "note-2"));
  assert.ok(calls.some((call) => call[0] === "activateModule" && call[1] === "explorer"));

  calls.length = 0;
  const missing = await openSystemMessageActionForRuntime({
    message: { id: "missing", action: "open-note", noteId: "" },
    action: "open-note"
  }, deps);

  assert.equal(missing.opened, false);
  assert.equal(calls.some((call) => call[0] === "openNoteById"), false);
  assert.equal(calls.at(-1)[2], "warn");
});

test("system message controller marks selected action read before routing", async () => {
  const { calls, state, deps } = controllerHarness();

  const result = await handleSystemMessageActionForRuntime({
    messages: state.messages,
    messageId: "workflow",
    action: "open-note-workflow"
  }, deps);

  assert.equal(result.kind, "workflow");
  assert.equal(state.selectedId, "workflow");
  assert.equal(systemMessageById(state.messages, "workflow").read, true);
  assert.deepEqual(calls.slice(0, 3), [
    ["setSelectedMessageId", "workflow"],
    ["setMessages", ["ai:false", "note:false", "missing:false", "workflow:true"]],
    ["persistSystemMessages"]
  ]);
  assert.ok(calls.some((call) => call[0] === "openSystemMessageWorkflow" && call[1] === "workflow"));
});

test("system message controller rerenders unknown actions without navigation", async () => {
  const { calls, deps } = controllerHarness();

  const result = await openSystemMessageActionForRuntime({
    message: { id: "unknown", action: "unknown" },
    action: "unknown"
  }, deps);

  assert.deepEqual(result, { handled: true, kind: "unknown", messageId: "unknown" });
  assert.deepEqual(calls, [["renderSystemMessages"]]);
});
