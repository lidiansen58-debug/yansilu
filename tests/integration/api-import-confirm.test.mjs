import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import net from "node:net";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createImportConfirmationRecovery } from "../../apps/web/src/import-confirmation-recovery.js";
import { createImportRecordJournal } from "../../apps/api/src/import-record-journal.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const FIXTURES_ROOT = path.join(REPO_ROOT, "tests", "fixtures", "imports");

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 5000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error("API server did not become healthy");
}

async function postJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function getJson(baseUrl, pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const json = await res.json();
  return { status: res.status, json };
}

function startApi(port, vaultPath) {
  return spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

async function stopApi(child) {
  if (!child || child.killed) return;
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
}

test("completed import survives an actual API restart and cannot be imported again", async t => {
  const vaultPath = await makeTempDir("yansilu-import-restart-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let child = startApi(port, vaultPath);
  t.after(() => stopApi(child));
  await waitForHealth(baseUrl);
  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "obsidian", payload: { path: path.join(FIXTURES_ROOT, "markdown-basic") }, options: {}
  });
  assert.equal(preview.status, 200);
  const id = preview.json.importRecordId;
  const confirmed = await postJson(baseUrl, `/api/v1/imports/${id}/confirm`, { confirm: true, overrideOriginality: true });
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.json));
  const before = (await getJson(baseUrl, `/api/v1/imports/${id}`)).json.importRecord;
  const files = await Promise.all(before.confirmResult.createdFiles.map(item => fs.readFile(path.join(vaultPath, item.path))));
  await stopApi(child);
  child = startApi(port, vaultPath);
  await waitForHealth(baseUrl);
  const restored = (await getJson(baseUrl, `/api/v1/imports/${id}`)).json.importRecord;
  assert.equal(restored.status, "completed");
  assert.deepEqual(restored.confirmResult, before.confirmResult);
  const duplicate = await postJson(baseUrl, `/api/v1/imports/${id}/confirm`, { confirm: true });
  assert.equal(duplicate.json.error.code, "IMPORT_STATUS_INVALID");
  for (let i = 0; i < files.length; i++) assert.deepEqual(await fs.readFile(path.join(vaultPath, before.confirmResult.createdFiles[i].path)), files[i]);
});

test("an interrupted import journal cannot execute confirmation after API restart", async t => {
  const vaultPath = await makeTempDir("yansilu-import-interrupted-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let child = startApi(port, vaultPath);
  t.after(() => stopApi(child));
  await waitForHealth(baseUrl);
  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "obsidian", payload: { path: path.join(FIXTURES_ROOT, "markdown-basic") }, options: {}
  });
  assert.equal(preview.status, 200);
  const id = preview.json.importRecordId;
  await stopApi(child);
  const journal = createImportRecordJournal();
  const record = await journal.read(vaultPath, id);
  await journal.write({ ...record, state: "confirming" });
  child = startApi(port, vaultPath);
  await waitForHealth(baseUrl);
  const confirm = await postJson(baseUrl, `/api/v1/imports/${id}/confirm`, { confirm: true });
  assert.equal(confirm.json.error.code, "IMPORT_STATUS_INVALID");
  const restored = (await getJson(baseUrl, `/api/v1/imports/${id}`)).json.importRecord;
  assert.equal(restored.status, "interrupted");
  const files = await fs.readdir(path.join(vaultPath, "notes"), { recursive: true });
  assert.deepEqual(files.filter(name => name.endsWith(".md")), []);
});

test("lost import confirmation response is recovered from the real record without importing again", async t => {
  const vaultPath = await makeTempDir("yansilu-import-confirm-readback-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);
  t.after(() => stopApi(child));
  await waitForHealth(baseUrl);
  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "obsidian", payload: { path: path.join(FIXTURES_ROOT, "obsidian-realistic-vault") }, options: {}
  });
  assert.equal(preview.status, 200);
  const id = preview.json.importRecordId;
  let writes = 0, available = false;
  const confirm = createImportConfirmationRecovery({
    write: async (recordId, payload) => {
      writes++;
      const response = await postJson(baseUrl, `/api/v1/imports/${recordId}/confirm`, { confirm: true, ...payload });
      assert.equal(response.status, 200);
      throw Object.assign(new Error("response lost after import completed"), { code: "request_timeout" });
    },
    read: async recordId => available ? (await getJson(baseUrl, `/api/v1/imports/${recordId}`)).json.importRecord : null
  });
  await assert.rejects(confirm(id, { overrideOriginality: true }), { code: "IMPORT_CONFIRM_UNCERTAIN" });
  await assert.rejects(confirm(id, {}), { code: "IMPORT_CONFIRM_UNCERTAIN" });
  const record = (await getJson(baseUrl, `/api/v1/imports/${id}`)).json.importRecord;
  assert.equal(record.status, "completed");
  const before = [];
  for (const item of record.confirmResult.createdFiles) before.push(await fs.readFile(path.join(vaultPath, item.path)));
  assert.ok(before.length > 0);
  available = true;
  const recovered = await confirm(id, { selectedCandidateIds: [] });
  assert.equal(recovered.status, "completed");
  assert.deepEqual(recovered.result, record.confirmResult);
  assert.equal((await confirm(id, {})).status, "completed");
  assert.equal(writes, 1);
  for (let index = 0; index < before.length; index++) {
    assert.deepEqual(await fs.readFile(path.join(vaultPath, record.confirmResult.createdFiles[index].path)), before[index]);
  }
});

