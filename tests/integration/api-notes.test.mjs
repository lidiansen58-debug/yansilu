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

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function markdownDestinationPattern(target) {
  const escaped = escapeRegExp(target);
  return new RegExp(`\\((?:<${escaped}>|${escaped})\\)`);
}

test("notes API creates, lists, loads, and updates markdown note", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-notes-vault-");
  const noteRoot = path.join(vaultPath, "notes", "original");
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
    body: "# Writing starts from note units\n\nThis is test content.",
    thesis: "Writing should start from reusable note units instead of blank drafting.",
    threeLineSummary: [
      "Writing should start from reusable note units.",
      "That keeps argument-building tied to durable claims.",
      "It matters when the user wants to move from notes into structured prose."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "This breaks down when the claim cannot be traced to a concrete note."
  });
  assert.equal(createNote.status, 201);
  assert.equal(createNote.json.item.noteType, "permanent");
  assert.equal(createNote.json.item.title, "Writing starts from note units");
  assert.equal(createNote.json.item.originalityStatus, "warning");
  assert.deepEqual(createNote.json.item.authorship, { user_confirmed: false, ai_assisted: false });
  assert.equal(createNote.json.item.thesis, "Writing should start from reusable note units instead of blank drafting.");
  assert.deepEqual(createNote.json.item.threeLineSummary, [
    "Writing should start from reusable note units.",
    "That keeps argument-building tied to durable claims.",
    "It matters when the user wants to move from notes into structured prose."
  ]);
  assert.equal(createNote.json.item.distillationStatus, "confirmed");
  assert.equal(
    createNote.json.item.boundaryOrCounterpoint,
    "This breaks down when the claim cannot be traced to a concrete note."
  );
  assert.match(createNote.json.item.body, /This is test content\./);
  assert.equal(path.basename(createNote.json.item.markdownPath), "Writing starts from note units.md");

  const noteId = createNote.json.item.id;
  const noteFile = path.join(vaultPath, createNote.json.item.markdownPath.replaceAll("/", path.sep));
  const markdown = await fs.readFile(noteFile, "utf8");
  assert.match(markdown, /# Writing starts from note units/);
  assert.match(markdown, /thesis: Writing should start from reusable note units instead of blank drafting\./);
  assert.match(markdown, /three_line_summary:/);
  assert.match(markdown, /distillation_status: confirmed/);
  assert.match(markdown, /originality_status: warning/);
  assert.match(markdown, /authorship: \{"user_confirmed":false,"ai_assisted":false\}/);
  assert.match(markdown, /boundary_or_counterpoint: This breaks down when the claim cannot be traced to a concrete note\./);

  const list = await getJson(baseUrl, `/api/v1/directories/${encodeURIComponent(directoryId)}/notes`);
  assert.equal(list.status, 200);
  assert.equal(list.json.total, 1);
  assert.equal(list.json.items[0].id, noteId);

  const getNote = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`);
  assert.equal(getNote.status, 200);
  assert.equal(getNote.json.item.id, noteId);
  assert.equal(getNote.json.item.thesis, "Writing should start from reusable note units instead of blank drafting.");
  assert.deepEqual(getNote.json.item.threeLineSummary, [
    "Writing should start from reusable note units.",
    "That keeps argument-building tied to durable claims.",
    "It matters when the user wants to move from notes into structured prose."
  ]);
  assert.equal(getNote.json.item.distillationStatus, "confirmed");
  assert.equal(getNote.json.item.originalityStatus, "warning");
  assert.deepEqual(getNote.json.item.authorship, { user_confirmed: false, ai_assisted: false });
  assert.equal(
    getNote.json.item.boundaryOrCounterpoint,
    "This breaks down when the claim cannot be traced to a concrete note."
  );
  assert.match(getNote.json.item.body, /This is test content\./);

  const update = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`, {
    body: "# Updated title line\n\nUpdated paragraph.",
    status: "active",
    thesis: "A durable writing flow begins from compressed claims, not blank pages.",
    threeLineSummary: [
      "A durable writing flow begins from compressed claims.",
      "That lowers the cost of structuring paragraphs and arguments.",
      "It is most useful when the system turns notes into writing inputs."
    ],
    distillationStatus: "draft",
    boundaryOrCounterpoint: "This does not hold when the paragraph has no source trace.",
    originalityStatus: "pass",
    originalitySimilarity: 0.18,
    authorship: {
      user_confirmed: true,
      ai_assisted: false
    }
  });
  assert.equal(update.status, 200);
  assert.equal(update.json.item.id, noteId);
  assert.equal(update.json.item.title, "Updated title line");
  assert.equal(update.json.item.status, "active");
  assert.equal(update.json.item.thesis, "A durable writing flow begins from compressed claims, not blank pages.");
  assert.deepEqual(update.json.item.threeLineSummary, [
    "A durable writing flow begins from compressed claims.",
    "That lowers the cost of structuring paragraphs and arguments.",
    "It is most useful when the system turns notes into writing inputs."
  ]);
  assert.equal(update.json.item.distillationStatus, "draft");
  assert.equal(update.json.item.originalityStatus, "pass");
  assert.equal(update.json.item.originalitySimilarity, 0.18);
  assert.deepEqual(update.json.item.authorship, { user_confirmed: true, ai_assisted: false });
  assert.equal(update.json.item.boundaryOrCounterpoint, "This does not hold when the paragraph has no source trace.");
  assert.equal(path.basename(update.json.item.markdownPath), "Updated title line.md");

  const getAfterUpdate = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`);
  assert.equal(getAfterUpdate.status, 200);
  assert.equal(getAfterUpdate.json.item.title, "Updated title line");
  assert.equal(getAfterUpdate.json.item.status, "active");
  assert.equal(getAfterUpdate.json.item.thesis, "A durable writing flow begins from compressed claims, not blank pages.");
  assert.deepEqual(getAfterUpdate.json.item.threeLineSummary, [
    "A durable writing flow begins from compressed claims.",
    "That lowers the cost of structuring paragraphs and arguments.",
    "It is most useful when the system turns notes into writing inputs."
  ]);
  assert.equal(getAfterUpdate.json.item.distillationStatus, "draft");
  assert.equal(getAfterUpdate.json.item.originalityStatus, "pass");
  assert.equal(getAfterUpdate.json.item.originalitySimilarity, 0.18);
  assert.deepEqual(getAfterUpdate.json.item.authorship, { user_confirmed: true, ai_assisted: false });
  assert.equal(getAfterUpdate.json.item.boundaryOrCounterpoint, "This does not hold when the paragraph has no source trace.");
  assert.match(getAfterUpdate.json.item.body, /Updated paragraph\./);
  assert.equal(path.basename(getAfterUpdate.json.item.markdownPath), "Updated title line.md");

  const renamedNoteFile = path.join(vaultPath, update.json.item.markdownPath.replaceAll("/", path.sep));
  await assert.rejects(fs.access(noteFile));
  const markdownAfterUpdate = await fs.readFile(renamedNoteFile, "utf8");
  assert.match(markdownAfterUpdate, /# Updated title line/);
  assert.match(markdownAfterUpdate, /status: active/);
  assert.match(markdownAfterUpdate, /thesis: "?A durable writing flow begins from compressed claims, not blank pages\."?/);
  assert.match(markdownAfterUpdate, /three_line_summary:/);
  assert.match(markdownAfterUpdate, /distillation_status: draft/);
  assert.match(markdownAfterUpdate, /originality_status: pass/);
  assert.match(markdownAfterUpdate, /originality_similarity: 0\.18/);
  assert.match(markdownAfterUpdate, /authorship: \{"user_confirmed":true,"ai_assisted":false\}/);
  assert.match(markdownAfterUpdate, /boundary_or_counterpoint: This does not hold when the paragraph has no source trace\./);
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
  assert.equal(path.basename(moved.json.item.markdownPath), "Updated title line.md");
  const movedFile = path.join(vaultPath, moved.json.item.markdownPath.replaceAll("/", path.sep));
  await assert.rejects(fs.access(renamedNoteFile));
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

test("notes search returns explicit ranking metadata for relation target lookup", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-note-search-vault-");
  const noteRoot = path.join(vaultPath, "notes", "original");
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
    title: "alpha-ranking",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(noteRoot, "alpha-ranking"),
    maxNotes: 500
  });
  assert.equal(createDir.status, 201, JSON.stringify(createDir.json));
  const directoryId = createDir.json.item.id;

  const noteBodies = [
    "# Zeta unrelated\n\nOnly the folder path contains the query term.",
    "# Middle alpha target\n\nThe query appears in the middle of the title.",
    "# Alphabet trail\n\nThe title starts with the query.",
    "# Alpha\n\nThe title exactly matches the query."
  ];

  for (const body of noteBodies) {
    const created = await postJson(baseUrl, "/api/v1/notes", { directoryId, body });
    assert.equal(created.status, 201, JSON.stringify(created.json));
  }

  const search = await getJson(
    baseUrl,
    `/api/v1/notes/search?q=${encodeURIComponent("alpha")}&rootDirectoryId=${encodeURIComponent("dir_original_default")}&limit=10`
  );
  assert.equal(search.status, 200, JSON.stringify(search.json));
  assert.equal(search.json.ranking.method, "sqlite_catalog_note_search_v1");
  assert.deepEqual(search.json.ranking.priority.slice(0, 5), [
    "exact_title",
    "exact_id",
    "title_prefix",
    "id_prefix",
    "title_contains"
  ]);

  const titles = search.json.items.map((item) => item.title);
  assert.deepEqual(titles.slice(0, 4), ["Alpha", "Alphabet trail", "Middle alpha target", "Zeta unrelated"]);
  assert.deepEqual(
    search.json.items.slice(0, 4).map((item) => item.matchKind),
    ["exact_title", "title_prefix", "title_contains", "path_contains"]
  );
  assert.deepEqual(
    search.json.items.slice(0, 4).map((item) => item.rank),
    [0, 2, 4, 7]
  );
});

test("literature notes require paraphrase before they can be marked active", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-literature-vault-");
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

  const blockedCreate = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_literature_default",
    status: "active",
    body: "# 概念与语言\n\n## 原文\n\n概念和语言可能让人停留在表层，而未真正进入理解。\n"
  });
  assert.equal(blockedCreate.status, 400);
  assert.equal(blockedCreate.json.error.code, "LITERATURE_PARAPHRASE_REQUIRED");
  assert.equal(blockedCreate.json.error.details.requirement, "paraphrase");
  assert.equal(blockedCreate.json.error.details.requestedStatus, "active");
  assert.match(blockedCreate.json.error.message, /require a paraphrase/i);

  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_literature_default",
    status: "draft",
    body:
      "# 概念与语言\n\n## 原文\n\n概念和语言可能让人停留在表层，而未真正进入理解。\n\n## 转述\n\n作者在提醒我，语言流畅不等于真正理解。\n"
  });
  assert.equal(created.status, 201);
  assert.equal(created.json.item.noteType, "literature");
  assert.equal(created.json.item.status, "draft");

  const blockedUpdate = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(created.json.item.id)}`, {
    status: "active",
    body: "# 概念与语言\n\n## 原文\n\n概念和语言可能让人停留在表层，而未真正进入理解。\n\n## 转述\n\n"
  });
  assert.equal(blockedUpdate.status, 400);
  assert.equal(blockedUpdate.json.error.code, "LITERATURE_PARAPHRASE_REQUIRED");
  assert.equal(blockedUpdate.json.error.details.requirement, "paraphrase");
  assert.match(blockedUpdate.json.error.message, /require a paraphrase/i);

  const activated = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(created.json.item.id)}`, {
    status: "active",
    body:
      "# 概念与语言\n\n## 原文\n\n概念和语言可能让人停留在表层，而未真正进入理解。\n\n## 转述\n\n真正的任务不是复述原句，而是说清它改变了我对理解的定义。\n"
  });
  assert.equal(activated.status, 200);
  assert.equal(activated.json.item.status, "active");
  assert.match(activated.json.item.body, /真正的任务不是复述原句/);
});

test("permanent notes recompute originality against linked literature notes", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-permanent-originality-vault-");
  const noteRoot = path.join(vaultPath, "notes", "original");
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
    title: "originality-guard",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(noteRoot, "originality-guard"),
    maxNotes: 500
  });
  assert.equal(createDir.status, 201);
  const directoryId = createDir.json.item.id;

  const literature = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_literature_default",
    status: "draft",
    body:
      "# 概念与语言\n\n## 原文\n\nAI 不应该成为思想替身，而应该成为思想加速镜。\n\n## 转述\n\nAI 更适合帮助我暴露结构和冲突，而不是代替我做判断。\n"
  });
  assert.equal(literature.status, 201);

  const blockedCreate = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    status: "active",
    body:
      "# 镜像句子\n\nAI 不应该成为思想替身，而应该成为思想加速镜。 [[概念与语言]]",
    originalityStatus: "pass",
    authorship: {
      user_confirmed: true,
      ai_assisted: false
    }
  });
  assert.equal(blockedCreate.status, 400);
  assert.equal(blockedCreate.json.error.code, "PERMANENT_ORIGINALITY_BLOCKED");
  assert.equal(blockedCreate.json.error.details.noteType, "permanent");
  assert.equal(blockedCreate.json.error.details.requestedStatus, "active");
  assert.equal(blockedCreate.json.error.details.originality.status, "blocked");
  assert.ok(Number(blockedCreate.json.error.details.originality.similarity) >= 0.8);
  assert.match(blockedCreate.json.error.message, /Permanent note save blocked/i);

  const distinctCreate = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    status: "active",
    body:
      "# 我的判断\n\n真正该被加速的不是结论产出，而是我识别论证缺口与结构张力的速度。 [[概念与语言]]",
    originalityStatus: "warning",
    authorship: {
      user_confirmed: true,
      ai_assisted: false
    }
  });
  assert.equal(distinctCreate.status, 201);
  assert.equal(distinctCreate.json.item.status, "active");
  assert.equal(distinctCreate.json.item.originalityStatus, "pass");
  assert.ok(Number(distinctCreate.json.item.originalitySimilarity) < 0.6);

  const downgradedUpdate = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(distinctCreate.json.item.id)}`, {
    status: "active",
    body:
      "# 我的判断\n\n这条笔记已经接近外部语言，但我还没有完成作者确认。 [[概念与语言]]",
    authorship: {
      user_confirmed: false,
      ai_assisted: false
    }
  });
  assert.equal(downgradedUpdate.status, 200);
  assert.equal(downgradedUpdate.json.item.status, "draft");
});

