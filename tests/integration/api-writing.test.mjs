import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
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

test("writing APIs create project basket and draft scaffold from permanent notes", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-writing-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const noteA = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    body: "# Writing from claims\n\nA draft should start from durable original claims."
  });
  assert.equal(noteA.status, 201);

  const noteB = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    body: "# Evidence mapping\n\nEach paragraph should trace back to source notes."
  });
  assert.equal(noteB.status, 201);

  const literature = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_literature_default",
    body: "# Literature excerpt\n\nThis should not enter the writing basket directly."
  });
  assert.equal(literature.status, 201);

  const rejected = await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "Rejected project",
    basketNoteIds: [literature.json.item.id]
  });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.json.error.code, "WRITING_PROJECT_INVALID");
  assert.match(rejected.json.error.message, /only accepts permanent notes/);

  const project = await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "Writing mainline",
    goal: "Turn selected original notes into a draft scaffold.",
    audience: "Knowledge workers",
    tone: "clear",
    basketNoteIds: [noteA.json.item.id, noteB.json.item.id]
  });
  assert.equal(project.status, 201, JSON.stringify(project.json));
  assert.match(project.json.item.id, /^wp_/);
  assert.deepEqual(project.json.item.basket_note_ids, [noteA.json.item.id, noteB.json.item.id]);
  assert.equal(project.json.item.basket_notes.length, 2);

  const scaffold = await postJson(baseUrl, "/api/v1/draft-scaffolds", {
    writingProjectId: project.json.item.id,
    versionNote: "First scaffold pass from two permanent notes."
  });
  assert.equal(scaffold.status, 201, JSON.stringify(scaffold.json));
  assert.match(scaffold.json.item.id, /^ds_/);
  assert.equal(scaffold.json.item.writing_project_id, project.json.item.id);
  assert.equal(scaffold.json.item.generated_by, "writing-engine:v1");
  assert.equal(scaffold.json.item.version_note, "First scaffold pass from two permanent notes.");
  assert.ok(scaffold.json.item.sections.length >= 4);
  assert.equal(scaffold.json.item.writing_project.scaffold_id, scaffold.json.item.id);
  assert.match(scaffold.json.export.markdown, /# Writing mainline/);
  assert.match(scaffold.json.export.markdown, /## Paragraph-Evidence Map/);
  assert.match(scaffold.json.export.markdown, /Writing from claims/);
  assert.equal(scaffold.json.export.json.sections.length, scaffold.json.item.sections.length);

  const fetchedScaffold = await getJson(baseUrl, `/api/v1/draft-scaffolds/${encodeURIComponent(scaffold.json.item.id)}`);
  assert.equal(fetchedScaffold.status, 200, JSON.stringify(fetchedScaffold.json));
  assert.equal(fetchedScaffold.json.item.id, scaffold.json.item.id);
  assert.match(fetchedScaffold.json.export.markdown, /Paragraph-Evidence Map/);

  const scaffoldV2 = await postJson(baseUrl, "/api/v1/draft-scaffolds", {
    writingProjectId: project.json.item.id,
    versionNote: "Second scaffold pass with a tighter structure."
  });
  assert.equal(scaffoldV2.status, 201, JSON.stringify(scaffoldV2.json));
  assert.notEqual(scaffoldV2.json.item.id, scaffold.json.item.id);

  const scaffoldVersions = await getJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/scaffolds?limit=12`);
  assert.equal(scaffoldVersions.status, 200, JSON.stringify(scaffoldVersions.json));
  assert.ok(Array.isArray(scaffoldVersions.json.items));
  assert.equal(scaffoldVersions.json.items.length, 2);
  assert.equal(scaffoldVersions.json.items[0].id, scaffoldV2.json.item.id);
  assert.equal(scaffoldVersions.json.items[0].version_note, "Second scaffold pass with a tighter structure.");
  assert.equal(scaffoldVersions.json.items[1].id, scaffold.json.item.id);
  assert.equal(scaffoldVersions.json.items[1].version_note, "First scaffold pass from two permanent notes.");

  const draftNote = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "draft",
    body: "# Writing mainline draft\n\nDraft body generated from scaffold."
  });
  assert.equal(draftNote.status, 201, JSON.stringify(draftNote.json));

  const bindDraft = await postJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/draft-note`, {
    draftNoteId: draftNote.json.item.id,
    sourceScaffoldId: scaffold.json.item.id,
    versionNote: "First prose pass from scaffold v1."
  });
  assert.equal(bindDraft.status, 200, JSON.stringify(bindDraft.json));
  assert.equal(bindDraft.json.item.draft_note_id, draftNote.json.item.id);
  assert.equal(bindDraft.json.item.draft_note.id, draftNote.json.item.id);
  assert.equal(bindDraft.json.item.draft_note.title, "Writing mainline draft");

  const draftNoteV2 = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "draft",
    body: "# Writing mainline draft v2\n\nDraft body generated from the second scaffold."
  });
  assert.equal(draftNoteV2.status, 201, JSON.stringify(draftNoteV2.json));

  const bindDraftV2 = await postJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/draft-note`, {
    draftNoteId: draftNoteV2.json.item.id,
    sourceScaffoldId: scaffoldV2.json.item.id,
    versionNote: "Second prose pass from scaffold v2."
  });
  assert.equal(bindDraftV2.status, 200, JSON.stringify(bindDraftV2.json));
  assert.equal(bindDraftV2.json.item.draft_note_id, draftNoteV2.json.item.id);

  const draftVersions = await getJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/draft-versions?limit=12`);
  assert.equal(draftVersions.status, 200, JSON.stringify(draftVersions.json));
  assert.ok(Array.isArray(draftVersions.json.items));
  assert.equal(draftVersions.json.items.length, 2);
  assert.equal(draftVersions.json.items[0].draft_note_id, draftNoteV2.json.item.id);
  assert.equal(draftVersions.json.items[0].version_no, 2);
  assert.equal(draftVersions.json.items[0].source_scaffold_id, scaffoldV2.json.item.id);
  assert.equal(draftVersions.json.items[0].version_note, "Second prose pass from scaffold v2.");
  assert.equal(draftVersions.json.items[0].is_current, true);
  assert.equal(draftVersions.json.items[1].draft_note_id, draftNote.json.item.id);
  assert.equal(draftVersions.json.items[1].version_no, 1);
  assert.equal(draftVersions.json.items[1].source_scaffold_id, scaffold.json.item.id);
  assert.equal(draftVersions.json.items[1].version_note, "First prose pass from scaffold v1.");

  const rebindCurrent = await postJson(
    baseUrl,
    `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/current-draft`,
    {
      draftNoteId: draftNote.json.item.id
    }
  );
  assert.equal(rebindCurrent.status, 200, JSON.stringify(rebindCurrent.json));
  assert.equal(rebindCurrent.json.item.draft_note_id, draftNote.json.item.id);
  assert.equal(rebindCurrent.json.item.draft_note.id, draftNote.json.item.id);

  const reboundDraftVersions = await getJson(
    baseUrl,
    `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/draft-versions?limit=12`
  );
  assert.equal(reboundDraftVersions.status, 200, JSON.stringify(reboundDraftVersions.json));
  assert.equal(reboundDraftVersions.json.items.length, 2);
  assert.equal(reboundDraftVersions.json.items[0].draft_note_id, draftNoteV2.json.item.id);
  assert.equal(reboundDraftVersions.json.items[0].is_current, false);
  assert.equal(reboundDraftVersions.json.items[1].draft_note_id, draftNote.json.item.id);
  assert.equal(reboundDraftVersions.json.items[1].is_current, true);

  const fetchedProject = await getJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}`);
  assert.equal(fetchedProject.status, 200, JSON.stringify(fetchedProject.json));
  assert.equal(fetchedProject.json.item.scaffold_id, scaffoldV2.json.item.id);
  assert.equal(fetchedProject.json.item.draft_note_id, draftNote.json.item.id);
  assert.equal(fetchedProject.json.item.draft_note.id, draftNote.json.item.id);

  const listedProjects = await getJson(baseUrl, "/api/v1/writing-projects?limit=8");
  assert.equal(listedProjects.status, 200, JSON.stringify(listedProjects.json));
  assert.ok(Array.isArray(listedProjects.json.items));
  assert.equal(listedProjects.json.items[0].id, project.json.item.id);
  assert.equal(listedProjects.json.items[0].draft_note_id, draftNote.json.item.id);
  assert.equal(listedProjects.json.items[0].scaffold_id, scaffoldV2.json.item.id);
});
