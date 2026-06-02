import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const FIXTURES_ROOT = path.join(REPO_ROOT, "tests", "fixtures", "imports");

async function readJsonFixture(...segments) {
  return JSON.parse(await fs.readFile(path.join(FIXTURES_ROOT, ...segments), "utf8"));
}

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
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error("API did not become healthy");
}

async function postJson(baseUrl, pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  return { response, payload };
}

function startApi(port, vaultPath) {
  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  return child;
}

async function stopApi(child) {
  if (!child || child.exitCode !== null) {
    return;
  }
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
}

test("POST /api/v1/exports/markdown exports a permanent-note directory and persists export record", async () => {
  const vaultPath = await makeTempDir("yansilu-api-export-vault-");
  const targetPath = await makeTempDir("yansilu-api-export-target-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const api = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    await fs.mkdir(path.join(vaultPath, "assets"), { recursive: true });
    await fs.writeFile(path.join(vaultPath, "assets", "export-asset.txt"), "asset", "utf8");

    const firstNote = await postJson(baseUrl, "/api/v1/notes", {
      directoryId: "dir_original_default",
      title: "Permanent API export A",
      body: "Permanent API export body A.\n\n![asset](../../assets/export-asset.txt)"
    });
    const secondNote = await postJson(baseUrl, "/api/v1/notes", {
      directoryId: "dir_original_default",
      title: "Permanent API export B",
      body: "Permanent API export body B."
    });

    assert.equal(firstNote.response.status, 201, JSON.stringify(firstNote.payload));
    assert.equal(secondNote.response.status, 201, JSON.stringify(secondNote.payload));

    const { response, payload } = await postJson(baseUrl, "/api/v1/exports/markdown", {
      targetPath,
      directoryId: "dir_original_default"
    });

    assert.equal(response.status, 202);
    assert.equal(payload.status, "queued");
    assert.match(payload.exportJobId, /^exp_/);
    assert.equal(payload.copied, 3);
    assert.deepEqual(payload.copiedBreakdown, {
      markdownFiles: 2,
      assetFiles: 1,
      totalFiles: 3
    });

    const firstCopy = await fs.readFile(
      path.join(targetPath, path.posix.relative("notes", firstNote.payload.item.markdownPath).replaceAll("/", path.sep)),
      "utf8"
    );
    const secondCopy = await fs.readFile(
      path.join(targetPath, path.posix.relative("notes", secondNote.payload.item.markdownPath).replaceAll("/", path.sep)),
      "utf8"
    );
    const assetCopy = await fs.readFile(path.join(targetPath, "assets", "export-asset.txt"), "utf8");
    assert.match(firstCopy, /Permanent API export body A/);
    assert.match(secondCopy, /Permanent API export body B/);
    assert.equal(assetCopy, "asset");

    const record = JSON.parse(
      await fs.readFile(path.join(vaultPath, "exports", `${payload.exportJobId}.json`), "utf8")
    );
    assert.equal(record.exportJobId, payload.exportJobId);
    assert.match(record.requestId, /^req_/);
    assert.equal(record.targetPath, targetPath);
    assert.equal(record.copied, 3);
    assert.deepEqual(record.copiedBreakdown, payload.copiedBreakdown);
    assert.deepEqual(record.scope, {
      type: "directory",
      directoryId: "dir_original_default",
      includeDescendants: true
    });
    assert.deepEqual(
      record.exportedFiles.map((item) => item.sourcePath).sort(),
      [firstNote.payload.item.markdownPath, secondNote.payload.item.markdownPath, "assets/export-asset.txt"].sort()
    );
  } finally {
    await stopApi(api);
  }
});

test("POST /api/v1/exports/markdown rejects targets inside the active vault", async () => {
  const vaultPath = await makeTempDir("yansilu-api-export-target-guard-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const api = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const targetPath = path.join(vaultPath, "notes", "export-copy");
    const { response, payload } = await postJson(baseUrl, "/api/v1/exports/markdown", {
      targetPath,
      directoryId: "dir_original_default"
    });

    assert.equal(response.status, 400);
    assert.equal(payload.error.code, "EXPORT_TARGET_INVALID");
    assert.match(payload.error.message, /outside the active vault/);
    await assert.rejects(() => fs.access(targetPath), /ENOENT/);
  } finally {
    await stopApi(api);
  }
});

