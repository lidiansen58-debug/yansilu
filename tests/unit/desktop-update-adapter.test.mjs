import test from "node:test";
import assert from "node:assert/strict";

import {
  checkDesktopUpdate,
  downloadAndInstallDesktopUpdate,
  isDesktopUpdaterAvailable,
  normalizeDesktopDownloadEvent,
  relaunchDesktopApp
} from "../../apps/web/src/desktop-update-adapter.js";

function withWindow(windowValue, run) {
  const previousWindow = globalThis.window;
  globalThis.window = windowValue;
  return Promise.resolve()
    .then(run)
    .finally(() => {
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    });
}

test("desktop update adapter reports unsupported outside Tauri", async () => {
  await withWindow({}, async () => {
    assert.equal(isDesktopUpdaterAvailable(), false);
    const result = await checkDesktopUpdate();
    assert.equal(result.supported, false);
    assert.equal(result.available, false);
  });
});

test("desktop update adapter downloads and installs through Tauri updater", async () => {
  const progressEvents = [];
  const closeCalls = [];
  await withWindow({
    __TAURI__: {
      process: {
        async relaunch() {}
      },
      updater: {
        async check() {
          return {
            currentVersion: "0.1.1-beta.1",
            version: "0.1.2",
            async downloadAndInstall(onEvent) {
              onEvent({ event: "Started", data: { contentLength: 100 } });
              onEvent({ event: "Progress", data: { chunkLength: 40 } });
              onEvent({ event: "Progress", data: { chunkLength: 60 } });
              onEvent({ event: "Finished" });
            },
            async close() {
              closeCalls.push("close");
            }
          };
        }
      }
    }
  }, async () => {
    assert.equal(isDesktopUpdaterAvailable(), true);
    const result = await downloadAndInstallDesktopUpdate({
      onProgress(progress) {
        progressEvents.push(progress);
      }
    });

    assert.equal(result.status, "installed");
    assert.equal(result.metadata.version, "0.1.2");
    assert.equal(result.progress.phase, "installed");
    assert.equal(result.progress.percent, 100);
    assert.equal(progressEvents.at(-1).percent, 100);
    assert.deepEqual(closeCalls, ["close"]);
  });
});

test("desktop update adapter normalizes download progress events", () => {
  const started = normalizeDesktopDownloadEvent({ event: "Started", data: { contentLength: 200 } });
  const progress = normalizeDesktopDownloadEvent({ event: "Progress", data: { chunkLength: 50 } }, started);
  const finished = normalizeDesktopDownloadEvent({ event: "Finished" }, progress);

  assert.equal(started.totalBytes, 200);
  assert.equal(progress.downloadedBytes, 50);
  assert.equal(progress.percent, 25);
  assert.equal(finished.phase, "installing");
});

test("desktop update adapter relaunches through process plugin", async () => {
  const calls = [];
  await withWindow({
    __TAURI__: {
      updater: {
        async check() {
          return null;
        }
      },
      process: {
        async relaunch() {
          calls.push("relaunch");
        }
      }
    }
  }, async () => {
    const result = await relaunchDesktopApp();
    assert.equal(result.ok, true);
    assert.deepEqual(calls, ["relaunch"]);
  });
});
