import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSidebarTitleHostDeps
} from "../../apps/web/src/app-shell-sidebar-host-deps.js";

test("sidebar title host deps resolves root from shell state", () => {
  const state = { browserRootId: "dir-1" };
  const root = { id: "dir-1", name: "Root" };
  const marker = (key) => ({ key });
  const host = {
    state,
    folderById: (incomingState, id) => {
      assert.equal(incomingState, state);
      assert.equal(id, "dir-1");
      return root;
    },
    $: marker("$"),
    documentRef: marker("document"),
    windowRef: marker("window"),
    displayFolderName: marker("display"),
    currentModuleUi: marker("module"),
    syncNewNoteButtons: marker("sync")
  };

  const deps = buildSidebarTitleHostDeps(host);

  assert.notEqual(deps, host);
  assert.equal(deps.state, state);
  assert.equal(deps.root, root);
  assert.equal(deps.$, host.$);
  assert.equal(deps.documentRef, host.documentRef);
  assert.equal(deps.windowRef, host.windowRef);
  assert.equal(deps.displayFolderName, host.displayFolderName);
  assert.equal(deps.currentModuleUi, host.currentModuleUi);
  assert.equal(deps.syncNewNoteButtons, host.syncNewNoteButtons);
});