test("POST /api/v1/exports/markdown exports the whole vault when no scope is provided", async () => {
  const vaultPath = await makeTempDir("yansilu-api-export-all-vault-");
  const targetPath = await makeTempDir("yansilu-api-export-all-target-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const api = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    await fs.mkdir(path.join(vaultPath, "assets", "images"), { recursive: true });
    await fs.writeFile(path.join(vaultPath, "assets", "images", "all-export.txt"), "asset", "utf8");

    const literatureNote = await postJson(baseUrl, "/api/v1/notes", {
      directoryId: "dir_literature_default",
      title: "API all export literature",
      body: "All export literature body."
    });
    const permanentNote = await postJson(baseUrl, "/api/v1/notes", {
      directoryId: "dir_original_default",
      title: "API all export permanent",
      body: "All export permanent body."
    });

    assert.equal(literatureNote.response.status, 201, JSON.stringify(literatureNote.payload));
    assert.equal(permanentNote.response.status, 201, JSON.stringify(permanentNote.payload));

    const { response, payload } = await postJson(baseUrl, "/api/v1/exports/markdown", {
      targetPath
    });

    assert.equal(response.status, 202);
    assert.deepEqual(payload.scope, { type: "all" });
    assert.equal(payload.copiedBreakdown.markdownFiles, 2);
    assert.equal(payload.copiedBreakdown.assetFiles, 1);

    await fs.access(
      path.join(targetPath, path.posix.relative("notes", literatureNote.payload.item.markdownPath).replaceAll("/", path.sep))
    );
    await fs.access(
      path.join(targetPath, path.posix.relative("notes", permanentNote.payload.item.markdownPath).replaceAll("/", path.sep))
    );
    await fs.access(path.join(targetPath, "assets", "images", "all-export.txt"));

    const record = JSON.parse(
      await fs.readFile(path.join(vaultPath, "exports", `${payload.exportJobId}.json`), "utf8")
    );
    assert.deepEqual(record.scope, { type: "all" });
  } finally {
    await stopApi(api);
  }
});

test("POST /api/v1/exports/markdown can export selected noteIds", async () => {
  const vaultPath = await makeTempDir("yansilu-api-export-noteids-vault-");
  const targetPath = await makeTempDir("yansilu-api-export-noteids-target-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const api = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const selected = await postJson(baseUrl, "/api/v1/notes", {
      directoryId: "dir_literature_default",
      title: "Selected API export",
      body: "Selected API export body."
    });
    const omitted = await postJson(baseUrl, "/api/v1/notes", {
      directoryId: "dir_literature_default",
      title: "Omitted API export",
      body: "Omitted API export body."
    });

    assert.equal(selected.response.status, 201, JSON.stringify(selected.payload));
    assert.equal(omitted.response.status, 201, JSON.stringify(omitted.payload));

    const { response, payload } = await postJson(baseUrl, "/api/v1/exports/markdown", {
      targetPath,
      noteIds: [selected.payload.item.id]
    });

    assert.equal(response.status, 202);
    assert.deepEqual(payload.scope, { type: "noteIds", noteIds: [selected.payload.item.id] });
    assert.equal(payload.copiedBreakdown.markdownFiles, 1);

    const selectedTargetPath = path.join(
      targetPath,
      path.posix.relative("notes", selected.payload.item.markdownPath).replaceAll("/", path.sep)
    );
    const omittedTargetPath = path.join(
      targetPath,
      path.posix.relative("notes", omitted.payload.item.markdownPath).replaceAll("/", path.sep)
    );

    assert.match(await fs.readFile(selectedTargetPath, "utf8"), /Selected API export body/);
    await assert.rejects(() => fs.access(omittedTargetPath), /ENOENT/);

    const record = JSON.parse(
      await fs.readFile(path.join(vaultPath, "exports", `${payload.exportJobId}.json`), "utf8")
    );
    assert.deepEqual(record.scope, payload.scope);
    assert.deepEqual(record.exportedFiles.map((item) => item.sourcePath), [selected.payload.item.markdownPath]);
  } finally {
    await stopApi(api);
  }
});

