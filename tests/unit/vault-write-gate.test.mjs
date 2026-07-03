import test from "node:test";
import assert from "node:assert/strict";

import { createVaultBackupJobGate } from "../../apps/api/src/vault-write-gate.mjs";

test("vault backup job gate allows only one backup or restore task at a time", () => {
  const gate = createVaultBackupJobGate();
  const release = gate.enter();
  assert.equal(gate.status().running, true);

  assert.throws(() => gate.enter(), {
    code: "VAULT_BACKUP_ALREADY_RUNNING",
    status: 423
  });

  release();
  assert.equal(gate.status().running, false);

  const releaseAgain = gate.enter();
  releaseAgain();
  assert.equal(gate.status().running, false);
});
