import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { importDemoInRequestVault } from "../../apps/api/src/request-vault-demo-import.mjs";

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function fixture(body = {}) {
  const original = path.resolve("original"), copied = path.resolve("copy"), calls = [];
  const f = { original, copied, current: original, calls };
  f.deps = { vaultPath: original, currentVaultPath: () => f.current,
    readJson: async () => body, initVault: async vault => { calls.push(["init", vault]); },
    seed: async vault => { calls.push(["seed", vault]); return { imported: vault }; } };
  return f;
}
test("demo request rejects the client vault mismatch before any initialization or write", async () => {
  const f = fixture({ expectedVaultPath: path.resolve("copy") });
  await assert.rejects(importDemoInRequestVault({}, f.deps), { code: "VAULT_CHANGED" });
  assert.deepEqual(f.calls, []);
});
test("demo request rejects a switch while its request body is still arriving", async () => {
  const f = fixture(), body = deferred(); f.deps.readJson = () => body.promise;
  const pending = importDemoInRequestVault({}, f.deps);
  f.current = f.copied; body.resolve({});
  await assert.rejects(pending, { code: "VAULT_CHANGED" });
  assert.deepEqual(f.calls, []);
});
test("demo request rechecks the original vault after initialization", async () => {
  const f = fixture(), initialized = deferred(), entered = deferred();
  f.deps.initVault = async vault => { f.calls.push(["init", vault]); entered.resolve(); await initialized.promise; };
  const pending = importDemoInRequestVault({}, f.deps); await entered.promise;
  f.current = f.copied; initialized.resolve();
  await assert.rejects(pending, { code: "VAULT_CHANGED" });
  assert.deepEqual(f.calls, [["init", f.original]]);
});
test("once import begins it stays bound to its original vault throughout a later switch", async () => {
  const f = fixture(), seeded = deferred(), entered = deferred();
  f.deps.seed = async vault => { f.calls.push(["seed", vault]); entered.resolve(); await seeded.promise; return { imported: vault }; };
  const pending = importDemoInRequestVault({}, f.deps); await entered.promise;
  f.current = f.copied; seeded.resolve();
  assert.deepEqual(await pending, { imported: f.original });
  assert.deepEqual(f.calls, [["init", f.original], ["seed", f.original]]);
});
for (const body of [{}, { expectedVaultPath: path.resolve("original") }]) {
  test(`demo import accepts the current ${body.expectedVaultPath ? "explicit" : "legacy"} vault`, async () => {
    const f = fixture(body);
    assert.deepEqual(await importDemoInRequestVault({}, f.deps), { imported: f.original });
  });
}
test("aborted or malformed request cannot start an import", async () => {
  const f = fixture(); f.deps.readJson = async () => { throw new Error("request aborted"); };
  await assert.rejects(importDemoInRequestVault({}, f.deps), /request aborted/);
  assert.deepEqual(f.calls, []);
});
