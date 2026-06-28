import test from "node:test";
import assert from "node:assert/strict";

import {
  addSystemMessageForRuntime,
  markSystemMessagesReadForRuntime,
  resolveSystemMessageByDedupeKeyForRuntime,
  upsertSystemMessageForRuntime
} from "../../apps/web/src/system-messages-runtime-controller.js";
import {
  normalizeSystemMessage,
  upsertSystemMessageList
} from "../../apps/web/src/prototype-system-messages.js";

function runtimeHarness(initialMessages = [], selectedId = "") {
  const calls = [];
  const state = {
    messages: initialMessages,
    selectedId
  };
  return {
    calls,
    state,
    deps: {
      getMessages: () => state.messages,
      setMessages: (messages) => {
        calls.push(["set", messages.map((message) => message.id)]);
        state.messages = messages;
      },
      getSelectedMessageId: () => state.selectedId,
      setSelectedMessageId: (messageId) => {
        calls.push(["select", messageId]);
        state.selectedId = messageId;
      },
      normalizeSystemMessage,
      upsertSystemMessageList,
      limit: 3,
      persistSystemMessages: () => calls.push("persist"),
      renderSystemMessages: () => calls.push("render"),
      openSystemMessages: (options) => calls.push(["open", options]),
      now: () => "2026-06-28T00:00:00.000Z"
    }
  };
}

test("system messages runtime marks every message read and persists once", () => {
  const { calls, state, deps } = runtimeHarness([
    { id: "m1", read: false },
    { id: "m2", read: true }
  ]);

  const result = markSystemMessagesReadForRuntime(deps);

  assert.deepEqual(result.map((message) => message.read), [true, true]);
  assert.deepEqual(state.messages.map((message) => message.read), [true, true]);
  assert.deepEqual(calls.slice(-2), ["persist", "render"]);
});

test("system messages runtime adds newest message, selects it, and opens on interrupt", () => {
  const { calls, state, deps } = runtimeHarness([{ id: "old", title: "Old" }]);

  const message = addSystemMessageForRuntime({ id: "new", title: "New" }, { interrupt: true }, deps);

  assert.equal(message.id, "new");
  assert.deepEqual(state.messages.map((item) => item.id), ["new", "old"]);
  assert.equal(state.selectedId, "new");
  assert.deepEqual(calls.slice(-3), ["persist", "render", ["open", { latestOnly: true }]]);
});

test("system messages runtime upserts by dedupe key and preserves read state by default", () => {
  const { state, deps } = runtimeHarness([
    { id: "existing", dedupeKey: "task:1", title: "Old", read: true, createdAt: "2026-06-01T00:00:00.000Z" }
  ], "existing");

  const message = upsertSystemMessageForRuntime({ id: "incoming", dedupeKey: "task:1", title: "New" }, {}, deps);

  assert.equal(message.id, "existing");
  assert.equal(message.title, "New");
  assert.equal(message.read, true);
  assert.deepEqual(state.messages.map((item) => item.id), ["existing"]);
});

test("system messages runtime resolves active dedupe message without touching resolved ones", () => {
  const { calls, state, deps } = runtimeHarness([
    { id: "active", dedupeKey: "workflow:1", read: false, resolvedAt: "" },
    { id: "done", dedupeKey: "workflow:2", read: true, resolvedAt: "2026-06-01T00:00:00.000Z" }
  ]);

  const resolved = resolveSystemMessageByDedupeKeyForRuntime("workflow:1", deps);
  const alreadyResolved = resolveSystemMessageByDedupeKeyForRuntime("workflow:2", deps);

  assert.equal(resolved.id, "active");
  assert.equal(resolved.read, true);
  assert.equal(resolved.resolvedAt, "2026-06-28T00:00:00.000Z");
  assert.equal(alreadyResolved.id, "done");
  assert.equal(state.messages.find((message) => message.id === "active").resolvedAt, "2026-06-28T00:00:00.000Z");
  assert.deepEqual(calls.slice(-2), ["persist", "render"]);
});
