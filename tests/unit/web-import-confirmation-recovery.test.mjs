import test from "node:test";
import assert from "node:assert/strict";
import { createImportConfirmationRecovery } from "../../apps/web/src/import-confirmation-recovery.js";

const result = { created: { sources: 1, literatureNotes: 1, permanentNotes: 0 }, createdFiles: [{ noteId: "one", path: "one.md" }] };
const receipt = { importRecordId: "imp", status: "completed", confirmResult: result };
const timeout = () => Object.assign(new Error("lost response"), { code: "request_timeout" });

test("a fresh client after refresh only reads the submitted import record", async () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  let writes = 0, available = false;
  const deps = { getStorage: () => storage, write: async () => { writes++; throw timeout(); }, read: async () => available ? receipt : null };
  await assert.rejects(createImportConfirmationRecovery(deps)("imp", {}), { code: "IMPORT_CONFIRM_UNCERTAIN" });
  available = true;
  const restored = createImportConfirmationRecovery(deps);
  assert.equal((await restored("imp", { selectedCandidateIds: [] })).status, "completed");
  assert.equal(writes, 1);
  assert.equal((await createImportConfirmationRecovery(deps)("imp", {})).status, "completed");
  assert.equal(writes, 1);
});

test("unavailable local storage blocks confirmation before any POST", async () => {
  const confirm = createImportConfirmationRecovery({ getStorage: () => ({ getItem: () => null, setItem: () => { throw new Error("Quota"); } }),
    write: () => assert.fail("No POST"), read: () => assert.fail("No read") });
  await assert.rejects(confirm("imp", {}), { code: "IMPORT_RECOVERY_STORAGE_FAILED" });
});

test("an unexpected server failure retains the marker and rechecks instead of replaying", async () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  let writes = 0, available = false;
  const deps = { getStorage: () => storage, write: async () => { writes++; throw new Error("Journal unavailable after writing"); },
    read: async () => available ? receipt : null };
  await assert.rejects(createImportConfirmationRecovery(deps)("imp", {}), { code: "IMPORT_CONFIRM_UNCERTAIN" });
  available = true;
  assert.equal((await createImportConfirmationRecovery(deps)("imp", {})).status, "completed");
  assert.equal(writes, 1);
});

test("interrupted records remain uncertain with an explicit interruption reason", async () => {
  const confirm = createImportConfirmationRecovery({ write: async () => { throw timeout(); }, read: async () => ({ importRecordId: "imp", status: "interrupted" }) });
  await assert.rejects(confirm("imp", {}), error => error.code === "IMPORT_CONFIRM_UNCERTAIN" && /服务曾在导入期间停止/.test(error.message));
});

test("a lost response is recovered once and later clicks never post again", async () => {
  let writes = 0, reads = 0;
  const confirm = createImportConfirmationRecovery({ write: async () => { writes++; throw timeout(); }, read: async () => { reads++; return receipt; } });
  assert.equal((await confirm("imp", {})).result, result);
  assert.equal((await confirm("imp", { directoryId: "changed" })).result, result);
  assert.equal(writes, 1);
  assert.equal(reads, 1);
});

for (const state of ["confirming", "preview", "missing", "failed", "cancelled"]) {
  test(`${state} cannot become a fake success or resubmit`, async () => {
    let writes = 0;
    const confirm = createImportConfirmationRecovery({ write: async () => { writes++; throw timeout(); },
      read: async () => state === "missing" ? null : { importRecordId: "imp", status: state } });
    const code = state === "confirming" ? "IMPORT_CONFIRM_PENDING" : ["failed", "cancelled"].includes(state) ? "IMPORT_CONFIRM_FAILED" : "IMPORT_CONFIRM_UNCERTAIN";
    for (let n = 0; n < 2; n++) await assert.rejects(confirm("imp", {}), { code });
    assert.equal(writes, 1);
  });
}

test("concurrent confirmation shares one promise and bounded hung writes only recheck", async () => {
  let writes = 0, found = null;
  const confirm = createImportConfirmationRecovery({ timeoutMs: 5, verifyTimeoutMs: 5,
    write: () => { writes++; return new Promise(() => {}); }, read: async () => found });
  const first = confirm("imp", {});
  assert.equal(first, confirm("imp", {}));
  await assert.rejects(first, { code: "IMPORT_CONFIRM_UNCERTAIN" });
  found = receipt;
  assert.equal((await confirm("imp", {})).status, "completed");
  assert.equal(writes, 1);
});

test("wrong IDs, incomplete receipts and failed checks stay uncertain", async () => {
  for (const read of [async () => ({ ...receipt, importRecordId: "wrong" }), async () => ({ ...receipt, confirmResult: {} }),
    async () => { throw new Error("service restarted"); }]) {
    const confirm = createImportConfirmationRecovery({ write: async () => null, read });
    await assert.rejects(confirm("imp", {}), { code: "IMPORT_CONFIRM_UNCERTAIN" });
  }
});

test("validation rejection permits corrected input without result readback", async () => {
  let writes = 0;
  const confirm = createImportConfirmationRecovery({ write: async () => {
    if (++writes === 1) throw Object.assign(new Error("bad selection"), { code: "IMPORT_SELECTED_CANDIDATES_INVALID" });
    return { importRecordId: "imp", status: "completed", result };
  }, read: () => assert.fail("validation must not check") });
  await assert.rejects(confirm("imp", {}), { code: "IMPORT_SELECTED_CANDIDATES_INVALID" });
  assert.equal((await confirm("imp", {})).status, "completed");
});

test("bounded storage does not evict unresolved operations to allow a new POST", async () => {
  let writes = 0;
  const confirm = createImportConfirmationRecovery({ limit: 1, write: async () => { writes++; throw timeout(); }, read: async () => null });
  await assert.rejects(confirm("imp", {}), { code: "IMPORT_CONFIRM_UNCERTAIN" });
  await assert.rejects(confirm("another", {}), { code: "IMPORT_CONFIRM_UNCERTAIN" });
  await assert.rejects(confirm("imp", {}), { code: "IMPORT_CONFIRM_UNCERTAIN" });
  assert.equal(writes, 1);
});
