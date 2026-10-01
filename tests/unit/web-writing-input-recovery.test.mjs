import test from "node:test";
import assert from "node:assert/strict";
import { saveWritingInput, readWritingInput, clearWritingInput } from "../../apps/web/src/writing-input-recovery.js";

function fixture() {
  const records = new Map();
  const recoveryStorage = { getItem: key => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
  return { records, deps: { recoveryStorage, getVaultPath: () => "A" } };
}

test("empty input and the original body and revision survive serialization", () => {
  const { deps } = fixture();
  const record = { markdown: "", noteId: "note", savedBody: "Old text", savedFileRevision: "old-revision" };
  saveWritingInput(deps, "article", record);
  assert.deepEqual(readWritingInput(deps, "article"), record);
});

test("input recovery and clearing are isolated by vault and context", () => {
  const { deps } = fixture();
  const record = { markdown: "Own prose", noteId: "note" };
  saveWritingInput(deps, "article", record);
  assert.equal(readWritingInput({ ...deps, getVaultPath: () => "B" }, "article"), null);
  assert.equal(readWritingInput(deps, "chapter"), null);
  clearWritingInput(deps, "chapter");
  assert.deepEqual(readWritingInput(deps, "article"), record);
  clearWritingInput(deps, "article");
  assert.equal(readWritingInput(deps, "article"), null);
});

for (const raw of ["{broken", "null", '{"markdown":false,"noteId":"n"}', '{"markdown":"x","noteId":"n","savedBody":5}']) {
  test(`damaged input record ${raw} cannot be silently discarded`, () => {
    const { deps, records } = fixture();
    records.set("yansilu:writing-input:v1:A:article", raw);
    assert.throws(() => readWritingInput(deps, "article"), /本机草稿恢复记录/);
    assert.equal(records.size, 1);
  });
}
