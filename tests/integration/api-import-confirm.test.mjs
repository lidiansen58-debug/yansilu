import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseMarkdownWithFrontmatter } from "../../packages/domain/src/index.mjs";

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

async function readImportRecordSchema() {
  const raw = await fs.readFile(path.join(REPO_ROOT, "schemas", "import_record.schema.json"), "utf8");
  return JSON.parse(raw);
}

function assertRequiredFields(schemaNode, fields) {
  assert.deepEqual([...schemaNode.required].sort(), [...fields].sort());
}

function assertImportRecordBase(record, status) {
  assert.equal(record.status, status);
  assert.equal(record.state, status);
  assert.equal(typeof record.importRecordId, "string");
  assert.equal(typeof record.connector, "string");
  assert.equal(typeof record.createdAt, "string");
  assert.equal(typeof record.updatedAt, "string");
  assert.equal(typeof record.summary.sources, "number");
  assert.equal(typeof record.summary.literatureNotes, "number");
  assert.equal(typeof record.summary.permanentNotes, "number");
  assert.equal(typeof record.summary.warnings, "number");
  assert.ok(record.candidatePreview);
  assert.ok(record.candidateSelection);
  assert.ok(Array.isArray(record.candidatePreview.sources));
  assert.ok(Array.isArray(record.candidatePreview.literatureNotes));
  assert.ok(Array.isArray(record.candidatePreview.permanentNotes));
  assert.ok(Array.isArray(record.candidateSelection.sources));
  assert.ok(Array.isArray(record.candidateSelection.literatureNotes));
  assert.ok(Array.isArray(record.candidateSelection.permanentNotes));
  assert.ok(Array.isArray(record.warnings));
}

function assertCreatedFileContract(item) {
  assert.equal(typeof item.noteId, "string");
  assert.match(item.noteType, /^(source|literature|permanent|asset)$/);
  assert.equal(typeof item.path, "string");
  assert.equal(typeof item.hash, "string");
}

function assertConfirmResultContract(record) {
  assert.equal(typeof record.confirmResult.finishedAt, "string");
  assert.deepEqual(Object.keys(record.confirmResult.created).sort(), [
    "literatureNotes",
    "permanentNotes",
    "sources"
  ]);
  assert.deepEqual(Object.keys(record.confirmResult.skipped).sort(), ["conflicted", "invalid"]);
  assert.equal(typeof record.confirmResult.selection.mode, "string");
  assert.ok(Array.isArray(record.confirmResult.selection.candidateIds));
  assert.equal(typeof record.confirmResult.selection.totalCandidates, "number");
  assert.equal(typeof record.confirmResult.selection.selectedCandidates, "number");
  assert.deepEqual(Object.keys(record.confirmResult.selection.counts).sort(), [
    "literatureNotes",
    "permanentNotes",
    "sources"
  ]);
  assert.ok(Array.isArray(record.confirmResult.targetDirectories));
  assert.ok(Array.isArray(record.confirmResult.writtenPaths));
  assert.ok(Array.isArray(record.confirmResult.createdFiles));
  for (const item of record.confirmResult.createdFiles) assertCreatedFileContract(item);
}

function assertSchemaDeclaresImportRecordLifecycle(schema) {
  assert.equal(schema.properties.status.enum.includes("failed"), true);
  assert.equal(schema.properties.state.enum.includes("failed"), true);
  assertRequiredFields(schema.properties.confirmResult, [
    "created",
    "skipped",
    "selection",
    "targetDirectories",
    "writtenPaths",
    "createdFiles",
    "finishedAt"
  ]);
  assertRequiredFields(schema.properties.confirmResult.properties.created, [
    "sources",
    "literatureNotes",
    "permanentNotes"
  ]);
  assertRequiredFields(schema.properties.confirmResult.properties.skipped, ["conflicted", "invalid"]);
  assertRequiredFields(schema.properties.confirmResult.properties.selection, [
    "mode",
    "candidateIds",
    "totalCandidates",
    "selectedCandidates",
    "counts"
  ]);
  assertRequiredFields(schema.properties.confirmResult.properties.selection.properties.counts, [
    "sources",
    "literatureNotes",
    "permanentNotes"
  ]);
  assertRequiredFields(schema.properties.confirmResult.properties.targetDirectories.items, ["noteType", "directoryId", "label"]);
  assertRequiredFields(schema.properties.confirmResult.properties.createdFiles.items, ["noteId", "noteType", "path", "hash"]);
  assertRequiredFields(schema.properties.rollbackResult, ["rolledBack", "skipped", "finishedAt"]);
  assertRequiredFields(schema.properties.rollbackResult.properties.rolledBack.items, ["noteId", "noteType", "path", "hash"]);
  assertRequiredFields(schema.properties.rollbackResult.properties.skipped.items, [
    "noteId",
    "noteType",
    "path",
    "hash",
    "reason"
  ]);
  assertRequiredFields(schema.properties.candidatePreview, ["sources", "literatureNotes", "permanentNotes", "total", "truncated"]);
  assertRequiredFields(schema.properties.candidatePreview.properties.sources.items, ["id", "type", "title", "status"]);
  assertRequiredFields(schema.properties.candidatePreview.properties.literatureNotes.items, ["id", "type", "title", "status"]);
  assertRequiredFields(schema.properties.candidatePreview.properties.permanentNotes.items, [
    "id",
    "type",
    "title",
    "status",
    "originalityStatus"
  ]);
  assertRequiredFields(schema.properties.candidateSelection, ["sources", "literatureNotes", "permanentNotes", "total"]);
  assertRequiredFields(schema.properties.candidateSelection.properties.total, ["sources", "literatureNotes", "permanentNotes"]);
  assertRequiredFields(schema.properties.failureResult, ["code", "message", "details", "finishedAt"]);
}

