import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import {
  createDirectory,
  listDirectories,
  createNoteInDirectory,
  createNoteRelation,
  getNoteById,
  updateNoteContent,
  updateNoteRelation,
  createIndexCard,
  getIndexCard,
  updateIndexCard,
  initVault
} from "../packages/domain/src/index.mjs";
import { createDraftScaffold, createWritingProject, getDraftScaffold, getWritingProject } from "../packages/writing-engine/src/index.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_FIXTURE_PATH = path.join(REPO_ROOT, "tests", "fixtures", "demo-smart-notes-product-thinking", "demo.json");

const ORIGINAL_DIRECTORY_ID = "dir_demo_smart_notes_product_thinking_original";
const ORIGINAL_FOLDER_NAME = "demo-smart-notes-product-thinking";

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
    "  node scripts/seed-smart-notes-product-thinking.mjs --vault <vault-path>",
    "",
    "Options:",
    "  --fixture <path>  Override the default demo fixture JSON."
  ].join("\n");
}

function fixtureNoteType(note) {
  const kind = cleanText(note?.note_type || note?.noteType).toLowerCase();
  if (kind === "fleeting") return "fleeting";
  if (kind === "literature") return "literature";
  return "permanent";
}

function directoryIdForFixtureType(fixtureType) {
  if (fixtureType === "fleeting") return "dir_fleeting_default";
  if (fixtureType === "literature") return "dir_literature_default";
  return ORIGINAL_DIRECTORY_ID;
}

function noteBodyFromFixture(note, fixtureType) {
  const title = cleanText(note?.title) || cleanText(note?.id) || "Untitled";
  const tags = Array.isArray(note?.tags) ? note.tags.filter(Boolean).map((t) => String(t).trim()).filter(Boolean) : [];
  const tagLine = tags.length ? `\n\n${tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}` : "";

  if (fixtureType === "literature") {
    const sourceId = cleanText(note?.source_id || note?.sourceId);
    const location = cleanText(note?.location);
    const paraphrase = cleanText(note?.paraphrase || note?.paraphrase_text);
    const takeaway = cleanText(note?.my_takeaway || note?.takeaway);
    const excerpt = cleanText(note?.excerpt);
    const questions = Array.isArray(note?.questions) ? note.questions.filter(Boolean) : [];
    return [
      `# ${title}`,
      "",
      "## 来源",
      sourceId || "未标注",
      "",
      "## 位置",
      location || "未标注",
      "",
      "## 转述",
      paraphrase || "",
      "",
      ...(excerpt
        ? ["## 摘录", excerpt, ""]
        : []),
      ...(takeaway
        ? ["## 我的收获", takeaway, ""]
        : []),
      "## 问题",
      ...(questions.length ? questions.map((q) => `- ${q}`) : ["- (none)"]),
      ""
    ].join("\n") + tagLine;
  }

  if (fixtureType === "fleeting") {
    return [`# ${title}`, "", cleanText(note?.body), ""].join("\n") + tagLine;
  }

  const thesis = cleanText(note?.thesis);
  const summary = Array.isArray(note?.threeLineSummary || note?.three_line_summary)
    ? (note.threeLineSummary || note.three_line_summary).filter(Boolean)
    : [];
  const boundary = cleanText(note?.boundaryOrCounterpoint || note?.boundary_or_counterpoint);
  const body = cleanText(note?.body);
  const lines = [`# ${title}`, ""];
  if (thesis) lines.push("## 论点", thesis, "");
  if (summary.length) lines.push("## 三行摘要", ...summary.map((s) => `- ${s}`), "");
  if (boundary) lines.push("## 边界/反例", boundary, "");
  if (body) lines.push(body, "");
  return lines.join("\n") + tagLine;
}

function normalizeRelationType(input) {
  const raw = cleanText(input).toLowerCase();
  if (!raw) return "related";
  const map = {
    refines: "qualifies",
    leads_to: "follows",
    tension: "contrasts",
    gap: "asks",
    evidence_for: "supports",
    depends_on: "precedes",
    extends: "extends",
    contrasts: "contrasts",
    duplicates_or_overlaps: "duplicates",
    example_of: "example_of",
    counterexample_to: "counterexample_to",
    source_gap: "asks",
    writing_move: "appears_in_draft"
  };
  return map[raw] || raw;
}

function normalizeIndexType(input) {
  const raw = cleanText(input).toLowerCase();
  if (!raw) return "topic";
  const map = {
    theme: "topic",
    theme_index: "topic",
    topic: "topic",
    topic_index: "topic",
    nearby: "nearby",
    sequence: "sequence",
    logic_chain: "sequence",
    free_link: "free_link"
  };
  return map[raw] || "topic";
}

