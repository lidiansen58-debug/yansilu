import test from "node:test";
import assert from "node:assert/strict";
import {
  closeSystemMessagesDom,
  isSystemMessageModalOpenDom,
  openSystemMessagesDom,
  renderSystemMessagesDom
} from "../../apps/web/src/system-messages-controller.js";

function createElement() {
  const classes = new Set(["hidden"]);
  return {
    innerHTML: "",
    textContent: "",
    title: "",
    dataset: {},
    attributes: {},
    classList: {
      add: (...values) => values.forEach((value) => classes.add(value)),
      remove: (...values) => values.forEach((value) => classes.delete(value)),
      toggle: (value, force) => {
        if (force) classes.add(value);
        else classes.delete(value);
      },
      contains: (value) => classes.has(value)
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
  };
}

function systemMessageDeps(overrides = {}) {
  const elements = {
    systemMessagesButton: createElement(),
    btnSystemMessageMarkRead: createElement(),
    systemMessageList: createElement(),
    systemMessageModal: createElement(),
    systemMessageModalNote: createElement()
  };
  const state = {
    messages: [
      {
        id: "latest",
        title: "Latest",
        body: "Needs review",
        action: "open-ai-inbox",
        read: false,
        createdAt: "2026-06-22T00:00:00.000Z",
        artifactCount: 2
      },
      {
        id: "older",
        title: "Older",
        body: "Already read",
        action: "",
        read: true,
        createdAt: "2026-06-21T00:00:00.000Z"
      }
    ],
    selectedId: "missing",
    renderCount: 0,
    helperHidden: false
  };
  return {
    elements,
    state,
    deps: {
      $: (id) => elements[id] || null,
      document: { body: createElement() },
      getMessages: () => state.messages,
      getSelectedMessageId: () => state.selectedId,
      setSelectedMessageId: (id = "") => {
        state.selectedId = id;
      },
      notes: [],
      escapeHtml: (value = "") => String(value ?? ""),
      systemMessageActionLabel: (message) => (message.action ? "Review" : ""),
      systemMessageDisplayTitle: (message) => message.title,
      systemMessagePreviewText: (message) => message.body,
      systemMessageSubjectText: () => "",
      hideEditorHelper: () => {
        state.helperHidden = true;
      },
      renderSystemMessages: () => {
        state.renderCount += 1;
      },
      ...overrides
    }
  };
}

test("system messages controller renders unread state and normalizes selected message", () => {
  const { deps, elements, state } = systemMessageDeps();

  renderSystemMessagesDom(deps);

  assert.equal(state.selectedId, "latest");
  assert.equal(elements.systemMessagesButton.classList.contains("has-unread"), true);
  assert.equal(elements.btnSystemMessageMarkRead.disabled, false);
  assert.match(elements.systemMessageList.innerHTML, /data-system-message-id="latest"/);
  assert.doesNotMatch(elements.systemMessageList.innerHTML, /role="button"/);
  assert.match(elements.systemMessageList.innerHTML, /data-system-message-action="open-ai-inbox"/);
});

test("system messages controller opens modal and selects latest message when requested", () => {
  const { deps, elements, state } = systemMessageDeps();
  state.selectedId = "older";

  openSystemMessagesDom({ latestOnly: true }, deps);

  assert.equal(state.selectedId, "latest");
  assert.equal(state.helperHidden, true);
  assert.equal(elements.systemMessageModal.classList.contains("hidden"), false);
  assert.equal(state.renderCount, 1);
  assert.ok(elements.systemMessageModalNote.textContent.length > 0);
});

test("system messages controller closes modal and reports open state", () => {
  const { deps, elements } = systemMessageDeps();
  deps.document.body.classList.add("system-message-modal-open");
  elements.systemMessageModal.classList.remove("hidden");

  assert.equal(isSystemMessageModalOpenDom(deps), true);

  closeSystemMessagesDom(deps);

  assert.equal(elements.systemMessageModal.classList.contains("hidden"), true);
  assert.equal(deps.document.body.classList.contains("system-message-modal-open"), false);
  assert.equal(isSystemMessageModalOpenDom(deps), false);
});
