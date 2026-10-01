import path from "node:path";
import { getNoteById } from "../../domain/src/index.mjs";
import { getWritingProject } from "../../writing-engine/src/writing-engine.mjs";
import { rewriteVaultAssetLinks } from "../../domain/src/markdown-asset-links.mjs";
import { exportArticle } from "./article-export.mjs";

function invalid(message) {
  return Object.assign(new Error(message), { code: "BOOK_EXPORT_INVALID" });
}

function heading(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function bookFileName(title) {
  const base = Array.from(title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")).slice(0, 100).join("").replace(/[. ]+$/g, "") || "书稿";
  return `${/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(base) ? `_${base}` : base}.md`;
}

export async function buildBookExport({ vaultPath, projectId, expectedBookStructure }) {
  if (!projectId || !expectedBookStructure || typeof expectedBookStructure !== "object") throw invalid("请重新打开书稿后导出。");
  const project = await getWritingProject(vaultPath, projectId);
  if (JSON.stringify(project.book_structure) !== JSON.stringify(expectedBookStructure)) throw invalid("章节目录已变化，请重新打开主题后导出。");
  const parts = project.book_structure.parts || [];
  const chapters = parts.flatMap(part => part.chapters || []);
  if (!chapters.length) throw invalid("书稿还没有章节，请先新增章节并保存正文。");
  if (chapters.length > 200) throw invalid("书稿超过 200 章，请分卷导出。");
  const missing = chapters.filter(chapter => !chapter.draft_note_id);
  if (missing.length) throw invalid(`以下章节尚未保存正文：${missing.map(chapter => chapter.title).join("、")}。请保存后再导出。`);
  if (new Set(chapters.map(chapter => chapter.id)).size !== chapters.length
    || new Set(chapters.map(chapter => chapter.draft_note_id)).size !== chapters.length) throw invalid("章节或正文绑定重复，请检查目录。");
  const title = heading(project.title) || "未命名书稿";
  const fileName = bookFileName(title);
  const output = [`# ${title}\n`];
  const sourceCache = new Map();
  let bodyBytes = 0;
  for (const part of parts) {
    if (!part.chapters?.length) continue;
    output.push(`## ${heading(part.title || part.label) || "章节"}\n`);
    for (const chapter of part.chapters) {
      let note;
      try { note = await getNoteById(vaultPath, chapter.draft_note_id); }
      catch (error) { throw invalid(`无法读取“${chapter.title}”正文：${String(error?.message || error)}`); }
      if (note.noteType !== "permanent" || !String(note.body || "").trim()) throw invalid(`“${chapter.title}”没有可导出的已保存正文。`);
      const sourcePath = String(note.markdownPath || "").replaceAll("\\", "/");
      const relative = path.relative(path.resolve(vaultPath, "notes"), path.resolve(vaultPath, sourcePath));
      if (!sourcePath || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw invalid(`“${chapter.title}”正文路径无效。`);
      bodyBytes += Buffer.byteLength(note.body, "utf8");
      if (bodyBytes > 2 * 1024 * 1024) throw invalid("书稿正文超过 2 MB，请分卷导出。");
      // Only omit the exact generated leading title; user prose and internal headings stay intact.
      const lines = note.body.replace(/\r\n?/g, "\n").split("\n");
      if (lines[0]?.match(/^ {0,3}#\s+(.+)$/)?.[1]?.trim() === chapter.title) lines.shift();
      while (lines.length && !lines[0].trim()) lines.shift();
      if (!lines.join("\n").trim()) throw invalid(`“${chapter.title}”仅有标题，请先写入正文并保存。`);
      const body = rewriteVaultAssetLinks(lines.join("\n"), sourcePath, fileName);
      output.push(`### ${heading(chapter.title)}\n\n${body}\n`);
      const sourceIds = [...new Set([...(chapter.evidence_note_ids || []), ...(chapter.sections || []).flatMap(section => section.evidence_note_ids || [])])];
      const titles = [];
      for (const id of sourceIds) {
        if (!sourceCache.has(id)) {
          try { sourceCache.set(id, await getNoteById(vaultPath, id)); }
          catch (error) { throw invalid(`“${chapter.title}”参考笔记无法读取：${String(error?.message || error)}`); }
        }
        const link = `[[${sourceCache.get(id).title}]]`;
        if (!body.includes(link)) titles.push(link);
      }
      if (titles.length) output.push(`参考笔记：${titles.join("、")}\n`);
    }
  }
  return { markdown: `${output.join("\n")}\n`, fileName, chapterCount: chapters.length, sourceCount: sourceCache.size };
}

export async function exportBook(input) {
  const output = await buildBookExport(input);
  const result = await exportArticle({ vaultPath: input.vaultPath, targetPath: input.targetPath, fileName: output.fileName, markdown: output.markdown });
  return { ...result, bookPath: result.articlePath, chapterCount: output.chapterCount, sourceCount: output.sourceCount, projectId: input.projectId };
}