function validateSchema(schema, value, location = "$") {
  if (!schema || typeof schema !== "object") return;
  if (Array.isArray(schema.type)) {
    const allowed = schema.type;
    assert.equal(allowed.some((item) => matchesSchemaType(item, value)), true, `${location} expected one of ${allowed.join(", ")}`);
  } else if (schema.type) {
    assert.equal(matchesSchemaType(schema.type, value), true, `${location} expected type ${schema.type}`);
  }

  if (schema.enum) {
    assert.equal(schema.enum.includes(value), true, `${location} expected enum value`);
  }

  const isObjectSchema =
    (schema.type === "object" || (Array.isArray(schema.type) && value && typeof value === "object" && !Array.isArray(value))) &&
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);
  if (isObjectSchema) {
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      assert.equal(Object.prototype.hasOwnProperty.call(value, key), true, `${location}.${key} is required`);
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        assert.equal(Object.prototype.hasOwnProperty.call(schema.properties, key), true, `${location}.${key} is not allowed`);
      }
    }
    for (const [key, childSchema] of Object.entries(schema.properties || {})) {
      if (Object.prototype.hasOwnProperty.call(value, key)) validateSchema(childSchema, value[key], `${location}.${key}`);
    }
  }

  if (schema.type === "array" && Array.isArray(value) && schema.items) {
    value.forEach((item, index) => validateSchema(schema.items, item, `${location}[${index}]`));
  }
}

function matchesSchemaType(type, value) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "string") return typeof value === "string";
  if (type === "number") return typeof value === "number";
  if (type === "boolean") return typeof value === "boolean";
  return true;
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

test("API originality check returns pass, warning, and blocked summaries", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-originality-check-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const result = await postJson(baseUrl, "/api/v1/originality/check", {
    originalityPlan: {
      warnThreshold: 0.6,
      blockThreshold: 0.8,
      requireCitationLocator: true
    },
    literature: [
      {
        id: "ln_1",
        source_id: "src_1",
        quote_text: "A copied claim should remain a source excerpt"
      },
      {
        id: "ln_2",
        source_id: "src_2",
        quote_text: "An unrelated note about reading"
      },
      {
        id: "ln_3",
        source_id: "src_3",
        quote_text: "A short excerpt about systems"
      }
    ],
    permanent: [
      {
        id: "pn_pass",
        core_claim: "Index cards connect mature ideas for future writing",
        citations: [{ source_id: "src_2", locator: "p. 4" }]
      },
      {
        id: "pn_warning",
        core_claim: "A distinct synthesis with a missing locator",
        citations: [{ source_id: "src_3" }]
      },
      {
        id: "pn_blocked",
        core_claim: "A copied claim should remain a source excerpt",
        citations: [{ source_id: "src_1", locator: "p. 1" }]
      }
    ]
  });

  assert.equal(result.status, 200);
  assert.equal(result.json.summary.passCount, 1);
  assert.equal(result.json.summary.warningCount, 1);
  assert.equal(result.json.summary.blockedCount, 1);
  assert.deepEqual(result.json.originalityGuard.blockedPermanentIds, ["pn_blocked"]);

  const statuses = Object.fromEntries(result.json.originalityGuard.evaluations.map((item) => [item.permanentId, item.status]));
  assert.equal(statuses.pn_pass, "pass");
  assert.equal(statuses.pn_warning, "warning");
  assert.equal(statuses.pn_blocked, "blocked");
});

test("API import confirm blocks flagged notes by default and allows explicit originality override", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-");
  const sourceDir = await makeTempDir("yansilu-api-md-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  await fs.writeFile(
    path.join(sourceDir, "note.md"),
    [
      "---",
      "title: Imported note",
      "type: permanent",
      'tags: ["permanent", "test"]',
      "---",
      "",
      "A copied claim that should be flagged. #test"
    ].join("\n"),
    "utf8"
  );

  const child = startApi(port, vaultPath);

  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: sourceDir }
  });

  assert.equal(preview.status, 200);
  assert.equal(preview.json.status, "preview");
  assert.equal(preview.json.summary.sources, 1);
  assert.equal(preview.json.summary.literatureNotes, 1);
  assert.equal(preview.json.summary.permanentNotes, 1);
  assert.deepEqual(preview.json.originalityGuard.flaggedPermanentIds, preview.json.samples.permanentNoteIds);

  const blockedConfirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
    confirm: true
  });

  assert.equal(blockedConfirm.status, 409);
  assert.equal(blockedConfirm.json.error.code, "IMPORT_ORIGINALITY_BLOCKED");
  assert.deepEqual(blockedConfirm.json.error.details.blockedPermanentIds, preview.json.samples.permanentNoteIds);

  const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
    confirm: true,
    overrideOriginality: true
  });

  assert.equal(confirm.status, 200, JSON.stringify(confirm.json));
  assert.equal(confirm.json.status, "completed");
  assert.deepEqual(confirm.json.result.created, {
    sources: 1,
    literatureNotes: 1,
    permanentNotes: 1
  });
  assert.equal(confirm.json.result.createdFiles.length, 3);
  assert.ok(confirm.json.result.createdFiles.some((item) => item.noteType === "permanent"));

  const [sourceId] = preview.json.samples.sourceIds;
  const [literatureId] = preview.json.samples.literatureNoteIds;
  const [permanentId] = preview.json.samples.permanentNoteIds;

  await fs.access(path.join(vaultPath, "notes", "sources", `${sourceId}.md`));
  await fs.access(path.join(vaultPath, "notes", "literature", `${literatureId}.md`));
  await fs.access(path.join(vaultPath, "notes", "original", `${permanentId}.md`));

  const secondPreview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: sourceDir }
  });
  const secondConfirm = await postJson(baseUrl, `/api/v1/imports/${secondPreview.json.importRecordId}/confirm`, {
    confirm: true,
    overrideOriginality: true
  });

  assert.equal(secondConfirm.status, 200);
  assert.deepEqual(secondConfirm.json.result.created, {
    sources: 0,
    literatureNotes: 0,
    permanentNotes: 0
  });
  assert.equal(secondConfirm.json.result.skipped.conflicted, 3);
});

