import path from "node:path";
import { randomUUID } from "node:crypto";
import { SQLITE_DB_FILES } from "./sqlite-migrations.mjs";
import { deriveIndexCardThinkingStatus } from "./thinking-status.mjs";

const ALLOWED_INDEX_TYPES = new Set(["topic", "nearby", "sequence", "free_link"]);
const ALLOWED_ORDERING_STRATEGIES = new Set(["manual", "chronological", "logical", "clustered"]);

function catalogDbPath(vaultPath) {
  return path.join(path.resolve(vaultPath), ".yansilu", SQLITE_DB_FILES.catalog);
}

async function loadDatabaseSync() {
  try {
    const mod = await import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    throw new Error("Index card store requires node:sqlite (Node.js 22+).");
  }
}

function cleanText(input) {
  return String(input || "").trim();
}

function normalizeIndexType(input) {
  const raw = cleanText(input) || "topic";
  const value = raw === "logic_chain" ? "sequence" : raw;
  if (!ALLOWED_INDEX_TYPES.has(value)) throw new Error(`indexType invalid: ${value}`);
  return value;
}

function normalizeOrderingStrategy(input) {
  const value = cleanText(input) || "manual";
  if (!ALLOWED_ORDERING_STRATEGIES.has(value)) throw new Error(`orderingStrategy invalid: ${value}`);
  return value;
}

function normalizeBoolean(input, fallback = false) {
  if (typeof input === "boolean") return input;
  const value = cleanText(input).toLowerCase();
  if (!value) return fallback;
  return value !== "false" && value !== "0" && value !== "no";
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : []).map((item) => cleanText(item)).filter(Boolean))];
}

