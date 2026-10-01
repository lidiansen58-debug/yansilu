import test from "node:test";
import assert from "node:assert/strict";

import {
  addWritingBasketIdsForRuntime,
  clearWritingBasketForRuntime,
  createWritingBasketSession,
  parseWritingBasketIdsForRuntime,
  removeWritingBasketIdForRuntime,
  setWritingBasketIdsForRuntime,
  writingBasketIdsFromRaw
} from "../../apps/web/src/writing-basket-state.js";

function sessionFixture() {
  const saved = new Map();
  const storage = { getItem: (key) => saved.get(key) || null, setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key) };
  let vault = "E:\\Vaults\\one";
  let changes = 0;
  const input = { value: "" };
  const create = () => createWritingBasketSession({ $: () => input, getVaultPath: () => vault, getStorage: () => storage, onScopeChange: () => changes++ });
  return { input, saved, create, setVault: (value) => { vault = value; }, changes: () => changes };
}

test("writing basket restores selected ids in their original order after a reload", () => {
  const f = sessionFixture();
  f.create().set(["n2", "n1", "n2"]);
  f.input.value = "";
  assert.deepEqual(f.create().read(), ["n2", "n1"]);
  assert.equal(f.input.value, "n2\nn1");
  assert.equal(f.changes(), 0);
});

test("writing basket is isolated by vault and a scope change clears old project context", () => {
  const f = sessionFixture();
  const session = f.create();
  session.set(["one"]);
  f.setVault("E:\\Vaults\\two");
  assert.deepEqual(session.read(), []);
  session.set(["two"]);
  f.setVault("E:\\Vaults\\one");
  assert.deepEqual(session.read(), ["one"]);
  assert.equal(f.changes(), 2);
});

test("Windows case and slash variations use the same basket scope", () => {
  const f = sessionFixture();
  const session = f.create();
  session.set(["one"]);
  f.setVault("e:/vaults/ONE/");
  assert.deepEqual(session.read(), ["one"]);
  assert.equal(f.changes(), 0);
});

test("removal and clearing persist rather than resurrecting old selections", () => {
  const f = sessionFixture();
  const session = f.create();
  session.set(["one", "two"]);
  session.set(["two"]);
  assert.deepEqual(f.create().read(), ["two"]);
  session.set([]);
  assert.deepEqual(f.create().read(), []);
  assert.equal(f.saved.size, 0);
});

test("manual input persists and ordinary reads do not overwrite saved data", () => {
  const f = sessionFixture();
  const session = f.create();
  session.set(["one"]);
  f.input.value = "n2 n3 n2";
  session.persist();
  const snapshot = Array.from(f.saved);
  session.read();
  assert.deepEqual(Array.from(f.saved), snapshot);
  assert.deepEqual(f.create().read(), ["n2", "n3"]);
});

test("invalid storage is ignored, unknown vault is not persisted and storage errors do not break editing", () => {
  const f = sessionFixture();
  f.setVault("");
  f.create().set(["one"]);
  assert.equal(f.saved.size, 0);
  const input = { value: "" };
  const session = createWritingBasketSession({ $: () => input, getVaultPath: () => "/vault", getStorage: () => ({ getItem: () => '{"ids": ["wrong shape"]}', setItem() { throw new Error("quota"); } }) });
  assert.deepEqual(session.read(), []);
  assert.deepEqual(session.set(["n1"]), ["n1"]);
  assert.deepEqual(session.read(), ["n1"]);
});

test("writing basket state parses ids from common separators and removes duplicates", () => {
  assert.deepEqual(writingBasketIdsFromRaw(" n1, n2\nn1; n3\uFF0Cn4\u3001n5\uFF1Bn6 "), ["n1", "n2", "n3", "n4", "n5", "n6"]);
});

test("writing basket state reads and writes the basket textarea", () => {
  const input = { value: "n1 n2 n1" };
  const $ = (id) => (id === "writingBasketNoteIds" ? input : null);

  assert.deepEqual(parseWritingBasketIdsForRuntime({ $ }), ["n1", "n2"]);
  assert.deepEqual(setWritingBasketIdsForRuntime(["n3", "n2", "n3"], { $ }), ["n3", "n2"]);
  assert.equal(input.value, "n3\nn2");
});

test("writing basket state adds ids and refreshes relation counts", () => {
  const calls = [];
  const merged = addWritingBasketIdsForRuntime(["n2", "n3"], {
    parseWritingBasketIds: () => ["n1", "n2"],
    setWritingBasketIds: (ids) => calls.push(["set", ids]),
    resetWritingProjectContextForBasketChange: () => calls.push(["reset"]),
    refreshWritingRelationCounts: (ids) => calls.push(["refresh", ids])
  });

  assert.deepEqual(merged, ["n1", "n2", "n3"]);
  assert.deepEqual(calls, [
    ["set", ["n1", "n2", "n3"]],
    ["reset"],
    ["refresh", ["n1", "n2", "n3"]]
  ]);
});

test("writing basket state removes one id and clears its relation count", () => {
  const calls = [];
  const writingState = { relationCounts: { n1: 2, n2: 3 } };
  const remaining = removeWritingBasketIdForRuntime("n1", {
    writingState,
    parseWritingBasketIds: () => ["n1", "n2"],
    setWritingBasketIds: (ids) => calls.push(["set", ids]),
    resetWritingProjectContextForBasketChange: () => calls.push(["reset"]),
    refreshWritingRelationCounts: (ids) => calls.push(["refresh", ids])
  });

  assert.deepEqual(remaining, ["n2"]);
  assert.deepEqual(writingState.relationCounts, { n2: 3 });
  assert.deepEqual(calls, [
    ["set", ["n2"]],
    ["reset"],
    ["refresh", ["n2"]]
  ]);
});

test("writing basket state clears basket and relation loading state", () => {
  const calls = [];
  const writingState = {
    relationCounts: { n1: 1 },
    relationCountErrors: { n2: "failed" },
    loadingRelationCounts: true
  };

  assert.deepEqual(clearWritingBasketForRuntime({
    writingState,
    setWritingBasketIds: (ids) => calls.push(["set", ids]),
    resetWritingLocalBookIdeas: () => calls.push(["resetIdeas"])
  }), []);
  assert.deepEqual(calls, [["set", []], ["resetIdeas"]]);
  assert.deepEqual(writingState.relationCounts, {});
  assert.deepEqual(writingState.relationCountErrors, {});
  assert.equal(writingState.loadingRelationCounts, false);
});
