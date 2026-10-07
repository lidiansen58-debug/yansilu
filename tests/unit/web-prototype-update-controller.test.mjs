import test from "node:test";
import assert from "node:assert/strict";

import { createPrototypeUpdateController, renderUpdateSettingsCard } from "../../apps/web/src/prototype-update-controller.js";
import { createUpdateState, updateStateDownloaded } from "../../apps/web/src/update-state.js";
import { LOCAL_RELEASE_NOTES } from "../../apps/web/src/local-release-notes.js";
import { escapeHtml } from "../../apps/web/src/editor-render-utils.js";

for (const status of ["idle", "up-to-date", "update-available", "failed"]) {
  test(`local release notes remain available but collapsed with ${status} remote update state`, () => {
    const element = { innerHTML: "" };
    renderUpdateSettingsCard({
      $: id => id === "settingsUpdateChangelog" ? element : null,
      escapeHtml, appVersion: "0.1.0",
      settingsState: { update: createUpdateState({ status, latestVersion: "0.2.0", changelog: status === "idle" ? [] : ["Remote <notes>"] }) }
    });
    assert.match(element.innerHTML, /本机版本说明/);
    assert.match(element.innerHTML, /<details[^>]+id="settingsUpdateLocalNotes">/);
    for (const line of LOCAL_RELEASE_NOTES) assert.ok(element.innerHTML.includes(escapeHtml(line)));
    if (status !== "idle") {
      assert.match(element.innerHTML, /Remote &lt;notes&gt;/);
      assert.match(element.innerHTML, /远端版本说明/);
      assert.match(element.innerHTML, /0\.2\.0/);
    }
  });
}

function createElement() {
  const classes = new Set();
  return {
    disabled: false,
    textContent: "",
    innerHTML: "",
    checked: false,
    hidden: false,
    classes,
    classList: { toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); } }
  };
}

for (const [label, desktop, update, expected] of [
  ["browser idle", false, { status: "idle" }, { check: true, install: false, restart: false, download: false, primary: "settingsCheckUpdate" }],
  ["browser available", false, { status: "update-available", downloadUrl: "https://example.test/download" }, { check: true, install: false, restart: false, download: true, primary: "settingsOpenUpdateDownload" }],
  ["browser failed", false, { status: "failed", error: "network" }, { check: true, install: false, restart: false, download: false, primary: "settingsCheckUpdate" }],
  ["desktop fallback", true, { status: "update-available", downloadUrl: "https://example.test/download" }, { check: true, install: false, restart: false, download: true, primary: "settingsOpenUpdateDownload" }],
  ["desktop available", true, { status: "update-available", installable: true }, { check: true, install: true, restart: false, download: false, primary: "settingsInstallUpdate" }],
  ["desktop retry", true, { status: "failed", installable: true, downloadUrl: "https://example.test/download", error: "download failed" }, { check: true, install: true, restart: false, download: true, primary: "settingsInstallUpdate" }],
  ["desktop downloading", true, { status: "downloading", installable: true, installProgress: { percent: 42 } }, { check: false, install: true, restart: false, download: false, primary: "settingsInstallUpdate" }],
  ["desktop downloaded", true, updateStateDownloaded({ installable: true }, { message: "更新已下载，重启后更新。" }), { check: false, install: false, restart: true, download: false, primary: "settingsRelaunchUpdate" }]
]) {
  test(`update actions focus the next available task: ${label}`, async () => {
    await withWindow(desktop ? { __TAURI__: { updater: { async check() {} }, process: { async relaunch() {} } } } : {}, async () => {
      const elements = new Map();
      const $ = id => {
        if (!elements.has(id)) {
          const element = createElement();
          if (["settingsCheckUpdate", "settingsInstallUpdate", "settingsRelaunchUpdate"].includes(id)) element.classes.add("primary");
          elements.set(id, element);
        }
        return elements.get(id);
      };
      renderUpdateSettingsCard({ $, escapeHtml, settingsState: { update: createUpdateState(update) } });
      const controls = { check: "settingsCheckUpdate", install: "settingsInstallUpdate", restart: "settingsRelaunchUpdate", download: "settingsOpenUpdateDownload" };
      for (const [name, id] of Object.entries(controls)) assert.equal(!$(id).hidden, expected[name], id);
      assert.deepEqual(Object.values(controls).filter(id => !$(id).hidden && $(id).classes.has("primary")), [expected.primary]);
      if (update.status === "downloaded") {
        assert.equal($("settingsUpdateError").textContent, "");
        assert.ok($("settingsUpdateError").classes.has("hidden"));
        assert.match($("settingsUpdateDownloadHint").textContent, /更新已下载/);
      }
      if (update.status === "downloading") {
        assert.equal($("settingsInstallUpdate").disabled, true);
        assert.match($("settingsUpdateInstallProgress").textContent, /42%/);
      }
      if (update.error && update.status === "failed") assert.match($("settingsUpdateError").textContent, /更新失败/);
    });
  });
}

test("update rerenders preserve expanded local and remote release notes", () => {
  const element = { innerHTML: "", querySelector: () => ({ open: true }) };
  renderUpdateSettingsCard({
    $: id => id === "settingsUpdateChangelog" ? element : null,
    escapeHtml,
    settingsState: { update: createUpdateState({ changelog: ["Change"], latestVersion: "0.2.0" }) }
  });
  assert.match(element.innerHTML, /id="settingsUpdateLocalNotes" open/);
  assert.match(element.innerHTML, /id="settingsUpdateRemoteNotes" open/);
});

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

test("delayed automatic check does not erase a manual failure when automatic checks are disabled", async () => {
  const settingsState = { update: createUpdateState({ status: "failed", autoCheckEnabled: false, error: "network", checkedAt: "2026-10-06T00:00:00Z" }) };
  let checks = 0;
  const controller = createPrototypeUpdateController({ settingsState, checkAppUpdate: async () => { checks += 1; } });
  await controller.runAppUpdateCheck({ manual: false });
  assert.equal(checks, 0);
  assert.equal(settingsState.update.status, "failed");
  assert.equal(settingsState.update.error, "network");
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
