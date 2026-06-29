import test from "node:test";
import assert from "node:assert/strict";
import { installDistillationEventBindings } from "../../apps/web/src/distillation-event-bindings.js";

function panel() {
  let clickHandler = null;
  return {
    addEventListener(type, handler) {
      if (type === "click") clickHandler = handler;
    },
    async click(target) {
      await clickHandler?.({ target });
    }
  };
}

function target(matches = {}) {
  return {
    closest(selector) {
      return matches[selector] || null;
    }
  };
}

function node(dataset = {}) {
  return { dataset };
}

test("distillation event bindings route refresh filter and actions", async () => {
  const calls = [];
  const mount = panel();
  const state = { browserRootId: "", selectedFolderId: "" };
  const distillationState = { filter: "all" };

  installDistillationEventBindings({
    $: (id) => (id === "distillationPanel" ? mount : null),
    state,
    distillationState,
    openDistillationModule: async () => calls.push(["refresh"]),
    renderDistillationPanel: () => calls.push(["render-panel"]),
    activateModule: (module) => calls.push(["activate", module]),
    openWritingModule: async () => calls.push(["open-writing"]),
    handleStateChange: async (action) => calls.push(["state", action]),
    renderAll: () => calls.push(["render-all"]),
    openDistillationQueueNote: async (id) => calls.push(["open-note", id])
  });

  await mount.click(target({ "#btnDistillationRefresh": node() }));
  await mount.click(target({ "[data-distillation-filter]": node({ distillationFilter: "needs-review" }) }));
  await mount.click(target({ "[data-distillation-action]": node({ distillationAction: "open-writing" }) }));
  await mount.click(target({ "[data-distillation-action]": node({ distillationAction: "create-permanent" }) }));
  await mount.click(target({ "[data-distillation-open-note]": node({ distillationOpenNote: "note-1" }) }));

  assert.equal(distillationState.filter, "needs-review");
  assert.equal(state.browserRootId, "dir_original_default");
  assert.equal(state.selectedFolderId, "dir_original_default");
  assert.deepEqual(calls, [
    ["refresh"],
    ["render-panel"],
    ["activate", "writing"],
    ["open-writing"],
    ["activate", "explorer"],
    ["state", "create-note-in-selected-folder"],
    ["render-all"],
    ["open-note", "note-1"]
  ]);
});