test("notes API syncs markdown wikilinks and tags into note relations", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-note-relations-vault-");
  const noteRoot = path.join(vaultPath, "notes", "original");
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
    title: "relations",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(noteRoot, "relations"),
    maxNotes: 500
  });
  assert.equal(createDir.status, 201);
  const directoryId = createDir.json.item.id;

  const targetNote = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    body: "# Target idea\n\nThis note should receive a backlink."
  });
  assert.equal(targetNote.status, 201);

  const sourceNote = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    body: "# Source idea\n\nThis links to [[Target idea]] and carries #writing #中文标签."
  });
  assert.equal(sourceNote.status, 201);

  const siblingDir = await postJson(baseUrl, "/api/v1/directories", {
    title: "relations-sibling",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(noteRoot, "relations-sibling"),
    maxNotes: 500
  });
  assert.equal(siblingDir.status, 201);
  const siblingNote = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: siblingDir.json.item.id,
    body: "# Sibling tagged note\n\nThis note is in another original directory but shares #writing."
  });
  assert.equal(siblingNote.status, 201);

  const literatureTaggedNote = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_literature_default",
    body: "# Literature tagged note\n\nThis note should not appear in original-root #writing results."
  });
  assert.equal(literatureTaggedNote.status, 201);

  const sourceRelations = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(sourceNote.json.item.id)}/relations`);
  assert.equal(sourceRelations.status, 200);
  assert.deepEqual(
    sourceRelations.json.item.tags.map((tag) => tag.name).sort(),
    ["writing", "中文标签"]
  );
  assert.equal(sourceRelations.json.item.outgoingLinks.length, 1);
  assert.equal(sourceRelations.json.item.outgoingLinks[0].toNoteId, targetNote.json.item.id);
  assert.equal(sourceRelations.json.item.outgoingLinks[0].relationType, "associated_with");
  assert.equal(sourceRelations.json.item.outgoingLinks[0].rationale, "markdown_wikilink");

  const targetRelations = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(targetNote.json.item.id)}/relations`);
  assert.equal(targetRelations.status, 200);
  assert.equal(targetRelations.json.item.backlinks.length, 1);
  assert.equal(targetRelations.json.item.backlinks[0].fromNoteId, sourceNote.json.item.id);

  const graph = await getJson(baseUrl, `/api/v1/graph?scope=directory&directoryId=${encodeURIComponent(directoryId)}`);
  assert.equal(graph.status, 200);
  assert.equal(graph.json.item.scope, "directory");
  assert.equal(graph.json.item.directoryId, directoryId);
  assert.equal(graph.json.item.totalNodes, 2);
  assert.equal(graph.json.item.totalEdges, 1);
  assert.equal(graph.json.item.edges[0].fromNoteId, sourceNote.json.item.id);
  assert.equal(graph.json.item.edges[0].toNoteId, targetNote.json.item.id);
  assert.ok(graph.json.item.insights);
  assert.equal(graph.json.item.insights.supportingRelations.length, 0);
  assert.equal(graph.json.item.insights.conflictingRelations.length, 0);
  assert.equal(graph.json.item.insights.untypedRelations.length, 1);
  assert.equal(graph.json.item.insights.bridgeGaps.length, 0);
  assert.equal(graph.json.item.insights.connectedComponentCount, 1);

  const originalTagNotes = await getJson(
    baseUrl,
    `/api/v1/tags/${encodeURIComponent("writing")}/notes?rootDirectoryId=${encodeURIComponent("dir_original_default")}`
  );
  assert.equal(originalTagNotes.status, 200);
  assert.equal(originalTagNotes.json.tag, "writing");
  assert.equal(originalTagNotes.json.rootDirectoryId, "dir_original_default");
  assert.deepEqual(
    originalTagNotes.json.items.map((item) => item.id).sort(),
    [sourceNote.json.item.id, siblingNote.json.item.id].sort()
  );

  const scopedTagList = await getJson(
    baseUrl,
    `/api/v1/tags?rootDirectoryId=${encodeURIComponent("dir_original_default")}&q=${encodeURIComponent("writ")}`
  );
  assert.equal(scopedTagList.status, 200);
  assert.equal(scopedTagList.json.rootDirectoryId, "dir_original_default");
  assert.deepEqual(scopedTagList.json.items.map((item) => item.name), ["writing"]);
  assert.equal(scopedTagList.json.items[0].noteCount, 2);

  const allTagNotes = await getJson(baseUrl, `/api/v1/tags/${encodeURIComponent("writing")}/notes`);
  assert.equal(allTagNotes.status, 200);
  assert.deepEqual(
    allTagNotes.json.items.map((item) => item.id).sort(),
    [sourceNote.json.item.id, siblingNote.json.item.id, literatureTaggedNote.json.item.id].sort()
  );

  const update = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(sourceNote.json.item.id)}`, {
    body: "# Source idea\n\nThe wikilink and tag were removed."
  });
  assert.equal(update.status, 200);

  const sourceRelationsAfterUpdate = await getJson(
    baseUrl,
    `/api/v1/notes/${encodeURIComponent(sourceNote.json.item.id)}/relations`
  );
  assert.equal(sourceRelationsAfterUpdate.status, 200);
  assert.deepEqual(sourceRelationsAfterUpdate.json.item.tags, []);
  assert.deepEqual(sourceRelationsAfterUpdate.json.item.outgoingLinks, []);

  const targetRelationsAfterUpdate = await getJson(
    baseUrl,
    `/api/v1/notes/${encodeURIComponent(targetNote.json.item.id)}/relations`
  );
  assert.equal(targetRelationsAfterUpdate.status, 200);
  assert.deepEqual(targetRelationsAfterUpdate.json.item.backlinks, []);

  const graphAfterUpdate = await getJson(baseUrl, `/api/v1/graph?scope=directory&directoryId=${encodeURIComponent(directoryId)}`);
  assert.equal(graphAfterUpdate.status, 200);
  assert.equal(graphAfterUpdate.json.item.totalNodes, 2);
  assert.equal(graphAfterUpdate.json.item.totalEdges, 0);
  assert.equal(graphAfterUpdate.json.item.insights.untypedRelations.length, 0);
  assert.equal(graphAfterUpdate.json.item.insights.bridgeGaps.length, 2);
  assert.equal(graphAfterUpdate.json.item.insights.connectedComponentCount, 2);

  const originalTagNotesAfterUpdate = await getJson(
    baseUrl,
    `/api/v1/tags/${encodeURIComponent("writing")}/notes?rootDirectoryId=${encodeURIComponent("dir_original_default")}`
  );
  assert.equal(originalTagNotesAfterUpdate.status, 200);
  assert.deepEqual(originalTagNotesAfterUpdate.json.items.map((item) => item.id), [siblingNote.json.item.id]);
});

test("graph API finds note paths and duplicate title conflicts", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-graph-tools-vault-");
  const noteRoot = path.join(vaultPath, "notes", "original");
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
    title: "graph-tools",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(noteRoot, "graph-tools"),
    maxNotes: 500
  });
  assert.equal(createDir.status, 201);
  const directoryId = createDir.json.item.id;

  const noteC = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    body: "# Path C\n\nThe path should end here."
  });
  assert.equal(noteC.status, 201);

  const noteB = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    body: "# Path B\n\nThis links onward to [[Path C]]."
  });
  assert.equal(noteB.status, 201);

  const noteA = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    body: "# Path A\n\nThis starts the route through [[Path B]]."
  });
  assert.equal(noteA.status, 201);

  const pathResult = await getJson(
    baseUrl,
    `/api/v1/graph/path?fromNoteId=${encodeURIComponent(noteA.json.item.id)}&toNoteId=${encodeURIComponent(
      noteC.json.item.id
    )}&directoryId=${encodeURIComponent(directoryId)}&maxDepth=4`
  );
  assert.equal(pathResult.status, 200);
  assert.equal(pathResult.json.item.found, true);
  assert.equal(pathResult.json.item.hops, 2);
  assert.deepEqual(pathResult.json.item.path, [noteA.json.item.id, noteB.json.item.id, noteC.json.item.id]);
  assert.deepEqual(
    pathResult.json.item.edges.map((edge) => [edge.fromNoteId, edge.toNoteId]),
    [
      [noteA.json.item.id, noteB.json.item.id],
      [noteB.json.item.id, noteC.json.item.id]
    ]
  );

  const shallowPath = await getJson(
    baseUrl,
    `/api/v1/graph/path?fromNoteId=${encodeURIComponent(noteA.json.item.id)}&toNoteId=${encodeURIComponent(
      noteC.json.item.id
    )}&directoryId=${encodeURIComponent(directoryId)}&maxDepth=1`
  );
  assert.equal(shallowPath.status, 200);
  assert.equal(shallowPath.json.item.found, false);
  assert.deepEqual(shallowPath.json.item.path, []);

  const duplicateA = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    body: "# Duplicate idea\n\nFirst version."
  });
  assert.equal(duplicateA.status, 201);
  const duplicateB = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    body: "# Duplicate idea\n\nSecond version."
  });
  assert.equal(duplicateB.status, 201);

  const conflicts = await getJson(
    baseUrl,
    `/api/v1/graph/conflicts?directoryId=${encodeURIComponent(directoryId)}&includeDescendants=false`
  );
  assert.equal(conflicts.status, 200);
  assert.equal(conflicts.json.item.scope, "directory");
  assert.equal(conflicts.json.item.total, 1);
  assert.equal(conflicts.json.item.conflicts[0].conflictType, "duplicate_title");
  assert.equal(conflicts.json.item.conflicts[0].severity, "warning");
  assert.deepEqual(conflicts.json.item.conflicts[0].noteIds.sort(), [duplicateA.json.item.id, duplicateB.json.item.id].sort());
});

test("notes API keeps title-based filenames unique inside a directory", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-note-title-path-vault-");
  const noteRoot = path.join(vaultPath, "notes", "original");
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
    title: "duplicates",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(noteRoot, "duplicates"),
    maxNotes: 500
  });
  assert.equal(createDir.status, 201);
  const directoryId = createDir.json.item.id;

  const noteA = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    body: "# Same title\n\nAlpha."
  });
  assert.equal(noteA.status, 201);
  assert.equal(path.basename(noteA.json.item.markdownPath), "Same title.md");

  const noteB = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    body: "# Same title\n\nBeta."
  });
  assert.equal(noteB.status, 201);
  assert.equal(path.basename(noteB.json.item.markdownPath), "Same title 2.md");

  const renamed = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteB.json.item.id)}`, {
    body: "# Same title\n\nGamma."
  });
  assert.equal(renamed.status, 200);
  assert.equal(path.basename(renamed.json.item.markdownPath), "Same title 2.md");
});