test("API import confirm can write only selected candidates", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-selected-");
  const sourceDir = await makeTempDir("yansilu-api-md-selected-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  await fs.writeFile(
    path.join(sourceDir, "note.md"),
    [
      "---",
      "title: Selected import note",
      "type: literature",
      'tags: ["literature", "selected"]',
      "---",
      "",
      "Selective import should let us confirm only the source candidate."
    ].join("\n"),
    "utf8"
  );

  const child = startApi(port, vaultPath);

  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: sourceDir }
  });
  assert.equal(preview.status, 200, JSON.stringify(preview.json));
  assert.equal(preview.json.summary.sources, 1);
  assert.equal(preview.json.summary.literatureNotes, 1);

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
    totalCandidates: 2,
    selectedCandidates: 1,
    counts: {
      sources: 1,
      literatureNotes: 0,
      permanentNotes: 0
    }
  });

  await fs.access(path.join(vaultPath, "notes", "sources", `${selectedSourceId}.md`));
  const literatureNotes = await getJson(baseUrl, "/api/v1/directories/dir_literature_default/notes");
  assert.equal(literatureNotes.status, 200);
  assert.equal(literatureNotes.json.total, 0);

  const completedRecord = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
  assert.equal(completedRecord.status, 200);
  assert.equal(completedRecord.json.importRecord.confirmResult.selection.mode, "subset");
  assert.deepEqual(completedRecord.json.importRecord.confirmResult.selection.candidateIds, [selectedSourceId]);
});

test("API import confirm writes literature notes into selected literature directory", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-targeted-literature-");
  const sourceDir = await makeTempDir("yansilu-api-md-targeted-literature-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  await fs.writeFile(
    path.join(sourceDir, "note.md"),
    [
      "---",
      "title: Targeted literature import",
      "type: literature",
      'tags: ["literature"]',
      "---",
      "",
      "Imported literature should land in the selected literature directory."
    ].join("\n"),
    "utf8"
  );

  const child = startApi(port, vaultPath);
  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const targetDirectory = await postJson(baseUrl, "/api/v1/directories", {
    title: "Imported reading batch",
    parentDirectoryId: "dir_literature_default",
    fsPath: path.join(vaultPath, "notes", "literature", "imported-reading-batch")
  });
  assert.equal(targetDirectory.status, 201, JSON.stringify(targetDirectory.json));

  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: sourceDir }
  });
  assert.equal(preview.status, 200, JSON.stringify(preview.json));

  const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
    confirm: true,
    selectedCandidateIds: [...preview.json.samples.sourceIds, ...preview.json.samples.literatureNoteIds],
    directoryId: targetDirectory.json.item.id
  });

  assert.equal(confirm.status, 200, JSON.stringify(confirm.json));
  const literatureFile = confirm.json.result.createdFiles.find((item) => item.noteType === "literature");
  assert.ok(literatureFile);
  assert.match(literatureFile.path, /notes\/literature\/imported-reading-batch\//);
  assert.equal(confirm.json.result.targetDirectories.length, 1);
  assert.equal(confirm.json.result.targetDirectories[0].noteType, "literature");
  assert.equal(confirm.json.result.targetDirectories[0].directoryId, targetDirectory.json.item.id);
  assert.match(confirm.json.result.targetDirectories[0].label, /Imported reading batch/);

  const targetNotes = await getJson(baseUrl, `/api/v1/directories/${encodeURIComponent(targetDirectory.json.item.id)}/notes`);
  assert.equal(targetNotes.status, 200);
  assert.equal(targetNotes.json.total, 1);
  assert.equal(targetNotes.json.items[0].id, preview.json.samples.literatureNoteIds[0]);
});

