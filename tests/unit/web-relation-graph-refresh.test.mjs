import test from "node:test";
import assert from "node:assert/strict";
import { refreshGraphAfterRelationMutation } from "../../apps/web/src/relation-graph-refresh.js";

test("relation mutations refresh a visible graph even when their entry came from the note sidebar", async () => {
  let calls = 0;
  const host = { state: { module: "graph" }, refreshDirectoryGraph: async () => { calls++; return true; } };
  assert.equal(await refreshGraphAfterRelationMutation(host), true);
  assert.equal(calls, 1);
});

test("graph-returning relation entries refresh the graph without requiring an active graph module", async () => {
  let calls = 0;
  const host = { state: { module: "notes" }, refreshDirectoryGraph: async () => { calls++; return true; } };
  assert.equal(await refreshGraphAfterRelationMutation(host, { returnTo: "graph" }), true);
  assert.equal(calls, 1);
});

test("note-only relation edits defer graph reads until the graph is opened", async () => {
  const host = { state: { module: "notes" }, refreshDirectoryGraph: () => { throw new Error("unexpected graph request"); } };
  assert.equal(await refreshGraphAfterRelationMutation(host), null);
});

test("graph read failures do not reject a persisted relation mutation", async () => {
  assert.equal(await refreshGraphAfterRelationMutation({ state: { module: "graph" }, refreshDirectoryGraph: async () => false }), false);
  assert.equal(await refreshGraphAfterRelationMutation({ state: { module: "graph" }, refreshDirectoryGraph: async () => { throw new Error("offline"); } }), false);
  assert.equal(await refreshGraphAfterRelationMutation({ state: { module: "graph" } }), false);
});

test("saved relation reveal carries a live composer guard instead of an unconditional navigation", async () => {
  let current = true, received;
  const host = { state: { module: "graph" }, refreshDirectoryGraph: async options => { received = options; return true; } };
  const relation = { id: "saved" };
  await refreshGraphAfterRelationMutation(host, { savedRelation: relation, canRevealSavedRelation: () => current });
  assert.equal(received.savedRelation, relation);
  assert.equal(received.canRevealSavedRelation(), true);
  current = false;
  assert.equal(received.canRevealSavedRelation(), false);
});
