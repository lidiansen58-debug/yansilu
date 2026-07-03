import path from "node:path";
import fs from "node:fs/promises";
import { applySqliteMigrations } from "./sqlite-migrations.mjs";
import { ensureDefaultDirectories, healDirectoryFsPathsForVault } from "./catalog-store.mjs";

export const VAULT_DIRS = [
  ".yansilu",
  "imports",
  "exports",
  "assets",
  path.join("notes", "fleeting"),
  path.join("notes", "sources"),
  path.join("notes", "literature"),
  path.join("notes", "permanent"),
  path.join("notes", "original")
];

export async function ensureVaultLayout(vaultPath) {
  if (!vaultPath) throw new Error("vaultPath is required");
  const root = path.resolve(vaultPath);
  for (const dir of VAULT_DIRS) {
    await fs.mkdir(path.join(root, dir), { recursive: true });
  }
  return { vaultPath: root, dirs: VAULT_DIRS.map((dir) => path.join(root, dir)) };
}

export async function initVault(vaultPath) {
  const layout = await ensureVaultLayout(vaultPath);
  const markerPath = path.join(layout.vaultPath, ".yansilu", "vault.json");
  try {
    await fs.access(markerPath);
  } catch {
    await fs.writeFile(
      markerPath,
      JSON.stringify({ version: 1, created_at: new Date().toISOString() }, null, 2),
      "utf8"
    );
  }

  // Try to prepare local SQLite schemas. If runtime lacks node:sqlite,
  // vault layout should still initialize so Markdown workflows remain usable.
  try {
    await applySqliteMigrations(layout.vaultPath);
  } catch (error) {
    if (!String(error?.message || "").includes("node:sqlite")) throw error;
  }
  try {
    await ensureDefaultDirectories(layout.vaultPath);
    await healDirectoryFsPathsForVault(layout.vaultPath);
  } catch (error) {
    if (!String(error?.message || "").includes("node:sqlite")) throw error;
  }

  return layout;
}

export function resolveVaultPath(vaultPath, relativePath) {
  if (!vaultPath) throw new Error("vaultPath is required");
  if (!relativePath) throw new Error("relativePath is required");
  const root = path.resolve(vaultPath);
  const candidate = path.resolve(root, relativePath);
  const rel = path.relative(root, candidate);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes vault: ${relativePath}`);
  }
  return candidate;
}

export async function writeMarkdownIfAbsent(filePath, content) {
  try {
    await fs.access(filePath);
    return { written: false, skipped: true, reason: "exists", path: filePath };
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, String(content ?? ""), "utf8");
    return { written: true, skipped: false, path: filePath };
  }
}

export async function readMarkdown(filePath) {
  return fs.readFile(filePath, "utf8");
}

export async function listMarkdownFiles(rootPath) {
  const root = path.resolve(rootPath);
  const stat = await fs.stat(root);
  if (stat.isFile()) return root.toLowerCase().endsWith(".md") ? [root] : [];

  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}
