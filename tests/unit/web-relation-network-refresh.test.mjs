import test from "node:test";
import assert from "node:assert/strict";
import { refreshRelationNetworkStatusesForHost } from "../../apps/web/src/relation-network-refresh.js";

function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
function fixture() {
  let scope = "vault-a";
  const calls = [];
  const host = { state: { notes: [{ id: "same-id", thinkingStatus: null }] }, vaultScope: () => scope,
    applyRelationNetworkStatusesFromRelations: (_id, relations) => calls.push(relations),
    renderThinkingStatus: () => calls.push("thinking"), renderAll: () => calls.push("render") };
  return { host, calls, switchVault: value => { scope = value; } };
}

test("old vault responses cannot change another vault's note with the same id", async () => {
  const { host, calls, switchVault } = fixture();
  const held = deferred();
  const running = refreshRelationNetworkStatusesForHost(host, ["same-id"], {
    fetchNoteRelations: () => held.promise,
    fetchNote: async () => ({ thinkingStatus: { status: "old-vault" } }) });
  switchVault("vault-b");
  held.resolve({ outgoingLinks: [{ id: "old-relation" }] });
  await running;
  assert.deepEqual(calls, []);
  assert.equal(host.state.notes[0].thinkingStatus, null);
});

test("a slower earlier refresh cannot overwrite a newer relation snapshot", async () => {
  const { host, calls } = fixture();
  const held = deferred();
  const earlier = refreshRelationNetworkStatusesForHost(host, ["same-id"], {
    fetchNoteRelations: () => held.promise,
    fetchNote: async () => ({ thinkingStatus: { status: "old" } }) });
  const latest = { outgoingLinks: [] };
  await refreshRelationNetworkStatusesForHost(host, ["same-id", "same-id"], {
    fetchNoteRelations: async () => latest, fetchNote: async () => ({ thinkingStatus: { status: "latest" } }) });
  held.resolve({ outgoingLinks: [{ id: "deleted" }] });
  await earlier;
  assert.deepEqual(calls, [latest, "thinking", "render"]);
  assert.deepEqual(host.state.notes[0].thinkingStatus, { status: "latest" });
});

test("a note read failure does not discard successfully fetched relation statuses", async () => {
  const { host, calls } = fixture();
  const relations = { outgoingLinks: [] };
  await refreshRelationNetworkStatusesForHost(host, ["same-id"], {
    fetchNoteRelations: async () => relations, fetchNote: async () => { throw new Error("note unavailable"); } });
  assert.deepEqual(calls, [relations]);
});

test("a missing relation response does not falsely mark a note isolated", async () => {
  const { host, calls } = fixture();
  await refreshRelationNetworkStatusesForHost(host, ["same-id"], {
    fetchNoteRelations: async () => null, fetchNote: async () => null });
  assert.deepEqual(calls, []);
});
