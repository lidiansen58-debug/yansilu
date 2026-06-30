import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { syncWritingProject } from "../../packages/writing-engine/src/writing-engine.mjs";

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

async function patchJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function readRequestJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function startJsonProvider(output) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "not found" } }));
      return;
    }
    const body = await readRequestJson(req);
    requests.push({ body, headers: req.headers });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: "chatcmpl_writing_analysis_test",
        choices: [{ message: { role: "assistant", content: JSON.stringify(output) } }],
        usage: { prompt_tokens: 17, completion_tokens: 19, total_tokens: 36 }
      })
    );
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        requests,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

function startApi(port, vaultPath) {
  return spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath,
      YANSILU_TEST_PROVIDER_KEY: process.env.YANSILU_TEST_PROVIDER_KEY || "test-key"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

test("writing AI analysis API requires confirmation and stores review-only remote artifacts", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-writing-ai-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const note = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    body: "# AI review boundary\n\nAI writing support should expose source note ids and remain reviewable."
  });
  assert.equal(note.status, 201);

  const rejected = await postJson(baseUrl, "/api/v1/writing/ai-analysis", {
    writingGoal: "Prepare a source-grounded outline.",
    noteIds: [note.json.item.id]
  });
  assert.equal(rejected.status, 403);
  assert.equal(rejected.json.error.code, "WRITING_REMOTE_MODEL_CONFIRMATION_REQUIRED");

  const prepared = await postJson(baseUrl, "/api/v1/writing/ai-analysis", {
    userConfirmedRemoteModel: true,
    writingGoal: "Prepare a source-grounded outline.",
    noteIds: [note.json.item.id],
    model: "gpt-strong",
    persistArtifacts: false
  });
  assert.equal(prepared.status, 200, JSON.stringify(prepared.json));
  assert.equal(prepared.json.item.request.requestType, "writing_strong_model_analysis");
  assert.equal(prepared.json.item.request.privacy.mode, "remote_after_confirmation");
  assert.equal(prepared.json.item.request.privacy.cloudModelAllowed, true);
  assert.equal(prepared.json.item.request.privacy.cloudModelUsed, false);
  assert.equal(prepared.json.item.request.canAutoConfirm, false);
  assert.equal(prepared.json.item.result, null);

  const merged = await postJson(baseUrl, "/api/v1/writing/ai-analysis", {
    userConfirmedRemoteModel: true,
    writingGoal: "Prepare a source-grounded outline.",
    noteIds: [note.json.item.id],
    remoteModelResponse: {
      writingMoves: [
        {
          moveType: "claim",
          text: "Open by separating AI support from user judgment.",
          sourceNoteIds: [note.json.item.id],
          suggestedLocation: "opening",
          whyItMatters: "It makes authorship boundaries explicit."
        }
      ],
      outlineDrafts: [
        {
          title: "Review-first outline",
          sections: ["Problem", "Boundary", "Workflow"],
          sourceNoteIds: [note.json.item.id],
          gaps: ["Need one accepted example."]
        }
      ],
      sourceGaps: [
        {
          gap: "example_missing",
          claim: "Review queues prevent accidental adoption.",
          requiredSourceType: "note",
          relatedNoteIds: [note.json.item.id]
        }
      ]
    },
    persistArtifacts: false
  });
  assert.equal(merged.status, 200, JSON.stringify(merged.json));
  assert.equal(merged.json.item.result.analysisMode, "remote_strong_model_writing");
  assert.equal(merged.json.item.result.provenance.cloudModelUsed, true);
  assert.equal(merged.json.item.result.summary.canAutoConfirm, false);
  assert.equal(merged.json.item.result.artifactsPersisted, false);
  assert.deepEqual(merged.json.item.result.artifacts.map((item) => item.type), ["WritingMove", "OutlineDraft", "SourceGap"]);
  assert.ok(merged.json.item.result.artifacts.every((item) => item.status === "pending_review"));
  assert.ok(merged.json.item.result.artifacts.every((item) => item.origin === "ai_generated"));

  const remoteProvider = await startJsonProvider({
    writingMoves: [
      {
        moveType: "counterpoint",
        text: "Add a caveat that review queues still require user attention.",
        sourceNoteIds: [note.json.item.id],
        suggestedLocation: "middle",
        whyItMatters: "It keeps the workflow honest."
      }
    ],
    outlineDrafts: [
      {
        title: "Executed review outline",
        sections: ["Boundary", "Execution", "Review"],
        sourceNoteIds: [note.json.item.id],
        gaps: ["Need one manual adoption example."]
      }
    ],
    sourceGaps: [
      {
        gap: "manual_adoption_example",
        claim: "Review-first AI works better with explicit adoption examples.",
        requiredSourceType: "note",
        relatedNoteIds: [note.json.item.id]
      }
    ]
  });
  t.after(() => remoteProvider.server.close());

  const executed = await postJson(baseUrl, "/api/v1/writing/ai-analysis", {
    userConfirmedRemoteModel: true,
    executeRemoteModel: true,
    providerPreset: "local_private_gateway",
    modelPack: "Privacy First",
    authMode: "local_no_key",
    endpointUrl: `${remoteProvider.baseUrl}/v1/chat/completions`,
    runtimeModelMap: {
      "local_private_gateway:strong_reasoning": "local-strong-model"
    },
    writingGoal: "Prepare a source-grounded outline.",
    noteIds: [note.json.item.id],
    model: "local-strong-model",
    persistArtifacts: false
  });
  assert.equal(executed.status, 200, JSON.stringify(executed.json));
  assert.equal(executed.json.item.modelExecution.status, "succeeded");
  assert.equal(executed.json.item.modelExecution.providerId, "local_private_gateway");
  assert.equal(executed.json.item.result.analysisMode, "remote_strong_model_writing");
  assert.equal(executed.json.item.result.provenance.cloudModelUsed, true);
  assert.deepEqual(executed.json.item.result.artifacts.map((item) => item.type), ["WritingMove", "OutlineDraft", "SourceGap"]);
  assert.ok(executed.json.item.result.artifacts.every((item) => item.status === "pending_review"));
  assert.equal(remoteProvider.requests.length, 1);
  assert.equal(remoteProvider.requests[0].body.model, "local-strong-model");

  const storedRemoteConfig = await postJson(baseUrl, "/api/v1/ai/provider-configs", {
    providerId: "openai_compatible_gateway",
    authMode: "workspace_managed",
    secretRef: "env:YANSILU_TEST_PROVIDER_KEY",
    endpointUrl: "https://stored-remote-gateway.example.test/v1/chat/completions",
    runtimeModelMap: {
      "openai_compatible_gateway:strong_reasoning": "stored-strong-model"
    }
  });
  assert.equal(storedRemoteConfig.status, 200, JSON.stringify(storedRemoteConfig.json));

  const clearedExecution = await postJson(baseUrl, "/api/v1/writing/ai-analysis", {
    userConfirmedRemoteModel: true,
    executeRemoteModel: true,
    providerPreset: "openai_compatible_gateway",
    modelPack: "Global Optimized",
    authMode: "workspace_managed",
    secretRef: "",
    endpointUrl: "",
    runtimeModelMap: {},
    writingGoal: "This should not reuse stored provider settings.",
    noteIds: [note.json.item.id],
    persistArtifacts: false
  });
  assert.equal(clearedExecution.status, 400, JSON.stringify(clearedExecution.json));
  assert.equal(clearedExecution.json.error.code, "AI_PROVIDER_CONFIG_INVALID");
  assert.equal(remoteProvider.requests.length, 1);

  const disabledLocalConfig = await postJson(baseUrl, "/api/v1/ai/provider-configs", {
    providerId: "local_private_gateway",
    authMode: "local_no_key",
    status: "disabled",
    endpointUrl: "",
    runtimeModelMap: {}
  });
  assert.equal(disabledLocalConfig.status, 200, JSON.stringify(disabledLocalConfig.json));

  const restoredExecution = await postJson(baseUrl, "/api/v1/writing/ai-analysis", {
    userConfirmedRemoteModel: true,
    executeRemoteModel: true,
    providerPreset: "local_private_gateway",
    modelPack: "Privacy First",
    authMode: "local_no_key",
    endpointUrl: `${remoteProvider.baseUrl}/v1/chat/completions`,
    runtimeModelMap: {
      "local_private_gateway:strong_reasoning": "local-restored-model"
    },
    writingGoal: "This should use the refreshed provider draft.",
    noteIds: [note.json.item.id],
    model: "local-restored-model",
    persistArtifacts: false
  });
  assert.equal(restoredExecution.status, 200, JSON.stringify(restoredExecution.json));
  assert.equal(restoredExecution.json.item.modelExecution.status, "succeeded");
  assert.equal(restoredExecution.json.item.modelExecution.providerId, "local_private_gateway");
  assert.equal(remoteProvider.requests.length, 2);
  assert.equal(remoteProvider.requests[1].body.model, "local-restored-model");
});

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

  const noteC = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    body: "# Theme tension\n\nA third permanent note adds a missing tension to the theme.",
    boundaryOrCounterpoint: "This only helps once the theme is explicit enough to compare competing claims."
  });
  assert.equal(noteC.status, 201);

  const updatedIndex = await patchJson(baseUrl, `/api/v1/index-cards/${encodeURIComponent(topicIndex.json.item.id)}`, {
    summary: "A reusable topic entry that now includes the missing tension note.",
    centralQuestion: "Which theme question is strong enough to organize the next writing move?",
    items: [
      { noteId: noteA.json.item.id, shortLabel: "claim", rationale: "Sets the main writing stance." },
      { noteId: noteB.json.item.id, shortLabel: "evidence", rationale: "Keeps each paragraph tied to notes." },
      { noteId: noteC.json.item.id, shortLabel: "tension", rationale: "Adds the missing tension that the theme still needs." }
    ]
  });
  assert.equal(updatedIndex.status, 200, JSON.stringify(updatedIndex.json));
  assert.equal(updatedIndex.json.item.central_question, "Which theme question is strong enough to organize the next writing move?");
  assert.equal(updatedIndex.json.item.note_count, 3);
  assert.deepEqual(updatedIndex.json.item.item_note_ids, [noteA.json.item.id, noteB.json.item.id, noteC.json.item.id]);
  assert.equal(updatedIndex.json.item.items[2].note.id, noteC.json.item.id);

  const rejected = await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "Rejected project",
    basketNoteIds: [literature.json.item.id]
  });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.json.error.code, "WRITING_PROJECT_INVALID");
  assert.match(rejected.json.error.message, /only accepts permanent notes/);

  const project = await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "Writing mainline",
    goal: "Turn selected permanent notes into a draft scaffold.",
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
  assert.equal(project.json.item.book_structure.schema_version, 1);
  assert.equal(project.json.item.book_structure.parts.length, 3);
  assert.ok(project.json.item.book_structure.parts.every((part) => part.chapters.length > 0));
  assert.ok(project.json.item.book_structure.parts.every((part) => part.chapters.every((chapter) => chapter.sections.length > 0)));
  assert.ok(project.json.item.book_structure.pools.cases.length > 0);
  assert.ok(project.json.item.book_structure.pools.cases.some((item) => item.note_ids.includes(noteA.json.item.id) || item.note_ids.includes(noteB.json.item.id)));
  assert.ok(project.json.item.book_structure.pools.counterarguments.length > 0);
  assert.ok(
    project.json.item.book_structure.pools.counterarguments.some(
      (item) => item.note_ids.includes(noteA.json.item.id) || item.note_ids.includes(noteB.json.item.id)
    )
  );

  const updatedBookStructure = {
    ...project.json.item.book_structure,
    direction_ideas: [
      {
        id: "idea_judgment_training",
        title: "Judgment training book",
        reader: "Knowledge workers",
        promise: "Teach readers to turn durable notes into decisions.",
        risk: "Needs concrete cases.",
        note_ids: [noteA.json.item.id]
      }
    ]
  };
  const bookStructurePatch = await patchJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/book-structure`, {
    bookStructure: updatedBookStructure
  });
  assert.equal(bookStructurePatch.status, 200, JSON.stringify(bookStructurePatch.json));
  assert.equal(bookStructurePatch.json.item.book_structure.direction_ideas.length, 1);
  assert.equal(bookStructurePatch.json.item.book_structure.direction_ideas[0].title, "Judgment training book");

  const emptyBookStructurePatch = await patchJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/book-structure`, {});
  assert.equal(emptyBookStructurePatch.status, 400, JSON.stringify(emptyBookStructurePatch.json));
  assert.match(emptyBookStructurePatch.json.error.message, /bookStructure or regenerate is required/);

  const fetchedBookProject = await getJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}`);
  assert.equal(fetchedBookProject.status, 200, JSON.stringify(fetchedBookProject.json));
  assert.equal(fetchedBookProject.json.item.book_structure.direction_ideas[0].id, "idea_judgment_training");
  assert.equal(fetchedBookProject.json.item.book_structure.parts.length, 3);

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
  assert.ok(scaffold.json.item.sections.some((section) => section.open_questions.some((item) => /边界|反例/i.test(item))));
  assert.ok(scaffold.json.item.open_questions.some((item) => /反方|区分|边界/i.test(item)));
  assert.equal(scaffold.json.item.preflight.status, "needs_attention");
  assert.ok(scaffold.json.item.preflight.checks.some((check) => check.id === "writing_intent" && check.status === "pass"));
  assert.ok(scaffold.json.item.preflight.checks.some((check) => check.id === "confirmed_distillation" && check.status === "warning"));
  assert.ok(scaffold.json.item.preflight.checks.some((check) => check.id === "distillation_quality" && check.status === "warning"));
  assert.equal(scaffold.json.item.writing_project.scaffold_id, scaffold.json.item.id);
  assert.equal(scaffold.json.item.writing_project.thinkingStatus.status, "ready_for_review");
  assert.match(scaffold.json.export.markdown, /# Writing mainline/);
  assert.match(scaffold.json.export.markdown, /## 草稿骨架预检/);
  assert.match(scaffold.json.export.markdown, /- 提醒 已确认提纯/);
  assert.match(scaffold.json.export.markdown, /- 提醒 提纯质量/);
  assert.match(scaffold.json.export.markdown, /## 段落-证据对照表/);
  assert.match(scaffold.json.export.markdown, /- 意图: Explain why writing should begin from distilled notes rather than blank prompts\./);
  assert.match(scaffold.json.export.markdown, /- 读者收获: Readers should see thought compression as the bridge between note-taking and writing\./);
  assert.match(scaffold.json.export.markdown, /待补缺口:/);
  assert.match(scaffold.json.export.markdown, /反方与边界:/);
  assert.match(scaffold.json.export.markdown, /要正面处理哪条反方或边界|补出哪条反方、限制或例外/);
  assert.match(scaffold.json.export.markdown, /进一步区分|区分/i);
  assert.match(scaffold.json.export.markdown, /Writing from claims/);
  assert.equal(scaffold.json.export.json.sections.length, scaffold.json.item.sections.length);
  assert.equal(scaffold.json.export.json.preflight.status, "needs_attention");

  const fetchedScaffold = await getJson(baseUrl, `/api/v1/draft-scaffolds/${encodeURIComponent(scaffold.json.item.id)}`);
  assert.equal(fetchedScaffold.status, 200, JSON.stringify(fetchedScaffold.json));
  assert.equal(fetchedScaffold.json.item.id, scaffold.json.item.id);
  assert.equal(fetchedScaffold.json.item.preflight.status, "needs_attention");
  assert.match(fetchedScaffold.json.export.markdown, /段落-证据对照表/);
  assert.match(fetchedScaffold.json.export.markdown, /反方与边界:/);

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
  assert.deepEqual(listedProjects.json.items[0].basket_note_ids, [noteA.json.item.id, noteB.json.item.id]);
  assert.equal(listedProjects.json.items[0].basket_notes.length, 2);
  assert.equal(listedProjects.json.items[0].basket_notes[0].title, "Writing from claims");
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

  const syncedProject = await syncWritingProject(vaultPath, project.json.item.id, {
    title: "Updated writing mainline",
    goal: "Updated book goal",
    audience: "Senior editors"
  });
  assert.equal(syncedProject.book_structure.mainline, "Updated book goal");
  assert.equal(syncedProject.book_structure.reader, "Senior editors");
  assert.equal(syncedProject.book_structure.parts.length, 3);
  assert.equal(syncedProject.book_structure.direction_ideas[0].id, "idea_judgment_training");
});

test("core writing flow keeps working when status guidance is ignored", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-writing-regression-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const noteA = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Rough claim\n\nCore flow should accept an unfinished permanent note."
  });
  assert.equal(noteA.status, 201, JSON.stringify(noteA.json));
  assert.equal(noteA.json.item.noteType, "permanent");
  assert.equal(noteA.json.item.distillationStatus, "missing");
  assert.equal(noteA.json.item.authorship.user_confirmed, false);
  assert.equal(noteA.json.item.thinkingStatus.status, "needs_thesis");

  const noteB = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Supporting example\n\nThe scaffold can still point back to draft-quality material."
  });
  assert.equal(noteB.status, 201, JSON.stringify(noteB.json));
  assert.equal(noteB.json.item.thinkingStatus.status, "needs_thesis");

  const index = await postJson(baseUrl, "/api/v1/index-cards", {
    directoryId: "dir_original_default",
    indexType: "topic",
    title: "Unfinished source material",
    noteIds: [noteA.json.item.id, noteB.json.item.id]
  });
  assert.equal(index.status, 201, JSON.stringify(index.json));
  assert.deepEqual(index.json.item.item_note_ids, [noteA.json.item.id, noteB.json.item.id]);
  assert.equal(index.json.item.thinkingStatus.status, "needs_central_question");

  const project = await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "Regression draft",
    goal: "Prove advisory status does not block the original writing path.",
    basketNoteIds: [noteA.json.item.id, noteB.json.item.id],
    relatedIndexIds: [index.json.item.id]
  });
  assert.equal(project.status, 201, JSON.stringify(project.json));
  assert.deepEqual(project.json.item.basket_note_ids, [noteA.json.item.id, noteB.json.item.id]);
  assert.deepEqual(project.json.item.related_index_ids, [index.json.item.id]);
  assert.equal(project.json.item.thinkingStatus.status, "needs_intent");
  assert.ok(project.json.item.preflight.checks.some((item) => item.code === "missing_central_question"));

  const scaffold = await postJson(baseUrl, "/api/v1/draft-scaffolds", {
    writingProjectId: project.json.item.id
  });
  assert.equal(scaffold.status, 201, JSON.stringify(scaffold.json));
  assert.equal(scaffold.json.item.writing_project_id, project.json.item.id);
  assert.equal(scaffold.json.item.writing_project.thinkingStatus.status, "needs_intent");
  assert.equal(scaffold.json.item.preflight.status, "needs_attention");
  assert.ok(scaffold.json.item.preflight.checks.some((check) => check.id === "writing_intent" && check.status === "warning"));
  assert.ok(scaffold.json.item.preflight.checks.some((check) => check.id === "distillation_quality" && check.status === "warning"));
  assert.match(scaffold.json.export.markdown, /# Regression draft/);
  assert.match(scaffold.json.export.markdown, /- 意图: 待补充/);
  assert.match(scaffold.json.export.markdown, /- 提醒 写作意图/);
  assert.match(scaffold.json.export.markdown, /- 提醒 提纯质量/);
  assert.match(scaffold.json.export.markdown, /补一张带中心问题的主题卡，或改用已经写出中心问题的主题/);
  assert.match(scaffold.json.export.markdown, /Rough claim/);
  assert.match(scaffold.json.export.markdown, /Supporting example/);

  const fetchedProject = await getJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}`);
  assert.equal(fetchedProject.status, 200, JSON.stringify(fetchedProject.json));
  assert.equal(fetchedProject.json.item.scaffold_id, scaffold.json.item.id);
  assert.equal(fetchedProject.json.item.thinkingStatus.status, "needs_intent");
});
