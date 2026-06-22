import test from "node:test";
import assert from "node:assert/strict";

import {
  handleMarkSystemMessagesRead,
  handleOpenAllAiInboxFromSystemMessages,
  handleSystemMessageModalClick,
  handleSystemMessagesButtonClick,
  readAllSystemMessages,
  systemMessageById
} from "../../apps/web/src/system-message-events.js";

function createDeps(overrides = {}) {
  const calls = [];
  const state = {
    messages: [
      { id: "m1", action: "open-ai-inbox", noteId: "n1", read: false },
      { id: "m2", action: "open-note", noteId: "n2", read: false }
    ],
    selectedId: ""
  };
  return {
    calls,
    state,
    deps: {
      getMessages: () => state.messages,
      setMessages: (messages) => {
        state.messages = messages;
        calls.push(["setMessages", messages.map((message) => `${message.id}:${message.read}`)]);
      },
      getSelectedMessageId: () => state.selectedId,
      setSelectedMessageId: (messageId) => {
        state.selectedId = messageId;
        calls.push(["setSelectedMessageId", messageId]);
      },
      markSystemMessageRead: (messages, messageId) =>
        messages.map((message) => (message.id === messageId ? { ...message, read: true } : message)),
      persistSystemMessages: () => calls.push(["persistSystemMessages"]),
      renderSystemMessages: () => calls.push(["renderSystemMessages"]),
      openSystemMessages: () => calls.push(["openSystemMessages"]),
      closeSystemMessages: () => calls.push(["closeSystemMessages"]),
      systemMessageActionRoute: (action) => {
        if (action === "open-ai-inbox") return { kind: "ai-inbox", statusMessage: "Inbox opened", statusType: "ok" };
        if (action === "open-note") return { kind: "note", successStatus: "Note opened", failureStatus: "Missing note" };
        if (action === "open-note-workflow") return { kind: "workflow", successStatus: "Workflow opened", failureStatus: "Workflow failed" };
        return { kind: "" };
      },
      aiInboxFiltersForSystemMessage: (message) => ({ sourceNoteId: message?.noteId || "" }),
      globalPendingAiInboxFilters: () => ({ view: "pending" }),
      setAiInboxFilters: (filters) => calls.push(["setAiInboxFilters", filters]),
      resetAiInboxDetail: () => calls.push(["resetAiInboxDetail"]),
      activateModule: (moduleName) => calls.push(["activateModule", moduleName]),
      openAiInboxModule: async () => calls.push(["openAiInboxModule"]),
      setSettingsItem: (item, options) => calls.push(["setSettingsItem", item, options]),
      openNoteById: (noteId, options) => {
        calls.push(["openNoteById", noteId, options]);
        return true;
      },
      openSystemMessageWorkflow: async (message) => {
        calls.push(["openSystemMessageWorkflow", message.id]);
        return true;
      },
      setStatus: (text, tone) => calls.push(["setStatus", text, tone]),
      ...overrides
    }
  };
}

function targetWithClosest(selector, dataset) {
  return {
    closest: (requested) => (requested === selector ? { dataset } : null)
  };
}

test("system message event helpers read messages without mutating siblings", () => {
  const messages = [
    { id: "a", read: false },
    { id: "b", read: true }
  ];

  assert.equal(systemMessageById(messages, "b").id, "b");
  assert.equal(systemMessageById(messages, "missing"), null);
  assert.deepEqual(readAllSystemMessages(messages), [
    { id: "a", read: true },
    { id: "b", read: true }
  ]);
  assert.equal(messages[0].read, false);
});

test("system messages button event opens the modal entry", () => {
  const { calls, deps } = createDeps();
  const eventCalls = [];

  handleSystemMessagesButtonClick({
    preventDefault: () => eventCalls.push("preventDefault"),
    stopPropagation: () => eventCalls.push("stopPropagation")
  }, deps);

  assert.deepEqual(eventCalls, ["preventDefault", "stopPropagation"]);
  assert.deepEqual(calls, [["openSystemMessages"]]);
});

test("mark all system messages read persists and rerenders", () => {
  const { calls, deps, state } = createDeps();

  handleMarkSystemMessagesRead(deps);

  assert.equal(state.messages.every((message) => message.read), true);
  assert.deepEqual(calls.at(-3), ["persistSystemMessages"]);
  assert.deepEqual(calls.at(-2), ["renderSystemMessages"]);
  assert.deepEqual(calls.at(-1), ["setStatus", "系统消息已全部标记为已读", "ok"]);
});

test("global AI inbox button resets filters and opens inbox", async () => {
  const { calls, deps } = createDeps();

  await handleOpenAllAiInboxFromSystemMessages(deps);

  assert.deepEqual(calls, [
    ["setAiInboxFilters", { view: "pending" }],
    ["resetAiInboxDetail"],
    ["closeSystemMessages"],
    ["activateModule", "aiInbox"],
    ["openAiInboxModule"],
    ["setStatus", "已打开全部待确认建议", "ok"]
  ]);
});

test("system message modal selection marks one message read", async () => {
  const { calls, deps, state } = createDeps();

  await handleSystemMessageModalClick({
    target: targetWithClosest("[data-system-message-select]", { systemMessageSelect: "m2" })
  }, deps);

  assert.equal(state.selectedId, "m2");
  assert.equal(state.messages.find((message) => message.id === "m2").read, true);
  assert.deepEqual(calls.at(-2), ["persistSystemMessages"]);
  assert.deepEqual(calls.at(-1), ["renderSystemMessages"]);
});

test("system message AI inbox action uses message scoped filters", async () => {
  const { calls, deps } = createDeps();

  await handleSystemMessageModalClick({
    target: targetWithClosest("[data-system-message-action]", {
      systemMessageId: "m1",
      systemMessageAction: "open-ai-inbox"
    })
  }, deps);

  assert.ok(calls.some((call) => call[0] === "setAiInboxFilters" && call[1].sourceNoteId === "n1"));
  assert.ok(calls.some((call) => call[0] === "activateModule" && call[1] === "aiInbox"));
  assert.deepEqual(calls.at(-1), ["setStatus", "Inbox opened", "ok"]);
});

test("system message note and workflow actions route through host deps", async () => {
  const { calls, deps } = createDeps();

  await handleSystemMessageModalClick({
    target: targetWithClosest("[data-system-message-action]", {
      systemMessageId: "m2",
      systemMessageAction: "open-note"
    })
  }, deps);

  assert.ok(calls.some((call) => call[0] === "openNoteById" && call[1] === "n2"));
  assert.ok(calls.some((call) => call[0] === "activateModule" && call[1] === "explorer"));
  assert.deepEqual(calls.at(-1), ["setStatus", "Note opened", "ok"]);

  calls.length = 0;
  await handleSystemMessageModalClick({
    target: targetWithClosest("[data-system-message-action]", {
      systemMessageId: "m1",
      systemMessageAction: "open-note-workflow"
    })
  }, deps);

  assert.deepEqual(calls.at(-2), ["openSystemMessageWorkflow", "m1"]);
  assert.deepEqual(calls.at(-1), ["setStatus", "Workflow opened", "ok"]);
});
