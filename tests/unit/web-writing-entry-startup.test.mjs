import test from "node:test";
import assert from "node:assert/strict";
import { createWritingEntryRuntimeController } from "../../apps/web/src/writing-entry-runtime-controller.js";
import { loadWritingThemeIndexesForRuntime } from "../../apps/web/src/writing-theme-index-loader.js";

function fixture() {
  let resolveStartup, path = "";
  const pending = new Promise(resolve => { resolveStartup = resolve; });
  const state = { module: "writing", appStartupPending: true, noteMoveVaultScope: {} };
  const writingState = { project: null, projectFilters: {}, projects: [], themeIndexes: [] };
  const calls = [];
  let basket = [];
  state.retryStartupConnection = () => pending.then(connected => { state.appStartupPending = false; return connected; });
  const controller = createWritingEntryRuntimeController(() => ({ state, writingState, getVaultPath: () => path,
    parseWritingBasketIds: () => basket, activateModule: module => { state.module = module; },
    renderWritingPanel: () => calls.push(["render", state.module]),
    listWritingProjects: async () => { calls.push(["projects", path]); return [{ id: "existing-project" }]; },
    listIndexCards: async () => { calls.push(["themes", path]); return [{ id: "existing-theme" }]; },
    setStatus: message => calls.push(["status", message]) }));
  return { controller, state, writingState, calls, resolveStartup,
    setPath: value => { path = value; }, setBasket: value => { basket = value; } };
}

test("a writing entry waits for first startup and reads only after the real vault path is known", async () => {
  const f = fixture(), opening = f.controller.openWritingModule();
  assert.equal(f.writingState.loadingProjects, true);
  assert.equal(f.writingState.loadingThemeIndexes, true);
  assert.equal(f.calls.some(([action]) => action === "projects" || action === "themes"), false);
  f.setPath("/actual-library"); f.resolveStartup(true); await opening;
  assert.deepEqual(f.calls.filter(([action]) => action === "projects" || action === "themes"), [["projects", "/actual-library"], ["themes", "/actual-library"]]);
  assert.deepEqual(f.writingState.projects, [{ id: "existing-project" }]);
  assert.deepEqual(f.writingState.themeIndexes, [{ id: "existing-theme" }]);
  assert.equal(f.writingState.loadingProjects, false);
  assert.equal(f.writingState.loadingThemeIndexes, false);
});

test("leaving writing while startup is pending never starts late writing reads or announces success", async () => {
  const f = fixture(), opening = f.controller.openWritingModule();
  f.state.module = "today";
  f.setPath("/actual-library"); f.resolveStartup(true); await opening;
  assert.equal(f.calls.some(([action]) => ["projects", "themes", "status"].includes(action)), false);
  assert.equal(f.state.module, "today");
  assert.equal(f.writingState.loadingProjects, false);
  assert.equal(f.writingState.loadingThemeIndexes, false);
});

test("a pending writing entry cannot adopt a switched vault or different project", async () => {
  for (const change of [f => { f.state.noteMoveVaultScope = {}; },
    f => { f.writingState.project = { id: "new-project" }; }, f => { f.writingState.projectOpenRevision = 1; }]) {
    const f = fixture(), opening = f.controller.openWritingModule();
    change(f); f.writingState.projects = [{ id: "keep-new-context" }];
    f.setPath("/actual-library"); f.resolveStartup(true); await opening;
    assert.equal(f.calls.some(([action]) => ["projects", "themes", "status"].includes(action)), false);
    assert.deepEqual(f.writingState.projects, [{ id: "keep-new-context" }]);
    assert.equal(f.writingState.loadingProjects, true, "do not clear a changed context's loading flag");
  }
});

test("a basket change cancels the waiting entry and clears only its obsolete metadata loading state", async () => {
  const f = fixture(), opening = f.controller.openWritingModule();
  f.setBasket(["new-note"]);
  f.setPath("/actual-library"); f.resolveStartup(true); await opening;
  assert.equal(f.calls.some(([action]) => ["projects", "themes", "status"].includes(action)), false);
  assert.equal(f.writingState.loadingProjects, false);
  assert.equal(f.writingState.loadingThemeIndexes, false);
  assert.equal(f.calls.at(-1)[0], "render");
});

test("only the latest writing entry resumes after their shared startup promise", async () => {
  const f = fixture();
  const old = f.controller.openWritingModule({ statusMessage: "old" });
  const latest = f.controller.openWritingModule({ statusMessage: "latest" });
  f.setPath("/actual-library"); f.resolveStartup(true); await Promise.all([old, latest]);
  assert.equal(f.calls.filter(([action]) => action === "projects").length, 1);
  assert.deepEqual(f.calls.filter(([action]) => action === "status"), [["status", "latest"]]);
  assert.equal(f.writingState.loadingProjects, false);
});

test("a fresh entry after library readiness supersedes an older still-waiting startup entry", async () => {
  const f = fixture(), old = f.controller.openWritingModule({ statusMessage: "old" });
  f.state.appStartupPending = false; f.setPath("/actual-library");
  await f.controller.openWritingModule({ statusMessage: "fresh" });
  f.resolveStartup(true); await old;
  assert.equal(f.calls.filter(([action]) => action === "projects").length, 1);
  assert.deepEqual(f.calls.filter(([action]) => action === "status"), [["status", "fresh"]]);
});

test("failed startup leaves writing data intact and does not claim an opened workspace", async () => {
  for (const rejected of [false, true]) {
    const f = fixture();
    if (rejected) f.state.retryStartupConnection = async () => { throw new Error("startup failed"); };
    const opening = f.controller.openWritingModule();
    if (!rejected) { f.state.appStartupError = "startup failed"; f.resolveStartup(false); }
    await opening;
    assert.equal(f.calls.some(([action]) => ["projects", "themes", "status"].includes(action)), false);
    assert.deepEqual(f.writingState.projects, []);
    assert.equal(f.writingState.loadingProjects, false);
    assert.equal(f.writingState.loadingThemeIndexes, false);
  }
});

test("resolving startup cannot silently replace a previously known vault path", async () => {
  const f = fixture(); f.setPath("/known-original");
  const opening = f.controller.openWritingModule();
  f.setPath("/unexpected-library"); f.resolveStartup(true); await opening;
  assert.equal(f.calls.some(([action]) => ["projects", "themes", "status"].includes(action)), false);
});

for (const order of ["entry first", "theme refresh first"]) test(`a theme refresh retains ownership while an older startup entry finishes: ${order}`, async () => {
  const f = fixture(), opening = f.controller.openWritingModule();
  let releaseTheme;
  const refreshing = loadWritingThemeIndexesForRuntime({ writingState: f.writingState, directoryId: "latest-directory",
    renderWritingPanel: () => {}, listIndexCards: () => new Promise(resolve => { releaseTheme = resolve; }) });
  if (order === "theme refresh first") { releaseTheme([{ id: "latest-theme" }]); await refreshing; }
  f.setPath("/actual-library"); f.resolveStartup(true); await opening;
  if (order === "entry first") {
    assert.equal(f.writingState.loadingThemeIndexes, true);
    releaseTheme([{ id: "latest-theme" }]); await refreshing;
  }
  assert.deepEqual(f.writingState.themeIndexes, [{ id: "latest-theme" }]);
  assert.equal(f.writingState.loadingThemeIndexes, false);
  assert.equal(f.calls.filter(([action]) => action === "themes").length, 0);
});
