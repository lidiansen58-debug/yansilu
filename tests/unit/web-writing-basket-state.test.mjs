import test from "node:test";
import assert from "node:assert/strict";

import {
  addWritingBasketIdsForRuntime,
  clearWritingBasketForRuntime,
  parseWritingBasketIdsForRuntime,
  removeWritingBasketIdForRuntime,
  setWritingBasketIdsForRuntime,
  writingBasketIdsFromRaw
} from "../../apps/web/src/writing-basket-state.js";

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