test("API import confirm writes permanent notes into selected permanent directory", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-targeted-permanent-");
  const sourceDir = await makeTempDir("yansilu-api-md-targeted-permanent-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  await fs.writeFile(
    path.join(sourceDir, "note.md"),
    [
      "---",
      "title: Targeted permanent import",
      "type: permanent",
      'tags: ["permanent"]',
      "---",
      "",
      "A copied claim that should be flagged."
    ].join("\n"),
    "utf8"
  );

  const child = startApi(port, vaultPath);
  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const targetDirectory = await postJson(baseUrl, "/api/v1/directories", {
    title: "Imported arguments",
    parentDirectoryId: "dir_original_default",
    fsPath: path.join(vaultPath, "notes", "original", "imported-arguments")
  });
  assert.equal(targetDirectory.status, 201, JSON.stringify(targetDirectory.json));

  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: sourceDir }
  });
  assert.equal(preview.status, 200, JSON.stringify(preview.json));

  const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
    confirm: true,
    overrideOriginality: true,
    selectedCandidateIds: [...preview.json.samples.sourceIds, ...preview.json.samples.permanentNoteIds],
    directoryId: targetDirectory.json.item.id
  });

  assert.equal(confirm.status, 200, JSON.stringify(confirm.json));
  const permanentFile = confirm.json.result.createdFiles.find((item) => item.noteType === "permanent");
  assert.ok(permanentFile);
  assert.match(permanentFile.path, /notes\/original\/imported-arguments\//);
  const targetDirectories = confirm.json.result.targetDirectories;
  assert.ok(targetDirectories.some((item) => item.noteType === "permanent" && item.directoryId === targetDirectory.json.item.id));
  assert.ok(
    targetDirectories.every((item) =>
      ["literature", "permanent"].includes(item.noteType) && typeof item.label === "string" && item.label.length > 0
    )
  );

  const targetNotes = await getJson(baseUrl, `/api/v1/directories/${encodeURIComponent(targetDirectory.json.item.id)}/notes`);
  assert.equal(targetNotes.status, 200);
  assert.equal(targetNotes.json.total, 1);
  assert.equal(targetNotes.json.items[0].id, preview.json.samples.permanentNoteIds[0]);
});

test("API import confirm rejects a mismatched file-box directory for permanent notes", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-mismatched-permanent-dir-");
  const sourceDir = await makeTempDir("yansilu-api-md-mismatched-permanent-dir-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  await fs.writeFile(
    path.join(sourceDir, "note.md"),
    [
      "---",
      "title: Mismatched permanent import",
      "type: permanent",
      'tags: ["permanent"]',
      "---",
      "",
      "A permanent note should not be silently routed into the literature box."
    ].join("\n"),
    "utf8"
  );

  const child = startApi(port, vaultPath);
  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const targetDirectory = await postJson(baseUrl, "/api/v1/directories", {
    title: "Imported reading batch",
    parentDirectoryId: "dir_literature_default",
    fsPath: path.join(vaultPath, "notes", "literature", "imported-reading-batch")
  });
  assert.equal(targetDirectory.status, 201, JSON.stringify(targetDirectory.json));

  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: sourceDir }
  });
  assert.equal(preview.status, 200, JSON.stringify(preview.json));

  const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
    confirm: true,
    overrideOriginality: true,
    directoryId: targetDirectory.json.item.id
  });

  assert.equal(confirm.status, 400, JSON.stringify(confirm.json));
  assert.equal(confirm.json.error.code, "IMPORT_DIRECTORY_SCOPE_INVALID");
});

