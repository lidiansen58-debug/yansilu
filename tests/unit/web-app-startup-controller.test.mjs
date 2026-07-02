import test from "node:test";
import assert from "node:assert/strict";

import { bootstrapAppForRuntime } from "../../apps/web/src/app-startup-controller.js";
import { initializeAppRouteForRuntime } from "../../apps/web/src/app-route-initializer.js";
import { openInitialStartupRouteForRuntime } from "../../apps/web/src/app-startup-seed.js";

test("startup controller wires import toolbar events then initializes route and startup note", async () => {
  const calls = [];
  let fallback = false;
  await bootstrapAppForRuntime({
    state: { browserRootId: "root" },
    importState: { importRecordId: "import-1" },
    setUsingLocalFallbackData: (value) => {
      calls.push(["fallback", value]);
      fallback = value;
    },
    getUsingLocalFallbackData: () => fallback,
    renderImportPageShell: () => calls.push(["renderImportShell"]),
    createImportToolbarActions: (options) => {
      calls.push(["createToolbar", typeof options.onPreviewSuccess, typeof options.onConfirmSuccess]);
      return { handlePreview: async () => {} };
    },
    renderImportToolbar: () => calls.push(["renderToolbar"]),
    bindImportWorkspaceEvents: ({ importToolbarActions }) => calls.push(["bindEvents", Boolean(importToolbarActions)]),
    initializeAppRoute: async () => calls.push(["initRoute"]),
    renderAll: () => calls.push(["renderAll"]),
    openInitialStartupRoute: async ({ usingLocalFallbackData }) => calls.push(["openStartup", usingLocalFallbackData]),
    setStatus: () => {}
  });

  assert.deepEqual(calls, [
    ["fallback", false],
    ["renderImportShell"],
    ["createToolbar", "function", "function"],
    ["renderToolbar"],
    ["bindEvents", true],
    ["initRoute"],
    ["renderAll"],
    ["openStartup", false]
  ]);
});

test("route initializer connects API and marks browser fallback on web failures", async () => {
  const successCalls = [];
  const success = await initializeAppRouteForRuntime({
    state: { browserRootId: "root" },
    refreshVaultSettings: async () => successCalls.push("vault"),
    syncDirectoriesFromApi: async () => successCalls.push("dirs"),
    syncNotesForDirectoryTree: async (id) => successCalls.push(["notes", id]),
    getApiBase: () => "http://api",
    setStatus: (message, tone) => successCalls.push(["status", tone, message])
  });

  assert.equal(success.connected, true);
  assert.deepEqual(successCalls.slice(0, 3), ["vault", "dirs", ["notes", "root"]]);

  const fallbackCalls = [];
  const fallback = await initializeAppRouteForRuntime({
    refreshVaultSettings: async () => {
      throw new Error("offline");
    },
    windowRef: {},
    setUsingLocalFallbackData: (value) => fallbackCalls.push(["fallback", value]),
    setStatus: (message, tone) => fallbackCalls.push(["status", tone, message])
  });

  assert.equal(fallback.connected, false);
  assert.equal(fallback.usingLocalFallbackData, true);
  assert.deepEqual(fallbackCalls[0], ["fallback", true]);
  assert.equal(fallbackCalls[1][1], "warn");
});

test("startup route opener prioritizes demo then explicit note then fallback note", async () => {
  const demoCalls = [];
  const demo = await openInitialStartupRouteForRuntime({
    windowRef: { location: { search: "?demo=smart-notes" } },
    state: { notes: [] },
    importSmartNotesProductThinkingDemo: async () => {
      demoCalls.push("demo");
      return true;
    },
    renderAll: () => demoCalls.push("render")
  });
  assert.equal(demo.route, "demo");
  assert.deepEqual(demoCalls, ["demo", "render"]);

  const state = { notes: [{ id: "n1", folderId: "f1" }] };
  const note = await openInitialStartupRouteForRuntime({
    windowRef: { location: { search: "?note=n1" } },
    state,
    rootBoxIdFromFolder: () => "root",
    openNoteById: (id) => {
      assert.equal(id, "n1");
      return true;
    }
  });
  assert.equal(note.route, "note");
  assert.equal(state.browserRootId, "root");
  assert.equal(state.selectedFolderId, "f1");

  const fallbackCalls = [];
  const fallback = await openInitialStartupRouteForRuntime({
    windowRef: { location: { search: "" } },
    state: { notes: [] },
    usingLocalFallbackData: true,
    preferredLocalFallbackNote: () => ({ id: "fallback", folderId: "f2", title: "Fallback" }),
    rootBoxIdFromFolder: () => "root2",
    openNoteById: (id, options) => fallbackCalls.push(["open", id, options]),
    setStatus: (message, tone) => fallbackCalls.push(["status", tone, message])
  });
  assert.equal(fallback.route, "fallback_note");
  assert.equal(fallbackCalls[0][1], "fallback");
  assert.equal(fallbackCalls[1][1], "warn");
});

test("startup route opener reads late auto-open suppression before creating an untitled note", async () => {
  let suppressed = false;
  let created = 0;
  const route = await openInitialStartupRouteForRuntime({
    windowRef: { location: { search: "" } },
    state: { notes: [] },
    getStartupAutoOpenSuppressed: () => {
      suppressed = true;
      return suppressed;
    },
    openStartupUntitledNote: async () => {
      created += 1;
    }
  });

  assert.equal(route.route, "skipped");
  assert.equal(created, 0);
});

test("startup route opener defaults to today organizing when no note is requested", async () => {
  const calls = [];
  const route = await openInitialStartupRouteForRuntime({
    windowRef: { location: { search: "" } },
    state: { notes: [] },
    activateModule: (moduleName) => calls.push(["module", moduleName]),
    openStartupUntitledNote: async () => calls.push(["untitled"])
  });

  assert.equal(route.route, "today");
  assert.deepEqual(calls, [["module", "today"]]);
});
