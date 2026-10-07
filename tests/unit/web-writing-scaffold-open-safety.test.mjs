import test from "node:test";
import assert from "node:assert/strict";
import { openWritingScaffoldVersion, handleWritingReloadScaffoldClick } from "../../apps/web/src/writing-scaffold-open-controller.js";
import { beginWritingOutlineEdit, checkpointWritingOutline, prepareWritingOutlineSave } from "../../apps/web/src/writing-outline-recovery.js";

const outline = title => ({ id: "outline", writing_project_id: "project", markdown: `# ${title}`, open_questions: ["Question"],
  sections: [{ heading: title, purpose: "Purpose", evidence_note_ids: ["note"], counterpoints: ["Boundary"] }] });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function fixture() {
  const writingState = { project: { id: "project" }, scaffold: outline("Original"), scaffoldMarkdown: "# Original" };
  const records = new Map(), calls = [], button = { disabled: false }, menu = { open: true };
  let vault = "vault-a", consent = false;
  const server = outline("Externally saved");
  const deps = { writingState, state: { module: "writing", noteMoveVaultScope: 1 }, getVaultPath: () => vault,
    recoveryStorage: { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) },
    $: id => id === "btnWritingReloadScaffold" ? button : id === "writingMoreMenu" ? menu : null,
    fetchDraftScaffold: async id => { calls.push(["read", id]); return { item: structuredClone(server), export: { markdown: server.markdown } }; },
    confirm: message => { calls.push(["confirm", message]); return consent; },
    renderWritingPanel: () => calls.push(["render"]), setStatus: (message, tone) => calls.push(["status", message, tone]) };
  deps.openScaffoldVersion = id => openWritingScaffoldVersion(deps, id);
  const edit = () => { beginWritingOutlineEdit(deps); writingState.scaffold.sections[0].heading = "My local edit";
    writingState.scaffoldMarkdown = "# My local edit"; checkpointWritingOutline(deps); };
  return { deps, writingState, server, records, calls, button, menu, edit, setVault: value => { vault = value; }, allow: () => { consent = true; } };
}

test("cancel loading a saved version retains live input, local recovery and conflict baseline", async () => {
  const h = fixture(); h.edit(); const cached = [...h.records];
  assert.equal(await handleWritingReloadScaffoldClick(h.deps), null);
  assert.equal(h.writingState.scaffold.sections[0].heading, "My local edit");
  assert.deepEqual([...h.records], cached);
  assert.equal(prepareWritingOutlineSave(h.deps, "outline", "project", h.writingState.scaffold).expectedOutline.sections[0].heading, "Original");
  assert.ok(!h.calls.some(call => call[0] === "render"));
  assert.match(h.calls.at(-1)[1], /已取消.*保留/);
  assert.equal(h.menu.open, false); assert.equal(h.button.disabled, false);
});

test("confirmed readonly reload clears stale recovery, adopts saved baseline and permits later guarded saving", async () => {
  const h = fixture(); h.edit(); h.allow(); const server = structuredClone(h.server);
  const result = await handleWritingReloadScaffoldClick(h.deps);
  assert.equal(result.item.sections[0].heading, "Externally saved");
  assert.deepEqual(h.writingState.scaffold, server);
  assert.deepEqual(h.server, server);
  assert.equal(h.records.size, 0);
  assert.equal(prepareWritingOutlineSave(h.deps, "outline", "project", h.writingState.scaffold).expectedOutline.sections[0].heading, "Externally saved");
  assert.equal(h.menu.open, false); assert.equal(h.button.disabled, false);
  assert.equal(h.calls.filter(call => call[0] === "render").length, 1);
  assert.match(h.calls.at(-1)[1], /可继续编辑/);
});

test("matching clean outline loads without an unnecessary confirmation", async () => {
  const h = fixture(); h.writingState.scaffold = structuredClone(h.server);
  assert.ok(await openWritingScaffoldVersion(h.deps, "outline"));
  assert.ok(!h.calls.some(call => call[0] === "confirm"));
});

for (const failure of ["read", "wrong-outline", "wrong-project", "missing-sections", "storage"]) {
  test(`saved-outline ${failure} failure preserves input and never claims success`, async () => {
    const h = fixture(); h.edit(); h.allow(); const cached = [...h.records];
    if (failure === "read") h.deps.fetchDraftScaffold = async () => { throw new Error("Offline"); };
    if (failure === "wrong-outline") h.server.id = "other-outline";
    if (failure === "wrong-project") h.server.writing_project_id = "other-project";
    if (failure === "missing-sections") delete h.server.sections;
    if (failure === "storage") h.deps.recoveryStorage.removeItem = () => { throw new Error("Storage unavailable"); };
    assert.equal(await handleWritingReloadScaffoldClick(h.deps), null);
    assert.equal(h.writingState.scaffold.sections[0].heading, "My local edit");
    assert.deepEqual([...h.records], cached);
    assert.ok(!h.calls.some(call => call[0] === "render"));
    assert.match(h.calls.at(-1)[1], /载入提纲失败.*当前编辑仍保留/);
    assert.equal(h.button.disabled, false);
  });
}

