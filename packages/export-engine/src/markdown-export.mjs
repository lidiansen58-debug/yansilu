import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { listMarkdownFiles } from "../../domain/src/index.mjs";

export async function exportMarkdown({ vaultPath, targetPath, requestId = null, now = new Date() }) {
  if (!vaultPath) throw new Error("vaultPath is required");
  if (!targetPath) throw new Error("targetPath is required");

  const sourceRoot = path.join(vaultPath, "notes");
  const files = await listMarkdownFiles(sourceRoot).catch(() => []);
  const exportJobId = `exp_${Date.now()}_${randomUUID().slice(0, 8)}`;

  await fs.mkdir(targetPath, { recursive: true });
  for (const src of files) {
    const rel = path.relative(sourceRoot, src);
    const dest = path.join(targetPath, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  }

  const record = {
    exportJobId,
    copied: files.length,
    targetPath,
    requestId,
    time: now.toISOString()
  };

  const exportDir = path.join(vaultPath, "exports");
  await fs.mkdir(exportDir, { recursive: true });
  const recordPath = path.join(exportDir, `${exportJobId}.json`);
  await fs.writeFile(recordPath, JSON.stringify(record, null, 2), "utf8");

  return {
    exportJobId,
    status: "queued",
    copied: files.length,
    recordPath,
    record
  };
}
