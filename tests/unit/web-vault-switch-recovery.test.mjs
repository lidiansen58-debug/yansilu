import test from "node:test";
import assert from "node:assert/strict";
import { switchVaultWithNoteMoveRecovery } from "../../apps/web/src/vault-switch-recovery.js";
import { handleNoteMoveStateChange } from "../../apps/web/src/app-shell-state-file-actions.js";
import { handleSaveNoteStateChange } from "../../apps/web/src/app-shell-save-note-state-actions.js";
import { loadSettingsVaultSnapshot } from "../../apps/web/src/settings-vault-switch.js";

function harness(extra = {}) {
  let retry, closed = false, uncertain = false;
  const options = { targetVaultPath: "B", switchTimeoutMs: 5, verifyTimeoutMs: 5, applyTimeoutMs: 5,
    createDialog: callback => {
      retry = callback;
      return { waiting() {}, uncertain() { uncertain = true; }, close() { closed = true; } };
    }, ...extra };
  return { options, retry: () => retry(), closed: () => closed, uncertain: () => uncertain };
}
const disconnected = () => Object.assign(new Error("response lost"), { code: "api_unavailable" });

test("lost switch response verifies target vault before replacing the old scope", async () => {
  let activeVault = "A", applied = "", posts = 0;
  const oldScope = {};
  const state = { noteMoveVaultScope: oldScope };
  const h = harness({ verifyVault: async () => ({ vaultPath: activeVault, targetVaultMatchesCurrent: activeVault === "B" }), commitVault: vault => { applied = vault.vaultPath; } });
  const result = await switchVaultWithNoteMoveRecovery(state, async () => {
    posts++; activeVault = "B"; throw disconnected();
  }, h.options);
  assert.equal(result.vaultPath, "B");
  assert.equal(applied, "B");
  assert.equal(posts, 1);
  assert.notEqual(state.noteMoveVaultScope, oldScope);
  assert.equal(h.closed(), true);
});

test("hanging switch and verification release busy state and expose a bounded read-only retry", async () => {
  const state = {};
  let reads = 0, posts = 0;
  const h = harness({ verifyVault: () => ++reads === 1 ? new Promise(() => {}) : { vaultPath: "B", targetVaultMatchesCurrent: true } });
  const result = await switchVaultWithNoteMoveRecovery(state, () => { posts++; return new Promise(() => {}); }, h.options);
  assert.equal(result, null);
  assert.equal(state.noteMoveVaultSwitching, false);
  assert.equal(state.noteMoveVaultUncertain, true);
  assert.equal(h.uncertain(), true);
  const saved = await handleSaveNoteStateChange({ noteId: "n1" }, { state, updateNote: () => assert.fail("must not write an unconfirmed vault") });
  assert.equal(saved.ok, false);
  assert.equal(await h.retry(), true);
  assert.equal(state.noteMoveVaultUncertain, false);
  assert.equal(posts, 1);
  assert.equal(h.closed(), true);
});

test("reading the old vault does not unlock a switch that can still commit", async () => {
  const oldScope = {};
  const state = { noteMoveVaultScope: oldScope };
  const h = harness({ verifyVault: async () => ({ vaultPath: "A", targetVaultMatchesCurrent: false }) });
  await switchVaultWithNoteMoveRecovery(state, async () => { throw disconnected(); }, h.options);
  assert.equal(await h.retry(), false);
  assert.equal(state.noteMoveVaultUncertain, true);
  assert.equal(state.noteMoveVaultScope, oldScope);
  assert.equal(h.closed(), false);
});

for (const code of ["VAULT_SWITCH_FAILED", "desktop_api_unavailable"]) {
test(`${code} keeps the old vault scope without an uncertain-vault lock`, async () => {
  const oldScope = {};
  const state = { noteMoveVaultScope: oldScope };
  const h = harness({ verifyVault: () => assert.fail("explicit rejection needs no speculative read") });
  await assert.rejects(switchVaultWithNoteMoveRecovery(state, async () => {
    throw Object.assign(new Error("invalid directory"), { code });
  }, h.options), /invalid directory/);
  assert.equal(state.noteMoveVaultSwitching, false);
  assert.equal(Boolean(state.noteMoveVaultUncertain), false);
  assert.equal(state.noteMoveVaultScope, oldScope);
  assert.equal(h.closed(), true);
  const next = harness();
  const result = await switchVaultWithNoteMoveRecovery(state, async () => ({ vaultPath: "B" }), next.options);
  assert.equal(result.vaultPath, "B");
  assert.equal(next.closed(), true);
});
}

test("failed client reload retains protection and retry only reloads the confirmed target", async () => {
  const state = {};
  let applies = 0, posts = 0;
  const h = harness({ verifyVault: async () => ({ vaultPath: "B", targetVaultMatchesCurrent: true }), loadVault: async () => {
    if (++applies === 1) throw new Error("read failed");
  } });
  await switchVaultWithNoteMoveRecovery(state, async () => { posts++; return { vaultPath: "B" }; }, h.options);
  assert.equal(state.noteMoveVaultUncertain, true);
  assert.equal(await h.retry(), true);
  assert.equal(posts, 1);
  assert.equal(applies, 2);
});