test("notes API stores note assets and serves them back for preview", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-note-assets-vault-");
  const noteRoot = path.join(vaultPath, "notes", "original");
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
    title: "assets",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(noteRoot, "assets"),
    maxNotes: 500
  });
  assert.equal(createDir.status, 201);

  const note = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: createDir.json.item.id,
    body: "# Asset host note\n\nThis note will receive an uploaded image."
  });
  assert.equal(note.status, 201);

  const onePixelPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9l9wAAAABJRU5ErkJggg==";
  const upload = await postJson(baseUrl, "/api/v1/assets", {
    noteId: note.json.item.id,
    fileName: "inline-image.png",
    mimeType: "image/png",
    contentBase64: onePixelPngBase64,
    kind: "image"
  });
  assert.equal(upload.status, 201);
  assert.equal(upload.json.item.assetKind, "image");
  assert.match(upload.json.item.assetPath, new RegExp(`^assets/images/${note.json.item.id}/inline-image`));
  assert.match(upload.json.item.markdownLinkPath, /assets\/images\//);

  const assetFile = path.join(vaultPath, upload.json.item.assetPath.replaceAll("/", path.sep));
  await fs.access(assetFile);

  const assetResponse = await fetch(`${baseUrl}/api/v1/assets/file?path=${encodeURIComponent(upload.json.item.assetPath)}`);
  assert.equal(assetResponse.status, 200);
  assert.equal(assetResponse.headers.get("content-type"), "image/png");
  const assetBuffer = Buffer.from(await assetResponse.arrayBuffer());
  assert.ok(assetBuffer.length > 0);
});

