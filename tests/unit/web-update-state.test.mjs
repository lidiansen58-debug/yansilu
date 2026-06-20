import test from "node:test";
import assert from "node:assert/strict";

import {
  createUpdateState,
  shouldAutoCheckForUpdates,
  updateStateAutoCheckEnabled,
  updateStateChecking,
  updateStateFromCheckResult,
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
  assert.equal(updateStatusTone(state), "bad");
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
  const state = updateStateRemindLater(createUpdateState(), {
    nowMs,
    delayMs: 2 * 60 * 60 * 1000
  });

  assert.equal(state.remindAfter, "2026-06-20T02:00:00.000Z");
  assert.equal(shouldAutoCheckForUpdates(state, { nowMs: Date.parse("2026-06-20T01:00:00.000Z") }), false);
});

test("web update state records ignored latest version", () => {
  const state = updateStateIgnoreLatest(createUpdateState({
    latestVersion: "0.1.2",
    status: "update-available"
  }));

  assert.equal(state.ignoredVersion, "0.1.2");
});
