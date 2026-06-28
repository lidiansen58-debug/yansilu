import test from "node:test";
import assert from "node:assert/strict";

import {
  closeSystemMessagesShell,
  createSystemMessagesShellController,
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

test("system messages shell routes close through injected host deps", () => {
  const classes = new Set(["system-message-modal-open"]);
  const modalClasses = new Set();
  const host = {
    $: (id) => id === "systemMessageModal"
      ? { classList: { add: (value) => modalClasses.add(value) } }
      : null,
    document: {
      body: {
        classList: {
          remove: (value) => classes.delete(value)
        }
      }
    }
  };

  closeSystemMessagesShell(host);

  assert.equal(classes.has("system-message-modal-open"), false);
  assert.equal(modalClasses.has("hidden"), true);
});

test("system messages shell controller routes all modal actions through current host deps", () => {
  const calls = [];
  const modalClasses = new Set(["hidden"]);
  const bodyClasses = new Set();
  const host = {
    $: (id) => {
      calls.push(["select", id]);
      if (id === "systemMessageModal") {
        return {
          classList: {
            add: (value) => modalClasses.add(value),
            remove: (value) => modalClasses.delete(value),
            contains: (value) => modalClasses.has(value)
          }
        };
      }
      return null;
    },
    document: {
      body: {
        classList: {
          add: (value) => bodyClasses.add(value),
          remove: (value) => bodyClasses.delete(value)
        }
      }
    },
    getMessages: () => [],
    getSelectedMessageId: () => "",
    setSelectedMessageId: (messageId) => calls.push(["select-message", messageId]),
    notes: [],
    escapeHtml: (value) => String(value ?? ""),
    hideEditorHelper: () => calls.push(["hide-helper"])
  };
  const controller = createSystemMessagesShellController({
    hostProvider: () => host
  });

  controller.renderSystemMessages();
  controller.openSystemMessages();
  assert.equal(controller.isSystemMessageModalOpen(), true);
  controller.closeSystemMessages();

  assert.equal(modalClasses.has("hidden"), true);
  assert.equal(bodyClasses.has("system-message-modal-open"), false);
  assert.ok(calls.some(([kind]) => kind === "select"));
});
