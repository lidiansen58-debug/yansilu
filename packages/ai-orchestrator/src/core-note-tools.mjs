import {
  getNoteById,
  listDirectories,
  listNoteRelations,
  listNotesByTag,
  listNotesInDirectory
} from "../../domain/src/index.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function normalizeLimit(value) {
  const limit = Number(value || 10);
  if (!Number.isFinite(limit)) return 10;
  return Math.max(1, Math.min(50, Math.floor(limit)));
}

function requireVaultPath(vaultPath) {
  const value = cleanText(vaultPath);
  if (!value) throw new Error("vaultPath is required");
  return value;
}

function noteTypeAllowed(note, filters = {}) {
  const allowed = toArray(filters.noteTypes || filters.note_types).map((item) => cleanText(item));
  return !allowed.length || allowed.includes(note.noteType || note.note_type);
}

function mapNoteForTool(note = {}) {
  return {
    noteId: note.id,
    title: note.title || "",
    noteType: note.noteType || note.note_type || "",
    status: note.status || "",
    body: note.body || "",
    markdown: note.markdown || "",
    directoryId: note.directoryId || null,
    privacyMode: note.privacyMode || "normal",
    origin: note.origin || "human_authored",
    updatedAt: note.updatedAt || note.updated_at || null
  };
}

