import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { getNoteById } from "../../domain/src/index.mjs";
import { findVaultAssetLinks, rewriteVaultAssetLinks } from "../../domain/src/markdown-asset-links.mjs";

function exportError(message) {
  return Object.assign(new Error(message), { code: "ARTICLE_EXPORT_INVALID" });
}

function inside(parent, child) {
  const relative = path.relative(parent, child);
  return !relative || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

async function realTarget(target) {
  try { return await fs.realpath(target); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    const parent = path.dirname(target);
    if (parent === target) throw error;
    return path.join(await realTarget(parent), path.basename(target));
  }
}

export async function exportArticle({ vaultPath, targetPath, noteId = "", fileName, markdown }) {
  if (!path.isAbsolute(String(targetPath || ""))) throw exportError("请选择完整的导出目录路径。");
  if (typeof markdown !== "string" || !markdown.trim()) throw exportError("文章正文为空。");
  if (Buffer.byteLength(markdown, "utf8") > 2 * 1024 * 1024) throw exportError("文章超过 2 MB，请分段导出。");
  if (typeof fileName !== "string" || !fileName.endsWith(".md") || fileName.length > 210
    || /[<>:"/\\|?*\u0000-\u001f]/.test(fileName)
    || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(fileName)) {
    throw exportError("文章文件名无效。");
  }
  const vault = await fs.realpath(vaultPath);
  const target = await realTarget(path.resolve(targetPath));
  if (inside(vault, target)) throw exportError("导出目录必须在当前笔记库之外。");
  let sourcePath = "article.md";
  if (noteId) {
    const note = await getNoteById(vault, noteId);
    sourcePath = String(note.markdownPath || "").replaceAll("\\", "/");
    if (!sourcePath || !inside(path.join(vault, "notes"), path.resolve(vault, sourcePath))) throw exportError("草稿位置无效，请重开草稿后再试。");
  }
  const assetPaths = findVaultAssetLinks(markdown, sourcePath);
  if (assetPaths.length > 200) throw exportError("文章附件过多，请分段导出。");
  const assets = [];
  let assetBytes = 0;
  const assetRoot = path.join(vault, "assets");
  // Read and validate every attachment before creating the output bundle.
  for (const relative of assetPaths) {
    const lexical = path.resolve(vault, relative);
    if (!inside(assetRoot, lexical)) throw exportError(`附件路径超出笔记库：${relative}`);
    let real;
    try { real = await fs.realpath(lexical); }
    catch { throw exportError(`找不到附件：${relative}。请恢复该文件或删除无效图片引用后重试。`); }
    if (!inside(assetRoot, real)) throw exportError(`附件指向笔记库之外：${relative}`);
    const stat = await fs.stat(real);
    if (!stat.isFile()) throw exportError(`附件不是文件：${relative}`);
    assetBytes += stat.size;
    if (assetBytes > 50 * 1024 * 1024) throw exportError("文章附件超过 50 MB，请分段导出。");
    assets.push({ relative, content: await fs.readFile(real) });
  }
  const token = randomUUID();
  const stem = fileName.slice(0, -3);
  const bundleName = `${stem}-${token.slice(0, 8)}`;
  const bundlePath = path.join(target, bundleName);
  const stagingPath = path.join(target, `.article-${token}.partial`);
  let stagingCreated = false;
  try {
    await fs.mkdir(target, { recursive: true });
    if (inside(vault, await fs.realpath(target))) throw exportError("导出目录必须在当前笔记库之外。");
    await fs.mkdir(stagingPath);
    stagingCreated = true;
    const portableMarkdown = rewriteVaultAssetLinks(markdown, sourcePath, fileName);
    await fs.writeFile(path.join(stagingPath, fileName), portableMarkdown, { encoding: "utf8", flag: "wx" });
    for (const asset of assets) {
      const destination = path.join(stagingPath, asset.relative);
      if (!inside(stagingPath, destination)) throw exportError("导出附件位置无效。");
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, asset.content, { flag: "wx" });
    }
    await fs.rename(stagingPath, bundlePath);
    stagingCreated = false;
    return { status: "completed", targetPath: bundlePath, articlePath: path.join(bundlePath, fileName), fileName, assetCount: assets.length, bytes: Buffer.byteLength(portableMarkdown, "utf8") };
  } finally {
    if (stagingCreated && path.dirname(stagingPath) === target) await fs.rm(stagingPath, { recursive: true, force: true });
  }
}