test("API selective Obsidian confirm writes realistic Chinese vault notes and rolls them back", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-obsidian-realistic-confirm-");
  const fixturePath = path.join(FIXTURES_ROOT, "obsidian-realistic-vault");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "obsidian",
    payload: { path: fixturePath },
    options: { detectWikilinks: true }
  });
  assert.equal(preview.status, 200, JSON.stringify(preview.json));
  assert.equal(preview.json.summary.sources, 2);
  assert.equal(preview.json.summary.literatureNotes, 2);
  assert.equal(preview.json.summary.permanentNotes, 1);
  assert.deepEqual(preview.json.warnings.map((warning) => warning.code), ["ORIGINALITY_GUARD_BLOCKED"]);

  const chinesePreview = preview.json.candidatePreview.literatureNotes.find((item) => item.title === "中文阅读卡片");
  assert.ok(chinesePreview);
  const selectedCandidateIds = [...preview.json.samples.sourceIds, ...preview.json.samples.literatureNoteIds];
  const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
    confirm: true,
    selectedCandidateIds
  });

  assert.equal(confirm.status, 200, JSON.stringify(confirm.json));
  assert.deepEqual(confirm.json.result.created, {
    sources: 2,
    literatureNotes: 2,
    permanentNotes: 0
  });
  assert.deepEqual(confirm.json.result.skipped, {
    conflicted: 0,
    invalid: 0
  });
  assert.deepEqual(confirm.json.result.selection, {
    mode: "subset",
    candidateIds: selectedCandidateIds,
    totalCandidates: 5,
    selectedCandidates: 4,
    counts: {
      sources: 2,
      literatureNotes: 2,
      permanentNotes: 0
    }
  });

  const completedRecord = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
  assert.equal(completedRecord.status, 200);
  assert.equal(completedRecord.json.importRecord.status, "completed");
  assert.equal(completedRecord.json.importRecord.confirmResult.createdFiles.length, 5);

  const createdFiles = completedRecord.json.importRecord.confirmResult.createdFiles;
  for (const item of createdFiles) {
    await fs.access(path.join(vaultPath, item.path));
  }
  assert.ok(createdFiles.some((item) => item.noteType === "asset"));

  const chineseLiteratureFile = createdFiles.find((item) => item.noteId === chinesePreview.id);
  assert.ok(chineseLiteratureFile);
  const chineseMarkdown = await fs.readFile(path.join(vaultPath, chineseLiteratureFile.path), "utf8");
  const chineseParsed = parseMarkdownWithFrontmatter(chineseMarkdown);
  assert.match(chineseMarkdown, /中文阅读卡片/);
  assert.match(chineseMarkdown, /来源\/访谈/);
  assert.ok(chineseParsed.frontmatter.tags.includes("来源/访谈"));
  assert.equal(chineseParsed.frontmatter.tags.includes("#来源/访谈"), false);
  assert.match(chineseMarkdown, /\[\[Research\/Spacing Note\|英文材料\]\]/);

  const [permanentId] = preview.json.samples.permanentNoteIds;
  await assert.rejects(fs.access(path.join(vaultPath, "notes", "permanent", `${permanentId}.md`)));

  const catalogNotes = await getJson(baseUrl, "/api/v1/directories/dir_literature_default/notes");
  assert.equal(catalogNotes.status, 200);
  assert.equal(catalogNotes.json.total, 2);
  assert.ok(catalogNotes.json.items.some((item) => item.title === "中文阅读卡片"));

  const rollback = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/rollback`, {});
  assert.equal(rollback.status, 200, JSON.stringify(rollback.json));
  assert.equal(rollback.json.status, "rolled_back");
  assert.equal(rollback.json.result.rolledBack, 5);
  assert.equal(rollback.json.result.skipped, 0);

  for (const item of createdFiles) {
    await assert.rejects(fs.access(path.join(vaultPath, item.path)));
  }

  const catalogAfterRollback = await getJson(baseUrl, "/api/v1/directories/dir_literature_default/notes");
  assert.equal(catalogAfterRollback.status, 200);
  assert.equal(catalogAfterRollback.json.total, 0);
});

test("API import confirm skips warning permanent notes when drafts are disallowed", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-originality-warning-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const recordId = "imp_originality_warning_fixture";
  const createdAt = new Date().toISOString();
  const originalityPlan = {
    warnThreshold: 0.6,
    blockThreshold: 0.8,
    requireCitationLocator: true,
    allowDraftOnWarning: false
  };

  await fs.mkdir(path.join(vaultPath, "imports", "markdown"), { recursive: true });
  await fs.writeFile(
    path.join(vaultPath, "imports", "markdown", `${recordId}.preview.json`),
    JSON.stringify(
      {
        requestId: "test_originality_warning",
        payload: {},
        options: {},
        preview: {
          importRecordId: recordId,
          connector: "markdown",
          status: "preview",
          state: "preview",
          summary: { sources: 1, literatureNotes: 1, permanentNotes: 1, warnings: 0 },
          samples: {
            sourceIds: ["src_warning"],
            literatureNoteIds: ["ln_warning"],
            permanentNoteIds: ["pn_warning"]
          },
          warnings: [],
          originalityGuard: {
            plan: originalityPlan,
            flaggedPermanentIds: ["pn_warning"],
            evaluations: [
              {
                permanentId: "pn_warning",
                status: "warning",
                reasons: ["citation_locator_missing"],
                maxSimilarity: 0,
                matchedLiteratureId: null,
                matchedSourceId: null
              }
            ]
          },
          createdAt,
          updatedAt: createdAt,
          payload: {},
          options: {}
        },
        candidates: {
          sources: [
            {
              id: "src_warning",
              title: "Warning source",
              description: "A source note used to verify warning-only originality handling."
            }
          ],
          literature: [
            {
              id: "ln_warning",
              source_id: "src_warning",
              title: "Warning literature",
              quote_text: "Archival protocols preserve reading context for later review.",
              paraphrase_text: "The source discusses keeping context around reading evidence.",
              tags: ["warning"]
            }
          ],
          permanent: [
            {
              id: "pn_warning",
              title: "Warning permanent",
              core_claim:
                "Index cards become useful when they connect separate ideas into a reusable writing move.",
              citations: [{ source_id: "src_warning" }],
              tags: ["permanent", "warning"]
            }
          ],
          warnings: []
        }
      },
      null,
      2
    ),
    "utf8"
  );

  const child = startApi(port, vaultPath);

  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const preview = await getJson(baseUrl, `/api/v1/imports/${recordId}`);

  assert.equal(preview.status, 200);
  assert.equal(preview.json.importRecord.summary.permanentNotes, 1);
  assert.equal(preview.json.importRecord.originalityGuard.evaluations[0].status, "warning");
  assert.ok(preview.json.importRecord.originalityGuard.evaluations[0].reasons.includes("citation_locator_missing"));

  const confirm = await postJson(baseUrl, `/api/v1/imports/${recordId}/confirm`, {
    confirm: true
  });

  assert.equal(confirm.status, 200, JSON.stringify(confirm.json));
  assert.deepEqual(confirm.json.result.created, {
    sources: 1,
    literatureNotes: 1,
    permanentNotes: 0
  });
  assert.deepEqual(confirm.json.result.skipped, {
    conflicted: 0,
    invalid: 1
  });

  const [permanentId] = preview.json.importRecord.samples.permanentNoteIds;
  await assert.rejects(fs.access(path.join(vaultPath, "notes", "permanent", `${permanentId}.md`)));
});

test("API import records can be fetched and rolled back", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-rollback-");
  const sourceDir = await makeTempDir("yansilu-api-md-rollback-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  await fs.writeFile(
    path.join(sourceDir, "note.md"),
    ["---", "title: Rollback note", 'tags: ["rollback"]', "---", "", "Rollback candidate body."].join("\n"),
    "utf8"
  );

  const child = startApi(port, vaultPath);

  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: sourceDir }
  });

  assert.equal(preview.status, 200);
  const previewRecord = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
  assert.equal(previewRecord.status, 200);
  assert.equal(previewRecord.json.importRecord.status, "preview");
  assert.equal(previewRecord.json.importRecord.summary.sources, 1);

  const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
    confirm: true
  });

  assert.equal(confirm.status, 200, JSON.stringify(confirm.json));
  assert.equal(confirm.json.status, "completed");

  const completedRecord = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
  assert.equal(completedRecord.status, 200);
  assert.equal(completedRecord.json.importRecord.status, "completed");
  assert.equal(completedRecord.json.importRecord.confirmResult.createdFiles.length, 2);

  for (const item of completedRecord.json.importRecord.confirmResult.createdFiles) {
    await fs.access(path.join(vaultPath, item.path));
  }

  const catalogNotes = await getJson(baseUrl, "/api/v1/directories/dir_literature_default/notes");
  assert.equal(catalogNotes.status, 200);
  assert.equal(catalogNotes.json.total, 1);
  assert.equal(catalogNotes.json.items[0].noteType, "literature");

  const rollback = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/rollback`, {});
  assert.equal(rollback.status, 200);
  assert.equal(rollback.json.status, "rolled_back");
  assert.equal(rollback.json.result.rolledBack, 2);
  assert.equal(rollback.json.result.skipped, 0);

  for (const item of completedRecord.json.importRecord.confirmResult.createdFiles) {
    await assert.rejects(fs.access(path.join(vaultPath, item.path)));
  }

  const catalogAfterRollback = await getJson(baseUrl, "/api/v1/directories/dir_literature_default/notes");
  assert.equal(catalogAfterRollback.status, 200);
  assert.equal(catalogAfterRollback.json.total, 0);

  const rolledBackRecord = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
  assert.equal(rolledBackRecord.status, 200);
  assert.equal(rolledBackRecord.json.importRecord.status, "rolled_back");
  assert.equal(rolledBackRecord.json.importRecord.rollbackResult.rolledBack.length, 2);
});

