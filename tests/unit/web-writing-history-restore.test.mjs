import test from "node:test";
import assert from "node:assert/strict";
import { createWritingRestorationId, restoreWritingHistoryWithReadback } from "../../apps/web/src/writing-history-restore.js";

const payload = { restorationId: "ds_recovery", sourceScaffoldId: "ds_original" };
const item = { id: "ds_recovery", writing_project_id: "project", generated_by: "restored:ds_original", sections: [{ heading: "Real saved heading", evidence_note_ids: ["actual-note"] }] };
const project = { id: "project", scaffold_id: item.id, draft_note_id: "article" };
test("restore identities support a browser without randomUUID without using weak randomness", () => {
  let used = false;
  const id = createWritingRestorationId({ getRandomValues: array => { used = true; array.fill(0xab); return array; } });
  assert.equal(used, true);
  assert.equal(id, `ds_${"ab".repeat(16)}`);
  assert.match(id, /^ds_[a-zA-Z0-9_-]{8,64}$/);
});
test("restore identities retain the browser UUID path when available", () => {
  assert.equal(createWritingRestorationId({ randomUUID: () => "12345678-1234-1234-1234-123456789abc" }), "ds_12345678-1234-1234-1234-123456789abc");
});
function fixture(error = new Error("response lost")) {
  const calls = [];
  return { calls, error, deps: {
    restoreDraftScaffold: async () => { calls.push("post"); throw error; },
    fetchDraftScaffold: async id => { calls.push(["read", id]); return { item }; },
    fetchWritingProject: async id => { calls.push(["project", id]); return project; }
  } };
}
test("restore reads back a real saved identity and its current project after losing the POST response", async () => {
  const h = fixture();
  const result = await restoreWritingHistoryWithReadback(h.deps, "project", payload);
  assert.deepEqual(result, { ...item, writing_project: project });
  assert.deepEqual(h.calls, ["post", ["read", item.id], ["project", "project"]]);
});
test("a current-version conflict is not concealed by looking up an unrelated saved result", async () => {
  const h = fixture(Object.assign(new Error("conflict"), { status: 409 }));
  await assert.rejects(restoreWritingHistoryWithReadback(h.deps, "project", payload), error => error === h.error);
  assert.deepEqual(h.calls, ["post"]);
});
test("a changed context cannot apply a read-back result or issue a project read", async () => {
  const h = fixture();
  let current = true;
  h.deps.fetchDraftScaffold = async () => { current = false; return { item }; };
  await assert.rejects(restoreWritingHistoryWithReadback(h.deps, "project", payload, () => current), error => error === h.error);
  assert.deepEqual(h.calls, ["post"]);
});
for (const mismatch of ["project", "source", "sections"]) {
  test(`unconfirmed ${mismatch} is not reported as restored`, async () => {
    const h = fixture();
    if (mismatch === "project") h.deps.fetchWritingProject = async () => ({ ...project, scaffold_id: "newer-outline" });
    if (mismatch === "source") h.deps.fetchDraftScaffold = async () => ({ item: { ...item, generated_by: "restored:another" } });
    if (mismatch === "sections") h.deps.fetchDraftScaffold = async () => ({ item: { ...item, sections: null } });
    await assert.rejects(restoreWritingHistoryWithReadback(h.deps, "project", payload), error => error === h.error);
  });
}