function descendantDirectoryIds(directories = [], rootDirectoryId) {
  const rootId = cleanText(rootDirectoryId);
  if (!rootId) return [];

  const childrenByParent = new Map();
  for (const directory of directories) {
    const parentId = cleanText(directory.parentDirectoryId || directory.parent_directory_id);
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(directory.id);
  }

  const ids = new Set([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const currentId = queue.shift();
    for (const childId of childrenByParent.get(currentId) || []) {
      if (ids.has(childId)) continue;
      ids.add(childId);
      queue.push(childId);
    }
  }
  return [...ids];
}

function uniqueNotes(notes = []) {
  const byId = new Map();
  for (const note of notes) {
    if (!note?.id || byId.has(note.id)) continue;
    byId.set(note.id, note);
  }
  return [...byId.values()];
}

function snippetFromText(text, query) {
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const q = cleanText(query).toLowerCase();
  const index = q ? compact.toLowerCase().indexOf(q) : -1;
  const start = index > 40 ? index - 40 : 0;
  const slice = compact.slice(start, start + 180);
  return `${start > 0 ? "..." : ""}${slice}${start + 180 < compact.length ? "..." : ""}`;
}

function scoreSearchResult(note, query, fallbackReason) {
  const q = cleanText(query).toLowerCase();
  const title = String(note.title || "").toLowerCase();
  const body = String(note.body || "").toLowerCase();
  if (!q) return { score: fallbackReason === "tag" ? 0.82 : 0.45, matchedReason: fallbackReason || "recent" };
  if (title === q) return { score: 1, matchedReason: "title" };
  if (title.includes(q)) return { score: 0.9, matchedReason: "title" };
  if (body.includes(q)) return { score: 0.72, matchedReason: "body" };
  return null;
}

function mapSearchResult(note, query, fallbackReason) {
  const scored = scoreSearchResult(note, query, fallbackReason);
  if (!scored) return null;
  return {
    noteId: note.id,
    title: note.title || "",
    noteType: note.noteType || note.note_type || "",
    snippet: snippetFromText(note.body || note.markdown || "", query),
    score: scored.score,
    matchedReason: scored.matchedReason,
    privacyMode: note.privacyMode || "normal",
    updatedAt: note.updatedAt || note.updated_at || null,
    directoryId: note.directoryId || null
  };
}

async function collectSearchCandidates(root, input = {}) {
  const query = cleanText(input.query);
  const filters = input.filters || {};
  const queryTag = query.startsWith("#") ? query.slice(1) : "";
  const tagNames = [
    ...toArray(input.tag || input.tagName || input.tag_name),
    ...toArray(filters.tag || filters.tagName || filters.tag_name),
    ...toArray(filters.tagIds || filters.tag_ids),
    ...(queryTag ? [queryTag] : [])
  ]
    .map((tag) => cleanText(tag).replace(/^#/, ""))
    .filter(Boolean);

  const rootDirectoryId = cleanText(input.rootDirectoryId || input.root_directory_id || filters.rootDirectoryId || filters.root_directory_id);
  const directoryId = cleanText(input.directoryId || input.directory_id || filters.directoryId || filters.directory_id);

  if (tagNames.length) {
    const tagged = await Promise.all(
      [...new Set(tagNames)].map((tagName) => listNotesByTag(root, tagName, { rootDirectoryId }))
    );
    return {
      reason: "tag",
      query: queryTag ? "" : query,
      notes: uniqueNotes(tagged.flatMap((result) => result.items || []))
    };
  }

  if (directoryId) {
    return {
      reason: query ? "body" : "recent",
      query,
      notes: await listNotesInDirectory(root, directoryId)
    };
  }

  const directories = await listDirectories(root);
  const directoryIds = rootDirectoryId
    ? descendantDirectoryIds(directories, rootDirectoryId)
    : directories.map((directory) => directory.id).filter(Boolean);
  const listed = await Promise.all(directoryIds.map((id) => listNotesInDirectory(root, id)));
  return {
    reason: query ? "body" : "recent",
    query,
    notes: uniqueNotes(listed.flat())
  };
}

export function createCoreNoteTools({ vaultPath } = {}) {
  const root = requireVaultPath(vaultPath);
  return [
    {
      name: "search_notes",
      description: "Search notes by title, body text, tag, or directory scope.",
      permissionLevel: "read_note",
      dataBoundary: "local",
      async handler(input = {}) {
        const limit = normalizeLimit(input.limit);
        const filters = input.filters || {};
        const collected = await collectSearchCandidates(root, input);
        const candidates = collected.notes.filter((note) => noteTypeAllowed(note, filters)).slice(0, Math.max(limit * 6, limit));
        const hydrated = await Promise.all(candidates.map((note) => getNoteById(root, note.id)));
        const results = hydrated
          .map((note) => mapSearchResult(note, collected.query, collected.reason))
          .filter(Boolean)
          .sort((a, b) => b.score - a.score || String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
          .slice(0, limit);

        return {
          query: cleanText(input.query),
          mode: cleanText(input.mode) || "text",
          results,
          total: results.length
        };
      }
    },
    {
      name: "read_note",
      description: "Read a note by stable note id.",
      permissionLevel: "read_note",
      dataBoundary: "local",
      async handler(input = {}) {
        const noteId = cleanText(input.noteId || input.note_id);
        if (!noteId) {
          const error = new Error("noteId is required");
          error.code = "AI_TOOL_NOTE_ID_REQUIRED";
          throw error;
        }
        const note = await getNoteById(root, noteId);
        return mapNoteForTool(note);
      }
    },
    {
      name: "list_note_relations",
      description: "List tags, outgoing links, and backlinks for a note.",
      permissionLevel: "read_public",
      dataBoundary: "local",
      async handler(input = {}) {
        const noteId = cleanText(input.noteId || input.note_id);
        if (!noteId) {
          const error = new Error("noteId is required");
          error.code = "AI_TOOL_NOTE_ID_REQUIRED";
          throw error;
        }
        return listNoteRelations(root, noteId);
      }
    },
    {
      name: "list_notes_in_directory",
      description: "List note metadata in a directory.",
      permissionLevel: "read_public",
      dataBoundary: "local",
      async handler(input = {}) {
        const directoryId = cleanText(input.directoryId || input.directory_id);
        if (!directoryId) {
          const error = new Error("directoryId is required");
          error.code = "AI_TOOL_DIRECTORY_ID_REQUIRED";
          throw error;
        }
        return listNotesInDirectory(root, directoryId);
      }
    }
  ];
}
