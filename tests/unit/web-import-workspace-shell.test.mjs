import test from "node:test";
import assert from "node:assert/strict";
import {
  createImportWorkspaceShellController,
  normalizeImportWorkspaceTab
} from "../../apps/web/src/import-workspace-shell.js";

function element(initial = {}) {
  const classes = new Set();
  return {
    value: initial.value || "",
    hidden: Boolean(initial.hidden),
    innerHTML: initial.innerHTML || "",
    attributes: new Map(),
    children: initial.children || [],
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      }
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
    getAttribute(name) {
      return this.attributes.get(name) || "";
    },
    querySelectorAll(selector) {
      return selector === "[data-import-workspace-tab]" ? this.children : [];
    }
  };
}

function createHarness(overrides = {}) {
  const importButton = element();
  importButton.setAttribute("data-import-workspace-tab", "import");
  const exportButton = element();
  exportButton.setAttribute("data-import-workspace-tab", "export");

  const elements = {
    importConnector: element({ value: "obsidian" }),
    importDirectoryId: element({ value: "dir_literature_default" }),
    importPath: element({ value: "E:/vault" }),
    importPayload: element({ value: "payload" }),
    importOptions: element({ value: "{\"dryRun\":true}" }),
    importRecordId: element({ value: "imp_1" }),
    importToolbarMount: element(),
    importPageMount: element({ children: [importButton, exportButton] }),
    exportCardMount: element()
  };
  const importState = {
    directoryId: "dir_original_default",
    importRecordId: "fallback_record",
    activeTab: "import",
    lastResultPayload: null
  };
  const calls = {
    page: [],
    toolbar: [],
    mountedExport: 0
  };
  const controller = createImportWorkspaceShellController({
    getElement: (id) => elements[id] || null,
    importState,
    renderImportPageMount: (input) => {
      calls.page.push(input);
      return `<main data-active="${input.activeTab}"></main>`;
    },
    renderImportToolbarMount: (input) => {
      calls.toolbar.push(input);
      return `<form data-directory="${input.directoryId}"></form>`;
    },
    preferredImportDirectoryId: () => "dir_preferred",
    activeImportPreviewContext: () => ({
      importRecordId: "imp_1",
      candidatePreview: { ok: true },
      candidateSelection: { selected: true }
    }),
    selectionSummary: () => ({ selectedCount: 2, totalCount: 3 }),
    importConfirmButtonState: (input) => ({
      disabled: input.selectedCount === 0,
      label: `${input.selectedCount}/${input.totalCount}`
    }),
    importTargetDirectories: () => [
      { id: "dir_preferred" },
      { id: "dir_other" }
    ],
    directoryPathLabel: (id) => `path:${id}`,
    mountExportCardIntoImportShell: () => {
      calls.mountedExport += 1;
    },
    ...overrides
  });

  return { controller, elements, importState, calls, importButton, exportButton };
}

test("normalizeImportWorkspaceTab keeps import/export as the only tabs", () => {
  assert.equal(normalizeImportWorkspaceTab("export"), "export");
  assert.equal(normalizeImportWorkspaceTab(" EXPORT "), "export");
  assert.equal(normalizeImportWorkspaceTab("other"), "import");
  assert.equal(normalizeImportWorkspaceTab(""), "import");
});

test("import workspace shell reads toolbar values and renders confirm state", () => {
  const { controller, elements, importState, calls } = createHarness();

  controller.renderToolbar();

  assert.equal(importState.directoryId, "dir_preferred");
  assert.equal(elements.importToolbarMount.innerHTML, `<form data-directory="dir_preferred"></form>`);
  assert.deepEqual(calls.toolbar[0], {
    connector: "obsidian",
    directoryId: "dir_preferred",
    directoryOptions: [
      { value: "dir_preferred", label: "path:dir_preferred" },
      { value: "dir_other", label: "path:dir_other" }
    ],
    path: "E:/vault",
    payload: "payload",
    options: "{\"dryRun\":true}",
    importRecordId: "imp_1",
    confirmButton: {
      disabled: false,
      label: "2/3"
    }
  });
});

test("import workspace shell renders page result and syncs export tab", () => {
  const { controller, elements, importState, calls, importButton, exportButton } = createHarness();
  importState.activeTab = "export";
  importState.lastResultPayload = { status: "completed" };

  controller.renderPage();

  assert.equal(elements.importPageMount.innerHTML, `<main data-active="export"></main>`);
  assert.equal(calls.mountedExport, 1);
  assert.deepEqual(calls.page[0].result, {
    data: { status: "completed" },
    raw: JSON.stringify({ status: "completed" }, null, 2)
  });
  assert.equal(elements.importPageMount.attributes.get("data-import-workspace-tab"), "export");
  assert.equal(elements.importToolbarMount.hidden, true);
  assert.equal(elements.exportCardMount.hidden, false);
  assert.equal(importButton.attributes.get("aria-selected"), "false");
  assert.equal(exportButton.attributes.get("aria-selected"), "true");
  assert.equal(exportButton.classList.contains("is-active"), true);
});

test("import workspace shell setTab normalizes unknown tabs", () => {
  const { controller, importState, elements } = createHarness();

  controller.setTab("unknown");

  assert.equal(importState.activeTab, "import");
  assert.equal(elements.importToolbarMount.hidden, false);
  assert.equal(elements.exportCardMount.hidden, true);
});
