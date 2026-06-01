import fs from "node:fs/promises";
import path from "node:path";
import { getNoteCatalogEntryById } from "./note-catalog-store.mjs";
import { parseMarkdownWithFrontmatter, serializeMarkdownWithFrontmatter } from "./frontmatter.mjs";
import { initVault, listMarkdownFiles, readMarkdown, resolveVaultPath, writeMarkdownIfAbsent } from "./vault.mjs";

const NOTE_TYPES = {
  source: {
    dir: path.join("notes", "sources"),
    prefix: "src",
    bodyField: "description"
  },
  literature: {
    dir: path.join("notes", "literature"),
    prefix: "ln",
    bodyField: "quote_text"
  },
  permanent: {
    dir: path.join("notes", "permanent"),
    prefix: "pn",
    bodyField: "core_claim"
  }
};

function assertKnownType(type) {
  if (!NOTE_TYPES[type]) throw new Error(`Unknown note type: ${type}`);
}

function normalizeFilename(id) {
  return String(id || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
}

function noteRelativePath(type, id) {
  assertKnownType(type);
  const filename = normalizeFilename(id);
  if (!filename) throw new Error("note.id is required");
  return path.join(NOTE_TYPES[type].dir, `${filename}.md`);
}

function noteFilename(id) {
  const filename = normalizeFilename(id);
  if (!filename) throw new Error("note.id is required");
  return `${filename}.md`;
}

function noteBody(type, note) {
  const field = NOTE_TYPES[type].bodyField;
  return String(note.body ?? note[field] ?? "");
}

function toSingleLineTitle(input) {
  return String(input ?? "")
    .replace(/^\s*#+\s*/, "")
    .replace(/\r?\n/g, " ")
    .trim();
}

function splitTitleAndBody(markdownBody) {
  const raw = String(markdownBody ?? "").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  if (!lines.length) return { title: "", body: "" };

  const firstLine = String(lines[0] ?? "").trim();
  const headingMatch = firstLine.match(/^#{1,6}\s+(.+)$/);
  const title = toSingleLineTitle(headingMatch ? headingMatch[1] : firstLine);
  const body = lines.slice(1).join("\n").replace(/^\n+/, "");
  return { title, body };
}

function renderBodyWithTitle(type, note) {
  const sourceBody = noteBody(type, note);
  const fromBody = splitTitleAndBody(sourceBody);
  const explicitTitle = toSingleLineTitle(note?.title);
  const title = explicitTitle || fromBody.title || toSingleLineTitle(note?.id) || "Untitled";
  const contentBody = explicitTitle ? sourceBody : fromBody.body;

  const lines = [`# ${title}`];
  if (String(contentBody).trim()) lines.push("", String(contentBody).replace(/^\n+/, ""));
  return { title, body: lines.join("\n") };
}

function noteFrontmatter(type, note) {
  const { body, markdown_body, ...rest } = note;
  const rendered = renderBodyWithTitle(type, note);
  return {
    ...rest,
    title: rendered.title,
    note_type: type
  };
}

export function getNotePath(vaultPath, type, id) {
  return resolveVaultPath(vaultPath, noteRelativePath(type, id));
}

function resolveNoteWritePath(vaultPath, type, id, options = {}) {
  const directoryFsPath = String(options.directoryFsPath || "").trim();
  if (directoryFsPath) {
    return path.join(path.resolve(directoryFsPath), noteFilename(id));
  }
  return getNotePath(vaultPath, type, id);
}

async function findMatchingNotePaths(rootDir, filename, matches = []) {
  let entries = [];
  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch {
    return matches;
  }

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isFile() && entry.name === filename) {
      matches.push(path.resolve(fullPath));
      continue;
    }
    if (entry.isDirectory()) {
      await findMatchingNotePaths(fullPath, filename, matches);
    }
  }
  return matches;
}

function notePathsFromIndex(notePathIndex, id) {
  if (!(notePathIndex instanceof Map)) return [];
  const filename = noteFilename(id);
  return Array.isArray(notePathIndex.get(filename)) ? [...notePathIndex.get(filename)] : [];
}

function catalogEntryFromOptions(options = {}, id) {
  const map = options.catalogEntriesById;
  if (!(map instanceof Map)) return null;
  return map.get(String(id || "").trim()) || null;
}

function isRecoverableCatalogLookupError(error) {
  const message = String(error?.message || "");
  return (
    message.startsWith("noteId not found:") ||
    message.includes("unable to open database file") ||
    message.includes("node:sqlite") ||
    message.includes("requires node:sqlite")
  );
}

async function catalogNotePath(vaultPath, type, id) {
  return catalogNotePathFromOptions(vaultPath, type, id, {});
}

async function catalogNotePathFromOptions(vaultPath, type, id, options = {}) {
  try {
    const note = catalogEntryFromOptions(options, id) || (await getNoteCatalogEntryById(vaultPath, id));
    const noteType = String(note?.noteType || "").trim();
    const markdownPath = String(note?.markdownPath || "").trim();
    if (noteType === type && markdownPath) {
      const fullPath = path.resolve(resolveVaultPath(vaultPath, markdownPath));
      await fs.access(fullPath);
      return fullPath;
    }
  } catch (error) {
    if (!isRecoverableCatalogLookupError(error)) throw error;
  }
  return "";
}

export async function buildNotePathIndex(vaultPath, type) {
  assertKnownType(type);
  const typeRoot = resolveVaultPath(vaultPath, NOTE_TYPES[type].dir);
  const files = await listMarkdownFiles(typeRoot);
  const index = new Map();
  for (const filePath of files) {
    const filename = path.basename(filePath);
    if (!index.has(filename)) index.set(filename, []);
    index.get(filename).push(path.resolve(filePath));
  }
  for (const [filename, paths] of index.entries()) {
    index.set(filename, [...new Set(paths)].sort((a, b) => a.localeCompare(b)));
  }
  return index;
}

function rememberNotePath(notePathIndex, id, filePath) {
  if (!(notePathIndex instanceof Map)) return;
  const filename = noteFilename(id);
  const nextPaths = [...new Set([...(notePathIndex.get(filename) || []), path.resolve(filePath)])].sort((a, b) => a.localeCompare(b));
  notePathIndex.set(filename, nextPaths);
}

async function resolveKnownNotePaths(vaultPath, type, id, options = {}) {
  const discovered = notePathsFromIndex(options.notePathIndex, id);
  if (!(options.notePathIndex instanceof Map) && discovered.length === 0) {
    const filename = noteFilename(id);
    const typeRoot = resolveVaultPath(vaultPath, NOTE_TYPES[type].dir);
    discovered.push(...(await findMatchingNotePaths(typeRoot, filename)));
  }
  const catalogPath = await catalogNotePathFromOptions(vaultPath, type, id, options);
  if (catalogPath) discovered.unshift(catalogPath);
  return [...new Set(discovered.map((item) => path.resolve(item)))].sort((a, b) => a.localeCompare(b));
}

async function resolveNoteReadPath(vaultPath, type, id) {
  const catalogPath = await catalogNotePath(vaultPath, type, id);
  if (catalogPath) return catalogPath;

  const knownPaths = await resolveKnownNotePaths(vaultPath, type, id);
  if (knownPaths.length === 1) return knownPaths[0];
  if (knownPaths.length > 1) {
    const error = new Error(`Multiple ${type} note files found for ${id}`);
    error.code = "NOTE_PATH_AMBIGUOUS";
    error.paths = knownPaths;
    throw error;
  }
  return getNotePath(vaultPath, type, id);
}

export function serializeNote(type, note) {
  assertKnownType(type);
  const rendered = renderBodyWithTitle(type, note);
  return serializeMarkdownWithFrontmatter(noteFrontmatter(type, note), rendered.body);
}

export function parseNoteMarkdown(markdown) {
  const { frontmatter, body } = parseMarkdownWithFrontmatter(markdown);
  const extracted = splitTitleAndBody(body);
  const title = extracted.title || toSingleLineTitle(frontmatter.title);
  return {
    ...frontmatter,
    title,
    body: extracted.body,
    markdown_body: body
  };
}

export async function writeNoteIfAbsent(vaultPath, type, note, options = {}) {
  assertKnownType(type);
  if (options.skipInit !== true) await initVault(vaultPath);
  const filePath = resolveNoteWritePath(vaultPath, type, note?.id, options);
  const existingPaths = await resolveKnownNotePaths(vaultPath, type, note?.id, options);
  if (existingPaths.length > 0) {
    return { written: false, skipped: true, reason: "exists", path: existingPaths[0], noteId: note.id, noteType: type };
  }
  const content = serializeNote(type, note);
  const result = await writeMarkdownIfAbsent(filePath, content);
  if (result.written) rememberNotePath(options.notePathIndex, note?.id, result.path);
  return { ...result, noteId: note.id, noteType: type };
}

export async function readNote(vaultPath, type, id) {
  assertKnownType(type);
  const filePath = await resolveNoteReadPath(vaultPath, type, id);
  const markdown = await readMarkdown(filePath);
  return { path: filePath, note: parseNoteMarkdown(markdown), markdown };
}

export async function writeSourceIfAbsent(vaultPath, source, options = {}) {
  return writeNoteIfAbsent(vaultPath, "source", source, options);
}

export async function writeLiteratureNoteIfAbsent(vaultPath, note, options = {}) {
  return writeNoteIfAbsent(vaultPath, "literature", note, options);
}

export async function writePermanentNoteIfAbsent(vaultPath, note, options = {}) {
  return writeNoteIfAbsent(vaultPath, "permanent", note, options);
}
