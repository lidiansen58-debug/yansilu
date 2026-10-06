import test from "node:test";
import assert from "node:assert/strict";

import { bootstrapAppForRuntime } from "../../apps/web/src/app-startup-controller.js";
import { initializeAppRouteForRuntime } from "../../apps/web/src/app-route-initializer.js";
import { openInitialStartupRouteForRuntime } from "../../apps/web/src/app-startup-seed.js";

test("failed startup connection does not proceed into note or demo startup routes", async () => {
  const state = {};
  await bootstrapAppForRuntime({
    state,
    initializeAppRoute: async () => ({ connected: false, usingLocalFallbackData: false }),
    openInitialStartupRoute: () => assert.fail("must not start routes without a connection")
  });
  assert.equal(state.appStartupPending, false);
  assert.ok(state.appStartupError);
});

test("reconnecting reuses existing bindings and coalesces repeated clicks", async () => {
  const state = {};
  let attempts = 0, bindings = 0, routes = 0, finish;
  await bootstrapAppForRuntime({
    state, bindImportWorkspaceEvents: () => { bindings++; },
    initializeAppRoute: async () => {
      attempts++;
      if (attempts === 1) return { connected: false };
      await new Promise(resolve => { finish = resolve; });
      return { connected: true };
    },
    openInitialStartupRoute: () => { routes++; }
  });
  const reconnecting = state.retryStartupConnection();
  const repeated = state.retryStartupConnection();
  assert.equal(reconnecting, repeated);
  assert.equal(state.appStartupPending, true);
  assert.equal(state.appStartupError, "");
  await new Promise(resolve => setImmediate(resolve));
  finish();
  assert.equal(await reconnecting, true);
  assert.equal(attempts, 2);
  assert.equal(bindings, 1);
  assert.equal(routes, 1);
  assert.equal(state.appStartupPending, false);
});

test("failed startup reveals home even when partial notes or another module exist", async () => {
  const state = { module: "explorer", notes: [{ id: "loaded" }] };
  await bootstrapAppForRuntime({
    state,
    initializeAppRoute: async () => ({ connected: false, error: new Error("second directory unavailable") }),
    activateModule: module => { state.module = module; }
  });
  assert.equal(state.module, "today");
  assert.equal(state.notes.length, 1);
  assert.equal(state.appStartupError, "second directory unavailable");
});

test("first successful connection schedules updates once, including after retry", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const initiallyFailed of [false, true]) {
    const state = {};
    let attempts = 0;
    const calls = [];
    await bootstrapAppForRuntime({
      state,
      initializeAppRoute: async () => ({ connected: !(initiallyFailed && ++attempts === 1) }),
      updateController: {
        refreshAppVersionInfo: async () => { calls.push("version"); },
        runAppUpdateCheck: async options => { calls.push(["update", options.manual]); }
      }
    });
    t.mock.timers.tick(1200);
    await new Promise(resolve => setImmediate(resolve));
    if (initiallyFailed) {
      assert.deepEqual(calls, []);
      assert.equal(await state.retryStartupConnection(), true);
      t.mock.timers.tick(1200);
      await new Promise(resolve => setImmediate(resolve));
    }
    assert.deepEqual(calls, ["version", ["update", false]]);
    await state.retryStartupConnection();
    t.mock.timers.tick(1200);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.length, 2);
  }
});

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
    ["renderAll"],
    ["initRoute"],
    ["renderAll"],
    ["openStartup", false]
  ]);
});

test("startup controller keeps confirmed import results visible", async () => {
  const calls = [];
  let confirmSuccess = null;
  await bootstrapAppForRuntime({
    state: { browserRootId: "root", selectedFolderId: "root" },
    importState: { importRecordId: "import-1", directoryId: "root" },
    setUsingLocalFallbackData: () => {},
    renderImportPageShell: () => {},
    createImportToolbarActions: (options) => {
      confirmSuccess = options.onConfirmSuccess;
      return {};
    },
    renderImportToolbar: () => {},
    bindImportWorkspaceEvents: () => {},
    initializeAppRoute: async () => {},
    openInitialStartupRoute: async () => {},
    confirmedImportTargetDirectoryId: () => "",
    preferredImportDirectoryId: (value) => value,
    setImportRecordId: (id) => calls.push(["record", id]),
    showImportResult: (payload) => calls.push(["result", payload.stage]),
    activateModule: (moduleName) => calls.push(["module", moduleName]),
    hideImportOperationResultModal: () => calls.push(["hideModal"]),
    renderAll: () => {}
  });

  await confirmSuccess({
    importRecordId: "import-1",
    result: { status: "completed", result: { organizingOverview: { permanentCount: 1 } } },
    preview: { candidatePreview: null }
  });

  assert.deepEqual(calls, [
    ["record", "import-1"],
    ["result", "confirm"]
  ]);
});

