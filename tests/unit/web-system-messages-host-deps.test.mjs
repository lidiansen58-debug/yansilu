import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSystemMessagesPrototypeHostDeps,
  createSystemMessagesPrototypeHostProvider
} from "../../apps/web/src/system-messages-host-deps.js";

test("system messages prototype host deps keeps shell-owned DOM collaborators in one mapping", () => {
  const host = {};
  const keys = [
    "$",
    "document",
    "getMessagesRef",
    "getSelectedMessageIdRef",
    "setSelectedMessageIdRef",
    "notes",
    "escapeHtml",
    "hideEditorHelper",
    "renderSystemMessages"
  ];
  for (const key of keys) host[key] = { key };

  const deps = buildSystemMessagesPrototypeHostDeps(host);

  assert.notEqual(deps, host);
  assert.deepEqual(Object.keys(deps), [
    "$",
    "document",
    "getMessages",
    "getSelectedMessageId",
    "setSelectedMessageId",
    "notes",
    "escapeHtml",
    "hideEditorHelper",
    "renderSystemMessages"
  ]);
  for (const key of ["$", "document", "notes", "escapeHtml", "hideEditorHelper", "renderSystemMessages"]) {
    assert.equal(deps[key], host[key]);
  }
});

test("system messages prototype host provider reads current state and normalizes selection writes", () => {
  let messages = [{ id: "old" }];
  let selectedMessageId = "old";
  const provider = createSystemMessagesPrototypeHostProvider(() => ({
    getMessagesRef: () => messages,
    getSelectedMessageIdRef: () => selectedMessageId,
    setSelectedMessageIdRef: (messageId) => {
      selectedMessageId = messageId;
    }
  }));

  const first = provider();
  assert.deepEqual(first.getMessages(), [{ id: "old" }]);
  messages = [{ id: "next" }];
  const second = provider();

  assert.notEqual(first, second);
  assert.deepEqual(second.getMessages(), [{ id: "next" }]);
  assert.equal(second.setSelectedMessageId(" next "), "next");
  assert.equal(selectedMessageId, "next");
});