test("POST /api/v1/exports/markdown can export a directory tree", async () => {
  const vaultPath = await makeTempDir("yansilu-api-export-directory-vault-");
  const targetPath = await makeTempDir("yansilu-api-export-directory-target-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const api = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const parentDir = await postJson(baseUrl, "/api/v1/directories", {
      title: "API export parent",
      parentDirectoryId: "dir_original_default",
      fsPath: path.join(vaultPath, "notes", "original", "api-export-parent")
    });
    assert.equal(parentDir.response.status, 201, JSON.stringify(parentDir.payload));

    const childDir = await postJson(baseUrl, "/api/v1/directories", {
      title: "API export child",
      parentDirectoryId: parentDir.payload.item.id,
      fsPath: path.join(vaultPath, "notes", "original", "api-export-parent", "child")
    });
    assert.equal(childDir.response.status, 201, JSON.stringify(childDir.payload));

    const parentNote = await postJson(baseUrl, "/api/v1/notes", {
      directoryId: parentDir.payload.item.id,
      title: "API parent directory export note",
      body: "Parent directory export body."
    });
    const childNote = await postJson(baseUrl, "/api/v1/notes", {
      directoryId: childDir.payload.item.id,
      title: "API child directory export note",
      body: "Child directory export body."
    });
    const outsideNote = await postJson(baseUrl, "/api/v1/notes", {
      directoryId: "dir_literature_default",
      title: "API outside directory export note",
      body: "Outside directory export body."
    });

    assert.equal(parentNote.response.status, 201, JSON.stringify(parentNote.payload));
    assert.equal(childNote.response.status, 201, JSON.stringify(childNote.payload));
    assert.equal(outsideNote.response.status, 201, JSON.stringify(outsideNote.payload));

    const { response, payload } = await postJson(baseUrl, "/api/v1/exports/markdown", {
      targetPath,
      directoryId: parentDir.payload.item.id,
      includeDescendants: true
    });

    assert.equal(response.status, 202);
    assert.deepEqual(payload.scope, {
      type: "directory",
      directoryId: parentDir.payload.item.id,
      includeDescendants: true
    });
    assert.equal(payload.copiedBreakdown.markdownFiles, 2);

    const exportedRecord = JSON.parse(
      await fs.readFile(path.join(vaultPath, "exports", `${payload.exportJobId}.json`), "utf8")
    );
    assert.deepEqual(
      exportedRecord.exportedFiles.map((item) => item.sourcePath).sort(),
      [parentNote.payload.item.markdownPath, childNote.payload.item.markdownPath].sort()
    );

    await fs.access(
      path.join(targetPath, path.posix.relative("notes", parentNote.payload.item.markdownPath).replaceAll("/", path.sep))
    );
    await fs.access(
      path.join(targetPath, path.posix.relative("notes", childNote.payload.item.markdownPath).replaceAll("/", path.sep))
    );
    await assert.rejects(
      () =>
        fs.access(
          path.join(targetPath, path.posix.relative("notes", outsideNote.payload.item.markdownPath).replaceAll("/", path.sep))
        ),
      /ENOENT/
    );
  } finally {
    await stopApi(api);
  }
});

test("POST /api/v1/exports/markdown rejects literature subdirectories", async () => {
  const vaultPath = await makeTempDir("yansilu-api-export-literature-scope-vault-");
  const targetPath = await makeTempDir("yansilu-api-export-literature-scope-target-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const api = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const literatureChild = await postJson(baseUrl, "/api/v1/directories", {
      title: "API export literature child",
      parentDirectoryId: "dir_literature_default",
      fsPath: path.join(vaultPath, "notes", "literature", "api-export-literature-child")
    });
    assert.equal(literatureChild.response.status, 201, JSON.stringify(literatureChild.payload));

    const { response, payload } = await postJson(baseUrl, "/api/v1/exports/markdown", {
      targetPath,
      directoryId: literatureChild.payload.item.id
    });

    assert.equal(response.status, 400);
    assert.equal(payload.error.code, "EXPORT_SCOPE_INVALID");
    assert.equal(payload.error.message, "directoryId must be a permanent-note directory");
  } finally {
    await stopApi(api);
  }
});

