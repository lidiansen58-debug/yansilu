import assert from "node:assert/strict";
import test from "node:test";
import { createSmartNotesDemoImportController } from "../../apps/web/src/smart-notes-demo-import-controller.js";

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function fixture(overrides = {}) {
  const calls = [], state = {
    module: "settings", noteMoveVaultScope: 1, browserRootId: "old-root",
    selectedFolderId: "old-folder", selectedFileId: "old-note", activeTabId: "tab",
    folders: [{ id: "old-folder" }], notes: [{ id: "old-note", body: "my text" }],
    tabs: [{ id: "tab", noteId: "old-note", body: "my text", dirty: false }]
  };
  let path = "C:/vault-original", body = "my text";
  const deps = {
    state, getVaultPath: () => path,
    editor: { getEditorValue: () => body, resetEditorViewportToStart: () => calls.push(["viewport"]) },
    resetDesktopServiceStatusCache: () => {}, waitForRetry: async () => {},
    seedSmartNotesProductThinkingDemo: async payload => {
      calls.push(["seed", payload]);
      return { directoryId: "demo", firstNoteId: "guide", directoryIds: ["extra"] };
    },
    fetchDirectories: async () => [{ id: "demo", name: "Smart Notes 产品思考 Demo" }, { id: "child", parentId: "demo" }, { id: "extra" }],
    mapDirectoryItem: item => item,
    fetchDirectoryNotes: async id => { calls.push(["fetchNotes", id]); return [{ id: id === "demo" ? "guide" : id, title: id === "demo" ? "00 从这里开始" : id, folderId: id }]; },
    mapNoteItem: (item, { mappingState }) => { assert.equal(mappingState.folders[0].id, "demo"); return item; },
    upsertNotesForDirectory: (id, notes) => { calls.push(["commit", id]); state.notes.push(...notes); },
    rootBoxIdFromFolder: () => "demo-root",
    loadWritingThemeIndexes: async ({ isCurrent }) => { assert.equal(isCurrent(), true); calls.push(["themes"]); },
    refreshDirectoryGraph: async ({ isCurrent }) => { assert.equal(isCurrent(), true); calls.push(["graph"]); },
    activateModule: module => { state.module = module; calls.push(["module", module]); },
    openNoteById: id => { state.activeTabId = id; calls.push(["open", id]); },
    renderAll: () => calls.push(["render"]), setStatus: (...args) => calls.push(["status", ...args]),
    ...overrides
  };
  return { state, deps, calls, run: createSmartNotesDemoImportController(() => deps),
    setPath: value => { path = value; }, setBody: value => { body = value; } };
}

test("demo import stages descendants and commits before opening the guide once", async () => {
  const f = fixture();
  assert.equal(await f.run({ startup: true }), true);
  assert.deepEqual(f.calls.filter(c => c[0] === "seed"), [["seed", { expectedVaultPath: "C:/vault-original" }]]);
  assert.deepEqual(f.calls.filter(c => c[0] === "fetchNotes").map(c => c[1]), ["demo", "extra", "child"]);
  assert.deepEqual(f.calls.filter(c => c[0] === "open"), [["open", "guide"]]);
  assert.equal(f.state.module, "explorer");
  assert.equal(f.calls.at(-1)[2], "ok");
});

test("settings demo import refreshes home without opening a guide", async () => {
  const f = fixture();
  await f.run({ source: "settings-help" });
  assert.equal(f.state.module, "today");
  assert.equal(f.calls.some(c => c[0] === "open"), false);
  assert.match(f.state.todayNoticeMessage, /首页已刷新/);
});

