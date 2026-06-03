import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

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
      directoryId: "dir_literature_default"
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
      directoryId: "dir_literature_default"
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
      directoryId: "dir_literature_default"
    });
    assert.equal(confirm.status, 200, JSON.stringify(confirm.json));

    const rollback = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/rollback`, {});
    assert.equal(rollback.status, 400, JSON.stringify(rollback.json));
    assert.equal(rollback.json.error.code, "IMPORT_ROLLBACK_UNSUPPORTED");
  } finally {
    await stopApi(child);
  }
});