function normalizeOrderingStrategy(input) {
  const raw = cleanText(input).toLowerCase();
  if (!raw) return "manual";
  const map = {
    manual: "manual",
    chronological: "chronological",
    logical: "logical",
    clustered: "clustered",
    time: "chronological"
  };
  return map[raw] || "manual";
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
    title: "写作 Demo（卡片笔记写作法 x 产品思考）",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(root, "notes", "original", ORIGINAL_FOLDER_NAME),
    maxNotes: 260
  });
}

async function upsertNote(vaultPath, note, counters) {
  const fixtureType = fixtureNoteType(note);
  const directoryId = directoryIdForFixtureType(fixtureType);
  const payload = {
    id: cleanText(note?.id) || `note_${randomUUID().slice(0, 8)}`,
    directoryId,
    title: cleanText(note?.title) || cleanText(note?.id) || "Untitled",
    body: noteBodyFromFixture(note, fixtureType),
    status: cleanText(note?.status) || "draft"
  };

  if (fixtureType === "permanent") {
    payload.thesis = cleanText(note?.thesis);
    payload.threeLineSummary = note?.threeLineSummary || note?.three_line_summary || [];
    payload.distillationStatus = "draft";
    payload.originalityStatus = cleanText(note?.originality_status || note?.originalityStatus) || "pass";
    payload.authorship = note?.authorship || { user_confirmed: true, ai_assisted: false };
    payload.boundaryOrCounterpoint = cleanText(note?.boundary_or_counterpoint || note?.boundaryOrCounterpoint);
  }

  const existing = await getExistingNote(vaultPath, payload.id);
  if (existing) {
    await updateNoteContent(vaultPath, payload.id, payload);
    counters.updatedNotes += 1;
    return payload.id;
  }
  await createNoteInDirectory(vaultPath, payload);
  counters.createdNotes += 1;
  return payload.id;
}

async function upsertRelation(vaultPath, relation, counters, noteIdSet) {
  const payload = {
    id: cleanText(relation?.id) || `rel_${randomUUID().slice(0, 8)}`,
    fromNoteId: cleanText(relation?.from),
    toNoteId: cleanText(relation?.to),
    relationType: normalizeRelationType(relation?.relationType || relation?.relation_type || "related"),
    status: cleanText(relation?.status || "confirmed"),
    rationale: cleanText(relation?.rationale || "")
  };
  if (!payload.fromNoteId || !payload.toNoteId) return null;
  if (noteIdSet && (!noteIdSet.has(payload.fromNoteId) || !noteIdSet.has(payload.toNoteId))) return null;

  const created = await createNoteRelation(vaultPath, payload.fromNoteId, payload);
  if (created?.created) counters.createdRelations += 1;
  else counters.updatedRelations += 1;
  return created?.id || payload.id;
}

async function upsertIndexCard(vaultPath, card, counters) {
  const fallbackItemNoteIds = Array.isArray(card?.item_note_ids) ? card.item_note_ids : [];
  const fallbackNoteIds = Array.isArray(card?.itemNoteIds) ? card.itemNoteIds : fallbackItemNoteIds;
  const payload = {
    id: cleanText(card?.id) || `idx_${randomUUID().slice(0, 8)}`,
    directoryId: ORIGINAL_DIRECTORY_ID,
    title: cleanText(card?.title) || cleanText(card?.id) || "Untitled Index",
    indexType: normalizeIndexType(card?.indexType || card?.index_type || "theme_index"),
    orderingStrategy: normalizeOrderingStrategy(card?.orderingStrategy || card?.ordering_strategy || "manual"),
    summary: cleanText(card?.summary || ""),
    thesis: cleanText(card?.thesis || ""),
    threeLineSummary: card?.threeLineSummary || card?.three_line_summary || [],
    centralQuestion: cleanText(card?.centralQuestion || card?.central_question || ""),
    items: Array.isArray(card?.items) ? card.items : null,
    noteIds: Array.isArray(card?.noteIds || card?.note_ids)
      ? (card.noteIds || card.note_ids)
      : fallbackNoteIds.length
        ? fallbackNoteIds
        : null
  };

  try {
    await getIndexCard(vaultPath, payload.id);
    await updateIndexCard(vaultPath, payload.id, payload);
    counters.updatedIndexCards += 1;
    return payload.id;
  } catch {
    await createIndexCard(vaultPath, payload);
    counters.createdIndexCards += 1;
    return payload.id;
  }
}

