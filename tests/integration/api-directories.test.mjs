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

test("directories API initializes defaults and persists newly created directory", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-dirs-vault-");
  const targetPath = path.join(vaultPath, "notes", "original", "api-dirs-target");
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

  const initial = await getJson(baseUrl, "/api/v1/directories");
  assert.equal(initial.status, 200);
  assert.ok(initial.json.total >= 3);
  const initialIds = new Set(initial.json.items.map((x) => x.id));
  assert.equal(initialIds.has("dir_fleeting_default"), true);
  assert.equal(initialIds.has("dir_literature_default"), true);
  assert.equal(initialIds.has("dir_original_default"), true);

  const created = await postJson(baseUrl, "/api/v1/directories", {
    title: "写作方法",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(targetPath, "写作方法"),
    maxNotes: 700
  });
  assert.equal(created.status, 201);
  assert.equal(created.json.item.title, "写作方法");
  assert.equal(created.json.item.parentDirectoryId, "dir_original_default");
  assert.equal(created.json.item.maxNotes, 700);

  await fs.access(created.json.item.fsPath);

  const after = await getJson(baseUrl, "/api/v1/directories");
  assert.equal(after.status, 200);
  const byId = new Map(after.json.items.map((x) => [x.id, x]));
  assert.ok(byId.has(created.json.item.id));

  const patched = await patchJson(baseUrl, `/api/v1/directories/${encodeURIComponent(created.json.item.id)}`, {
    title: "write-method-updated",
    maxNotes: 650
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.json.item.title, "write-method-updated");
  assert.equal(patched.json.item.maxNotes, 650);

  const removed = await deleteJson(baseUrl, `/api/v1/directories/${encodeURIComponent(created.json.item.id)}`);
  assert.equal(removed.status, 200);

  const finalList = await getJson(baseUrl, "/api/v1/directories");
  assert.equal(finalList.status, 200);
  const finalIds = new Set(finalList.json.items.map((x) => x.id));
  assert.equal(finalIds.has(created.json.item.id), false);
});

test("directories API renames and moves directory fsPath together with descendant paths and note markdown paths", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-dir-move-vault-");
  const noteRoot = path.join(vaultPath, "notes", "original", "api-dir-move-root");
  const nextRoot = path.join(vaultPath, "notes", "original", "api-dir-move-next");
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

  const parentPath = path.join(noteRoot, "parent-dir");
  const childPath = path.join(parentPath, "child-dir");
  const movedParentPath = path.join(nextRoot, "parent-dir-renamed");
  const movedChildPath = path.join(movedParentPath, "child-dir");

  const parentDir = await postJson(baseUrl, "/api/v1/directories", {
    title: "parent-dir",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: parentPath,
    maxNotes: 500
  });
  assert.equal(parentDir.status, 201, JSON.stringify(parentDir.json));

  const childDir = await postJson(baseUrl, "/api/v1/directories", {
    title: "child-dir",
    parentDirectoryId: parentDir.json.item.id,
    directoryType: "custom",
    fsPath: childPath,
    maxNotes: 500
  });
  assert.equal(childDir.status, 201, JSON.stringify(childDir.json));

  const parentNote = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: parentDir.json.item.id,
    body: "# Parent note\n\nStored under the parent directory."
  });
  assert.equal(parentNote.status, 201, JSON.stringify(parentNote.json));

  const childNote = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: childDir.json.item.id,
    body: "# Child note\n\nStored under the child directory."
  });
  assert.equal(childNote.status, 201, JSON.stringify(childNote.json));

  const oldParentNotePath = path.join(vaultPath, parentNote.json.item.markdownPath.replaceAll("/", path.sep));
  const oldChildNotePath = path.join(vaultPath, childNote.json.item.markdownPath.replaceAll("/", path.sep));
  await fs.access(oldParentNotePath);
  await fs.access(oldChildNotePath);

  const patched = await patchJson(baseUrl, `/api/v1/directories/${encodeURIComponent(parentDir.json.item.id)}`, {
    title: "parent-dir-renamed",
    fsPath: movedParentPath
  });
  assert.equal(patched.status, 200, JSON.stringify(patched.json));
  assert.equal(patched.json.item.title, "parent-dir-renamed");
  assert.equal(path.resolve(patched.json.item.fsPath), path.resolve(movedParentPath));

  const directories = await getJson(baseUrl, "/api/v1/directories?includeHidden=true");
  assert.equal(directories.status, 200);
  const childAfter = directories.json.items.find((item) => item.id === childDir.json.item.id);
  assert.ok(childAfter, JSON.stringify(directories.json.items, null, 2));
  assert.equal(path.resolve(childAfter.fsPath), path.resolve(movedChildPath));

  const parentNoteAfter = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(parentNote.json.item.id)}`);
  const childNoteAfter = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(childNote.json.item.id)}`);
  assert.equal(parentNoteAfter.status, 200);
  assert.equal(childNoteAfter.status, 200);

  const newParentNotePath = path.join(vaultPath, parentNoteAfter.json.item.markdownPath.replaceAll("/", path.sep));
  const newChildNotePath = path.join(vaultPath, childNoteAfter.json.item.markdownPath.replaceAll("/", path.sep));
  assert.equal(path.resolve(newParentNotePath), path.resolve(path.join(movedParentPath, path.basename(oldParentNotePath))));
  assert.equal(path.resolve(newChildNotePath), path.resolve(path.join(movedChildPath, path.basename(oldChildNotePath))));

  await assert.rejects(fs.access(oldParentNotePath));
  await assert.rejects(fs.access(oldChildNotePath));
  await fs.access(newParentNotePath);
  await fs.access(newChildNotePath);
});