for (const change of ["vault", "page", "folder", "editor", "tab"]) {
  test(`demo late seed preserves current ${change} and reports original import as completed`, async () => {
    const seed = deferred(), f = fixture({ seedSmartNotesProductThinkingDemo: () => seed.promise });
    const work = f.run();
    if (change === "vault") { f.setPath("C:/new-vault"); f.state.noteMoveVaultScope += 1; }
    if (change === "page") f.state.module = "writing";
    if (change === "folder") f.state.selectedFolderId = "new-folder";
    if (change === "editor") f.setBody("new unsaved text");
    if (change === "tab") f.state.tabs[0].body = "new tab text";
    const before = structuredClone(f.state);
    seed.resolve({ directoryId: "demo" });
    assert.equal(await work, true);
    assert.deepEqual(f.state, before);
    assert.equal(f.calls.length, 1); // Only initial progress, no stale fetch/feedback/navigation.
  });
}

test("demo notes hydration is atomic when editing starts between directory fetches", async () => {
  const notes = deferred();
  const f = fixture({ fetchDirectoryNotes: () => notes.promise });
  const before = structuredClone(f.state);
  const work = f.run();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(f.state, before);
  f.setBody("editing while waiting");
  notes.resolve([{ id: "guide", folderId: "demo" }]);
  assert.equal(await work, true);
  assert.deepEqual(f.state, before);
  assert.equal(f.calls.some(c => c[0] === "commit"), false);
});

test("demo startup retry stops after vault switch and never retries the new vault", async () => {
  const wait = deferred(), payloads = [];
  const f = fixture({
    seedSmartNotesProductThinkingDemo: async payload => { payloads.push(payload); throw Object.assign(new Error("boot"), { code: "desktop_api_unavailable" }); },
    waitForRetry: () => wait.promise
  });
  const work = f.run({ startup: true });
  await new Promise(resolve => setImmediate(resolve));
  f.setPath("C:/new-vault"); wait.resolve();
  assert.equal(await work, false);
  assert.deepEqual(payloads, [{ expectedVaultPath: "C:/vault-original" }]);
  assert.equal(f.calls.some(c => c[0] === "commit"), false);
});

test("demo retries keep original payload and duplicate invocations do not start a second seed", async () => {
  const wait = deferred(), payloads = [];
  const f = fixture({
    seedSmartNotesProductThinkingDemo: async payload => {
      payloads.push(payload);
      if (payloads.length === 1) throw Object.assign(new Error("boot"), { code: "api_unavailable" });
      return { directoryId: "demo" };
    }, waitForRetry: () => wait.promise
  });
  const work = f.run();
  assert.equal(await f.run(), false);
  wait.resolve(); assert.equal(await work, true);
  assert.equal(payloads.length, 2);
  assert.equal(payloads[0], payloads[1]);
});

test("late theme refresh does not start a graph refresh or overwrite feedback on the new page", async () => {
  const themes = deferred(), f = fixture({ loadWritingThemeIndexes: () => themes.promise });
  const work = f.run({ source: "settings-help" });
  await new Promise(resolve => setImmediate(resolve));
  f.state.module = "writing";
  const callsBefore = f.calls.length;
  themes.resolve(); assert.equal(await work, true);
  assert.equal(f.calls.length, callsBefore);
  assert.equal(f.state.module, "writing");
});

test("startup locked import can stage and open the existing guide", async () => {
  const f = fixture({ seedSmartNotesProductThinkingDemo: async () => { throw new Error("locked"); } });
  f.state.notes = [];
  assert.equal(await f.run({ startup: true }), true);
  assert.deepEqual(f.calls.filter(c => c[0] === "open"), [["open", "guide"]]);
  assert.match(f.calls.at(-1)[1], /保留你的修改/);
});

test("startup fallback also abandons staged data after navigation", async () => {
  const folders = deferred(), f = fixture({
    seedSmartNotesProductThinkingDemo: async () => { throw new Error("locked"); }, fetchDirectories: () => folders.promise
  });
  f.state.notes = [];
  const work = f.run({ startup: true });
  await new Promise(resolve => setImmediate(resolve));
  f.state.module = "writing";
  const before = structuredClone(f.state);
  folders.resolve([{ id: "demo", name: "Smart Notes 产品思考 Demo" }]);
  assert.equal(await work, false);
  assert.deepEqual(f.state, before);
});
