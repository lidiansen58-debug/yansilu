import fs from "node:fs/promises";
import path from "node:path";
import { parseMarkdownWithFrontmatter, serializeMarkdownWithFrontmatter } from "./frontmatter.mjs";
import { initVault, readMarkdown, resolveVaultPath, writeMarkdownIfAbsent } from "./vault.mjs";

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

async function findNotePathInDirectory(rootDir, filename) {
  let entries = [];
  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isFile() && entry.name === filename) return fullPath;
    if (entry.isDirectory()) {
      const nested = await findNotePathInDirectory(fullPath, filename);
      if (nested) return nested;
    }
  }
  return null;
}

async function resolveNoteReadPath(vaultPath, type, id) {
  const canonicalPath = getNotePath(vaultPath, type, id);
  try {
    await fs.access(canonicalPath);
    return canonicalPath;
  } catch {
    const typeRoot = resolveVaultPath(vaultPath, NOTE_TYPES[type].dir);
    return (await findNotePathInDirectory(typeRoot, noteFilename(id))) || canonicalPath;
  }
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
  await initVault(vaultPath);
  const filePath = resolveNoteWritePath(vaultPath, type, note?.id, options);
  const content = serializeNote(type, note);
  const result = await writeMarkdownIfAbsent(filePath, content);
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
