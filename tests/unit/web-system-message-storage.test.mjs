import test from "node:test";
import assert from "node:assert/strict";

import {
  persistSystemMessagesForRuntime,
  readStoredSystemMessagesForRuntime
} from "../../apps/web/src/system-message-storage.js";

function memoryStorage(initial = {}) {
  const values = { ...initial };
  return {
    values,
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      values[key] = value;
    }
  };
}

test("system message storage reads normalized messages within the configured limit", () => {
  const storage = memoryStorage({
    messages: JSON.stringify([{ id: "a" }, { id: "b" }, { id: "c" }])
  });

  assert.deepEqual(readStoredSystemMessagesForRuntime({
    storage,
    key: "messages",
    limit: 2,
    normalizeSystemMessage: (message) => ({ ...message, read: Boolean(message.read) })
  }), [
    { id: "a", read: false },
    { id: "b", read: false }
  ]);
});

test("system message storage returns an empty list for invalid or non-array payloads", () => {
  assert.deepEqual(readStoredSystemMessagesForRuntime({
    storage: memoryStorage({ messages: "{bad json" }),
    key: "messages"
  }), []);
  assert.deepEqual(readStoredSystemMessagesForRuntime({
    storage: memoryStorage({ messages: JSON.stringify({ id: "not-list" }) }),
    key: "messages"
  }), []);
});

test("system message storage persists bounded message lists", () => {
  const storage = memoryStorage();

  assert.equal(persistSystemMessagesForRuntime([{ id: "a" }, { id: "b" }, { id: "c" }], {
    storage,
    key: "messages",
    limit: 2
  }), true);
  assert.equal(storage.values.messages, JSON.stringify([{ id: "a" }, { id: "b" }]));
});

test("system message storage reports failed writes without throwing", () => {
  const storage = {
    setItem: () => {
      throw new Error("quota");
    }
  };

  assert.equal(persistSystemMessagesForRuntime([{ id: "a" }], { storage, key: "messages" }), false);
});
