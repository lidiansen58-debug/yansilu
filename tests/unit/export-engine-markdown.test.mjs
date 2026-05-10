import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { exportMarkdown } from "../../packages/export-engine/src/index.mjs";

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("exportMarkdown copies vault notes markdown files and writes an export record", async () => {
  const vaultPath = await makeTempDir("yansilu-export-vault-");
  const targetPath = await makeTempDir("yansilu-export-target-");
  const sourcePath = path.join(vaultPath, "notes", "literature", "ln_1.md");
  const assetPath = path.join(vaultPath, "assets", "images", "chart.txt");
  await fs.mkdir(path.dirname(sourcePath), { recursive: true });
  await fs.mkdir(path.dirname(assetPath), { recursive: true });
  await fs.writeFile(sourcePath, "---\nid: ln_1\n---\n\nBody", "utf8");
  await fs.writeFile(assetPath, "asset-body", "utf8");

  const result = await exportMarkdown({
    vaultPath,
    targetPath,
    requestId: "req_test",
    now: new Date("2026-04-22T00:00:00.000Z")
  });

  assert.equal(result.status, "queued");
  assert.equal(result.copied, 2);
  assert.deepEqual(result.copiedBreakdown, {
    markdownFiles: 1,
    assetFiles: 1,
    totalFiles: 2
  });

  const copied = await fs.readFile(path.join(targetPath, "literature", "ln_1.md"), "utf8");
  const copiedAsset = await fs.readFile(path.join(targetPath, "assets", "images", "chart.txt"), "utf8");
  assert.equal(copied, "---\nid: ln_1\n---\n\nBody");
  assert.equal(copiedAsset, "asset-body");

  const record = JSON.parse(await fs.readFile(result.recordPath, "utf8"));
  assert.equal(record.exportJobId, result.exportJobId);
  assert.equal(record.copied, 2);
  assert.deepEqual(record.copiedBreakdown, result.copiedBreakdown);
  assert.equal(record.requestId, "req_test");
  assert.equal(record.time, "2026-04-22T00:00:00.000Z");
});

test("exportMarkdown succeeds with zero copied files when notes directory is absent", async () => {
  const vaultPath = await makeTempDir("yansilu-export-empty-vault-");
  const targetPath = await makeTempDir("yansilu-export-empty-target-");

  const result = await exportMarkdown({ vaultPath, targetPath });

  assert.equal(result.status, "queued");
  assert.equal(result.copied, 0);
  assert.deepEqual(result.copiedBreakdown, {
    markdownFiles: 0,
    assetFiles: 0,
    totalFiles: 0
  });
  await fs.access(result.recordPath);
});