for (const code of ["VAULT_SWITCH_FAILED", "desktop_api_unavailable"]) {
test(`late ${code} rejection releases recovery without another POST`, async () => {
  const oldScope = {};
  const state = { noteMoveVaultScope: oldScope };
  let reject, feedback;
  const h = harness({ verifyVault: async () => ({ vaultPath: "A" }), onRejected: error => { feedback = error.message; } });
  await switchVaultWithNoteMoveRecovery(state, () => new Promise((_resolve, fail) => { reject = fail; }), h.options);
  reject(Object.assign(new Error("bad directory"), { code }));
  await Promise.resolve();
  await h.retry();
  assert.equal(state.noteMoveVaultUncertain, false);
  assert.equal(state.noteMoveVaultScope, oldScope);
  assert.equal(h.closed(), true);
  assert.equal(feedback, "bad directory");
});
}

test("expired snapshot cannot commit after retry and a later vault switch", async () => {
  const state = { folders: ["A"] };
  let finishOld, oldSignal, loads = 0;
  const h = harness({ loadVault: async (_vault, { signal }) => {
    if (++loads === 1) { oldSignal = signal; await new Promise(resolve => { finishOld = resolve; }); }
    return ["B"];
  }, commitVault: (_vault, snapshot) => { state.folders = snapshot; } });
  await switchVaultWithNoteMoveRecovery(state, async () => ({ vaultPath: "B" }), h.options);
  assert.equal(oldSignal.aborted, true);
  assert.deepEqual(state.folders, ["A"]);
  await h.retry();
  const next = harness({ loadVault: async () => ["C"], commitVault: (_vault, snapshot) => { state.folders = snapshot; } });
  await switchVaultWithNoteMoveRecovery(state, async () => ({ vaultPath: "C" }), next.options);
  finishOld();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(state.folders, ["C"]);
});

for (const delayedPart of ["directories", "notes"]) {
  test(`snapshot loader rejects stale ${delayedPart} without mutating shared state`, async () => {
    const state = { folders: ["A"], notes: ["old note"] };
    let finish, current = true, noteReads = 0;
    const signal = new AbortController().signal;
    const waiting = new Promise(resolve => { finish = resolve; });
    const pending = loadSettingsVaultSnapshot(state, {
      fetchDirectories: async (_hidden, options) => {
        assert.equal(options.signal, signal);
        if (delayedPart === "directories") await waiting;
        return [{ id: "B" }];
      },
      fetchDirectoryNotes: async (_id, options) => {
        noteReads++; assert.equal(options.signal, signal);
        if (delayedPart === "notes") await waiting;
        return [{ id: "new note" }];
      }, mapDirectoryItem: item => item, mapNoteItem: item => item
    }, { signal, isCurrent: () => current });
    await Promise.resolve(); await Promise.resolve();
    assert.deepEqual(state, { folders: ["A"], notes: ["old note"] });
    current = false; finish();
    await assert.rejects(pending, /加载已失效/);
    assert.deepEqual(state, { folders: ["A"], notes: ["old note"] });
    if (delayedPart === "directories") assert.equal(noteReads, 0);
  });
}

test("verification uses the backend path match for a canonicalized target", async () => {
  const h = harness({ targetVaultPath: "C:\\Vaults\\..\\Notes", verifyVault: async options => {
    assert.equal(options.targetVaultPath, "C:\\Vaults\\..\\Notes");
    return { vaultPath: "C:\\Notes", targetVaultMatchesCurrent: true };
  } });
  const vault = await switchVaultWithNoteMoveRecovery({}, async () => { throw disconnected(); }, h.options);
  assert.equal(vault.vaultPath, "C:\\Notes");
  assert.equal(h.closed(), true);
});

for (const targetVaultPath of ["A", "B"]) {
  test(`an unresolved move blocks opening ${targetVaultPath} until the same move is verified`, async () => {
    let resolveMove, retry, currentDirectory = "source", posts = 0;
    const scope = {};
    const state = { notes: [], tabs: [], noteMoveVaultScope: scope };
    await handleNoteMoveStateChange({ noteId: "n1", directoryId: "target" }, {
      state, moveTimeoutMs: 5, verifyTimeoutMs: 5,
      moveNote: () => new Promise(resolve => { resolveMove = resolve; }),
      fetchNote: async () => ({ id: "n1", directoryId: currentDirectory, body: "Intact" }),
      showMoveRecovery: callback => { retry = callback; return () => {}; }
    });
    const h = harness({ targetVaultPath });
    const switchVault = async () => { posts++; return { vaultPath: targetVaultPath }; };
    await assert.rejects(switchVaultWithNoteMoveRecovery(state, switchVault, h.options), /移动结果尚未确认/);
    assert.equal(posts, 0);
    assert.equal(state.noteMoveVaultScope, scope);
    assert.equal(state.unresolvedNoteMove.noteId, "n1");
    const saved = await handleSaveNoteStateChange({ noteId: "n1" }, { state });
    assert.equal(saved.ok, false);
    currentDirectory = "target";
    resolveMove({ id: "n1", directoryId: "target", body: "Intact" });
    await Promise.resolve();
    assert.equal(await retry(), true);
    await switchVaultWithNoteMoveRecovery(state, switchVault, h.options);
    assert.equal(posts, 1);
  });
}
