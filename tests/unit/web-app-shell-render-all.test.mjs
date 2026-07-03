import test from "node:test";
import assert from "node:assert/strict";

import {
  createRenderAppShellController,
  renderAppShell
} from "../../apps/web/src/app-shell-render-all.js";

function renderDeps(module = "explorer") {
  const calls = [];
  const push = (name) => () => calls.push(name);
  return {
    calls,
    deps: {
      state: { module },
      ensureSelection: push("ensureSelection"),
      syncRailSelectionState: push("syncRailSelectionState"),
      renderSidebarTitle: push("renderSidebarTitle"),
      renderModulePanels: push("renderModulePanels"),
      syncExportDirectoryOptions: push("syncExportDirectoryOptions"),
      renderAiInboxWorkspace: push("renderAiInboxWorkspace"),
      renderDistillationPanel: push("renderDistillationPanel"),
      renderGraphPanel: push("renderGraphPanel"),
      renderSettingsPanel: push("renderSettingsPanel"),
      explorerRender: push("explorerRender"),
      renderExplorerSidebarFlow: push("renderExplorerSidebarFlow"),
      renderWritingPanel: push("renderWritingPanel"),
      renderEditorTabs: push("renderEditorTabs"),
      applyFocusModeChrome: push("applyFocusModeChrome"),
      renderStatusMeta: push("renderStatusMeta"),
      renderWorkspaceStatusHint: push("renderWorkspaceStatusHint"),
      renderSaveAiSuggestion: push("renderSaveAiSuggestion"),
      renderSystemMessages: push("renderSystemMessages")
    }
  };
}

test("app shell render runs explorer before writing panel for explorer and graph modules", () => {
  for (const module of ["explorer", "graph"]) {
    const { calls, deps } = renderDeps(module);

    renderAppShell(deps);

    assert.ok(calls.indexOf("explorerRender") >= 0);
    assert.ok(calls.indexOf("explorerRender") < calls.indexOf("renderWritingPanel"));
    assert.ok(calls.indexOf("renderExplorerSidebarFlow") < calls.indexOf("renderWritingPanel"));
    assert.ok(calls.indexOf("renderGraphPanel") < calls.indexOf("explorerRender"));
  }
});

test("app shell render skips explorer tree for module workspaces", () => {
  const { calls, deps } = renderDeps("writing");

  renderAppShell(deps);

  assert.equal(calls.includes("explorerRender"), false);
  assert.ok(calls.indexOf("renderExplorerSidebarFlow") > calls.indexOf("renderSettingsPanel"));
  assert.ok(calls.indexOf("renderWritingPanel") > calls.indexOf("renderSettingsPanel"));
  assert.deepEqual(calls.slice(-3), ["renderWorkspaceStatusHint", "renderSaveAiSuggestion", "renderSystemMessages"]);
});

test("app shell render controller renders from current deps provider", () => {
  const calls = [];
  const controller = createRenderAppShellController({
    depsProvider: () => ({
      state: { module: "writing" },
      ensureSelection: () => calls.push("ensure"),
      renderSidebarTitle: () => calls.push("sidebar"),
      renderExplorerSidebarFlow: () => calls.push("flow"),
      renderWritingPanel: () => calls.push("writing"),
      renderSystemMessages: () => calls.push("messages")
    })
  });

  controller.renderAll();

  assert.deepEqual(calls, ["ensure", "sidebar", "flow", "writing", "messages"]);
});
