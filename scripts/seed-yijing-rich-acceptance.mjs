import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDirectory, listDirectories } from "../packages/domain/src/catalog-store.mjs";
import {
  createNoteInDirectory,
  createNoteRelation,
  getNoteById,
  updateNoteContent,
  updateNoteRelation
} from "../packages/domain/src/note-catalog-store.mjs";
import { SQLITE_DB_FILES } from "../packages/domain/src/sqlite-migrations.mjs";
import { initVault } from "../packages/domain/src/vault.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_FIXTURE_PATH = path.join(REPO_ROOT, "tests", "fixtures", "acceptance", "yijing-rich-acceptance.json");
const ORIGINAL_DIRECTORY_ID = "dir_yijing_rich_acceptance_original";
const ORIGINAL_FOLDER_NAME = "yijing-rich-acceptance";

function cleanText(input) {
  return String(input || "").trim();
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--vault") {
      options.vaultPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--fixture") {
      options.fixturePath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (!options.vaultPath) {
      options.vaultPath = arg;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/seed-yijing-rich-acceptance.mjs --vault <vault-path>",
    "",
    "Options:",
    "  --fixture <path>  Override the default acceptance fixture JSON."
  ].join("\n");
}

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    throw new Error("The Yijing acceptance seed requires node:sqlite (Node.js 22+).");
  }
}

function catalogDbPath(vaultPath) {
  return path.join(path.resolve(vaultPath), ".yansilu", SQLITE_DB_FILES.catalog);
}

function noteDirectoryId(noteType) {
  if (noteType === "fleeting") return "dir_fleeting_default";
  if (noteType === "literature") return "dir_literature_default";
  return ORIGINAL_DIRECTORY_ID;
}

function literatureBody(note) {
  return [
    `# ${note.title}`,
    "",
    "## 来源",
    note.source || "未标注来源",
    "",
    "## 位置",
    note.location || "未标注位置",
    "",
    "## 原文摘录",
    note.excerpt || "",
    "",
    "## 转述",
    note.paraphrase || "",
    "",
    "## 问题",
    ...(Array.isArray(note.questions) ? note.questions.map((question) => `- ${question}`) : []),
    "",
    "## 候选主题",
    ...(Array.isArray(note.candidateTopics) ? note.candidateTopics.map((topic) => `- ${topic}`) : []),
    "",
    "#易经 #文献笔记"
  ].join("\n");
}

function fleetingBody(note) {
  return [`# ${note.title}`, "", note.body || "", "", "#易经 #随笔"].join("\n");
}

function noteBody(note) {
  if (note.note_type === "literature") return literatureBody(note);
  if (note.note_type === "fleeting") return fleetingBody(note);
  return note.body || `# ${note.title}\n`;
}

async function getExistingNote(vaultPath, noteId) {
  try {
    return await getNoteById(vaultPath, noteId);
  } catch {
    return null;
  }
}

async function ensureOriginalDirectory(vaultPath) {
  const root = path.resolve(vaultPath);
  const directories = await listDirectories(root, { includeHidden: true });
  const existing = directories.find((item) => item.id === ORIGINAL_DIRECTORY_ID);
  if (existing) return existing;
  return createDirectory(root, {
    id: ORIGINAL_DIRECTORY_ID,
    title: "易经验收样例：原创笔记",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(root, "notes", "original", ORIGINAL_FOLDER_NAME),
    maxNotes: 200
  });
}

async function upsertNote(vaultPath, note, counters) {
  const noteType = note.note_type === "literature" ? "literature" : note.note_type === "fleeting" ? "fleeting" : "permanent";
  const directoryId = noteDirectoryId(noteType);
  const payload = {
    id: note.id,
    directoryId,
    title: note.title,
    body: noteBody(note),
    status: note.status || "draft"
  };
  if (noteType === "permanent") {
    payload.thesis = note.thesis || "";
    payload.threeLineSummary = note.threeLineSummary || note.three_line_summary || [];
    payload.distillationStatus = "draft";
    payload.originalityStatus = note.originality_status || "pass";
    payload.authorship = note.authorship || { user_confirmed: true, ai_assisted: false };
  }

  const existing = await getExistingNote(vaultPath, note.id);
  if (existing) {
    if (existing.noteType !== noteType) {
      throw new Error(`Existing note ${note.id} is ${existing.noteType}, expected ${noteType}.`);
    }
    counters.updatedNotes += 1;
    return updateNoteContent(vaultPath, note.id, payload);
  }

  counters.createdNotes += 1;
  return createNoteInDirectory(vaultPath, payload);
}

