import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRenderAppShellDeps
} from "../../apps/web/src/app-shell-render-all-deps.js";

test("app shell render deps wraps explorer and editor host renderers", () => {
  const calls = [];
  const state = { module: "explorer" };
  const marker = (name) => () => calls.push(name);
  const deps = buildRenderAppShellDeps({
    state,
    explorer: { render: marker("explorer") },
    editor: { renderTabs: marker("tabs") },
    ensureSelection: marker("ensure"),
    renderWritingPanel: marker("writing")
  });

  assert.equal(deps.state, state);
  deps.ensureSelection();
  deps.explorerRender();
  deps.renderWritingPanel();
  deps.renderEditorTabs();

  assert.deepEqual(calls, ["ensure", "explorer", "writing", "tabs"]);
});

test("app shell render deps tolerates missing host renderers", () => {
  const deps = buildRenderAppShellDeps();

  assert.doesNotThrow(() => deps.explorerRender());
  assert.doesNotThrow(() => deps.renderEditorTabs());
  assert.doesNotThrow(() => deps.renderSystemMessages());
});
