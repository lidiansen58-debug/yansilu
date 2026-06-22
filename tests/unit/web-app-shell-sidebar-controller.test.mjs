import test from "node:test";
import assert from "node:assert/strict";

import {
  renderSidebarTitleForRuntime
} from "../../apps/web/src/app-shell-sidebar-controller.js";

function fakeElement() {
  const classes = new Set();
  return {
    textContent: "",
    innerHTML: "",
    dataset: {},
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle: (name, force) => {
        const next = force === undefined ? !classes.has(name) : Boolean(force);
        if (next) classes.add(name);
        else classes.delete(name);
        return next;
      },
      contains: (name) => classes.has(name)
    }
  };
}

function sidebarElements() {
  return {
    sidebarTitle: fakeElement(),
    sidebarPrimaryActions: fakeElement(),
    filter: fakeElement(),
    moduleSidebar: fakeElement(),
    sidebarFlow: fakeElement(),
    listArea: fakeElement(),
    searchToggle: fakeElement(),
    sidebarSubtitle: fakeElement(),
    sidebarFoot: fakeElement(),
    explorerActions: fakeElement()
  };
}

test("app shell sidebar controller renders explorer sidebar state", () => {
  const elements = sidebarElements();
  const quickEntry = fakeElement();
  quickEntry.dataset.action = "quick-literature";
  let syncedNewNoteButtons = false;

  renderSidebarTitleForRuntime({
    state: {
      module: "explorer",
      browserRootId: "dir_literature_default",
      searchVisible: false,
      searchQuery: ""
    },
    root: { name: "Literature" },
    elements,
    documentRef: { querySelectorAll: () => [quickEntry] },
    displayFolderName: (folder) => `Folder: ${folder.name}`,
    syncNewNoteButtons: () => {
      syncedNewNoteButtons = true;
    }
  });

  assert.equal(elements.sidebarTitle.textContent, "Folder: Literature");
  assert.equal(syncedNewNoteButtons, true);
  assert.equal(quickEntry.classList.contains("current-root"), true);
  assert.equal(elements.sidebarPrimaryActions.classList.contains("hidden"), false);
  assert.equal(elements.filter.classList.contains("hidden"), true);
  assert.equal(elements.moduleSidebar.innerHTML, "");
  assert.equal(elements.sidebarFoot.classList.contains("hidden"), true);
});

test("app shell sidebar controller keeps graph sidebar scoped to graph navigation", () => {
  const elements = sidebarElements();

  renderSidebarTitleForRuntime({
    state: { module: "graph" },
    elements,
    documentRef: { querySelectorAll: () => [] }
  });

  assert.equal(elements.sidebarTitle.textContent, "图谱笔记范围");
  assert.match(elements.sidebarSubtitle.textContent, /切换图谱观察范围/);
  assert.match(elements.sidebarFoot.textContent, /待关联笔记/);
  assert.equal(elements.listArea.classList.contains("hidden"), false);
  assert.equal(elements.moduleSidebar.classList.contains("visible"), false);
});

test("app shell sidebar controller hides module sidebar on compact import screens", () => {
  const elements = sidebarElements();

  renderSidebarTitleForRuntime({
    state: { module: "imports" },
    elements,
    windowRef: { innerWidth: 640 },
    currentModuleUi: () => ({
      sidebarTitle: "Import",
      sidebarSubtitle: "Import details",
      sidebarFoot: "Foot",
      sidebarHtml: "<aside>module</aside>"
    })
  });

  assert.equal(elements.sidebarTitle.textContent, "Import");
  assert.equal(elements.sidebarSubtitle.textContent, "先预览，再写入。");
  assert.equal(elements.moduleSidebar.classList.contains("visible"), false);
  assert.equal(elements.moduleSidebar.innerHTML, "");
  assert.equal(elements.sidebarFoot.classList.contains("hidden"), true);
});