async function upsertRelation(vaultPath, relation, counters) {
  const relationType = String(relation.relationType || "same_topic").trim().toLowerCase() || "same_topic";

  const payload = {
    id: relation.id,
    toNoteId: relation.to,
    relationType,
    rationale: relation.rationale || "",
    insightQuestion: relation.insightQuestion,
    confidence: relation.confidence ?? 1,
    status: relation.status || "confirmed",
    createdBy: relation.createdBy || "user"
  };
  const item = await createNoteRelation(vaultPath, relation.from, payload);
  if (item?.created === false) {
    counters.updatedRelations += 1;
    return updateNoteRelation(vaultPath, item.id, payload);
  }
  counters.createdRelations += 1;
  return item;
}

function normalizeIndexType(input) {
  const value = cleanText(input);
  if (value === "neighborhood") return "nearby";
  if (value === "freeform") return "free_link";
  return value || "topic";
}

function indexSummary(card) {
  return cleanText(card.description) || cleanText(card.centralQuestion) || `${card.title}包含 ${card.noteIds?.length || 0} 条易经原创笔记。`;
}

function indexThreeLineSummary(card) {
  return [
    `${card.title}不是标签，而是围绕中心问题组织的判断入口。`,
    `${card.noteIds?.length || 0} 条原创笔记共同回答：${card.centralQuestion}`,
    "它可以直接进入写作篮、图谱筛选和段落骨架。"
  ];
}