test("API import records match schema contract across preview, completed, and rolled_back states", async (t) => {
  const schema = await readImportRecordSchema();
  assertSchemaDeclaresImportRecordLifecycle(schema);

  const vaultPath = await makeTempDir("yansilu-api-vault-contract-");
  const sourceDir = await makeTempDir("yansilu-api-md-contract-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  await fs.writeFile(path.join(sourceDir, "note.md"), "Contract candidate body.", "utf8");

  const child = startApi(port, vaultPath);

  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: sourceDir }
  });
  assert.equal(preview.status, 200);

  const previewRecord = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
  assert.equal(previewRecord.status, 200);
  assertImportRecordBase(previewRecord.json.importRecord, "preview");
  assert.equal(previewRecord.json.importRecord.confirmResult, null);
  assert.equal(previewRecord.json.importRecord.rollbackResult, null);

  const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
    confirm: true
  });
  assert.equal(confirm.status, 200, JSON.stringify(confirm.json));

  const completedRecord = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
  assert.equal(completedRecord.status, 200);
  assertImportRecordBase(completedRecord.json.importRecord, "completed");
  assertConfirmResultContract(completedRecord.json.importRecord);
  validateSchema(schema, completedRecord.json.importRecord);
  assert.equal(completedRecord.json.importRecord.rollbackResult, null);

  const rollback = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/rollback`, {});
  assert.equal(rollback.status, 200);

  const rolledBackRecord = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
  assert.equal(rolledBackRecord.status, 200);
  assertImportRecordBase(rolledBackRecord.json.importRecord, "rolled_back");
  assertConfirmResultContract(rolledBackRecord.json.importRecord);
  validateSchema(schema, rolledBackRecord.json.importRecord);
  assert.equal(typeof rolledBackRecord.json.importRecord.rollbackResult.finishedAt, "string");
  assert.ok(Array.isArray(rolledBackRecord.json.importRecord.rollbackResult.rolledBack));
  assert.ok(Array.isArray(rolledBackRecord.json.importRecord.rollbackResult.skipped));
  for (const item of rolledBackRecord.json.importRecord.rollbackResult.rolledBack) assertCreatedFileContract(item);
  for (const item of rolledBackRecord.json.importRecord.rollbackResult.skipped) {
    assertCreatedFileContract(item);
    assert.equal(typeof item.reason, "string");
  }
});

test("API import records can be listed with limit and lifecycle states", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-list-");
  const previewSourceDir = await makeTempDir("yansilu-api-md-list-preview-");
  const completedSourceDir = await makeTempDir("yansilu-api-md-list-completed-");
  const rollbackSourceDir = await makeTempDir("yansilu-api-md-list-rollback-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  await fs.writeFile(path.join(previewSourceDir, "preview.md"), "Preview import body.", "utf8");
  await fs.writeFile(path.join(completedSourceDir, "completed.md"), "Completed import body.", "utf8");
  await fs.writeFile(path.join(rollbackSourceDir, "rollback.md"), "Rollback import body.", "utf8");

  const child = startApi(port, vaultPath);

  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const previewOnly = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: previewSourceDir }
  });
  assert.equal(previewOnly.status, 200);

  const completedPreview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: completedSourceDir }
  });
  assert.equal(completedPreview.status, 200);
  const completedConfirm = await postJson(baseUrl, `/api/v1/imports/${completedPreview.json.importRecordId}/confirm`, {
    confirm: true
  });
  assert.equal(completedConfirm.status, 200, JSON.stringify(completedConfirm.json));

  const rollbackPreview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: rollbackSourceDir }
  });
  assert.equal(rollbackPreview.status, 200);
  const rollbackConfirm = await postJson(baseUrl, `/api/v1/imports/${rollbackPreview.json.importRecordId}/confirm`, {
    confirm: true
  });
  assert.equal(rollbackConfirm.status, 200, JSON.stringify(rollbackConfirm.json));
  const rollback = await postJson(baseUrl, `/api/v1/imports/${rollbackPreview.json.importRecordId}/rollback`, {});
  assert.equal(rollback.status, 200, JSON.stringify(rollback.json));

  const allRecords = await getJson(baseUrl, "/api/v1/imports");
  assert.equal(allRecords.status, 200);
  assert.equal(allRecords.json.count, 3);
  assert.equal(allRecords.json.total, 3);
  assert.deepEqual(
    new Set(allRecords.json.items.map((item) => item.status)),
    new Set(["preview", "completed", "rolled_back"])
  );

  const limitedRecords = await getJson(baseUrl, "/api/v1/imports?limit=2");
  assert.equal(limitedRecords.status, 200);
  assert.equal(limitedRecords.json.count, 2);
  assert.equal(limitedRecords.json.total, 3);
  assert.equal(limitedRecords.json.items[0].importRecordId, rollbackPreview.json.importRecordId);
  assert.equal(limitedRecords.json.items[0].status, "rolled_back");
  assert.ok(limitedRecords.json.items.every((item) => item.confirmResult === null || Array.isArray(item.confirmResult.createdFiles)));
});

test("API import rollback skips files modified after confirm", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-rollback-modified-");
  const sourceDir = await makeTempDir("yansilu-api-md-rollback-modified-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  await fs.writeFile(path.join(sourceDir, "note.md"), "Modified rollback body.", "utf8");

  const child = startApi(port, vaultPath);

  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: sourceDir }
  });
  const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
    confirm: true
  });

  assert.equal(confirm.status, 200, JSON.stringify(confirm.json));
  const completedRecord = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
  const modifiedFile = path.join(vaultPath, completedRecord.json.importRecord.confirmResult.createdFiles[0].path);
  await fs.appendFile(modifiedFile, "\n\nUser edit after import.", "utf8");

  const rollback = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/rollback`, {});
  assert.equal(rollback.status, 200);
  assert.equal(rollback.json.result.rolledBack, 1);
  assert.equal(rollback.json.result.skipped, 1);
  assert.equal(rollback.json.result.skippedFiles[0].reason, "modified");
  await fs.access(modifiedFile);
});

