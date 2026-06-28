import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSystemMessagesPrototypeHostDeps
} from "../../apps/web/src/system-messages-host-deps.js";

test("system messages prototype host deps keeps shell-owned DOM collaborators in one mapping", () => {
  const host = {};
  const keys = [
    "$",
    "document",
    "getMessages",
    "getSelectedMessageId",
    "setSelectedMessageId",
    "notes",
    "escapeHtml",
    "hideEditorHelper",
    "renderSystemMessages"
  ];
  for (const key of keys) host[key] = { key };

  const deps = buildSystemMessagesPrototypeHostDeps(host);

  assert.notEqual(deps, host);
  assert.deepEqual(Object.keys(deps), keys);
  for (const key of keys) {
    assert.equal(deps[key], host[key]);
  }
});
