import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRenderAppShellHostDeps,
  createRenderAppShellPrototypeDepsProvider
} from "../../apps/web/src/app-shell-render-all-host-deps.js";

test("render app shell host deps keeps shell render collaborators in one mapping", () => {
  const host = {};
  const keys = [
    "state",
    "explorer",
    "editor",
    "ensureSelection",
    "syncRailSelectionState",
    "renderSidebarTitle",
    "renderModulePanels",
    "syncExportDirectoryOptions",
    "renderAiInboxWorkspace",
    "renderDistillationPanel",
    "renderGraphPanel",
    "renderSettingsPanel",
    "renderWritingPanel",
    "applyFocusModeChrome",
    "renderStatusMeta",
    "renderWorkspaceStatusHint",
    "renderSaveAiSuggestion",
    "renderSystemMessages"
  ];
  for (const key of keys) host[key] = { key };

  const deps = buildRenderAppShellHostDeps(host);

  assert.notEqual(deps, host);
  assert.deepEqual(Object.keys(deps), keys);
  for (const key of keys) {
    assert.equal(deps[key], host[key]);
  }
});

test("render app shell prototype deps provider normalizes current host renderers", () => {
  const calls = [];
  let state = { module: "explorer" };
  const provider = createRenderAppShellPrototypeDepsProvider(() => ({
    state,
    explorer: { render: () => calls.push(["explorer", state.module]) },
    editor: { renderTabs: () => calls.push(["tabs", state.module]) },
    renderWritingPanel: () => calls.push(["writing", state.module])
  }));

  const first = provider();
  state = { module: "writing" };
  const second = provider();

  assert.notEqual(first, second);
  assert.equal(first.state.module, "explorer");
  assert.equal(second.state.module, "writing");
  second.explorerRender();
  second.renderEditorTabs();
  second.renderWritingPanel();
  assert.deepEqual(calls, [
    ["explorer", "writing"],
    ["tabs", "writing"],
    ["writing", "writing"]
  ]);
});
