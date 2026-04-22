import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { initVault, SQLITE_DB_FILES, applySqliteMigrations } from "../../packages/domain/src/index.mjs";

async function makeTempVault() {
  return fs.mkdtemp(path.join(os.tmpdir(), "yansilu-sqlite-"));
}

async function hasNodeSqlite() {
  try {
    await import("node:sqlite");
    return true;
  } catch {
    return false;
  }
}

test("applySqliteMigrations creates three database files when node:sqlite is available", async (t) => {
  if (!(await hasNodeSqlite())) {
    t.skip("node:sqlite is not available in current runtime");
    return;
  }

  const vaultPath = await makeTempVault();
  await initVault(vaultPath);

  const result = await applySqliteMigrations(vaultPath);
  assert.ok(result.catalogPath.endsWith(SQLITE_DB_FILES.catalog));
  assert.ok(result.graphCachePath.endsWith(SQLITE_DB_FILES.graphCache));
  assert.ok(result.vectorsPath.endsWith(SQLITE_DB_FILES.vectors));

  const files = [result.catalogPath, result.graphCachePath, result.vectorsPath];
  for (const filePath of files) {
    const stat = await fs.stat(filePath);
    assert.equal(stat.isFile(), true);
  }
});