test("startup controller keeps the shell usable when startup initialization throws", async () => {
  const calls = [];
  let fallback = true;
  await bootstrapAppForRuntime({
    state: { browserRootId: "root" },
    importState: { importRecordId: "import-1" },
    setUsingLocalFallbackData: (value) => {
      calls.push(["fallback", value]);
      fallback = value;
    },
    getUsingLocalFallbackData: () => fallback,
    renderImportPageShell: () => calls.push(["renderImportShell"]),
    createImportToolbarActions: () => ({}),
    renderImportToolbar: () => calls.push(["renderToolbar"]),
    bindImportWorkspaceEvents: () => calls.push(["bindEvents"]),
    initializeAppRoute: async () => {
      throw new Error("dev instance is still running");
    },
    renderAll: () => calls.push(["renderAll"]),
    activateModule: (moduleName) => calls.push(["module", moduleName]),
    openInitialStartupRoute: async () => calls.push(["unexpectedStartupRoute"]),
    setStatus: (message, tone, options) => calls.push(["status", tone, /dev instance is still running/.test(message), options?.force])
  });

  assert.deepEqual(calls, [
    ["fallback", false],
    ["renderImportShell"],
    ["renderToolbar"],
    ["bindEvents"],
    ["renderAll"],
    ["fallback", false],
    ["module", "today"],
    ["renderAll"],
    ["status", "bad", true, true]
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

test("route initializer does not mask API connection failures as local empty data", async () => {
  const calls = [];
  const apiError = new Error("API 未连接");
  apiError.code = "api_unavailable";
  apiError.apiBase = "http://127.0.0.1:3999";

  const result = await initializeAppRouteForRuntime({
    refreshVaultSettings: async () => {
      throw apiError;
    },
    windowRef: {},
    isApiConnectionError: (error) => error?.code === "api_unavailable",
    apiConnectionErrorMessage: (error) => `API 未连接，不能读取笔记库。当前尝试地址：${error.apiBase}`,
    setUsingLocalFallbackData: (value) => calls.push(["fallback", value]),
    setStatus: (message, tone) => calls.push(["status", tone, message])
  });

  assert.equal(result.connected, false);
  assert.equal(result.usingLocalFallbackData, false);
  assert.deepEqual(calls[0], ["fallback", false]);
  assert.equal(calls[1][1], "bad");
  assert.match(calls[1][2], /API 未连接/);
});

test("route initializer shows install-friendly desktop API failure message", async () => {
  const dialogCalls = [];
  const result = await initializeAppRouteForRuntime({
    refreshVaultSettings: async () => {
      throw new Error("桌面内置服务未启动");
    },
    getApiBase: () => "",
    windowRef: {
      __TAURI__: {
        core: {
          invoke: async (command) => {
            assert.equal(command, "get_desktop_api_status");
            return {
              baseUrl: "",
              running: false,
              launchError: "Yansilu desktop API runtime is incomplete."
            };
          }
        },
        dialog: {
          message: async (message, options) => dialogCalls.push([message, options])
        }
      }
    },
    setStatus: () => {}
  });

  assert.equal(result.connected, false);
  assert.equal(dialogCalls.length, 1);
  assert.equal(dialogCalls[0][1].title, "本地服务启动失败");
  assert.match(dialogCalls[0][0], /本地服务没有启动完成/);
  assert.match(dialogCalls[0][0], /runtime is incomplete/);
  assert.doesNotMatch(dialogCalls[0][0], /npm run dev:api/);
  assert.doesNotMatch(dialogCalls[0][0], /联系开发者获取“内置 API”的版本/);
});

test("startup route opener auto-opens demo then explicit note then fallback note", async () => {
  const demoCalls = [];
  const demo = await openInitialStartupRouteForRuntime({
    windowRef: { location: { search: "?demo=smart-notes" } },
    state: { notes: [] },
    confirm: (message) => {
      demoCalls.push(["confirm", /Smart Notes Demo/.test(message)]);
      return true;
    },
    importSmartNotesProductThinkingDemo: async (payload) => {
      demoCalls.push(["demo", payload.startup, payload.confirmed]);
      return true;
    },
    renderAll: () => demoCalls.push("render")
  });
  assert.equal(demo.route, "demo");
  assert.deepEqual(demoCalls, [["demo", true, true], "render"]);

  const state = { module: "today", notes: [{ id: "n1", folderId: "f1" }] };
  const note = await openInitialStartupRouteForRuntime({
    windowRef: { location: { search: "?note=n1" } },
    state,
    rootBoxIdFromFolder: () => "root",
    activateModule: (module) => { state.module = module; },
    openNoteById: (id) => {
      assert.equal(id, "n1");
      assert.equal(state.module, "explorer", "explicit routes must show the editor before opening the tab");
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

test("startup route opener defaults to organizer when no note is requested", async () => {
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

test("ordinary startup does not change its route when imported demo notes exist", async () => {
  for (const restored of [false, true]) {
    const state = { folders: [{ id: "demo-dir", title: "写作 Demo" }], notes: [{ id: "GUIDE-SHORT-PRACTICE" }], ...(restored ? { activeTabId: "tab", selectedFileId: "mine" } : {}) };
    const calls = [];
    const route = await openInitialStartupRouteForRuntime({ state, windowRef: { location: { search: "" } },
      syncNotesForDirectory: () => assert.fail("demo must not require startup loading"),
      openNoteById: () => assert.fail("demo must not replace normal route"),
      activateModule: module => calls.push(module)
    });
    assert.equal(route.route, restored ? "skipped" : "today");
    assert.deepEqual(calls, restored ? [] : ["today"]);
    assert.equal(state.selectedFileId, restored ? "mine" : undefined);
  }
});