for (const mutation of ["outline", "draft", "project", "vault", "scope", "module", "uncertain", "queue"]) {
  test(`late saved-outline response cannot replace a changed ${mutation}`, async () => {
    const h = fixture(); h.edit(); h.allow(); const pending = deferred();
    h.deps.fetchDraftScaffold = () => pending.promise;
    const operation = openWritingScaffoldVersion(h.deps, "outline");
    await new Promise(resolve => setImmediate(resolve));
    if (mutation === "outline") h.writingState.scaffold.sections[0].heading = "New typing";
    if (mutation === "draft") h.writingState.draftMarkdown = "New draft";
    if (mutation === "project") h.writingState.project.id = "other-project";
    if (mutation === "vault") h.setVault("vault-b");
    if (mutation === "scope") h.deps.state.noteMoveVaultScope++;
    if (mutation === "module") h.deps.state.module = "explorer";
    if (mutation === "uncertain") h.deps.state.noteMoveVaultUncertain = true;
    if (mutation === "queue") h.writingState.outlineSaveQueue = Promise.resolve();
    pending.resolve({ item: h.server });
    assert.equal(await operation, null);
    assert.equal(h.writingState.scaffold.sections[0].heading, mutation === "outline" ? "New typing" : "My local edit");
    assert.equal(h.records.size, 1);
    assert.equal(h.writingState.scaffoldOpenPending, false);
    assert.ok(!h.calls.some(call => call[0] === "confirm" || call[0] === "render"));
  });
}

test("confirmation waiting cannot discard newly typed outline input", async () => {
  const h = fixture(); h.edit(); const pending = deferred(); h.deps.confirm = () => pending.promise;
  const operation = openWritingScaffoldVersion(h.deps, "outline");
  await new Promise(resolve => setImmediate(resolve));
  h.writingState.scaffold.sections[0].purpose = "New purpose while checking";
  pending.resolve(true);
  assert.equal(await operation, null);
  assert.equal(h.writingState.scaffold.sections[0].purpose, "New purpose while checking");
  assert.equal(h.records.size, 1);
});

test("reload waits for pending autosave before reading the saved outline", async () => {
  const h = fixture(); h.writingState.scaffold = structuredClone(h.server);
  const pending = deferred(); h.writingState.outlineSaveQueue = pending.promise;
  const operation = openWritingScaffoldVersion(h.deps, "outline");
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(!h.calls.some(call => call[0] === "read" || call[0] === "confirm" || call[0] === "render"));
  pending.resolve(); assert.ok(await operation);
  assert.equal(h.calls.filter(call => call[0] === "read").length, 1);
});

test("only the latest overlapping load commits and restores the original button state", async () => {
  const h = fixture(); h.allow(); const first = deferred(), second = deferred(); let calls = 0;
  h.deps.fetchDraftScaffold = () => ++calls === 1 ? first.promise : second.promise;
  const a = openWritingScaffoldVersion(h.deps, "outline");
  await new Promise(resolve => setImmediate(resolve));
  const b = openWritingScaffoldVersion(h.deps, "outline");
  await new Promise(resolve => setImmediate(resolve));
  first.resolve({ item: outline("Obsolete saved version") }); assert.equal(await a, null);
  assert.equal(h.button.disabled, true);
  second.resolve({ item: h.server }); assert.ok(await b);
  assert.equal(h.writingState.scaffold.sections[0].heading, "Externally saved");
  assert.equal(h.button.disabled, false); assert.equal(h.writingState.scaffoldOpenPending, false);
});

test("late read failure after a Vault switch does not announce an error in the new Vault", async () => {
  const h = fixture(); h.edit(); const pending = deferred(); h.deps.fetchDraftScaffold = () => pending.promise;
  const operation = handleWritingReloadScaffoldClick(h.deps);
  await new Promise(resolve => setImmediate(resolve));
  h.setVault("vault-b"); pending.reject(new Error("Old Vault read failed"));
  assert.equal(await operation, null);
  assert.ok(!h.calls.some(call => call[0] === "status" && /失败/.test(call[1])));
  assert.equal(h.records.size, 1);
  assert.equal(h.writingState.scaffoldOpenPending, false);
});
