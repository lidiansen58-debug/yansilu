import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRenderAppShellHostDeps
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
