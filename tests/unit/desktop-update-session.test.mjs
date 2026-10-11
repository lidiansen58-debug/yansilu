import test from "node:test";
import assert from "node:assert/strict";
import { createDesktopUpdateSession } from "../../apps/web/src/desktop-update-session.js";
import { createPrototypeUpdateController } from "../../apps/web/src/prototype-update-controller.js";
import { createUpdateState } from "../../apps/web/src/update-state.js";

function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
function fixture(overrides = {}) {
  const calls = [];
  const update = { version: "next", async download(emit) {
    calls.push("download"); emit({ event: "Started", data: { contentLength: 10 } });
    emit({ event: "Progress", data: { chunkLength: 10 } }); emit({ event: "Finished" });
  }, async install() { calls.push("install"); }, async close() { calls.push("close"); }, ...overrides };
  return { update, calls, session: createDesktopUpdateSession({ check: async () => ({ supported: true, update }) }) };
}

test("background download retains signed native bytes without installation; explicit install consumes them exactly once", async () => {
  const { session, calls } = fixture(), progress = [];
  await session.download({ version: "next", onProgress: event => progress.push(event) });
  assert.deepEqual(calls, ["download"]); assert.equal(session.has("next"), true);
  assert.equal(progress.at(-1).phase, "downloaded");
  await session.download({ version: "next" }); assert.deepEqual(calls, ["download"]);
  await session.install("next"); await session.install("next");
  assert.deepEqual(calls, ["download", "install", "close"]);
});

test("a newer announced version cannot replace the approved downloaded version", async () => {
  const { session, calls } = fixture({ version: "changed" });
  await assert.rejects(session.download({ version: "next" }), /版本已变化/);
  assert.deepEqual(calls, ["close"]);
  await assert.rejects(session.install("next"), /已失效/);
});

test("signature or network failure releases the update and cannot leave an installable payload", async () => {
  const { session, calls } = fixture({ async download() { throw new Error("signature rejected"); } });
  await assert.rejects(session.download({ version: "next" }), /signature rejected/);
  assert.deepEqual(calls, ["close"]); assert.equal(session.has("next"), false);
  await assert.rejects(session.install("next"), /已失效/);
});

test("discarding while a download is pending invalidates its late bytes and releases its native resource", async () => {
  const started = deferred(), finished = deferred();
  const { session, calls } = fixture({ async download() { started.resolve(); await finished.promise; } });
  const pending = session.download({ version: "next" }); await started.promise;
  await session.discard(); finished.resolve();
  await assert.rejects(pending, /已失效/);
  assert.deepEqual(calls, ["close"]); assert.equal(session.has("next"), false);
});

test("failed native installation retains downloaded bytes for retry", async () => {
  let attempts = 0;
  const { session, calls } = fixture({ async install() { attempts++; if (attempts === 1) throw new Error("installer busy"); } });
  await session.download({ version: "next" });
  await assert.rejects(session.install("next"), /installer busy/);
  assert.equal(session.has("next"), true); assert.deepEqual(calls, ["download"]);
  await session.install("next"); assert.equal(attempts, 2); assert.deepEqual(calls, ["download", "close"]);
});

test("pending installation rejects duplicate installation, replacement and disposal", async () => {
  const started = deferred(), finished = deferred();
  const { session, calls } = fixture({ async install() { started.resolve(); await finished.promise; } });
  await session.download({ version: "next" });
  const pending = session.install("next"); await started.promise;
  await assert.rejects(session.install("next"), /正在安装/);
  await assert.rejects(session.download({ version: "other" }), /正在安装/);
  await assert.rejects(session.discard(), /正在安装/);
  finished.resolve(); await pending; assert.deepEqual(calls, ["download", "close"]);
});

