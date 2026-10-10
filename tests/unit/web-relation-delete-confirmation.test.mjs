import test from "node:test";
import assert from "node:assert/strict";
import { EditorSemanticRelationsController } from "../../apps/web/src/editor-semantic-relations-controller.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup(t, confirm) {
  const previousWindow = globalThis.window;
  globalThis.window = { confirm };
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });
  const requests = [], effects = [];
  const link = { id: "relation-1", fromNoteId: "source", toNoteId: "target", target: { title: "目标" } };
  const host = {
    currentVaultPath: "E:/original-vault", vaultScope: () => host.currentVaultPath,
    state: { notes: [], module: "graph", noteMoveVaultScope: {} }, activeId: "source",
    activeNote: () => ({ id: host.activeId }), isActiveNoteId: id => id === host.activeId,
    currentSemanticRelations: { outgoingLinks: [link], backlinks: [] },
    refreshRelationNetworkStatuses: async (...ids) => effects.push(["statuses", ...ids]),
    refreshDirectoryGraph: async () => effects.push(["graph"]),
    onStatus: (...args) => effects.push(["status", ...args]),
    closePermanentRelationWorkspace: () => effects.push(["close"]),
    refreshSemanticRelations: async id => effects.push(["relations", id])
  };
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(new URL(url).pathname, "/api/v1/relations/relation-1");
    assert.equal(options.method, "DELETE");
    requests.push({ url, method: options.method, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ deleted: true }), { status: 200 });
  });
  return { controller: new EditorSemanticRelationsController(host), host, requests, effects };
}

test("native async relation confirmation waits, cancellation preserves the relation and permits retry", async t => {
  const gate = deferred();
  let confirmations = 0;
  const { controller, host, requests, effects } = setup(t, () => { confirmations++; return gate.promise; });
  const pending = controller.deleteRelation("relation-1");
  await controller.deleteRelation("relation-1");
  assert.equal(confirmations, 1, "Repeated clicks must not open another dialog");
  assert.deepEqual(requests, [], "No mutation while the native decision is pending");
  assert.deepEqual(effects, []);
  gate.resolve(false);
  await pending;
  assert.equal(host.currentSemanticRelations.outgoingLinks.length, 1);
  assert.deepEqual(requests, []);
  assert.deepEqual(effects, []);
  window.confirm = async () => true;
  await controller.deleteRelation("relation-1");
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].body, { expectedVaultPath: "E:/original-vault" });
  assert.deepEqual(effects.filter(item => item[0] === "statuses"), [["statuses", "source", "target"]]);
  assert.deepEqual(effects.filter(item => item[0] === "graph"), [["graph"]]);
  assert.deepEqual(effects.filter(item => item[0] === "relations"), [["relations", "source"]]);
});

for (const change of ["note", "vault", "vault-path", "switching", "uncertain", "endpoints", "removed"]) {
  test(`late confirmed relation deletion does nothing after ${change} changes`, async t => {
    const gate = deferred();
    const { controller, host, requests, effects } = setup(t, () => gate.promise);
    const pending = controller.deleteRelation("relation-1");
    if (change === "note") host.activeId = "other-note";
    if (change === "vault") host.state.noteMoveVaultScope = {};
    if (change === "vault-path") host.currentVaultPath = "E:/other-vault";
    if (change === "switching") host.state.noteMoveVaultSwitching = true;
    if (change === "uncertain") host.state.noteMoveVaultUncertain = true;
    if (change === "endpoints") host.currentSemanticRelations.outgoingLinks = [{ id: "relation-1", fromNoteId: "source", toNoteId: "other-target" }];
    if (change === "removed") host.currentSemanticRelations.outgoingLinks = [];
    gate.resolve(true);
    await pending;
    assert.deepEqual(requests, []);
    assert.deepEqual(effects, []);
    assert.equal(controller.pendingRelationDeletes.size, 0);
  });
}

test("rejected native confirmation reports failure without deleting and releases the pending action", async t => {
  const { controller, requests, effects } = setup(t, async () => { throw new Error("确认框不可用"); });
  await controller.deleteRelation("relation-1");
  assert.deepEqual(requests, []);
  assert.equal(controller.pendingRelationDeletes.size, 0);
  assert.match(effects[0][1], /确认框不可用/);
  assert.equal(effects[0][2], "warn");
});

for (const accepted of [false, true]) {
  test(`browser synchronous relation confirmation ${accepted ? "accepts" : "cancels"}`, async t => {
    const { controller, requests } = setup(t, () => accepted);
    await controller.deleteRelation("relation-1");
    assert.equal(requests.length, accepted ? 1 : 0);
  });
}
