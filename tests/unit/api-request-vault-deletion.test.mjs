import test from "node:test";
import assert from "node:assert/strict";
import { deleteInRequestVault } from "../../apps/api/src/request-vault-deletion.mjs";

function deferred() { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; }
test("delete rejects a vault changed during initialization before any removal", async () => {
  const gate = deferred(); let current = "/vault/original", removals = 0;
  const pending = deleteInRequestVault({}, { vaultPath: current, currentVaultPath: () => current,
    readJson: async () => ({}), initVault: () => gate.promise, remove: () => { removals++; }, itemId: "same-id" });
  await Promise.resolve();
  current = "/vault/copied"; gate.resolve();
  await assert.rejects(pending, { code: "VAULT_CHANGED" });
  assert.equal(removals, 0);
});
test("removal remains bound to its original path if the selected vault changes after it starts", async () => {
  const gate = deferred(), started = deferred(); let current = "/vault/original", pathUsed;
  const pending = deleteInRequestVault({}, { vaultPath: current, currentVaultPath: () => current,
    readJson: async () => ({}), initVault: async () => {}, remove: async vault => {
      started.resolve();
      await gate.promise; pathUsed = vault; return { deleted: true };
    }, itemId: "same-id" });
  await started.promise;
  current = "/vault/copied"; gate.resolve();
  assert.deepEqual(await pending, { deleted: true });
  assert.equal(pathUsed, "/vault/original");
});
