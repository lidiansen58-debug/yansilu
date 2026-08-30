import test from "node:test";
import assert from "node:assert/strict";
import { handleNoteMoveStateChange } from "../../apps/web/src/app-shell-state-file-actions.js";
import { handleSaveNoteStateChange } from "../../apps/web/src/app-shell-save-note-state-actions.js";
import { installSettingsEventBindings } from "../../apps/web/src/settings-event-bindings.js";
import { ExplorerPane } from "../../apps/web/src/components-explorer-pane.js";

function switchHarness(state, switchVault, restored = false) {
  let click;
  const elements = new Map([
    [restored ? "settingsOpenRestoredVault" : "settingsSwitchVault", { addEventListener: (_event, handler) => { click = handler; } }],
    ["settingsVaultPath", { value: "next-vault" }]
  ]);
  installSettingsEventBindings({
    $: id => elements.get(id), state,
    settingsState: { backup: { lastRestore: { vaultPath: "restored-vault" } } },
    editor: { confirmDiscardDirtyTabs: () => true },
    desktopCommands: { switchVault }
  });
  return () => click();
}

async function unresolvedMove(state, fetchNote, extra = {}) {
  let retry, cleared = false;
  await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, {
    state, moveTimeoutMs: 2, verifyTimeoutMs: 100,
    moveNote: async () => { throw Object.assign(new Error("offline"), { code: "api_unavailable" }); },
    fetchNote,
    showMoveRecovery: callback => { retry = callback; return () => { cleared = true; }; },
    ...extra
  });
  return { retry: () => retry(), cleared: () => cleared };
}

test("vault switching waits for an in-flight move recheck, then invalidates its old scope", async () => {
  const state = { notes: [{ id: "n1" }], tabs: [] };
  let resolveRead, reads = 0, applied = 0;
  const recovery = await unresolvedMove(state, () => {
    if (++reads === 1) return { id: "n1", directoryId: "d1", body: "old" };
    return new Promise(resolve => { resolveRead = resolve; });
  }, { moveNoteInClientState: () => { applied++; } });
  const pending = recovery.retry();
  await Promise.resolve();
  let switches = 0;
  const openVault = switchHarness(state, async () => { switches++; return { vaultPath: "next-vault" }; });
  await openVault();
  assert.equal(switches, 0);
  assert.equal(state.unresolvedNoteMove.noteId, "n1");
  resolveRead({ id: "n1", directoryId: "d2", body: "old vault content" });
  assert.equal(await pending, true);
  assert.equal(applied, 1);
  await openVault();
  assert.equal(switches, 1);
  assert.equal(recovery.cleared(), true);
  assert.equal(state.unresolvedNoteMove, null);
  assert.equal(await recovery.retry(), false);
  assert.equal(reads, 2);
  let posts = 0;
  await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d3" }, {
    state, moveNote: async () => { posts++; return { id: "n1", directoryId: "d3", body: "new" }; }
  });
  assert.equal(posts, 1);
});

test("blocked vault switch preserves protection and recheck remains usable", async () => {
  const state = { notes: [{ id: "n1" }], tabs: [] };
  let reads = 0, applied = 0;
  const recovery = await unresolvedMove(state, async () => ({ id: "n1", directoryId: ++reads === 1 ? "d1" : "d2", body: "confirmed" }), {
    moveNoteInClientState: () => { applied++; }
  });
  await switchHarness(state, () => assert.fail("unresolved move must block switching"))();
  assert.equal(reads, 1);
  assert.equal(state.unresolvedNoteMove.noteId, "n1");
  assert.equal(recovery.cleared(), false);
  assert.equal(await recovery.retry(), true);
  assert.equal(applied, 1);
});

test("vault switch is rejected while a move request is pending", async () => {
  const state = { pendingNoteMoveId: "n1", notes: [{ id: "n1" }], tabs: [] };
  let switches = 0;
  await switchHarness(state, async () => { switches++; return {}; })();
  assert.equal(switches, 0);
  assert.equal(state.notes.length, 1);
});

test("renaming a protected note rolls back its title and never reports success", async () => {
  const state = { notes: [{ id: "n1", title: "Original" }], unresolvedNoteMove: { noteId: "n1" } };
  const messages = [];
  await ExplorerPane.prototype.handleContextAction.call({
    state, requestTextInput: async () => "Changed",
    onStatus: (message, tone) => messages.push({ message, tone }),
    onStateChange: (reason, payload) => reason === "save-note" ? handleSaveNoteStateChange(payload, {
      state, updateNote: () => assert.fail("protected note must not be saved")
    }) : true
  }, "rename", { kind: "file", id: "n1" });
  assert.equal(state.notes[0].title, "Original");
  assert.equal(messages.some(item => item.tone === "ok"), false);
});

test("opening a restored vault also waits for move recovery", async () => {
  const state = { notes: [{ id: "n1" }], tabs: [] };
  let reads = 0;
  const recovery = await unresolvedMove(state, async () => {
    reads++;
    return { id: "n1", directoryId: "d1", body: "old" };
  });
  await switchHarness(state, () => assert.fail("restore entry must not bypass move protection"), true)();
  assert.equal(recovery.cleared(), false);
  assert.equal(state.unresolvedNoteMove.noteId, "n1");
  assert.equal(await recovery.retry(), false);
  assert.equal(reads, 2);
});
