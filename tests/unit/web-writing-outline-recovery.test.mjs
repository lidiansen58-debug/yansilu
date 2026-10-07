import test from "node:test";
import assert from "node:assert/strict";
import { beginWritingOutlineEdit, checkpointWritingOutline, prepareWritingOutlineSave,
  acknowledgeWritingOutlineSave, restoreWritingOutline } from "../../apps/web/src/writing-outline-recovery.js";

const scaffold = () => ({ id: "outline", writing_project_id: "project", markdown: "Server markdown", open_questions: ["Open question"],
  sections: [{ heading: "Server title", purpose: "Server purpose", evidence_note_ids: ["note-a"], gaps: ["Gap"], counterpoints: ["Counterpoint"] }] });
function fixture(records = new Map(), vault = "vault-a") {
  const writingState = { project: { id: "project" }, scaffold: scaffold(), scaffoldMarkdown: "Server markdown" };
  const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
  return { records, writingState, deps: { writingState, recoveryStorage: storage, getVaultPath: () => vault } };
}
function edit(h, title = "My unsaved title") {
  beginWritingOutlineEdit(h.deps);
  h.writingState.scaffold.sections[0].heading = title;
  h.writingState.scaffoldMarkdown = `# ${title}`;
  checkpointWritingOutline(h.deps);
}

test("fresh outline recovery preserves complete local edits and the original guarded baseline", () => {
  const first = fixture();
  edit(first);
  const second = fixture(first.records);
  const recovered = restoreWritingOutline(second.deps, "project", scaffold());
  assert.equal(recovered.restored, true);
  assert.equal(recovered.conflict, false);
  assert.equal(recovered.item.sections[0].heading, "My unsaved title");
  assert.deepEqual(recovered.item.sections[0].evidence_note_ids, ["note-a"]);
  assert.equal(recovered.item.markdown, "# My unsaved title");
  assert.deepEqual(prepareWritingOutlineSave(second.deps, "outline", "project", recovered.item).expectedOutline.sections, scaffold().sections);
});

test("completed lost-response outline is read back and clears local recovery without a new write", () => {
  const first = fixture(); edit(first);
  prepareWritingOutlineSave(first.deps, "outline", "project", first.writingState.scaffold);
  const server = structuredClone(first.writingState.scaffold);
  const second = fixture(first.records);
  assert.equal(restoreWritingOutline(second.deps, "project", server).restored, false);
  assert.equal(second.records.size, 0);
});

test("pending submitted outline is recognized while later unsubmitted input remains recoverable", () => {
  const first = fixture(); edit(first, "Submitted title");
  prepareWritingOutlineSave(first.deps, "outline", "project", first.writingState.scaffold);
  const server = structuredClone(first.writingState.scaffold);
  edit(first, "Later title typed while waiting");
  const second = fixture(first.records);
  const recovered = restoreWritingOutline(second.deps, "project", server);
  assert.equal(recovered.conflict, false);
  assert.equal(recovered.item.sections[0].heading, "Later title typed while waiting");
  assert.equal(prepareWritingOutlineSave(second.deps, "outline", "project", recovered.item).expectedOutline.sections[0].heading, "Submitted title");
});

test("external outline edits retain local input but keep the old baseline so a retry cannot overwrite them", () => {
  const first = fixture(); edit(first);
  const external = scaffold(); external.sections[0].heading = "External new title";
  const second = fixture(first.records);
  const recovered = restoreWritingOutline(second.deps, "project", external);
  assert.equal(recovered.conflict, true);
  assert.equal(recovered.item.sections[0].heading, "My unsaved title");
  assert.equal(prepareWritingOutlineSave(second.deps, "outline", "project", recovered.item).expectedOutline.sections[0].heading, "Server title");
  assert.equal(second.records.size, 1);
});

test("save acknowledgment advances the baseline without clearing newer local input", () => {
  const h = fixture(); edit(h, "Submitted");
  const submitted = structuredClone(h.writingState.scaffold);
  prepareWritingOutlineSave(h.deps, "outline", "project", submitted);
  edit(h, "Newer input");
  acknowledgeWritingOutlineSave(h.deps, submitted, "project");
  const recovered = restoreWritingOutline(fixture(h.records).deps, "project", submitted);
  assert.equal(recovered.item.sections[0].heading, "Newer input");
  assert.equal(recovered.conflict, false);
  acknowledgeWritingOutlineSave(h.deps, { ...submitted, sections: h.writingState.scaffold.sections }, "project");
  assert.equal(h.records.size, 0);
});

test("outline recovery is isolated by Vault, project and scaffold identity", () => {
  const first = fixture(); edit(first);
  assert.equal(restoreWritingOutline(fixture(first.records, "vault-b").deps, "project", scaffold()).restored, false);
  assert.equal(restoreWritingOutline(fixture(first.records).deps, "different-project", scaffold()).restored, false);
  assert.equal(restoreWritingOutline(fixture(first.records).deps, "project", { ...scaffold(), id: "different-outline" }).restored, false);
  assert.equal(first.records.size, 1);
});

test("damaged local outline data is retained and reported rather than replacing the server", () => {
  const first = fixture(); edit(first);
  const key = [...first.records.keys()][0];
  const cached = JSON.parse(first.records.get(key));
  cached.sections = [null]; first.records.set(key, JSON.stringify(cached));
  assert.throws(() => restoreWritingOutline(fixture(first.records).deps, "project", scaffold()), /恢复记录不完整/);
  assert.equal(first.records.size, 1);
});

test("local storage failure is exposed and does not mutate the outline being edited", () => {
  const h = fixture();
  h.deps.recoveryStorage.setItem = () => { throw new Error("Storage full"); };
  beginWritingOutlineEdit(h.deps);
  h.writingState.scaffold.sections[0].heading = "Keep typing";
  assert.throws(() => checkpointWritingOutline(h.deps), /Storage full/);
  assert.equal(h.writingState.scaffold.sections[0].heading, "Keep typing");
});

test("uncertain or switching Vault cannot checkpoint old outline input into a new context", () => {
  for (const flag of ["noteMoveVaultSwitching", "noteMoveVaultUncertain"]) {
    const h = fixture(); h.deps.state = { [flag]: true };
    beginWritingOutlineEdit(h.deps); checkpointWritingOutline(h.deps);
    assert.deepEqual(prepareWritingOutlineSave(h.deps, "outline", "project", scaffold()), {});
    assert.equal(restoreWritingOutline(h.deps, "project", scaffold()).restored, false);
    assert.equal(h.records.size, 0);
  }
});
