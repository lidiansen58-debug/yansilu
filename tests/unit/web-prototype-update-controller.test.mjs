import test from "node:test";
import assert from "node:assert/strict";

import { createPrototypeUpdateController, renderUpdateSettingsCard } from "../../apps/web/src/prototype-update-controller.js";
import { createUpdateState } from "../../apps/web/src/update-state.js";

function createElement() {
  return {
    disabled: false,
    textContent: "",
    innerHTML: "",
    checked: false,
    classList: { toggle() {} }
  };
}

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

test("prototype update controller loads settings and persists manual update checks", async () => {
  const storage = new Map([
    ["settings", JSON.stringify({ autoCheckEnabled: false, ignoredVersion: "0.1.1" })],
    ["last-result", JSON.stringify({ status: "idle", currentVersion: "0.1.1" })]
  ]);
  const settingsState = { update: createUpdateState() };
  const rendered = [];
  const statuses = [];
  const messages = [];

  const controller = createPrototypeUpdateController({
    settingsState,
    updateSettingsKey: "settings",
    updateLastResultKey: "last-result",
    appVersion: "0.1.1",
    readStoredText: (key, fallback = "") => storage.get(key) || fallback,
    writeStoredText: (key, value) => storage.set(key, value),
    fetchAppVersion: async () => ({ version: "0.1.1", manifestUrl: "https://example.test/update.json" }),
    checkAppUpdate: async () => ({
      status: "update-available",
      currentVersion: "0.1.1",
      latestVersion: "0.1.2",
      manifest: {
        version: "0.1.2",
        changelog: ["Fixes"],
        downloadUrl: "https://example.test/download"
      }
    }),
    renderSettingsPanel: () => rendered.push("settings"),
    renderSystemMessages: () => rendered.push("messages"),
    setStatus: (text, tone) => statuses.push({ text, tone }),
    upsertSystemMessage: (message) => messages.push(message)
  });

  controller.loadUpdateSettingsFromStorage();
  assert.equal(settingsState.update.autoCheckEnabled, false);

  await controller.refreshAppVersionInfo();
  const result = await controller.runAppUpdateCheck({ manual: true });

  assert.equal(result.status, "update-available");
  assert.equal(result.latestVersion, "0.1.2");
  assert.equal(JSON.parse(storage.get("last-result")).latestVersion, "0.1.2");
  assert.equal(messages[0].type, "app_update");
  assert.equal(statuses[0].tone, "warn");
  assert.ok(rendered.includes("settings"));
  assert.ok(rendered.includes("messages"));
});

test("prototype update card disables in-app install when desktop check is not installable", async () => {
  await withWindow({ __TAURI__: { core: { async invoke() {} } } }, async () => {
    const elements = new Map();
    const $ = (id) => {
      if (!elements.has(id)) elements.set(id, createElement());
      return elements.get(id);
    };
    const settingsState = {
      update: createUpdateState({
        status: "update-available",
        latestVersion: "0.2.0",
        installable: false
      })
    };

    renderUpdateSettingsCard({ $, escapeHtml: (value = "") => String(value), settingsState, appVersion: "0.1.0" });

    assert.equal(elements.get("settingsInstallUpdate").disabled, true);
    assert.match(elements.get("settingsUpdateDownloadHint").textContent, /手动安装|下载/);
  });
});

test("prototype update card keeps retry and download actions available after failure", async () => {
  await withWindow({
    __TAURI__: {
      process: { async relaunch() {} },
      updater: { async check() {} }
    }
  }, async () => {
    const elements = new Map();
    const $ = (id) => {
      if (!elements.has(id)) elements.set(id, createElement());
      return elements.get(id);
    };
    const settingsState = {
      update: createUpdateState({
        status: "failed",
        latestVersion: "0.2.0",
        downloadUrl: "https://example.test/download",
        installable: true,
        error: "network"
      })
    };

    renderUpdateSettingsCard({ $, escapeHtml: (value = "") => String(value), settingsState, appVersion: "0.1.0" });

    assert.equal(elements.get("settingsInstallUpdate").disabled, false);
    assert.equal(elements.get("settingsOpenUpdateDownload").disabled, false);
  });
});