test("directories API deletes empty directory record and removes empty folder from disk", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-dir-delete-vault-");
  const targetPath = path.join(vaultPath, "notes", "original", "api-dir-delete-root");
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

  const emptyFolderPath = path.join(targetPath, "empty-folder");
  const created = await postJson(baseUrl, "/api/v1/directories", {
    title: "empty-folder",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: emptyFolderPath,
    maxNotes: 500
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  await fs.access(emptyFolderPath);

  const removed = await deleteJson(baseUrl, `/api/v1/directories/${encodeURIComponent(created.json.item.id)}`);
  assert.equal(removed.status, 200, JSON.stringify(removed.json));
  await assert.rejects(fs.access(emptyFolderPath));
});

test("directories API rejects custom fsPath values outside the vault root", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-dir-scope-vault-");
  const outsidePath = await makeTempDir("yansilu-api-dir-scope-outside-");
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

  const created = await postJson(baseUrl, "/api/v1/directories", {
    title: "outside-dir",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: outsidePath,
    maxNotes: 500
  });
  assert.equal(created.status, 400, JSON.stringify(created.json));
  assert.equal(created.json.error.code, "DIRECTORY_PAYLOAD_INVALID");
  assert.match(created.json.error.message, /inside vault/i);
});

test("directories API keeps the record when filesystem delete fails", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-dir-nonempty-vault-");
  const targetPath = path.join(vaultPath, "notes", "original", "api-dir-nonempty-root");
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

  const folderPath = path.join(targetPath, "non-empty-folder");
  const created = await postJson(baseUrl, "/api/v1/directories", {
    title: "non-empty-folder",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: folderPath,
    maxNotes: 500
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  await fs.writeFile(path.join(folderPath, "leftover.tmp"), "x", "utf8");

  const removed = await deleteJson(baseUrl, `/api/v1/directories/${encodeURIComponent(created.json.item.id)}`);
  assert.equal(removed.status, 400, JSON.stringify(removed.json));

  const directories = await getJson(baseUrl, "/api/v1/directories?includeHidden=true");
  assert.equal(directories.status, 200);
  assert.ok(directories.json.items.some((item) => item.id === created.json.item.id));
  await fs.access(folderPath);
});

test("directories API rejects visible directories under hidden parents on create and update", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-hidden-parent-vault-");
  const originalPath = path.join(vaultPath, "notes", "original", "visible-dir");
  const hiddenPath = path.join(vaultPath, "notes", "sources", "visible-under-hidden");
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

  const createdUnderHidden = await postJson(baseUrl, "/api/v1/directories", {
    title: "visible-under-hidden",
    parentDirectoryId: "dir_source_default",
    directoryType: "custom",
    fsPath: hiddenPath,
    maxNotes: 500
  });
  assert.equal(createdUnderHidden.status, 400, JSON.stringify(createdUnderHidden.json));
  assert.equal(createdUnderHidden.json.error.code, "DIRECTORY_PAYLOAD_INVALID");
  assert.match(createdUnderHidden.json.error.message, /hidden parent/i);

  const visibleDirectory = await postJson(baseUrl, "/api/v1/directories", {
    title: "visible-dir",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: originalPath,
    maxNotes: 500
  });
  assert.equal(visibleDirectory.status, 201, JSON.stringify(visibleDirectory.json));

  const movedUnderHidden = await patchJson(
    baseUrl,
    `/api/v1/directories/${encodeURIComponent(visibleDirectory.json.item.id)}`,
    {
      parentDirectoryId: "dir_source_default",
      fsPath: hiddenPath
    }
  );
  assert.equal(movedUnderHidden.status, 400, JSON.stringify(movedUnderHidden.json));
  assert.equal(movedUnderHidden.json.error.code, "DIRECTORY_UPDATE_INVALID");
  assert.match(movedUnderHidden.json.error.message, /hidden parent/i);
});
