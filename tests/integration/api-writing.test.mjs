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
    body: "# Writing from claims\n\nA draft should start from durable original claims.",
    boundaryOrCounterpoint: "This claim weakens when the paragraph cannot point back to a stable note."
  });
  assert.equal(noteA.status, 201);

  const noteB = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    body: "# Evidence mapping\n\nEach paragraph should trace back to source notes.",
    boundaryOrCounterpoint: "Evidence mapping is not enough when two similar concepts are still being conflated."
  });
  assert.equal(noteB.status, 201);

  const literature = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_literature_default",
    body: "# Literature excerpt\n\nThis should not enter the writing basket directly."
  });
  assert.equal(literature.status, 201);

  const invalidIndex = await postJson(baseUrl, "/api/v1/index-cards", {
    directoryId: "dir_original_default",
    indexType: "topic",
    title: "Invalid topic index",
    noteIds: [literature.json.item.id]
  });
  assert.equal(invalidIndex.status, 400);
  assert.equal(invalidIndex.json.error.code, "INDEX_CARD_INVALID");
  assert.match(invalidIndex.json.error.message, /only accept permanent notes/);

  const topicIndex = await postJson(baseUrl, "/api/v1/index-cards", {
    directoryId: "dir_original_default",
    indexType: "topic",
    title: "Writing themes",
    summary: "A reusable topic entry for the current writing direction.",
    thesis: "This topic is about turning notes into compressed writing inputs.",
    threeLineSummary: [
      "The topic centers on turning notes into compressed writing inputs.",
      "It matters because structure is easier when claims are already distilled.",
      "It connects note quality directly to writing quality."
    ],
    centralQuestion: "How can a note system force better compression before drafting begins?",
    items: [
      { noteId: noteA.json.item.id, shortLabel: "claim", rationale: "Sets the main writing stance." },
      { noteId: noteB.json.item.id, shortLabel: "evidence", rationale: "Keeps each paragraph tied to notes." }
    ]
  });
  assert.equal(topicIndex.status, 201, JSON.stringify(topicIndex.json));
  assert.match(topicIndex.json.item.id, /^idx_/);
  assert.equal(topicIndex.json.item.index_type, "topic");
  assert.equal(topicIndex.json.item.thesis, "This topic is about turning notes into compressed writing inputs.");
  assert.deepEqual(topicIndex.json.item.three_line_summary, [
    "The topic centers on turning notes into compressed writing inputs.",
    "It matters because structure is easier when claims are already distilled.",
    "It connects note quality directly to writing quality."
  ]);
  assert.equal(topicIndex.json.item.central_question, "How can a note system force better compression before drafting begins?");
  assert.equal(topicIndex.json.item.thinkingStatus.status, "ready_for_writing");
  assert.equal(topicIndex.json.item.thinkingStatus.label, "可进入写作");
  assert.equal(topicIndex.json.item.note_count, 2);
  assert.deepEqual(topicIndex.json.item.item_note_ids, [noteA.json.item.id, noteB.json.item.id]);

  const listedIndexes = await getJson(baseUrl, "/api/v1/index-cards?directoryId=dir_original_default&indexType=topic&includeDescendants=true&limit=8");
  assert.equal(listedIndexes.status, 200, JSON.stringify(listedIndexes.json));
  assert.equal(listedIndexes.json.items.length, 1);
  assert.equal(listedIndexes.json.items[0].id, topicIndex.json.item.id);
  assert.equal(listedIndexes.json.items[0].thinkingStatus.status, "ready_for_writing");

  const fetchedIndex = await getJson(baseUrl, `/api/v1/index-cards/${encodeURIComponent(topicIndex.json.item.id)}`);
  assert.equal(fetchedIndex.status, 200, JSON.stringify(fetchedIndex.json));
  assert.equal(fetchedIndex.json.item.id, topicIndex.json.item.id);
  assert.equal(fetchedIndex.json.item.thesis, "This topic is about turning notes into compressed writing inputs.");
  assert.equal(fetchedIndex.json.item.central_question, "How can a note system force better compression before drafting begins?");
  assert.equal(fetchedIndex.json.item.thinkingStatus.status, "ready_for_writing");
  assert.equal(fetchedIndex.json.item.items[0].note.noteType, "permanent");

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
    intent: "Explain why writing should begin from distilled notes rather than blank prompts.",
    desiredReaderTakeaway: "Readers should see thought compression as the bridge between note-taking and writing.",
    basketNoteIds: [noteA.json.item.id, noteB.json.item.id],
    relatedIndexIds: [topicIndex.json.item.id]
  });
  assert.equal(project.status, 201, JSON.stringify(project.json));
  assert.match(project.json.item.id, /^wp_/);
  assert.deepEqual(project.json.item.basket_note_ids, [noteA.json.item.id, noteB.json.item.id]);
  assert.deepEqual(project.json.item.related_index_ids, [topicIndex.json.item.id]);
  assert.equal(project.json.item.intent, "Explain why writing should begin from distilled notes rather than blank prompts.");
  assert.equal(project.json.item.desired_reader_takeaway, "Readers should see thought compression as the bridge between note-taking and writing.");
  assert.equal(project.json.item.thinkingStatus.status, "needs_scaffold");
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
  assert.ok(scaffold.json.item.sections.every((section) => Array.isArray(section.evidence_note_ids)));
  assert.ok(scaffold.json.item.sections.every((section) => Array.isArray(section.gaps)));
  assert.ok(scaffold.json.item.sections.every((section) => Array.isArray(section.counterpoints)));
  assert.ok(scaffold.json.item.sections.some((section) => section.counterpoints.some((item) => /stable note|conflated/i.test(item))));
  assert.ok(scaffold.json.item.sections.some((section) => section.open_questions.some((item) => /boundary|counterexample/i.test(item))));
  assert.ok(scaffold.json.item.open_questions.some((item) => /counterpoint|sharper separation|boundary/i.test(item)));
  assert.equal(scaffold.json.item.writing_project.scaffold_id, scaffold.json.item.id);
  assert.equal(scaffold.json.item.writing_project.thinkingStatus.status, "ready_for_review");
  assert.match(scaffold.json.export.markdown, /# Writing mainline/);
  assert.match(scaffold.json.export.markdown, /## Paragraph-Evidence Map/);
  assert.match(scaffold.json.export.markdown, /Intent: Explain why writing should begin from distilled notes rather than blank prompts\./);
  assert.match(scaffold.json.export.markdown, /Reader takeaway: Readers should see thought compression as the bridge between note-taking and writing\./);
  assert.match(scaffold.json.export.markdown, /Gaps:/);
  assert.match(scaffold.json.export.markdown, /Counterpoints:/);
  assert.match(scaffold.json.export.markdown, /Address this counterpoint or boundary/);
  assert.match(scaffold.json.export.markdown, /sharper separation/i);
  assert.match(scaffold.json.export.markdown, /Writing from claims/);
  assert.equal(scaffold.json.export.json.sections.length, scaffold.json.item.sections.length);

  const fetchedScaffold = await getJson(baseUrl, `/api/v1/draft-scaffolds/${encodeURIComponent(scaffold.json.item.id)}`);
  assert.equal(fetchedScaffold.status, 200, JSON.stringify(fetchedScaffold.json));
  assert.equal(fetchedScaffold.json.item.id, scaffold.json.item.id);
  assert.match(fetchedScaffold.json.export.markdown, /Paragraph-Evidence Map/);
  assert.match(fetchedScaffold.json.export.markdown, /Counterpoints:/);

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

  const updatedScaffoldNote = await fetch(`${baseUrl}/api/v1/draft-scaffolds/${encodeURIComponent(scaffold.json.item.id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ versionNote: "Updated scaffold explanation after review." })
  }).then(async (res) => ({ status: res.status, json: await res.json() }));
  assert.equal(updatedScaffoldNote.status, 200, JSON.stringify(updatedScaffoldNote.json));
  assert.equal(updatedScaffoldNote.json.item.version_note, "Updated scaffold explanation after review.");

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

  const updatedDraftVersionNote = await fetch(
    `${baseUrl}/api/v1/draft-note-versions/${encodeURIComponent(draftVersions.json.items[1].id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionNote: "Updated prose explanation after comparison." })
    }
  ).then(async (res) => ({ status: res.status, json: await res.json() }));
  assert.equal(updatedDraftVersionNote.status, 200, JSON.stringify(updatedDraftVersionNote.json));
  assert.equal(updatedDraftVersionNote.json.item.version_note, "Updated prose explanation after comparison.");
  assert.equal(updatedDraftVersionNote.json.item.version_no, 1);
  assert.equal(updatedDraftVersionNote.json.item.source_scaffold_id, scaffold.json.item.id);
  assert.equal(updatedDraftVersionNote.json.item.is_current, false);

  const rereadDraftVersions = await getJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/draft-versions?limit=12`);
  assert.equal(rereadDraftVersions.status, 200, JSON.stringify(rereadDraftVersions.json));
  assert.equal(rereadDraftVersions.json.items[1].version_note, "Updated prose explanation after comparison.");

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
  assert.deepEqual(fetchedProject.json.item.related_index_ids, [topicIndex.json.item.id]);
  assert.equal(fetchedProject.json.item.intent, "Explain why writing should begin from distilled notes rather than blank prompts.");
  assert.equal(fetchedProject.json.item.desired_reader_takeaway, "Readers should see thought compression as the bridge between note-taking and writing.");
  assert.equal(fetchedProject.json.item.scaffold_id, scaffoldV2.json.item.id);
  assert.equal(fetchedProject.json.item.draft_note_id, draftNote.json.item.id);
  assert.equal(fetchedProject.json.item.draft_note.id, draftNote.json.item.id);
  assert.equal(fetchedProject.json.item.thinkingStatus.status, "ready_for_review");

  const listedProjects = await getJson(baseUrl, "/api/v1/writing-projects?limit=8");
  assert.equal(listedProjects.status, 200, JSON.stringify(listedProjects.json));
  assert.ok(Array.isArray(listedProjects.json.items));
  assert.equal(listedProjects.json.items[0].id, project.json.item.id);
  assert.deepEqual(listedProjects.json.items[0].related_index_ids, [topicIndex.json.item.id]);
  assert.equal(listedProjects.json.items[0].intent, "Explain why writing should begin from distilled notes rather than blank prompts.");
  assert.equal(listedProjects.json.items[0].desired_reader_takeaway, "Readers should see thought compression as the bridge between note-taking and writing.");
  assert.equal(listedProjects.json.items[0].draft_note_id, draftNote.json.item.id);
  assert.equal(listedProjects.json.items[0].scaffold_id, scaffoldV2.json.item.id);
  assert.equal(listedProjects.json.items[0].thinkingStatus.status, "ready_for_review");

  const secondProject = await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "Side outline",
    goal: "Keep a separate branch without a draft note yet.",
    audience: "Editors",
    tone: "concise",
    basketNoteIds: [noteA.json.item.id]
  });
  assert.equal(secondProject.status, 201, JSON.stringify(secondProject.json));

  const filteredByQuery = await getJson(baseUrl, "/api/v1/writing-projects?limit=8&q=mainline");
  assert.equal(filteredByQuery.status, 200, JSON.stringify(filteredByQuery.json));
  assert.equal(filteredByQuery.json.items.length, 1);
  assert.equal(filteredByQuery.json.items[0].id, project.json.item.id);

  const filteredWithDraft = await getJson(baseUrl, "/api/v1/writing-projects?limit=8&hasDraft=true");
  assert.equal(filteredWithDraft.status, 200, JSON.stringify(filteredWithDraft.json));
  assert.equal(filteredWithDraft.json.items.length, 1);
  assert.equal(filteredWithDraft.json.items[0].id, project.json.item.id);

  const filteredWithoutDraft = await getJson(baseUrl, "/api/v1/writing-projects?limit=8&hasDraft=false");
  assert.equal(filteredWithoutDraft.status, 200, JSON.stringify(filteredWithoutDraft.json));
  assert.equal(filteredWithoutDraft.json.items.length, 1);
  assert.equal(filteredWithoutDraft.json.items[0].id, secondProject.json.item.id);

  const filteredByStatus = await getJson(baseUrl, "/api/v1/writing-projects?limit=8&status=draft");
  assert.equal(filteredByStatus.status, 200, JSON.stringify(filteredByStatus.json));
  assert.ok(filteredByStatus.json.items.some((item) => item.id === project.json.item.id));
  assert.ok(filteredByStatus.json.items.some((item) => item.id === secondProject.json.item.id));
});