function normalizeThreeLineSummary(input) {
  if (!Array.isArray(input)) return [];
  const lines = input.map((item) => cleanText(item)).filter(Boolean);
  if (!lines.length) return [];
  if (lines.length !== 3) throw new Error("three_line_summary must contain exactly 3 items");
  return lines;
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeIndexItems(inputItems = [], fallbackNoteIds = []) {
  const explicitItems = Array.isArray(inputItems) ? inputItems : [];
  if (explicitItems.length) {
    const seen = new Set();
    return explicitItems
      .map((item, index) => {
        const noteId = cleanText(item?.noteId || item?.note_id);
        if (!noteId || seen.has(noteId)) return null;
        seen.add(noteId);
        const orderValue = Number(item?.order);
        return {
          note_id: noteId,
          short_label: cleanText(item?.shortLabel || item?.short_label),
          rationale: cleanText(item?.rationale),
          order: Number.isFinite(orderValue) && orderValue > 0 ? Math.floor(orderValue) : index + 1
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);
  }

  return uniqueStrings(fallbackNoteIds).map((noteId, index) => ({
    note_id: noteId,
    short_label: "",
    rationale: "",
    order: index + 1
  }));
}

function mapIndexItemRow(row) {
  return {
    note_id: row.note_id,
    short_label: row.short_label || "",
    rationale: row.rationale || "",
    order: Number(row.order_no || 0),
    note: row.note_title
      ? {
          id: row.note_id,
          title: row.note_title,
          noteType: row.note_type,
          status: row.note_status
        }
      : null
  };
}

function mapIndexCardRow(row, items = []) {
  const item = {
    id: row.id,
    directory_id: row.directory_id,
    directory_title: row.directory_title || "",
    index_type: row.index_type,
    title: row.title,
    summary: row.summary || "",
    thesis: row.thesis || "",
    three_line_summary: normalizeThreeLineSummary(parseJsonArray(row.three_line_summary_json)),
    central_question: row.central_question || "",
    ordering_strategy: row.ordering_strategy || "manual",
    note_count: Number(row.note_count ?? items.length),
    item_note_ids: items.map((item) => item.note_id),
    items,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
  return {
    ...item,
    thinkingStatus: deriveIndexCardThinkingStatus(item)
  };
}

function loadIndexItems(db, indexId) {
  const rows = db
    .prepare(
      `SELECT ii.note_id, ii.short_label, ii.rationale, ii.order_no,
              n.title AS note_title, n.note_type, n.status AS note_status
       FROM index_items ii
       LEFT JOIN notes n ON n.id = ii.note_id AND n.deleted_at IS NULL
       WHERE ii.index_id = ?
       ORDER BY ii.order_no ASC, ii.id ASC`
    )
    .all(indexId);
  return rows.map(mapIndexItemRow);
}

function loadIndexCardById(db, indexId) {
  const row = db
    .prepare(
      `SELECT ic.*, d.title AS directory_title,
              COUNT(ii.id) AS note_count
       FROM index_cards ic
       LEFT JOIN directories d ON d.id = ic.directory_id
       LEFT JOIN index_items ii ON ii.index_id = ic.id
       WHERE ic.id = ?
       GROUP BY ic.id, d.title
       LIMIT 1`
    )
    .get(indexId);
  if (!row) return null;
  const items = loadIndexItems(db, row.id);
  return mapIndexCardRow(row, items);
}

function validateIndexCardDirectory(db, directoryId) {
  const row = db
    .prepare(
      `SELECT id, title, directory_type
       FROM directories
       WHERE id = ?
       LIMIT 1`
    )
    .get(directoryId);
  if (!row) throw new Error(`directoryId not found: ${directoryId}`);
  return row;
}

function loadNoteValidationRows(db, noteIds = []) {
  if (!noteIds.length) return [];
  const placeholders = noteIds.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT n.id, n.note_type, n.title, n.status, ndm.directory_id, d.directory_type
       FROM notes n
       LEFT JOIN note_directory_membership ndm ON ndm.note_id = n.id
       LEFT JOIN directories d ON d.id = ndm.directory_id
       WHERE n.id IN (${placeholders}) AND n.deleted_at IS NULL`
    )
    .all(...noteIds);
}

function validateIndexItems(db, items = []) {
  if (!items.length) throw new Error("index card items are required");
  const noteIds = items.map((item) => item.note_id);
  const rows = loadNoteValidationRows(db, noteIds);
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const item of items) {
    const row = byId.get(item.note_id);
    if (!row) throw new Error(`index item note not found: ${item.note_id}`);
    if (row.note_type !== "permanent") {
      throw new Error(`index cards only accept permanent notes: ${item.note_id}`);
    }
  }
}

export async function createIndexCard(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const directoryId = cleanText(input.directoryId || input.directory_id);
  if (!directoryId) throw new Error("directoryId is required");
  const title = cleanText(input.title);
  if (!title) throw new Error("title is required");
  const indexType = normalizeIndexType(input.indexType || input.index_type);
  const orderingStrategy = normalizeOrderingStrategy(input.orderingStrategy || input.ordering_strategy);
  const summary = cleanText(input.summary);
  const thesis = cleanText(input.thesis);
  const threeLineSummary = normalizeThreeLineSummary(input.threeLineSummary || input.three_line_summary);
  const centralQuestion = cleanText(input.centralQuestion || input.central_question);
  const items = normalizeIndexItems(input.items, input.noteIds || input.note_ids);
  const now = new Date().toISOString();
  const id = cleanText(input.id) || `idx_${randomUUID().slice(0, 8)}`;

  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    validateIndexCardDirectory(db, directoryId);
    validateIndexItems(db, items);

    db.exec("BEGIN IMMEDIATE;");
    try {
      db.prepare(
        `INSERT INTO index_cards
          (id, directory_id, index_type, title, summary, thesis, three_line_summary_json, central_question, ordering_strategy, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, directoryId, indexType, title, summary, thesis, JSON.stringify(threeLineSummary), centralQuestion, orderingStrategy, now, now);

      for (const item of items) {
        db.prepare(
          `INSERT INTO index_items
            (id, index_id, note_id, short_label, rationale, order_no)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(`idxi_${randomUUID().slice(0, 8)}`, id, item.note_id, item.short_label, item.rationale, item.order);
      }
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }

    return loadIndexCardById(db, id);
  } finally {
    db.close();
  }
}

export async function getIndexCard(vaultPath, indexCardId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = cleanText(indexCardId);
  if (!id) throw new Error("indexCardId is required");
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const card = loadIndexCardById(db, id);
    if (!card) throw new Error(`indexCardId not found: ${id}`);
    return card;
  } finally {
    db.close();
  }
}

export async function updateIndexCard(vaultPath, indexCardId, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = cleanText(indexCardId);
  if (!id) throw new Error("indexCardId is required");
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const existing = loadIndexCardById(db, id);
    if (!existing) throw new Error(`indexCardId not found: ${id}`);

    const title = input.title === undefined ? existing.title : cleanText(input.title);
    if (!title) throw new Error("title is required");
    const summary = input.summary === undefined ? existing.summary : cleanText(input.summary);
    const thesis = input.thesis === undefined ? existing.thesis : cleanText(input.thesis);
    const centralQuestion = input.centralQuestion === undefined && input.central_question === undefined
      ? existing.central_question
      : cleanText(input.centralQuestion || input.central_question);
    const orderingStrategy = input.orderingStrategy === undefined && input.ordering_strategy === undefined
      ? existing.ordering_strategy
      : normalizeOrderingStrategy(input.orderingStrategy || input.ordering_strategy);
    const threeLineSummary = input.threeLineSummary === undefined && input.three_line_summary === undefined
      ? normalizeThreeLineSummary(existing.three_line_summary)
      : normalizeThreeLineSummary(input.threeLineSummary || input.three_line_summary);
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE index_cards
       SET title = ?, summary = ?, thesis = ?, three_line_summary_json = ?, central_question = ?, ordering_strategy = ?, updated_at = ?
       WHERE id = ?`
    ).run(title, summary, thesis, JSON.stringify(threeLineSummary), centralQuestion, orderingStrategy, now, id);

    return loadIndexCardById(db, id);
  } finally {
    db.close();
  }
}

function isGenericDistillationText(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return true;
  return ["new theme index", "writing themes", "topic index", "theme index", "topic", "index"].includes(text);
}

function noteTitleList(indexCard) {
  return (Array.isArray(indexCard?.items) ? indexCard.items : [])
    .map((item) => cleanText(item?.note?.title || item?.short_label || item?.note_id))
    .filter(Boolean);
}

function compactPreview(titles = [], limit = 3) {
  const preview = titles.slice(0, limit).join(", ");
  return titles.length > limit ? `${preview}, and related notes` : preview;
}

export async function distillIndexCard(vaultPath, indexCardId) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const id = cleanText(indexCardId);
  if (!id) throw new Error("indexCardId is required");

  const indexCard = await getIndexCard(vaultPath, id);
  const titles = noteTitleList(indexCard);
  const topicLabel = cleanText(indexCard.title) || "This topic";
  const notePreview = compactPreview(titles);
  const summarySeed = cleanText(indexCard.summary);

  const thesis = summarySeed
    ? `${topicLabel} is really about turning ${summarySeed} into a reusable judgment for later writing.`
    : `${topicLabel} is really about turning ${notePreview || "a cluster of permanent notes"} into a reusable judgment before drafting begins.`;

  const centralQuestion = summarySeed
    ? `What judgment ties ${topicLabel} together beyond collecting material about ${summarySeed}?`
    : `What judgment ties ${topicLabel} together beyond collecting related notes?`;

  const threeLineSummary = [
    `${topicLabel} is not just a storage bucket for notes like ${notePreview || "these permanent notes"}.`,
    "Its value comes from compressing multiple mature notes into one clearer theme-level judgment.",
    `The next step is to answer this question clearly: ${centralQuestion}`
  ];

  const qualityChecks = [];
  if (thesis.length > 180) qualityChecks.push("too_long");
  if (titles.length < 2) qualityChecks.push("missing_scope");
  if (isGenericDistillationText(indexCard.title)) qualityChecks.push("too_generic");
  if (!summarySeed) qualityChecks.push("needs_user_judgment");
  if (!qualityChecks.length) qualityChecks.push("clear");

  return {
    index_id: indexCard.id,
    thesis,
    three_line_summary: threeLineSummary,
    central_question: centralQuestion,
    quality_checks: qualityChecks,
    rationale: `Generated from the current index title, summary, and ${titles.length || 0} linked permanent notes. User confirmation is still required.`,
    needs_user_confirmation: true
  };
}

export async function listIndexCards(vaultPath, input = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const directoryId = cleanText(input.directoryId || input.directory_id);
  const indexType = cleanText(input.indexType || input.index_type);
  const includeDescendants = normalizeBoolean(input.includeDescendants ?? input.include_descendants, true);
  const limit = Math.max(1, Math.min(50, Number(input.limit || 12) || 12));
  const DatabaseSync = await loadDatabaseSync();
  const db = new DatabaseSync(catalogDbPath(vaultPath));
  try {
    const filters = [];
    const params = [];
    let prefix = "";

    if (directoryId && includeDescendants) {
      prefix = `WITH RECURSIVE directory_scope(id) AS (
                  SELECT id FROM directories WHERE id = ?
                  UNION ALL
                  SELECT d.id
                  FROM directories d
                  JOIN directory_scope scope ON d.parent_directory_id = scope.id
                )`;
      filters.push("ic.directory_id IN (SELECT id FROM directory_scope)");
      params.push(directoryId);
    } else if (directoryId) {
      filters.push("ic.directory_id = ?");
      params.push(directoryId);
    }

    if (indexType) {
      filters.push("ic.index_type = ?");
      params.push(normalizeIndexType(indexType));
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const rows = db
      .prepare(
        `${prefix}
         SELECT ic.*, d.title AS directory_title, COUNT(ii.id) AS note_count
         FROM index_cards ic
         LEFT JOIN directories d ON d.id = ic.directory_id
         LEFT JOIN index_items ii ON ii.index_id = ic.id
         ${whereClause}
         GROUP BY ic.id, d.title
         ORDER BY datetime(ic.updated_at) DESC, ic.title ASC
         LIMIT ?`
      )
      .all(...params, limit);
    return rows.map((row) => mapIndexCardRow(row, loadIndexItems(db, row.id)));
  } finally {
    db.close();
  }
}
