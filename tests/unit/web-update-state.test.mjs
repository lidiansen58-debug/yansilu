import test from "node:test";
import assert from "node:assert/strict";

import {
  createUpdateState,
  shouldAutoCheckForUpdates,
  shouldShowUpdateAttention,
  updateStateAutoCheckEnabled,
  updateStateChecking,
  updateStateDownloaded,
  updateStateDownloading,
  updateStateFromCheckResult,
  updateStateFromVersionInfo,
  updateStateIgnoreLatest,
  updateStateRemindLater,
  updateStatusTone
} from "../../apps/web/src/update-state.js";

test("web update state lets users disable automatic checks", () => {
  const state = updateStateAutoCheckEnabled(createUpdateState(), false);

  assert.equal(state.autoCheckEnabled, false);
  assert.equal(state.status, "disabled");
  assert.equal(shouldAutoCheckForUpdates(state, { nowMs: Date.parse("2026-06-20T00:00:00.000Z") }), false);
});

test("web update state clears restart prompt after the new version is running", () => {
  const state = updateStateFromVersionInfo(createUpdateState({
    status: "downloaded",
    latestVersion: "0.1.2",
    installReadyForRestart: true,
    installPhase: "installed",
    installProgress: { percent: 100 }
  }), {
    version: "0.1.2"
  });

  assert.equal(state.status, "up-to-date");
  assert.equal(state.installReadyForRestart, false);
  assert.equal(state.installProgress, null);
});

test("web update state allows manual checks even after disabled state is visible", () => {
  const disabled = updateStateAutoCheckEnabled(createUpdateState(), false);
  const checking = updateStateChecking(disabled, { manual: true });

  assert.equal(checking.status, "checking");
  assert.equal(checking.manualCheckCount, 1);
});

test("web update state applies manual check update result", () => {
  const state = updateStateFromCheckResult(
    createUpdateState({ currentVersion: "0.1.1-beta.1" }),
    {
      status: "update-available",
      currentVersion: "0.1.1-beta.1",
      latestVersion: "0.1.2",
      checkedAt: "2026-06-20T01:00:00.000Z",
      critical: true,
      manifest: {
        version: "0.1.2",
        critical: true,
        changelog: ["Important fix."],
        downloadUrl: "https://example.test/download"
      }
    },
    { manual: true }
  );

  assert.equal(state.status, "update-available");
  assert.equal(state.latestVersion, "0.1.2");
  assert.equal(state.downloadUrl, "https://example.test/download");
  assert.equal(state.installable, false);
  assert.equal(updateStatusTone(state), "bad");
});

test("web update state preserves desktop installability from check result", () => {
  const state = updateStateFromCheckResult(createUpdateState(), {
    status: "update-available",
    latestVersion: "0.2.0",
    installable: true
  });

  assert.equal(state.installable, true);
});

test("web update state suppresses ignored versions during automatic checks", () => {
  const initial = createUpdateState({ ignoredVersion: "0.1.2" });
  const state = updateStateFromCheckResult(initial, {
    status: "update-available",
    latestVersion: "0.1.2",
    manifest: { version: "0.1.2" }
  });

  assert.equal(state.status, "idle");
});

test("web update state can remind later", () => {
  const nowMs = Date.parse("2026-06-20T00:00:00.000Z");
  const state = updateStateRemindLater(createUpdateState({
    status: "update-available",
    latestVersion: "0.1.2"
  }), {
    nowMs,
    delayMs: 2 * 60 * 60 * 1000
  });

  assert.equal(state.remindAfter, "2026-06-20T02:00:00.000Z");
  assert.equal(shouldAutoCheckForUpdates(state, { nowMs: Date.parse("2026-06-20T01:00:00.000Z") }), false);
  assert.equal(shouldShowUpdateAttention(state, { nowMs: Date.parse("2026-06-20T01:00:00.000Z") }), false);
  assert.equal(shouldShowUpdateAttention(state, { nowMs: Date.parse("2026-06-20T03:00:00.000Z") }), true);
});

test("web update state records ignored latest version", () => {
  const state = updateStateIgnoreLatest(createUpdateState({
    latestVersion: "0.1.2",
    status: "update-available"
  }));

  assert.equal(state.ignoredVersion, "0.1.2");
  assert.equal(shouldShowUpdateAttention(state), false);
});

test("web update state tracks desktop install progress and restart readiness", () => {
  const downloading = updateStateDownloading(createUpdateState({
    status: "update-available",
    latestVersion: "0.1.2"
  }), {
    phase: "downloading",
    downloadedBytes: 40,
    totalBytes: 100,
    percent: 40
  });

  assert.equal(downloading.status, "downloading");
  assert.equal(downloading.installProgress.percent, 40);
  assert.equal(downloading.installReadyForRestart, false);

  const downloaded = updateStateDownloaded(downloading, {
    message: "更新已安装，重启后生效。"
  });

  assert.equal(downloaded.status, "downloaded");
  assert.equal(downloaded.installProgress.percent, 100);
  assert.equal(downloaded.installReadyForRestart, true);
});
