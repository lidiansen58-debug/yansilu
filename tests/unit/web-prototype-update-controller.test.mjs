import test from "node:test";
import assert from "node:assert/strict";

import { createPrototypeUpdateController } from "../../apps/web/src/prototype-update-controller.js";
import { createUpdateState } from "../../apps/web/src/update-state.js";

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