async function withNative(run) {
  const previous = globalThis.window, calls = [], statuses = [];
  const installation = deferred(), installStarted = deferred();
  let dirty = 0, holdInstall = false;
  const update = { version: "next", async download() { calls.push("download"); }, async install() {
    calls.push("install"); installStarted.resolve(); if (holdInstall) await installation.promise;
  }, async close() { calls.push("close"); } };
  globalThis.window = { confirm: async () => true, __TAURI__: {
    updater: { check: async () => update }, process: { async relaunch() { calls.push("relaunch"); } }
  } };
  const settingsState = { update: createUpdateState({ status: "update-available", latestVersion: "next", installable: true }) };
  const controller = createPrototypeUpdateController({ settingsState, getDirtyTabCount: () => dirty,
    setStatus: text => statuses.push(text) });
  try {
    await controller.installUpdateFromDesktopUpdater();
    await run({ controller, settingsState, calls, statuses, installStarted,
      dirty: value => { dirty = value; }, hold: () => { holdInstall = true; }, release: installation.resolve });
  } finally { installation.resolve(); if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
}

test("dirty notes block installation, and a later explicit approval installs before relaunch", async () => withNative(async h => {
  h.dirty(1); assert.equal(await h.controller.relaunchAfterInstalledUpdate(), false);
  assert.deepEqual(h.calls, ["download"]);
  h.dirty(0); assert.equal(await h.controller.relaunchAfterInstalledUpdate(), true);
  assert.deepEqual(h.calls, ["download", "install", "close", "relaunch"]);
}));

test("new unsaved input during native installation defers relaunch and never reinstalls the same package", async () => withNative(async h => {
  h.hold(); const pending = h.controller.relaunchAfterInstalledUpdate(); await h.installStarted.promise;
  h.dirty(1); h.release(); assert.equal(await pending, false);
  assert.deepEqual(h.calls, ["download", "install", "close"]);
  assert.match(h.statuses.at(-1), /更新已安装.*当前不重启/);
  h.dirty(0); assert.equal(await h.controller.relaunchAfterInstalledUpdate(), true);
  assert.deepEqual(h.calls, ["download", "install", "close", "relaunch"]);
}));

test("a stored ready flag cannot install native bytes lost on a full page or application restart", async () => {
  const state = { update: createUpdateState() };
  const controller = createPrototypeUpdateController({ settingsState: state, readStoredText: key => key === "last" ? JSON.stringify({ status: "downloaded", latestVersion: "next", installReadyForRestart: true }) : "", updateLastResultKey: "last" });
  controller.loadUpdateSettingsFromStorage();
  assert.equal(state.update.installReadyForRestart, false); assert.equal(state.update.status, "idle");
});

test("a newer check during a held download releases old bytes and stages only the new announced version", async () => {
  const previous = globalThis.window, started = deferred(), finished = deferred(), calls = [];
  let version = "first";
  globalThis.window = { confirm: async () => true, __TAURI__: {
    updater: { async check() {
      const selected = version; let closed = false;
      return { version: selected, async download() {
        assert.equal(closed, false); calls.push(`download:${selected}`);
        if (selected === "first") { started.resolve(); await finished.promise; }
      }, async install() { assert.equal(closed, false); calls.push(`install:${selected}`); }, async close() { closed = true; } };
    } }, process: { async relaunch() { calls.push("relaunch"); } }
  } };
  const settingsState = { update: createUpdateState() }, controller = createPrototypeUpdateController({ settingsState });
  try {
    await controller.runAppUpdateCheck({ manual: true }); await started.promise;
    const old = controller.queueBackgroundUpdateDownload({ await: true });
    version = "second"; await controller.runAppUpdateCheck({ manual: true });
    assert.deepEqual(calls, ["download:first"]);
    finished.resolve(); await old; await controller.queueBackgroundUpdateDownload({ await: true });
    assert.equal(settingsState.update.latestVersion, "second"); assert.equal(settingsState.update.status, "downloaded");
    assert.deepEqual(calls, ["download:first", "download:second"]);
    assert.equal(await controller.relaunchAfterInstalledUpdate(), true);
    assert.deepEqual(calls, ["download:first", "download:second", "install:second", "relaunch"]);
  } finally { finished.resolve(); if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
});