test("an import confirmation cannot follow a vault switch while its body is still arriving", async t => {
  const originalVault = await makeTempDir("yansilu-import-request-scope-");
  const otherVault = await makeTempDir("yansilu-import-request-other-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, originalVault);
  t.after(() => stopApi(child));
  await waitForHealth(baseUrl);
  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "obsidian", payload: { path: path.join(FIXTURES_ROOT, "obsidian-realistic-vault") }, options: {}
  });
  assert.equal(preview.status, 200);
  const id = preview.json.importRecordId;
  let pending;
  const response = new Promise((resolve, reject) => {
    pending = http.request(`${baseUrl}/api/v1/imports/${id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" } }, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(data) }));
    });
    pending.on("error", reject);
    pending.write('{"confirm":');
  });
  t.after(() => pending.destroy());
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal((await postJson(baseUrl, "/api/v1/vault", { vaultPath: otherVault })).status, 200);
  pending.end('true,"overrideOriginality":true}');
  const denied = await response;
  assert.equal(denied.status, 409);
  assert.equal(denied.json.error.code, "IMPORT_VAULT_CHANGED");
  const stale = await postJson(baseUrl, `/api/v1/imports/${id}/confirm`, { confirm: true, overrideOriginality: true });
  assert.equal(stale.status, 404);
  assert.equal(stale.json.error.code, "IMPORT_RECORD_NOT_FOUND");
  assert.equal((await getJson(baseUrl, `/api/v1/imports/${id}`)).status, 404);
  const sampleId = preview.json.samples.sourceIds[0];
  assert.equal((await getJson(baseUrl, `/api/v1/notes/${sampleId}`)).status, 404);
  await postJson(baseUrl, "/api/v1/vault", { vaultPath: originalVault });
  assert.equal((await getJson(baseUrl, `/api/v1/notes/${sampleId}`)).status, 404);
});

test("API import confirm can write only selected candidates from an Obsidian vault", async () => {
  const vaultPath = await makeTempDir("yansilu-api-vault-selected-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const fixturePath = path.join(FIXTURES_ROOT, "obsidian-realistic-vault");
  const child = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: fixturePath },
      options: { detectWikilinks: true }
    });
    assert.equal(preview.status, 200, JSON.stringify(preview.json));

    const [selectedSourceId] = preview.json.samples.sourceIds;
    const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
      confirm: true,
      selectedCandidateIds: [selectedSourceId]
    });

    assert.equal(confirm.status, 200, JSON.stringify(confirm.json));
    assert.deepEqual(confirm.json.result.created, {
      sources: 1,
      literatureNotes: 0,
      permanentNotes: 0
    });
    assert.deepEqual(confirm.json.result.selection, {
      mode: "subset",
      candidateIds: [selectedSourceId],
      totalCandidates: 5,
      selectedCandidates: 1,
      counts: {
        sources: 1,
        literatureNotes: 0,
        permanentNotes: 0
      }
    });
  } finally {
    await stopApi(child);
  }
});

test("API import confirm blocks originality-flagged permanent notes by default and allows explicit override", async () => {
  const vaultPath = await makeTempDir("yansilu-api-vault-originality-");
  const importRoot = await makeTempDir("yansilu-api-import-originality-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  await fs.writeFile(
    path.join(importRoot, "copied-claim.md"),
    [
      "---",
      "title: Copied claim",
      "type: permanent",
      'tags: ["permanent"]',
      "---",
      "",
      "A copied claim should remain a source excerpt."
    ].join("\n"),
    "utf8"
  );

  try {
    await waitForHealth(baseUrl);

    const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: importRoot }
    });
    assert.equal(preview.status, 200, JSON.stringify(preview.json));
    assert.deepEqual(preview.json.originalityGuard.flaggedPermanentIds, preview.json.samples.permanentNoteIds);

    const blocked = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
      confirm: true
    });
    assert.equal(blocked.status, 409, JSON.stringify(blocked.json));
    assert.equal(blocked.json.error.code, "IMPORT_ORIGINALITY_BLOCKED");

    const confirmed = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
      confirm: true,
      overrideOriginality: true
    });
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.json));
    assert.deepEqual(confirmed.json.originalityGuard.flaggedPermanentIds, preview.json.samples.permanentNoteIds);
  } finally {
    await stopApi(child);
  }
});

test("API import confirm writes obsidian literature, permanent notes, and copied assets", async () => {
  const vaultPath = await makeTempDir("yansilu-api-vault-obsidian-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const fixturePath = path.join(FIXTURES_ROOT, "obsidian-realistic-vault");
  const child = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: fixturePath },
      options: { detectWikilinks: true }
    });
    assert.equal(preview.status, 200, JSON.stringify(preview.json));

    const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
      confirm: true,
      directoryId: "dir_literature_default",
      overrideOriginality: true
    });
    assert.equal(confirm.status, 200, JSON.stringify(confirm.json));
    assert.deepEqual(confirm.json.result.created, {
      sources: 2,
      literatureNotes: 2,
      permanentNotes: 1
    });
    assert.ok(confirm.json.result.createdFiles.some((item) => item.noteType === "asset"));

    const literatureFile = confirm.json.result.createdFiles.find((item) => item.noteType === "literature");
    const markdown = await fs.readFile(path.join(vaultPath, literatureFile.path), "utf8");
    assert.match(markdown, /assets\/imports\//);
  } finally {
    await stopApi(child);
  }
});

test("API import records can be fetched and listed during the current app session", async () => {
  const vaultPath = await makeTempDir("yansilu-api-vault-records-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const fixturePath = path.join(FIXTURES_ROOT, "obsidian-realistic-vault");
  const child = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: fixturePath },
      options: { detectWikilinks: true }
    });
    assert.equal(preview.status, 200, JSON.stringify(preview.json));

    const fetchedPreview = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
    assert.equal(fetchedPreview.status, 200, JSON.stringify(fetchedPreview.json));
    assert.equal(fetchedPreview.json.importRecord.status, "preview");

    const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
      confirm: true,
      directoryId: "dir_literature_default",
      overrideOriginality: true
    });
    assert.equal(confirm.status, 200, JSON.stringify(confirm.json));

    const fetchedCompleted = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
    assert.equal(fetchedCompleted.status, 200, JSON.stringify(fetchedCompleted.json));
    assert.equal(fetchedCompleted.json.importRecord.status, "completed");

    const listed = await getJson(baseUrl, "/api/v1/imports?limit=10");
    assert.equal(listed.status, 200, JSON.stringify(listed.json));
    assert.ok(Array.isArray(listed.json.items));
    assert.ok(listed.json.items.some((item) => item.importRecordId === preview.json.importRecordId));
  } finally {
    await stopApi(child);
  }
});

test("API import preview returns warnings instead of 500 for unreadable obsidian paths", async () => {
  const vaultPath = await makeTempDir("yansilu-api-vault-unreadable-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: path.join(vaultPath, "missing-obsidian-vault") }
    });

    assert.equal(preview.status, 200, JSON.stringify(preview.json));
    assert.equal(preview.json.summary.sources, 0);
    assert.equal(preview.json.summary.literatureNotes, 0);
    assert.equal(preview.json.summary.permanentNotes, 0);
    assert.equal(preview.json.summary.warnings, 1);
    assert.equal(preview.json.warnings[0].code, "IMPORT_SOURCE_UNREADABLE");
  } finally {
    await stopApi(child);
  }
});

test("API import rollback is rejected in simplified mode", async () => {
  const vaultPath = await makeTempDir("yansilu-api-vault-rollback-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const fixturePath = path.join(FIXTURES_ROOT, "obsidian-realistic-vault");
  const child = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: fixturePath },
      options: { detectWikilinks: true }
    });
    assert.equal(preview.status, 200, JSON.stringify(preview.json));

    const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
      confirm: true,
      directoryId: "dir_literature_default",
      overrideOriginality: true
    });
    assert.equal(confirm.status, 200, JSON.stringify(confirm.json));

    const rollback = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/rollback`, {});
    assert.equal(rollback.status, 400, JSON.stringify(rollback.json));
    assert.equal(rollback.json.error.code, "IMPORT_ROLLBACK_UNSUPPORTED");
  } finally {
    await stopApi(child);
  }
});
