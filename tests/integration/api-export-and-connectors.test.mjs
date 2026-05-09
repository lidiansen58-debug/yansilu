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

test("POST /api/v1/exports/markdown copies notes and persists export record", async () => {
  const vaultPath = await makeTempDir("yansilu-api-export-vault-");
  const targetPath = await makeTempDir("yansilu-api-export-target-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const api = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    await fs.mkdir(path.join(vaultPath, "notes", "literature"), { recursive: true });
    await fs.mkdir(path.join(vaultPath, "notes", "sources"), { recursive: true });
    await fs.writeFile(
      path.join(vaultPath, "notes", "literature", "ln_api_export.md"),
      "---\ntype: literature\n---\n\n# Literature API export\n",
      "utf8"
    );
    await fs.writeFile(
      path.join(vaultPath, "notes", "sources", "src_api_export.md"),
      "---\ntype: source\n---\n\n# Source API export\n",
      "utf8"
    );

    const { response, payload } = await postJson(baseUrl, "/api/v1/exports/markdown", {
      targetPath
    });

    assert.equal(response.status, 202);
    assert.equal(payload.status, "queued");
    assert.match(payload.exportJobId, /^exp_/);
    assert.equal(payload.copied, 2);

    const literatureCopy = await fs.readFile(
      path.join(targetPath, "literature", "ln_api_export.md"),
      "utf8"
    );
    const sourceCopy = await fs.readFile(path.join(targetPath, "sources", "src_api_export.md"), "utf8");
    assert.match(literatureCopy, /Literature API export/);
    assert.match(sourceCopy, /Source API export/);

    const record = JSON.parse(
      await fs.readFile(path.join(vaultPath, "exports", `${payload.exportJobId}.json`), "utf8")
    );
    assert.equal(record.exportJobId, payload.exportJobId);
    assert.match(record.requestId, /^req_/);
    assert.equal(record.targetPath, targetPath);
    assert.equal(record.copied, 2);
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
