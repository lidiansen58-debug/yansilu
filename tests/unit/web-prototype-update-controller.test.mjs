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