test("notes API rewrites relative asset links when moving a note between directories", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-note-move-assets-vault-");
  const noteRoot = path.join(vaultPath, "notes", "original");
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

  const sourceDir = await postJson(baseUrl, "/api/v1/directories", {
    title: "deep-source",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(noteRoot, "nested", "deep-source"),
    maxNotes: 500
  });
  assert.equal(sourceDir.status, 201, JSON.stringify(sourceDir.json));

  const targetDir = await postJson(baseUrl, "/api/v1/directories", {
    title: "target",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(noteRoot, "target"),
    maxNotes: 500
  });
  assert.equal(targetDir.status, 201, JSON.stringify(targetDir.json));

  const note = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: sourceDir.json.item.id,
    body: "# Asset move note\n\nInitial body."
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));

  const upload = await postJson(baseUrl, "/api/v1/assets", {
    noteId: note.json.item.id,
    fileName: "move-check.txt",
    mimeType: "text/plain",
    contentBase64: Buffer.from("asset move check").toString("base64"),
    kind: "file"
  });
  assert.equal(upload.status, 201, JSON.stringify(upload.json));

  const attached = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}`, {
    body: `# Asset move note\n\n[move-check.txt](${upload.json.item.markdownLinkPath})`
  });
  assert.equal(attached.status, 200, JSON.stringify(attached.json));
  const beforeMoveBody = attached.json.item.body;

  const moved = await postJson(baseUrl, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}/move`, {
    directoryId: targetDir.json.item.id
  });
  assert.equal(moved.status, 200, JSON.stringify(moved.json));

  const fetched = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}`);
  assert.equal(fetched.status, 200, JSON.stringify(fetched.json));

  const expectedLink = path
    .posix
    .relative(path.posix.dirname(fetched.json.item.markdownPath), upload.json.item.assetPath)
    .replaceAll("\\", "/");
  assert.match(beforeMoveBody, /assets\/files\//);
  assert.match(fetched.json.item.body, markdownDestinationPattern(expectedLink));
  assert.ok(!fetched.json.item.body.includes(upload.json.item.markdownLinkPath));
});