test("API import records can be restored from disk after restart", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-restore-");
  const sourceDir = await makeTempDir("yansilu-api-md-restore-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let child = startApi(port, vaultPath);

  t.after(async () => {
    await stopApi(child);
  });

  await fs.writeFile(path.join(sourceDir, "note.md"), "Restorable import body.", "utf8");
  await waitForHealth(baseUrl);

  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: sourceDir }
  });
  assert.equal(preview.status, 200);

  await stopApi(child);
  child = startApi(port, vaultPath);
  await waitForHealth(baseUrl);

  const restoredRecord = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
  assert.equal(restoredRecord.status, 200);
  assert.equal(restoredRecord.json.importRecord.status, "preview");
  assert.equal(restoredRecord.json.importRecord.summary.sources, 1);

  const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
    confirm: true
  });
  assert.equal(confirm.status, 200, JSON.stringify(confirm.json));
  assert.equal(confirm.json.status, "completed");
  assert.deepEqual(confirm.json.result.created, {
    sources: 1,
    literatureNotes: 1,
    permanentNotes: 0
  });
});

test("API completed import records can be restored and rolled back after restart", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-restore-completed-");
  const sourceDir = await makeTempDir("yansilu-api-md-restore-completed-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let child = startApi(port, vaultPath);

  t.after(async () => {
    await stopApi(child);
  });

  await fs.writeFile(path.join(sourceDir, "note.md"), "Completed import body.", "utf8");
  await waitForHealth(baseUrl);

  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: sourceDir }
  });
  assert.equal(preview.status, 200);

  const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
    confirm: true
  });
  assert.equal(confirm.status, 200, JSON.stringify(confirm.json));
  assert.deepEqual([...confirm.json.result.writtenPaths].sort(), ["notes/literature", "notes/sources"]);

  const completedRecord = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
  assert.equal(completedRecord.status, 200);
  assert.equal(completedRecord.json.importRecord.status, "completed");
  assert.equal(completedRecord.json.importRecord.confirmResult.createdFiles.length, 2);

  const createdFiles = completedRecord.json.importRecord.confirmResult.createdFiles;
  for (const item of createdFiles) {
    await fs.access(path.join(vaultPath, item.path));
  }

  await stopApi(child);
  child = startApi(port, vaultPath);
  await waitForHealth(baseUrl);

  const restoredRecord = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
  assert.equal(restoredRecord.status, 200);
  assert.equal(restoredRecord.json.importRecord.status, "completed");
  assert.deepEqual([...restoredRecord.json.importRecord.confirmResult.writtenPaths].sort(), [
    "notes/literature",
    "notes/sources"
  ]);
  assert.equal(restoredRecord.json.importRecord.confirmResult.createdFiles.length, 2);

  const rollback = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/rollback`, {});
  assert.equal(rollback.status, 200);
  assert.equal(rollback.json.status, "rolled_back");
  assert.equal(rollback.json.result.rolledBack, 2);
  assert.equal(rollback.json.result.skipped, 0);

  for (const item of createdFiles) {
    await assert.rejects(fs.access(path.join(vaultPath, item.path)));
  }
});

test("API import preview records Obsidian aliases and wikilink variants in candidates", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-obsidian-");
  const sourceDir = await makeTempDir("yansilu-api-obsidian-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  await fs.writeFile(
    path.join(sourceDir, "obsidian-note.md"),
    [
      "---",
      "title: Obsidian note",
      "aliases:",
      "  - First alias",
      "  - Second alias",
      "---",
      "",
      [
        "[[Target Note|Readable title]]",
        "[[Target Note#Section]]",
        "[[Target Note#Section^block-id|Block title]]",
        "[[#Local heading|Local title]]",
        "![[Image.png]]",
        "[[Target Note|Readable title]]"
      ].join(" ")
    ].join("\n"),
    "utf8"
  );

  const child = startApi(port, vaultPath);

  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "obsidian",
    payload: { path: sourceDir }
  });

  assert.equal(preview.status, 200);
  assert.equal(preview.json.status, "preview");
  assert.equal(preview.json.summary.sources, 1);
  assert.equal(preview.json.summary.literatureNotes, 1);

  const recordPath = path.join(vaultPath, "imports", "obsidian", `${preview.json.importRecordId}.preview.json`);
  const record = JSON.parse(await fs.readFile(recordPath, "utf8"));
  const source = record.candidates.sources[0];
  const note = record.candidates.literature[0];

  assert.deepEqual(source.aliases, ["First alias", "Second alias"]);
  assert.deepEqual(note.aliases, ["First alias", "Second alias"]);
  assert.deepEqual(note.wikilinks, [
    "Target Note|Readable title",
    "Target Note#Section",
    "Target Note#Section^block-id|Block title",
    "#Local heading|Local title",
    "Image.png"
  ]);
  assert.deepEqual(note.wikilink_targets, ["Target Note", "Image.png"]);
  assert.deepEqual(note.parsed_wikilinks[0], {
    raw: "Target Note|Readable title",
    target: "Target Note",
    heading: null,
    block: null,
    alias: "Readable title",
    display: "Readable title",
    embed: false
  });
  assert.deepEqual(note.parsed_wikilinks[2], {
    raw: "Target Note#Section^block-id|Block title",
    target: "Target Note",
    heading: "Section",
    block: "block-id",
    alias: "Block title",
    display: "Block title",
    embed: false
  });
  assert.equal(note.parsed_wikilinks[4].embed, true);
});

test("API import preview returns warnings instead of 500 for unreadable markdown paths", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-unreadable-");
  const sourceDir = await makeTempDir("yansilu-api-missing-root-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = startApi(port, vaultPath);

  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "markdown",
    payload: { path: path.join(sourceDir, "does-not-exist") }
  });

  assert.equal(preview.status, 200);
  assert.equal(preview.json.status, "preview");
  assert.equal(preview.json.summary.sources, 0);
  assert.equal(preview.json.summary.literatureNotes, 0);
  assert.equal(preview.json.warnings[0].code, "IMPORT_SOURCE_UNREADABLE");
});

test("API import preview returns full candidateSelection ids even when candidatePreview is truncated", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-vault-preview-selection-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => {
    child.kill();
  });

  await waitForHealth(baseUrl);

  const highlights = Array.from({ length: 13 }, (_, index) => ({
    id: `hl_${index + 1}`,
    title: `Highlight ${index + 1}`,
    text: `Readwise highlight body ${index + 1}`
  }));

  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "readwise",
    payload: { highlights },
    options: {}
  });

  assert.equal(preview.status, 200);
  assert.equal(preview.json.candidatePreview.sources.length, 12);
  assert.equal(preview.json.candidatePreview.literatureNotes.length, 12);
  assert.equal(preview.json.candidatePreview.truncated, true);
  assert.equal(preview.json.candidateSelection.sources.length, 13);
  assert.equal(preview.json.candidateSelection.literatureNotes.length, 13);
  assert.equal(preview.json.candidateSelection.permanentNotes.length, 0);
  assert.deepEqual(preview.json.candidateSelection.total, {
    sources: 13,
    literatureNotes: 13,
    permanentNotes: 0
  });
});
