import test from "node:test";
import assert from "node:assert/strict";
import { persistWritingOutline } from "../../apps/web/src/writing-outline-save.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fixture() {
  const requests = [], statuses = [];
  const state = { noteMoveVaultScope: {} };
  let vault = "vault-a";
  const writingState = { scaffold: { id: "scaffold-a", sections: [{ heading: "Saved title", purpose: "Purpose",
    evidence_note_ids: ["note-a"], gaps: ["Missing evidence"], counterpoints: ["Counterpoint"], open_questions: ["Question"] }],
    open_questions: ["Overall question"] }, scaffoldMarkdown: "Saved markdown" };
  const deps = { state, writingState, getVaultPath: () => vault,
    updateDraftScaffold: (id, payload) => { const pending = deferred(); requests.push({ id, payload, ...pending }); return pending.promise; },
    setStatus: (...values) => statuses.push(values), renderWritingPanel: () => assert.fail("Must not remount live outline fields") };
  return { deps, state, writingState, requests, statuses, setVault: value => { vault = value; } };
}

const tick = () => new Promise(resolve => setImmediate(resolve));

test("late outline save preserves newer unblurred input and all evidence without rendering", async () => {
  const h = fixture();
  const saving = persistWritingOutline(h.deps);
  await tick();
  assert.equal(h.requests[0].payload.expectedVaultPath, "vault-a");
  assert.equal(h.requests[0].payload.expectedCurrentScaffoldId, "scaffold-a");
  const saved = structuredClone(h.writingState.scaffold);
  h.writingState.scaffold.sections[0].heading = "Newer title still being typed";
  h.writingState.scaffold.sections[0].evidence_note_ids.push("note-b");
  h.writingState.scaffold.open_questions.push("New question");
  h.writingState.scaffoldMarkdown = "Newer live markdown";
  const liveSections = h.writingState.scaffold.sections;
  assert.deepEqual(h.requests[0].payload.sections[0].evidence_note_ids, ["note-a"]);
  h.requests[0].resolve({ ...saved, markdown: "Older server markdown", updated_at: "server-revision" });
  await saving;
  assert.equal(h.writingState.scaffold.sections, liveSections);
  assert.equal(h.writingState.scaffold.sections[0].heading, "Newer title still being typed");
  assert.equal(h.writingState.scaffoldMarkdown, "Newer live markdown");
  assert.equal(h.writingState.scaffold.updated_at, "server-revision");
  assert.deepEqual(h.writingState.scaffold.open_questions, ["Overall question", "New question"]);
  assert.deepEqual(h.statuses.at(-1), ["已保存此前提纲；正在编辑的修改仍保留。", "warn"]);
});

test("latest successful save adopts server metadata and markdown without rendering", async () => {
  const h = fixture();
  const saving = persistWritingOutline(h.deps);
  await tick();
  const saved = { ...structuredClone(h.writingState.scaffold), markdown: "Server markdown", updated_at: "revision-2" };
  h.requests[0].resolve(saved);
  assert.equal(await saving, saved);
  assert.equal(h.writingState.scaffold, saved);
  assert.equal(h.writingState.scaffoldMarkdown, "Server markdown");
  assert.deepEqual(h.statuses.at(-1), ["提纲已保存", "ok"]);
});

test("outline save failure retains edits and permits serialized retry", async () => {
  const h = fixture();
  const saving = persistWritingOutline(h.deps);
  await tick();
  h.writingState.scaffold.sections[0].heading = "Retry this full title";
  h.writingState.scaffoldMarkdown = "Retry markdown";
  h.requests[0].reject(new Error("Disk unavailable"));
  assert.equal(await saving, null);
  assert.equal(h.writingState.scaffold.sections[0].heading, "Retry this full title");
  assert.equal(h.writingState.scaffoldMarkdown, "Retry markdown");
  assert.deepEqual(h.statuses.at(-1), ["保存提纲失败：Disk unavailable", "bad"]);
  const retry = persistWritingOutline(h.deps);
  await tick();
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].payload.sections[0].heading, "Retry this full title");
  h.requests[1].resolve({ ...h.writingState.scaffold, markdown: "Retry markdown" });
  assert.ok(await retry);
  assert.equal(h.statuses.at(-1)[1], "ok");
});

