import test from "node:test";
import assert from "node:assert/strict";

import {
  createSystemMessagesDomDeps
} from "../../apps/web/src/system-messages-shell.js";

test("system messages shell keeps host deps and injects display helpers", () => {
  const host = {
    $: () => null,
    document: { body: {} },
    getMessages: () => [],
    getSelectedMessageId: () => "",
    setSelectedMessageId: () => {},
    notes: [{ id: "note-1" }],
    escapeHtml: (value) => String(value ?? ""),
    hideEditorHelper: () => {}
  };

  const deps = createSystemMessagesDomDeps(host);

  assert.equal(deps.$, host.$);
  assert.equal(deps.document, host.document);
  assert.equal(deps.getMessages, host.getMessages);
  assert.equal(deps.notes, host.notes);
  assert.equal(typeof deps.systemMessageActionLabel, "function");
  assert.equal(typeof deps.systemMessageDisplayTitle, "function");
  assert.equal(typeof deps.systemMessagePreviewText, "function");
  assert.equal(typeof deps.systemMessageSubjectText, "function");
});