async function upsertIndexCards(vaultPath, fixture, counters) {
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  const now = new Date().toISOString();
  try {
    db.exec("BEGIN IMMEDIATE;");
    try {
      for (const card of fixture.index_cards || []) {
        const exists = db.prepare("SELECT id FROM index_cards WHERE id = ? LIMIT 1").get(card.id);
        const orderingStrategy = normalizeIndexType(card.type) === "sequence" ? "logical" : "clustered";
        db.prepare(
          `INSERT INTO index_cards
            (id, directory_id, index_type, title, summary, thesis, three_line_summary_json, central_question,
             ordering_strategy, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             directory_id = excluded.directory_id,
             index_type = excluded.index_type,
             title = excluded.title,
             summary = excluded.summary,
             thesis = excluded.thesis,
             three_line_summary_json = excluded.three_line_summary_json,
             central_question = excluded.central_question,
             ordering_strategy = excluded.ordering_strategy,
             updated_at = excluded.updated_at`
        ).run(
          card.id,
          ORIGINAL_DIRECTORY_ID,
          normalizeIndexType(card.type),
          card.title,
          indexSummary(card),
          card.centralQuestion || "",
          JSON.stringify(indexThreeLineSummary(card)),
          card.centralQuestion || "",
          orderingStrategy,
          now,
          now
        );
        db.prepare("DELETE FROM index_items WHERE index_id = ?").run(card.id);
        (card.noteIds || []).forEach((noteId, index) => {
          db.prepare(
            `INSERT INTO index_items
              (id, index_id, note_id, short_label, rationale, order_no)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            `idxi_${card.id}_${index + 1}`.slice(0, 96),
            card.id,
            noteId,
            `YJ-${index + 1}`,
            `属于“${card.title}”索引，用于回答：${card.centralQuestion}`,
            index + 1
          );
        });
        if (exists) counters.updatedIndexCards += 1;
        else counters.createdIndexCards += 1;
      }
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }
  } finally {
    db.close();
  }
}

function scaffoldIdForProject(projectId) {
  return `ds_${projectId}`.slice(0, 96);
}

function scaffoldSections(project) {
  return (project.outline || []).map((section, index) => ({
    section_id: section.sectionId,
    heading: section.heading,
    purpose: section.summary,
    evidence_note_ids: section.noteTraceIds || [],
    source_trace_ids: section.literatureTraceIds || [],
    noteTraceIds: section.noteTraceIds || [],
    literatureTraceIds: section.literatureTraceIds || [],
    gaps: ["验收时检查本段是否能继续补充例证、反对意见或过渡句。"],
    counterpoints: ["验收时检查本段是否保留了判断边界，而不是直接代写成完成稿。"],
    open_questions: [`这段如何服务写作目标：${project.goal}`],
    order: index + 1
  }));
}

function scaffoldMarkdown(project, sections) {
  const lines = [
    `# ${project.title}`,
    "",
    "## 写作意图",
    `- 写作目标：${project.goal}`,
    `- 目标读者：${project.audience}`,
    `- 写作意图：${project.intent}`,
    `- 读者带走的判断：${project.desiredReaderTakeaway}`,
    "",
    "## 段落骨架"
  ];
  for (const section of sections) {
    lines.push(
      "",
      `### ${section.order}. ${section.heading}`,
      "",
      section.purpose,
      "",
      "追溯原创笔记：",
      ...section.evidence_note_ids.map((noteId) => `- ${noteId}`),
      "",
      "追溯文献笔记：",
      ...section.source_trace_ids.map((noteId) => `- ${noteId}`)
    );
  }
  lines.push("", "## 验收提示", "", "这是一份写作方案和脚手架，不是完成稿。每个段落都必须保留可追溯的笔记与文献来源。");
  return `${lines.join("\n")}\n`;
}

async function upsertWritingProjects(vaultPath, fixture, counters) {
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  const now = new Date().toISOString();
  try {
    db.exec("BEGIN IMMEDIATE;");
    try {
      for (const project of fixture.writing_projects || []) {
        const existingProject = db.prepare("SELECT id FROM writing_projects WHERE id = ? LIMIT 1").get(project.id);
        const scaffoldId = scaffoldIdForProject(project.id);
        db.prepare(
          `INSERT INTO writing_projects
            (id, title, goal, audience, tone, intent, desired_reader_takeaway, related_index_ids_json,
             status, scaffold_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             goal = excluded.goal,
             audience = excluded.audience,
             tone = excluded.tone,
             intent = excluded.intent,
             desired_reader_takeaway = excluded.desired_reader_takeaway,
             related_index_ids_json = excluded.related_index_ids_json,
             status = excluded.status,
             scaffold_id = excluded.scaffold_id,
             updated_at = excluded.updated_at`
        ).run(
          project.id,
          project.title,
          project.goal,
          project.audience,
          "清晰、克制、可追溯",
          project.intent,
          project.desiredReaderTakeaway,
          JSON.stringify(project.indexCardIds || []),
          project.status || "draft",
          scaffoldId,
          now,
          now
        );
        db.prepare("DELETE FROM writing_basket_items WHERE project_id = ?").run(project.id);
        (project.basketNoteIds || []).forEach((noteId, index) => {
          db.prepare(
            `INSERT INTO writing_basket_items
              (id, project_id, note_id, order_no)
             VALUES (?, ?, ?, ?)`
          ).run(`wbi_${project.id}_${index + 1}`.slice(0, 96), project.id, noteId, index + 1);
        });

        const sections = scaffoldSections(project);
        const existingScaffold = db.prepare("SELECT id FROM draft_scaffolds WHERE id = ? LIMIT 1").get(scaffoldId);
        db.prepare(
          `INSERT INTO draft_scaffolds
            (id, writing_project_id, sections_json, open_questions_json, generated_by, version_note, markdown, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             writing_project_id = excluded.writing_project_id,
             sections_json = excluded.sections_json,
             open_questions_json = excluded.open_questions_json,
             generated_by = excluded.generated_by,
             version_note = excluded.version_note,
             markdown = excluded.markdown,
             updated_at = excluded.updated_at`
        ).run(
          scaffoldId,
          project.id,
          JSON.stringify(sections),
          JSON.stringify(["每个段落的原创笔记是否足够支撑判断？", "反对意见是否已经进入图谱和段落骨架？"]),
          "acceptance-fixture:yijing-rich-v1",
          "易经验收样例预置写作方案",
          scaffoldMarkdown(project, sections),
          now,
          now
        );
        if (existingProject) counters.updatedWritingProjects += 1;
        else counters.createdWritingProjects += 1;
        if (existingScaffold) counters.updatedDraftScaffolds += 1;
        else counters.createdDraftScaffolds += 1;
      }
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }
  } finally {
    db.close();
  }
}

export async function seedYijingRichAcceptance(vaultPath, options = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const root = path.resolve(vaultPath);
  const fixturePath = path.resolve(options.fixturePath || DEFAULT_FIXTURE_PATH);
  const fixture = JSON.parse(await fs.readFile(fixturePath, "utf8"));
  await initVault(root);
  await ensureOriginalDirectory(root);

  const counters = {
    createdNotes: 0,
    updatedNotes: 0,
    createdRelations: 0,
    updatedRelations: 0,
    createdIndexCards: 0,
    updatedIndexCards: 0,
    createdWritingProjects: 0,
    updatedWritingProjects: 0,
    createdDraftScaffolds: 0,
    updatedDraftScaffolds: 0
  };

  for (const note of fixture.fleeting_notes || []) await upsertNote(root, note, counters);
  for (const note of fixture.literature_notes || []) await upsertNote(root, note, counters);
  for (const note of fixture.original_notes || []) await upsertNote(root, note, counters);
  for (const relation of fixture.relations || []) await upsertRelation(root, relation, counters);
  await upsertIndexCards(root, fixture, counters);
  await upsertWritingProjects(root, fixture, counters);

  return {
    kind: "yijing_rich_acceptance_seed",
    demoOnly: true,
    sourceKind: "bundled_fixture",
    importLifecycle: "none",
    importRecordId: null,
    fixtureId: fixture.id,
    vaultPath: root,
    directoryId: ORIGINAL_DIRECTORY_ID,
    fixturePath,
    counts: fixture.counts,
    summary: counters,
    firstNoteId: fixture.original_notes?.[0]?.id || ""
  };
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(usage());
    return;
  }
  if (!options.vaultPath) {
    throw new Error(`Missing --vault.\n${usage()}`);
  }
  const result = await seedYijingRichAcceptance(options.vaultPath, { fixturePath: options.fixturePath });
  console.log(JSON.stringify(result, null, 2));
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
