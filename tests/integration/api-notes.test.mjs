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
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error("API server did not become healthy");
}

async function getJson(baseUrl, pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const json = await res.json();
  return { status: res.status, json };
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

async function putJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function patchJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function deleteJson(baseUrl, pathname) {
  const res = await fetch(`${baseUrl}${pathname}`, { method: "DELETE" });
  const json = await res.json();
  return { status: res.status, json };
}

test("notes API creates, lists, loads, and updates markdown note", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-notes-vault-");
  const noteRoot = await makeTempDir("yansilu-api-notes-root-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const createDir = await postJson(baseUrl, "/api/v1/directories", {
    title: "research-method",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(noteRoot, "research-method"),
    maxNotes: 500
  });
  assert.equal(createDir.status, 201);
  const directoryId = createDir.json.item.id;

  const createNote = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    body: "# Writing starts from note units\n\nThis is test content."
  });
  assert.equal(createNote.status, 201);
  assert.equal(createNote.json.item.noteType, "permanent");
  assert.equal(createNote.json.item.title, "Writing starts from note units");

  const noteId = createNote.json.item.id;
  const noteFile = path.join(vaultPath, createNote.json.item.markdownPath.replaceAll("/", path.sep));
  const markdown = await fs.readFile(noteFile, "utf8");
  assert.match(markdown, /# Writing starts from note units/);

  const list = await getJson(baseUrl, `/api/v1/directories/${encodeURIComponent(directoryId)}/notes`);
  assert.equal(list.status, 200);
  assert.equal(list.json.total, 1);
  assert.equal(list.json.items[0].id, noteId);

  const getNote = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`);
  assert.equal(getNote.status, 200);
  assert.equal(getNote.json.item.id, noteId);
  assert.match(getNote.json.item.body, /This is test content\./);

  const update = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`, {
    body: "# Updated title line\n\nUpdated paragraph."
  });
  assert.equal(update.status, 200);
  assert.equal(update.json.item.id, noteId);
  assert.equal(update.json.item.title, "Updated title line");

  const getAfterUpdate = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`);
  assert.equal(getAfterUpdate.status, 200);
  assert.equal(getAfterUpdate.json.item.title, "Updated title line");
  assert.match(getAfterUpdate.json.item.body, /Updated paragraph\./);

  const markdownAfterUpdate = await fs.readFile(noteFile, "utf8");
  assert.match(markdownAfterUpdate, /# Updated title line/);
  assert.match(markdownAfterUpdate, /Updated paragraph\./);

  const patchedDirectory = await patchJson(baseUrl, `/api/v1/directories/${encodeURIComponent(directoryId)}`, {
    title: "research-updated"
  });
  assert.equal(patchedDirectory.status, 200);
  assert.equal(patchedDirectory.json.item.title, "research-updated");

  const createDir2 = await postJson(baseUrl, "/api/v1/directories", {
    title: "drafts",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(noteRoot, "drafts"),
    maxNotes: 500
  });
  assert.equal(createDir2.status, 201);
  const directoryId2 = createDir2.json.item.id;

  const moved = await postJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}/move`, {
    directoryId: directoryId2
  });
  assert.equal(moved.status, 200);
  assert.equal(moved.json.item.directoryId, directoryId2);
  const movedFile = path.join(vaultPath, moved.json.item.markdownPath.replaceAll("/", path.sep));
  await assert.rejects(fs.access(noteFile));
  await fs.access(movedFile);

  const listOld = await getJson(baseUrl, `/api/v1/directories/${encodeURIComponent(directoryId)}/notes`);
  assert.equal(listOld.status, 200);
  assert.equal(listOld.json.total, 0);

  const listNew = await getJson(baseUrl, `/api/v1/directories/${encodeURIComponent(directoryId2)}/notes`);
  assert.equal(listNew.status, 200);
  assert.equal(listNew.json.total, 1);
  assert.equal(listNew.json.items[0].id, noteId);

  const deleted = await deleteJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`);
  assert.equal(deleted.status, 200);

  const listAfterDelete = await getJson(baseUrl, `/api/v1/directories/${encodeURIComponent(directoryId2)}/notes`);
  assert.equal(listAfterDelete.status, 200);
  assert.equal(listAfterDelete.json.total, 0);

  const getAfterDelete = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`);
  assert.equal(getAfterDelete.status, 404);
  await assert.rejects(fs.access(movedFile));
});