for (const change of ["vault", "scope", "switching", "uncertain", "scaffold"]) {
  test(`late outline response cannot replace another context (${change})`, async () => {
    const h = fixture();
    const saving = persistWritingOutline(h.deps);
    await tick();
    const response = { ...structuredClone(h.writingState.scaffold), markdown: "Wrong context markdown" };
    if (change === "vault") h.setVault("vault-b");
    if (change === "scope") h.state.noteMoveVaultScope = {};
    if (change === "switching") h.state.noteMoveVaultSwitching = true;
    if (change === "uncertain") h.state.noteMoveVaultUncertain = true;
    if (change === "scaffold") h.writingState.scaffold = { id: "scaffold-b", sections: [], open_questions: [] };
    const current = h.writingState.scaffold;
    h.requests[0].resolve(response);
    await saving;
    assert.equal(h.writingState.scaffold, current);
    assert.equal(h.writingState.scaffoldMarkdown, "Saved markdown");
    assert.equal(h.statuses.length, 0);
  });
}

test("queued outline request does not start after changing Vault", async () => {
  const h = fixture();
  const first = persistWritingOutline(h.deps);
  await tick();
  const second = persistWritingOutline(h.deps);
  h.setVault("vault-b");
  h.state.noteMoveVaultScope = {};
  h.requests[0].resolve({ ...h.writingState.scaffold, markdown: "Old markdown" });
  await Promise.all([first, second]);
  assert.equal(h.requests.length, 1);
  assert.equal(h.statuses.length, 0);
});

test("rapid outline edits coalesce waiting snapshots while preserving serialized writes and full evidence", async () => {
  const h = fixture();
  const first = persistWritingOutline(h.deps);
  await tick();
  h.writingState.scaffold.sections[0].heading = "Superseded queued title";
  const second = persistWritingOutline(h.deps);
  h.writingState.scaffold.sections.push({ heading: "Latest complete outline", evidence_note_ids: ["note-b"] });
  const latest = persistWritingOutline(h.deps);
  const live = structuredClone(h.writingState.scaffold);
  assert.equal(h.requests.length, 1);
  h.requests[0].resolve({ ...h.writingState.scaffold, markdown: "Older markdown" });
  await tick();
  assert.equal(await second, null);
  assert.equal(h.requests.length, 2);
  assert.deepEqual(h.requests[1].payload.sections, live.sections);
  assert.deepEqual(h.requests[1].payload.sections[0].evidence_note_ids, ["note-a"]);
  h.requests[1].resolve({ ...live, markdown: "Latest full markdown" });
  await Promise.all([first, latest]);
  assert.equal(h.writingState.scaffoldMarkdown, "Latest full markdown");
  assert.equal(h.statuses.length, 1);
});

test("mismatched scaffold response is reported without replacing user data", async () => {
  const h = fixture();
  const saving = persistWritingOutline(h.deps);
  await tick();
  const current = h.writingState.scaffold;
  h.requests[0].resolve({ id: "scaffold-b", sections: [], markdown: "Wrong record" });
  assert.equal(await saving, null);
  assert.equal(h.writingState.scaffold, current);
  assert.match(h.statuses.at(-1)[0], /保存结果不匹配/);
});

test("coalescing does not discard a queued outline when another project is opened", async () => {
  const h = fixture();
  const first = persistWritingOutline(h.deps);
  await tick();
  h.writingState.scaffold.sections[0].heading = "Final changes in project A";
  const lastA = persistWritingOutline(h.deps);
  h.writingState.scaffold = { id: "scaffold-b", sections: [{ heading: "Project B", evidence_note_ids: ["note-b"] }], open_questions: [] };
  h.writingState.scaffoldMarkdown = "Project B markdown";
  const firstB = persistWritingOutline(h.deps);
  h.requests[0].resolve({ id: "scaffold-a", markdown: "First A markdown" });
  await tick();
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].id, "scaffold-a");
  assert.equal(h.requests[1].payload.sections[0].heading, "Final changes in project A");
  h.requests[1].resolve({ id: "scaffold-a", markdown: "Final A markdown" });
  await tick();
  assert.equal(h.requests.length, 3);
  assert.equal(h.requests[2].id, "scaffold-b");
  h.requests[2].resolve({ ...h.writingState.scaffold, markdown: "Project B markdown" });
  await Promise.all([first, lastA, firstB]);
  assert.equal(h.writingState.scaffold.id, "scaffold-b");
  assert.equal(h.writingState.scaffoldMarkdown, "Project B markdown");
  assert.equal(h.statuses.length, 1);
});

test("empty outline save response is an error rather than a silent completion", async () => {
  const h = fixture();
  const saving = persistWritingOutline(h.deps);
  await tick();
  const current = h.writingState.scaffold;
  h.requests[0].resolve(null);
  assert.equal(await saving, null);
  assert.equal(h.writingState.scaffold, current);
  assert.match(h.statuses.at(-1)[0], /保存结果不匹配/);
  assert.equal(h.statuses.at(-1)[1], "bad");
});
