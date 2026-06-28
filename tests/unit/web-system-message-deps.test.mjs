import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSystemMessageEventDeps,
  buildSystemMessagesRuntimeDeps,
  createSystemMessagePrototypeDepsProviders,
  createSystemMessageStateAccessors
} from "../../apps/web/src/system-message-deps.js";

test("system message deps expose normalized mutable message state accessors", () => {
  let messages = [{ id: "old" }];
  let selectedMessageId = "old";
  const accessors = createSystemMessageStateAccessors({
    getMessagesRef: () => messages,
    setMessagesRef: (next) => {
      messages = next;
    },
    getSelectedMessageIdRef: () => selectedMessageId,
    setSelectedMessageIdRef: (next) => {
      selectedMessageId = next;
    }
  });

  assert.deepEqual(accessors.getMessages(), [{ id: "old" }]);
  assert.deepEqual(accessors.setMessages("bad"), []);
  assert.deepEqual(messages, []);
  assert.equal(accessors.setSelectedMessageId(" next "), "next");
  assert.equal(selectedMessageId, "next");
});

test("system message event deps combine state accessors and host actions", () => {
  const calls = [];
  const stateAccessors = {
    getMessages: () => [{ id: "m1" }],
    setMessages: (messages) => calls.push(["messages", messages]),
    getSelectedMessageId: () => "m1",
    setSelectedMessageId: (messageId) => calls.push(["selected", messageId])
  };
  const deps = buildSystemMessageEventDeps({
    stateAccessors,
    closeSystemMessages: () => calls.push(["close"]),
    setStatus: (text, tone) => calls.push(["status", text, tone])
  });

  deps.setSelectedMessageId("m2");
  deps.closeSystemMessages();
  deps.setStatus("done", "ok");
  assert.equal(deps.getSelectedMessageId(), "m1");
  assert.deepEqual(calls, [
    ["selected", "m2"],
    ["close"],
    ["status", "done", "ok"]
  ]);
});

test("system message runtime deps carry normalized state and runtime helpers", () => {
  const deps = buildSystemMessagesRuntimeDeps({
    stateAccessors: createSystemMessageStateAccessors({
      getMessagesRef: () => [],
      setMessagesRef: () => {},
      getSelectedMessageIdRef: () => "",
      setSelectedMessageIdRef: () => {}
    }),
    normalizeSystemMessage: (message) => ({ ...message, normalized: true }),
    upsertSystemMessageList: (messages) => messages,
    limit: 5,
    persistSystemMessages: () => true,
    renderSystemMessages: () => "rendered",
    openSystemMessages: () => "opened"
  });

  assert.equal(deps.limit, 5);
  assert.deepEqual(deps.normalizeSystemMessage({ id: "m1" }), { id: "m1", normalized: true });
  assert.equal(deps.persistSystemMessages(), true);
  assert.equal(deps.renderSystemMessages(), "rendered");
  assert.equal(deps.openSystemMessages(), "opened");
});

test("system message prototype deps providers share current normalized state", () => {
  let messages = [{ id: "old" }];
  let selectedMessageId = "old";
  const calls = [];
  const providers = createSystemMessagePrototypeDepsProviders(() => ({
    getMessagesRef: () => messages,
    setMessagesRef: (next) => {
      messages = next;
    },
    getSelectedMessageIdRef: () => selectedMessageId,
    setSelectedMessageIdRef: (next) => {
      selectedMessageId = next;
    },
    closeSystemMessages: () => calls.push("close"),
    normalizeSystemMessage: (message) => ({ ...message, normalized: true }),
    upsertSystemMessageList: (items) => items,
    limit: 3
  }));

  const eventDeps = providers.eventDeps();
  const runtimeDeps = providers.runtimeDeps();

  assert.deepEqual(eventDeps.getMessages(), [{ id: "old" }]);
  assert.equal(eventDeps.setSelectedMessageId(" next "), "next");
  assert.equal(selectedMessageId, "next");
  assert.deepEqual(runtimeDeps.setMessages("bad"), []);
  assert.deepEqual(messages, []);
  assert.equal(runtimeDeps.limit, 3);
  assert.deepEqual(runtimeDeps.normalizeSystemMessage({ id: "m1" }), { id: "m1", normalized: true });
  eventDeps.closeSystemMessages();
  assert.deepEqual(calls, ["close"]);
});
