import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createDesktopVaultRecovery } from "../../apps/api/src/desktop-vault-recovery.mjs";

test("ordinary browser API does not create a desktop recovery record", () => {
  const recovery = createDesktopVaultRecovery();
  assert.equal(recovery.recoveryPath, "");
  assert.equal(recovery.commit("vault"), undefined);
});

test("desktop recovery requires an absolute record location", () => {
  assert.throws(() => createDesktopVaultRecovery("relative.json"), /must be absolute/);
});

test("switch acknowledgement has an atomic, complete UTF-8 recovery record", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "yansilu-recovery-record-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, "api-vault-recovery.json");
  const recovery = createDesktopVaultRecovery(filename);
  for (const name of ["first-vault", "笔记库"]) {
    const vaultPath = path.join(directory, name);
    recovery.commit(vaultPath);
    assert.deepEqual(JSON.parse(fs.readFileSync(filename, "utf8")), { app: "yansilu", version: 1, vaultPath });
    assert.deepEqual(fs.readdirSync(directory), ["api-vault-recovery.json"]);
  }
});

test("failed record replacement throws and removes its temporary file", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "yansilu-recovery-blocked-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, "blocked");
  fs.mkdirSync(filename);
  fs.writeFileSync(path.join(filename, "retained"), "unchanged", "utf8");
  assert.throws(() => createDesktopVaultRecovery(filename).commit(path.join(directory, "next-vault")));
  assert.deepEqual(fs.readdirSync(directory), ["blocked"]);
  assert.equal(fs.readFileSync(path.join(filename, "retained"), "utf8"), "unchanged");
});