test("POST /api/v1/imports/preview builds Zotero, Readwise, and NotebookLM candidates", async () => {
  const vaultPath = await makeTempDir("yansilu-api-preview-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const api = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const cases = [
      {
        connector: "zotero",
        body: {
          connector: "zotero",
          payload: await readJsonFixture("zotero-basic.json")
        },
        assertRecord(record) {
          assert.equal(record.preview.summary.sources, 1);
          assert.equal(record.preview.summary.literatureNotes, 1);
          assert.equal(record.preview.summary.permanentNotes, 0);
          assert.equal(record.candidates.sources[0].source_type, "article");
          assert.equal(record.candidates.literature[0].quote_text, "A careful Zotero quote.");
          assert.equal(record.candidates.literature[0].locator, "p. 9");
        }
      },
      {
        connector: "readwise",
        body: {
          connector: "readwise",
          payload: await readJsonFixture("readwise-basic.json")
        },
        assertRecord(record) {
          assert.equal(record.preview.summary.sources, 1);
          assert.equal(record.preview.summary.literatureNotes, 1);
          assert.equal(record.preview.summary.permanentNotes, 0);
          assert.equal(record.candidates.sources[0].source_type, "note");
          assert.ok(record.candidates.literature[0].tags.includes("pending_paraphrase"));
          assert.equal(record.candidates.literature[0].quote_text, "A Readwise highlight worth processing.");
        }
      },
      {
        connector: "notebooklm",
        body: {
          connector: "notebooklm",
          payload: await readJsonFixture("notebooklm-basic.json")
        },
        assertRecord(record) {
          assert.equal(record.preview.summary.sources, 1);
          assert.equal(record.preview.summary.literatureNotes, 1);
          assert.equal(record.preview.summary.permanentNotes, 0);
          assert.equal(record.candidates.sources[0].source_type, "note");
          assert.equal(record.candidates.literature[0].notebook, "Notebook A");
          assert.equal(record.candidates.literature[0].quote_text, "A NotebookLM synthesis fragment.");
        }
      }
    ];

    for (const testCase of cases) {
      const { response, payload } = await postJson(baseUrl, "/api/v1/imports/preview", testCase.body);

      assert.equal(response.status, 200);
      assert.match(payload.importRecordId, /^imp_/);
      assert.equal(payload.connector, testCase.connector);
      assert.equal(payload.samples.sourceIds.length, 1);
      assert.equal(payload.samples.literatureNoteIds.length, 1);
      assert.equal(payload.summary.sources, 1);
      assert.equal(payload.summary.literatureNotes, 1);
      assert.equal(payload.candidatePreview.sources.length, 1);
      assert.equal(payload.candidatePreview.literatureNotes.length, 1);
      assert.equal(payload.candidatePreview.sources[0].type, "Source");
      assert.equal(payload.candidatePreview.literatureNotes[0].type, "LiteratureNote");

      const recordPath = path.join(
        vaultPath,
        "imports",
        testCase.connector,
        `${payload.importRecordId}.preview.json`
      );
      const record = JSON.parse(await fs.readFile(recordPath, "utf8"));
      assert.equal(record.preview.status, "preview");
      assert.equal(record.preview.connector, testCase.connector);
      assert.equal(record.preview.importRecordId, payload.importRecordId);
      testCase.assertRecord(record);
    }
  } finally {
    await stopApi(api);
  }
});

test("POST /api/v1/imports/preview returns warnings for malformed external fixture payloads", async () => {
  const vaultPath = await makeTempDir("yansilu-api-preview-warning-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const api = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const { response, payload } = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "readwise",
      payload: await readJsonFixture("malformed", "readwise-highlights-not-array.json")
    });

    assert.equal(response.status, 200);
    assert.equal(payload.connector, "readwise");
    assert.equal(payload.summary.sources, 0);
    assert.equal(payload.summary.literatureNotes, 0);
    assert.equal(payload.summary.warnings, 1);
    assert.deepEqual(payload.candidatePreview.total, { sources: 0, literatureNotes: 0, permanentNotes: 0 });
    assert.equal(payload.warnings[0].code, "IMPORT_EMPTY_PAYLOAD");

    const recordPath = path.join(vaultPath, "imports", "readwise", `${payload.importRecordId}.preview.json`);
    const record = JSON.parse(await fs.readFile(recordPath, "utf8"));
    assert.deepEqual(record.candidates.sources, []);
    assert.deepEqual(record.candidates.literature, []);
    assert.equal(record.candidates.warnings[0].code, "IMPORT_EMPTY_PAYLOAD");
  } finally {
    await stopApi(api);
  }
});

