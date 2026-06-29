import test from "node:test";
import assert from "node:assert/strict";
import { installStartupAutoOpenEventBindings } from "../../apps/web/src/startup-auto-open-event-bindings.js";
import { installDirtyTabsBeforeUnloadEventBindings } from "../../apps/web/src/dirty-tabs-beforeunload-event-bindings.js";
import { installSettingsFeedbackEventBindings } from "../../apps/web/src/settings-feedback-event-bindings.js";
import { installEditorShellEventBindings } from "../../apps/web/src/editor-shell-event-bindings.js";
import { installSaveAiSuggestionRouteEventBindings } from "../../apps/web/src/save-ai-suggestion-route-events.js";

function button(dataset = {}) {
  const listeners = {};
  return {
    dataset,
    disabled: false,
    clicked: false,
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    async click(event = {}) {
      this.clicked = true;
      return listeners.click?.({
        preventDefault() {},
        stopPropagation() {},
        ...event
      });
    }
  };
}

function registry(elements = {}) {
  return (id) => elements[id] || null;
}

test("startup and beforeunload shell bindings stay outside prototype app", () => {
  const documentEvents = [];
  installStartupAutoOpenEventBindings({
    documentRef: {
      addEventListener: (...args) => documentEvents.push(args)
    },
    suppressStartupAutoOpen: () => documentEvents.push(["suppressed"])
  });

  assert.deepEqual(documentEvents.map(([type, , capture]) => [type, capture]), [
    ["pointerdown", true],
    ["keydown", true]
  ]);
  documentEvents[0][1]();
  assert.deepEqual(documentEvents.at(-1), ["suppressed"]);

  let beforeUnloadHandler = null;
  installDirtyTabsBeforeUnloadEventBindings({
    windowRef: {
      addEventListener(type, handler) {
        if (type === "beforeunload") beforeUnloadHandler = handler;
      }
    },
    editor: { hasDirtyTabs: () => true }
  });
  const event = {
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    }
  };
  beforeUnloadHandler(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(event.returnValue, "");
});

test("settings feedback bindings copy diagnostics and open feedback routes", async () => {
  const elements = {
    settingsCopyFeedbackDiagnostics: button(),
    settingsOpenBugReport: button(),
    settingsOpenFeatureRequest: button()
  };
  const opened = [];
  const statuses = [];

  installSettingsFeedbackEventBindings({
    $: registry(elements),
    feedbackRepositoryReady: true,
    copyTextToClipboard: async (text) => statuses.push(["copied", text]),
    buildFeedbackDiagnosticText: () => "diagnostics",
    buildFeedbackUrl: (kind) => `url:${kind}`,
    openFeedbackUrl: async (url) => {
      opened.push(url);
      return true;
    },
    setStatus: (...args) => statuses.push(args)
  });

  await elements.settingsCopyFeedbackDiagnostics.click();
  await elements.settingsOpenBugReport.click();
  await elements.settingsOpenFeatureRequest.click();

  assert.deepEqual(opened, ["url:bug", "url:feature"]);
  assert.deepEqual(statuses[0], ["copied", "diagnostics"]);
  assert.equal(statuses.some(([message]) => String(message).includes("已复制问题信息")), true);
  assert.equal(statuses.some(([message]) => String(message).includes("已打开问题反馈入口")), true);
});

test("editor shell bindings route focus helper and delayed save actions", async () => {
  const elements = {
    btnFocusMode: button(),
    btnDismissEditorHelper: button(),
    btnEditorHelperAction: button({ helperAction: "open-generated-original", targetNoteId: "note-2" }),
    btnSaveAiSuggestionLater: button(),
    btnEditorHelperMute: button()
  };
  const state = { focusMode: false };
  const calls = [];

  installEditorShellEventBindings({
    $: registry(elements),
    state,
    editor: { setFocusMode: (value) => calls.push(["focus", value]) },
    getSaveAiSuggestion: () => ({ noteId: "note-1" }),
    setEditorHelperDismissed: (value) => calls.push(["dismissed", value]),
    setEditorHelperMuted: (value) => calls.push(["muted", value]),
    writeStoredBoolean: (...args) => calls.push(["stored", ...args]),
    editorHelperMuteKey: "mute-key",
    hideEditorHelper: () => calls.push(["hide"]),
    openNoteById: (...args) => {
      calls.push(["open", ...args]);
      return true;
    },
    dismissSaveAiSuggestionForLater: (...args) => calls.push(["later", ...args]),
    dismissedSaveAiSuggestionKeys: new Set(),
    clearSaveAiSuggestion: () => calls.push(["clear"]),
    renderWorkspaceStatusHint: () => calls.push(["hint"]),
    applyFocusModeChrome: () => calls.push(["chrome"]),
    setStatus: (...args) => calls.push(["status", ...args])
  });

  await elements.btnFocusMode.click();
  await elements.btnEditorHelperAction.click();
  await elements.btnSaveAiSuggestionLater.click();
  await elements.btnEditorHelperMute.click();

  assert.equal(state.focusMode, true);
  assert.ok(calls.some(([name, value]) => name === "focus" && value === true));
  assert.ok(calls.some(([name, noteId]) => name === "open" && noteId === "note-2"));
  assert.ok(calls.some(([name]) => name === "later"));
  assert.ok(calls.some(([name, key, value]) => name === "stored" && key === "mute-key" && value === true));
});

test("save AI suggestion route binding handles route actions", async () => {
  const elements = {
    btnSaveAiSuggestionPrimary: button()
  };
  const recordButton = button();
  const calls = [];

  installSaveAiSuggestionRouteEventBindings({
    $: registry(elements),
    windowRef: {
      setTimeout(handler) {
        handler();
      }
    },
    state: { notes: [{ id: "note-1" }] },
    editor: { els: { recordPermanent: recordButton } },
    getSaveAiSuggestion: () => ({ noteId: "note-1", action: "record" }),
    clearSaveAiSuggestion: () => calls.push(["clear"]),
    saveAiSuggestionPrimaryRoute: () => ({ kind: "record-permanent", noteId: "note-1" }),
    activateModule: (...args) => calls.push(["activate", ...args]),
    openNoteById: (...args) => {
      calls.push(["open", ...args]);
      return true;
    },
    handleStateChange: async (...args) => calls.push(["state", ...args]),
    setStatus: (...args) => calls.push(["status", ...args])
  });

  await elements.btnSaveAiSuggestionPrimary.click();

  assert.ok(calls.some(([name]) => name === "clear"));
  assert.ok(calls.some(([name, moduleName]) => name === "activate" && moduleName === "explorer"));
  assert.ok(calls.some(([name, noteId]) => name === "open" && noteId === "note-1"));
  assert.equal(recordButton.clicked, true);
});