test("prototype update controller falls back to manifest when desktop updater plugin is missing", async () => {
  await withWindow({
    __TAURI__: {
      core: {
        async invoke() {
          throw new Error("unknown command plugin:updater|check");
        }
      }
    }
  }, async () => {
    const settingsState = { update: createUpdateState() };
    const controller = createPrototypeUpdateController({
      settingsState,
      appVersion: "0.1.0",
      checkAppUpdate: async () => ({
        status: "update-available",
        currentVersion: "0.1.0",
        latestVersion: "0.1.1",
        manifest: { version: "0.1.1", changelog: ["Fallback"], downloadUrl: "https://example.test/download" }
      }),
      renderSettingsPanel: () => {},
      renderSystemMessages: () => {},
      setStatus: () => {},
      upsertSystemMessage: () => {}
    });

    const result = await controller.runAppUpdateCheck({ manual: true });

    assert.equal(result.status, "update-available");
    assert.equal(result.latestVersion, "0.1.1");
    assert.equal(result.downloadUrl, "https://example.test/download");
  });
});

test("prototype update controller starts installable desktop updates in the background", async () => {
  const storage = new Map();
  const settingsState = { update: createUpdateState({ currentVersion: "0.1.1" }) };
  const statuses = [];
  const progressEvents = [];

  await withWindow({
    __TAURI__: {
      process: {
        async relaunch() {}
      },
      updater: {
        async check() {
          return {
            currentVersion: "0.1.1",
            version: "0.1.2",
            body: "Small fix",
            async downloadAndInstall(onEvent) {
              onEvent({ event: "Started", data: { contentLength: 100 } });
              onEvent({ event: "Progress", data: { chunkLength: 25 } });
              progressEvents.push("download");
              onEvent({ event: "Finished" });
            }
          };
        }
      }
    }
  }, async () => {
    const controller = createPrototypeUpdateController({
      settingsState,
      updateLastResultKey: "last-result",
      appVersion: "0.1.1",
      readStoredText: (key, fallback = "") => storage.get(key) || fallback,
      writeStoredText: (key, value) => storage.set(key, value),
      renderSettingsPanel: () => {},
      renderSystemMessages: () => {},
      setStatus: (text, tone) => statuses.push({ text, tone }),
      upsertSystemMessage: () => {}
    });

    const checked = await controller.runAppUpdateCheck({ manual: false });
    assert.equal(checked.status, "downloading");
    await controller.queueBackgroundUpdateDownload({ await: true });

    assert.equal(progressEvents.length, 1);
    assert.equal(settingsState.update.status, "downloaded");
    assert.equal(settingsState.update.installReadyForRestart, true);
    assert.match(statuses[0].text, /后台下载/);
    assert.match(statuses.at(-1).text, /重启完成更新/);
    assert.equal(JSON.parse(storage.get("last-result")).installReadyForRestart, true);
  });
});

test("prototype update controller defers restart while notes or workflows are active", async () => {
  const settingsState = {
    update: createUpdateState({
      status: "downloaded",
      latestVersion: "0.1.2",
      installReadyForRestart: true
    })
  };
  const statuses = [];
  const relaunchCalls = [];

  await withWindow({
    confirm: () => true,
    __TAURI__: {
      updater: {
        async check() {
          return null;
        }
      },
      process: {
        async relaunch() {
          relaunchCalls.push("relaunch");
        }
      }
    }
  }, async () => {
    const controller = createPrototypeUpdateController({
      settingsState,
      renderSettingsPanel: () => {},
      setStatus: (text, tone) => statuses.push({ text, tone }),
      getDirtyTabCount: () => 1,
      getRestartBlockers: () => ["写作流程仍在处理中"]
    });

    const restarted = await controller.relaunchAfterInstalledUpdate();

    assert.equal(restarted, false);
    assert.deepEqual(relaunchCalls, []);
    assert.equal(statuses.at(-1).tone, "warn");
    assert.match(statuses.at(-1).text, /当前不重启/);
  });
});
