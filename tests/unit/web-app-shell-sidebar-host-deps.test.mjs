import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSidebarTitleHostDeps,
  createSidebarTitlePrototypeDepsProvider
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

test("sidebar title prototype deps provider resolves current root and DOM elements", () => {
  let state = { browserRootId: "dir-1" };
  const elements = new Map();
  const provider = createSidebarTitlePrototypeDepsProvider(() => ({
    state,
    folderById: (_state, id) => ({ id, name: `root:${id}` }),
    $: (id) => {
      const element = { id };
      elements.set(id, element);
      return element;
    },
    displayFolderName: (folder) => folder?.name || "",
    currentModuleUi: () => ({ title: "Module" }),
    syncNewNoteButtons: () => {}
  }));

  const first = provider();
  state = { browserRootId: "dir-2" };
  const second = provider();

  assert.notEqual(first, second);
  assert.equal(first.root.id, "dir-1");
  assert.equal(second.root.id, "dir-2");
  assert.equal(second.elements.sidebarTitle.id, "sidebarTitle");
  assert.equal(elements.has("moduleSidebar"), true);
});