async function upsertWritingProjectAndScaffold(vaultPath, fixture, counters) {
  const projects = Array.isArray(fixture?.writing_projects) ? fixture.writing_projects : [];
  if (!projects.length) return [];

  const results = [];
  for (const project of projects) {
    const projectId = cleanText(project?.id);
    const title = cleanText(project?.title);
    const basketNoteIds = Array.isArray(project?.basketNoteIds) ? project.basketNoteIds : [];
    const relatedIndexIds = Array.isArray(project?.indexCardIds) ? project.indexCardIds : [];

    let writingProject = null;
    try {
      writingProject = await getWritingProject(vaultPath, projectId);
      counters.updatedWritingProjects += 1;
    } catch {
      writingProject = await createWritingProject(vaultPath, {
        id: projectId,
        title,
        intent: cleanText(project?.intent),
        audience: cleanText(project?.target_reader || project?.targetReader),
        desiredReaderTakeaway: cleanText(project?.desired_reader_takeaway || project?.desiredReaderTakeaway),
        basketNoteIds,
        relatedIndexIds,
        status: "draft"
      });
      counters.createdWritingProjects += 1;
    }

    const scaffoldFixture = Array.isArray(fixture?.draft_scaffolds)
      ? fixture.draft_scaffolds.find((item) => cleanText(item?.writing_project_id) === cleanText(writingProject?.id))
      : null;
    const scaffoldId = cleanText(scaffoldFixture?.id) || `ds_${cleanText(writingProject.id)}`;
    const versionNote = cleanText(scaffoldFixture?.version_note);

    try {
      await getDraftScaffold(vaultPath, scaffoldId);
      counters.updatedDraftScaffolds += 1;
    } catch {
      await createDraftScaffold(vaultPath, {
        id: scaffoldId,
        writingProjectId: writingProject.id,
        ...(versionNote ? { versionNote } : {})
      });
      counters.createdDraftScaffolds += 1;
    }

    results.push({ writingProjectId: writingProject.id, scaffoldId });
  }

  return results;
}

async function loadFixture(fixturePath) {
  const resolved = path.resolve(fixturePath || DEFAULT_FIXTURE_PATH);
  const raw = await fs.readFile(resolved, "utf8");
  const json = JSON.parse(raw);
  return { fixturePath: resolved, fixture: json };
}

export async function seedSmartNotesProductThinking(vaultPath, options = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  await initVault(vaultPath);
  await ensureOriginalDirectory(vaultPath);

  const { fixturePath, fixture } = await loadFixture(options.fixturePath);
  const counts = fixture?.counts && typeof fixture.counts === "object" ? fixture.counts : {};
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

  const noteIds = [];
  const batches = [
    ...(Array.isArray(fixture?.fleeting_notes) ? fixture.fleeting_notes : []),
    ...(Array.isArray(fixture?.literature_notes) ? fixture.literature_notes : []),
    ...(Array.isArray(fixture?.permanent_notes) ? fixture.permanent_notes : []),
    ...(Array.isArray(fixture?.final_essays) ? fixture.final_essays : [])
  ];
  for (const note of batches) noteIds.push(await upsertNote(vaultPath, note, counters));
  const noteIdSet = new Set(noteIds.filter(Boolean).map(String));

  if (Array.isArray(fixture?.relations)) {
    for (const relation of fixture.relations) await upsertRelation(vaultPath, relation, counters, noteIdSet);
  }

  if (Array.isArray(fixture?.index_cards)) {
    for (const card of fixture.index_cards) await upsertIndexCard(vaultPath, card, counters);
  }

  await upsertWritingProjectAndScaffold(vaultPath, fixture, counters);

  return {
    kind: "smart_notes_product_thinking_seed",
    demoOnly: true,
    sourceKind: "bundled_fixture",
    fixtureId: cleanText(fixture?.id) || "demo-smart-notes-product-thinking",
    fixturePath,
    directoryId: ORIGINAL_DIRECTORY_ID,
    firstNoteId: noteIds.find(Boolean) || null,
    counts: counts && typeof counts === "object" ? counts : {},
    summary: counters
  };
}

async function main() {
  const options = parseArgs();
  if (options.help || !options.vaultPath) {
    // eslint-disable-next-line no-console
    console.log(usage());
    process.exit(0);
  }
  const result = await seedSmartNotesProductThinking(options.vaultPath, { fixturePath: options.fixturePath });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}