test("notes API handles Chinese and space-containing vault paths with image and file assets", async (t) => {
  const baseRoot = path.join(os.tmpdir(), "\u7814\u601d\u5f55 MVP \u8def\u5f84 \u6d4b\u8bd5");
  await fs.mkdir(baseRoot, { recursive: true });
  const vaultPath = await fs.mkdtemp(path.join(baseRoot, "Vault \u4e2d\u6587 \u7a7a\u683c-"));
  const noteRoot = path.join(vaultPath, "notes", "original");
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

  const sourceDir = await postJson(baseUrl, "/api/v1/directories", {
    title: "\u8d44\u6599 \u6765\u6e90",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(noteRoot, "\u9636\u6bb5 \u4e00", "\u8d44\u6599 \u6765\u6e90"),
    maxNotes: 500
  });
  assert.equal(sourceDir.status, 201, JSON.stringify(sourceDir.json));

  const targetDir = await postJson(baseUrl, "/api/v1/directories", {
    title: "\u8f93\u51fa \u76ee\u6807",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(noteRoot, "\u8f93\u51fa \u76ee\u6807 \u4e2d\u6587"),
    maxNotes: 500
  });
  assert.equal(targetDir.status, 201, JSON.stringify(targetDir.json));

  const note = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: sourceDir.json.item.id,
    body: "# \u4e2d\u6587\u8def\u5f84 \u7b14\u8bb0\n\n\u521d\u59cb\u5185\u5bb9\u3002"
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));
  assert.ok(note.json.item.markdownPath.includes("%") === false);

  const originalMarkdownPath = path.join(vaultPath, note.json.item.markdownPath.replaceAll("/", path.sep));
  await fs.access(originalMarkdownPath);

  const imageUpload = await postJson(baseUrl, "/api/v1/assets", {
    noteId: note.json.item.id,
    fileName: "\u56fe\u50cf \u8d44\u6599.png",
    mimeType: "image/png",
    contentBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9l9wAAAABJRU5ErkJggg==",
    kind: "image"
  });
  assert.equal(imageUpload.status, 201, JSON.stringify(imageUpload.json));
  assert.equal(imageUpload.json.item.assetKind, "image");

  const fileUpload = await postJson(baseUrl, "/api/v1/assets", {
    noteId: note.json.item.id,
    fileName: "\u53c2\u8003 \u6587\u4ef6.txt",
    mimeType: "text/plain",
    contentBase64: Buffer.from("asset path with unicode and spaces", "utf8").toString("base64"),
    kind: "file"
  });
  assert.equal(fileUpload.status, 201, JSON.stringify(fileUpload.json));
  assert.equal(fileUpload.json.item.assetKind, "file");

  await fs.access(path.join(vaultPath, imageUpload.json.item.assetPath.replaceAll("/", path.sep)));
  await fs.access(path.join(vaultPath, fileUpload.json.item.assetPath.replaceAll("/", path.sep)));

  const imageAssetResponse = await fetch(`${baseUrl}/api/v1/assets/file?path=${encodeURIComponent(imageUpload.json.item.assetPath)}`);
  assert.equal(imageAssetResponse.status, 200);
  assert.equal(imageAssetResponse.headers.get("content-type"), "image/png");

  const fileAssetResponse = await fetch(`${baseUrl}/api/v1/assets/file?path=${encodeURIComponent(fileUpload.json.item.assetPath)}`);
  assert.equal(fileAssetResponse.status, 200);
  assert.match(fileAssetResponse.headers.get("content-type") || "", /^text\/plain\b/);

  const attached = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}`, {
    body: [
      "# \u4e2d\u6587\u8def\u5f84 \u7b14\u8bb0",
      "",
      `![\u56fe\u50cf \u8d44\u6599](${imageUpload.json.item.markdownLinkPath})`,
      "",
      `[\u53c2\u8003 \u6587\u4ef6.txt](${fileUpload.json.item.markdownLinkPath})`
    ].join("\n")
  });
  assert.equal(attached.status, 200, JSON.stringify(attached.json));
  assert.match(attached.json.item.body, new RegExp(escapeRegExp(imageUpload.json.item.markdownLinkPath)));
  assert.match(attached.json.item.body, new RegExp(escapeRegExp(fileUpload.json.item.markdownLinkPath)));

  const moved = await postJson(baseUrl, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}/move`, {
    directoryId: targetDir.json.item.id
  });
  assert.equal(moved.status, 200, JSON.stringify(moved.json));
  assert.equal(moved.json.item.directoryId, targetDir.json.item.id);

  const movedMarkdownPath = path.join(vaultPath, moved.json.item.markdownPath.replaceAll("/", path.sep));
  await assert.rejects(fs.access(originalMarkdownPath));
  await fs.access(movedMarkdownPath);
  assert.equal(path.dirname(movedMarkdownPath), path.resolve(targetDir.json.item.fsPath));

  const fetched = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(note.json.item.id)}`);
  assert.equal(fetched.status, 200, JSON.stringify(fetched.json));

  const expectedImageLink = path
    .posix
    .relative(path.posix.dirname(fetched.json.item.markdownPath), imageUpload.json.item.assetPath)
    .replaceAll("\\", "/");
  const expectedFileLink = path
    .posix
    .relative(path.posix.dirname(fetched.json.item.markdownPath), fileUpload.json.item.assetPath)
    .replaceAll("\\", "/");

  assert.match(fetched.json.item.body, markdownDestinationPattern(expectedImageLink));
  assert.match(fetched.json.item.body, markdownDestinationPattern(expectedFileLink));
  assert.ok(!fetched.json.item.body.includes(imageUpload.json.item.markdownLinkPath));
  assert.ok(!fetched.json.item.body.includes(fileUpload.json.item.markdownLinkPath));
});
