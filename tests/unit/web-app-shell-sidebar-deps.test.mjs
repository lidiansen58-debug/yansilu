import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSidebarTitleRuntimeDeps
} from "../../apps/web/src/app-shell-sidebar-deps.js";

test("app shell sidebar deps maps host DOM ids to sidebar runtime elements", () => {
  const calls = [];
  const elements = new Map();
  const state = { module: "explorer" };
  const root = { id: "root", name: "Root" };
  const documentRef = { querySelectorAll: () => [] };
  const windowRef = { innerWidth: 1200 };
  const deps = buildSidebarTitleRuntimeDeps({
    state,
    root,
    $: (id) => {
      calls.push(id);
      const element = { id };
      elements.set(id, element);
      return element;
    },
    documentRef,
    windowRef,
    displayFolderName: (folder) => folder.name,
    currentModuleUi: () => ({ sidebarTitle: "Module" }),
    syncNewNoteButtons: () => {}
  });

  assert.equal(deps.state, state);
  assert.equal(deps.root, root);
  assert.equal(deps.documentRef, documentRef);
  assert.equal(deps.windowRef, windowRef);
  assert.equal(deps.elements.sidebarTitle, elements.get("sidebarTitle"));
  assert.equal(deps.elements.moduleSidebar, elements.get("moduleSidebar"));
  assert.equal(deps.elements.explorerActions, elements.get("explorerActions"));
  assert.deepEqual(calls, [
    "sidebarTitle",
    "sidebarPrimaryActions",
    "searchBar",
    "moduleSidebar",
    "sidebarFlow",
    "listArea",
    "btnToggleSearch",
    "sidebarSubtitle",
    "sidebarFoot",
    "explorerActions"
  ]);
});