test("POST /api/v1/imports/preview records edge-case Obsidian fixture candidates", async () => {
  const vaultPath = await makeTempDir("yansilu-api-preview-obsidian-edge-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const api = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const fixturePath = path.join(FIXTURES_ROOT, "obsidian-edge-vault");
    const { response, payload } = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: fixturePath },
      options: { detectWikilinks: true, detectAliases: true }
    });

    assert.equal(response.status, 200);
    assert.equal(payload.connector, "obsidian");
    assert.equal(payload.summary.sources, 5);
    assert.equal(payload.summary.literatureNotes, 5);
    assert.equal(payload.summary.permanentNotes, 1);
    assert.equal(payload.summary.warnings, 2);
    assert.ok(payload.candidatePreview.permanentNotes.some((item) => item.title === "Source Note"));
    assert.equal(payload.candidatePreview.permanentNotes[0].type, "PermanentNote");
    assert.deepEqual(
      payload.warnings.map((warning) => warning.code).sort(),
      ["IMPORT_MALFORMED_FRONTMATTER", "ORIGINALITY_GUARD_BLOCKED"]
    );

    const recordPath = path.join(vaultPath, "imports", "obsidian", `${payload.importRecordId}.preview.json`);
    const record = JSON.parse(await fs.readFile(recordPath, "utf8"));
    const sourceNote = record.candidates.literature.find((note) => note.title === "Source Note");
    assert.ok(sourceNote);
    assert.deepEqual(sourceNote.aliases, ["Source Alias", "Source Alt"]);
    assert.deepEqual(sourceNote.wikilink_targets, ["Target Note", "image.png"]);
    assert.equal(sourceNote.parsed_wikilinks[3].embed, true);

    const duplicateNotes = record.candidates.literature.filter((note) => note.title === "Duplicate Idea");
    assert.equal(duplicateNotes.length, 2);
    assert.equal(record.candidates.permanent[0].title, "Source Note");
    assert.equal(record.candidates.warnings[0].code, "IMPORT_MALFORMED_FRONTMATTER");
  } finally {
    await stopApi(api);
  }
});

test("POST /api/v1/imports/preview records realistic Obsidian vault candidates with Chinese tags", async () => {
  const vaultPath = await makeTempDir("yansilu-api-preview-obsidian-realistic-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const api = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const fixturePath = path.join(FIXTURES_ROOT, "obsidian-realistic-vault");
    const { response, payload } = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: fixturePath },
      options: { detectWikilinks: true }
    });

    assert.equal(response.status, 200);
    assert.equal(payload.connector, "obsidian");
    assert.equal(payload.summary.sources, 2);
    assert.equal(payload.summary.literatureNotes, 2);
    assert.equal(payload.summary.permanentNotes, 1);
    assert.equal(payload.summary.warnings, 1);
    assert.deepEqual(payload.warnings.map((warning) => warning.code), ["ORIGINALITY_GUARD_BLOCKED"]);
    assert.ok(payload.candidatePreview.literatureNotes.some((item) => item.title === "中文阅读卡片"));

    const recordPath = path.join(vaultPath, "imports", "obsidian", `${payload.importRecordId}.preview.json`);
    const record = JSON.parse(await fs.readFile(recordPath, "utf8"));
    const chineseNote = record.candidates.literature.find((note) => note.title === "中文阅读卡片");
    assert.ok(chineseNote);
    assert.ok(chineseNote.tags.includes("来源/访谈"));
    assert.equal(chineseNote.tags.includes("#来源/访谈"), false);
    assert.ok(chineseNote.tags.includes("读书/论文"));
    assert.ok(chineseNote.tags.includes("产品-策略"));
    assert.deepEqual(chineseNote.wikilink_targets, ["Research/Spacing Note", "assets/chart 1.png"]);
    assert.equal(record.candidates.permanent[0].title, "Spacing Note");
  } finally {
    await stopApi(api);
  }
});
