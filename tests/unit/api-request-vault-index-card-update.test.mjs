import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createIndexCardInRequestVault, updateIndexCardInRequestVault } from "../../apps/api/src/request-vault-index-card-update.mjs";

function deferred() { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; }
function fixture() {
  const original = path.resolve("original"), copied = path.resolve("copied");
  const f = { original, copied, current: original, updates: [] };
  f.deps = { vaultPath: original, currentVaultPath: () => f.current, readJson: async () => ({}), initVault: async () => {},
    update: async (...args) => { f.updates.push(args); return { id: "same-id" }; }, itemId: "same-id" };
  return f;
}
test("theme update rejects a mismatched client vault before any initialization", async () => {
  const f = fixture(); let initialized = false;
  f.deps.readJson = async () => ({ expectedVaultPath: f.copied });
  f.deps.initVault = async () => { initialized = true; };
  await assert.rejects(updateIndexCardInRequestVault({}, f.deps), { code: "VAULT_CHANGED" });
  assert.equal(initialized, false); assert.deepEqual(f.updates, []);
});
test("theme update rejects a vault switch during initialization", async () => {
  const f = fixture(), gate = deferred(), entered = deferred();
  f.deps.initVault = () => { entered.resolve(); return gate.promise; };
  const pending = updateIndexCardInRequestVault({}, f.deps);
  await entered.promise; f.current = f.copied; gate.resolve();
  await assert.rejects(pending, { code: "VAULT_CHANGED" }); assert.deepEqual(f.updates, []);
});
test("a started theme update keeps its original vault and payload after a later switch", async () => {
  const f = fixture(), gate = deferred(), entered = deferred();
  const payload = { centralQuestion: "原库的新问题", expectedUpdatedAt: "original-revision" };
  f.deps.readJson = async () => payload;
  f.deps.update = async (...args) => { f.updates.push(args); entered.resolve(); await gate.promise; return { id: "same-id" }; };
  const pending = updateIndexCardInRequestVault({}, f.deps);
  await entered.promise; f.current = f.copied; gate.resolve();
  assert.deepEqual(await pending, { id: "same-id" }); assert.deepEqual(f.updates, [[f.original, "same-id", payload]]);
});

test("theme creation rejects a mismatched client vault before initialization or a write", async () => {
  const f = fixture(); let initialized = false, created = false;
  f.deps.readJson = async () => ({ expectedVaultPath: f.copied });
  f.deps.initVault = async () => { initialized = true; };
  f.deps.create = async () => { created = true; };
  await assert.rejects(createIndexCardInRequestVault({}, f.deps), { code: "VAULT_CHANGED" });
  assert.equal(initialized, false); assert.equal(created, false);
});

for (const phase of ["body read", "initialization"]) test(`theme creation rejects a vault switch during ${phase}`, async () => {
  const f = fixture(), gate = deferred(), entered = deferred(); let created = false;
  f.deps.create = async () => { created = true; };
  if (phase === "body read") f.deps.readJson = async () => { entered.resolve(); await gate.promise; return { expectedVaultPath: f.copied }; };
  else f.deps.initVault = () => { entered.resolve(); return gate.promise; };
  const pending = createIndexCardInRequestVault({}, f.deps);
  await entered.promise; f.current = f.copied; gate.resolve();
  await assert.rejects(pending, { code: "VAULT_CHANGED" }); assert.equal(created, false);
});

test("a started theme creation keeps its original vault and payload after a later switch", async () => {
  const f = fixture(), gate = deferred(), entered = deferred(), writes = [];
  const payload = { title: "原库主题", noteIds: ["original-note"] };
  f.deps.readJson = async () => payload;
  f.deps.create = async (...args) => { writes.push(args); entered.resolve(); await gate.promise; return { id: "created-theme" }; };
  const pending = createIndexCardInRequestVault({}, f.deps);
  await entered.promise; f.current = f.copied; gate.resolve();
  assert.deepEqual(await pending, { id: "created-theme" });
  assert.deepEqual(writes, [[f.original, payload]]);
});
