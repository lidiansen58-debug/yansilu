import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

export function createImportWriteProgress(record, journal) {
  const persist = () => journal?.write(record);
  return {
    async begin(noteId, noteType) {
      record.writeProgress ||= { files: [], skipped: [] };
      record.writeProgress.pending = { noteId, noteType };
      await persist();
    },
    async finish(result, noteId, noteType) {
      if (result.written) {
        const relativePath = path.relative(record.targetVaultPath, result.path);
        if (path.isAbsolute(relativePath) || relativePath === ".." || relativePath.startsWith(`..${path.sep}`)) throw new Error("Import write escaped its vault");
        const hash = createHash("sha256").update(await fs.readFile(result.path)).digest("hex");
        record.writeProgress.files.push({ noteId, noteType, relativePath, hash });
      } else record.writeProgress.skipped.push({ noteId, noteType });
      record.writeProgress.pending = null;
      await persist();
    }
  };
}

export async function inspectInterruptedImport(record) {
  const files = [];
  if (record.writeProgress && (!Array.isArray(record.writeProgress.files) || !Array.isArray(record.writeProgress.skipped))) throw new Error("Invalid import checkpoint");
  for (const entry of record.writeProgress?.files || []) {
    const relativePath = entry?.relativePath;
    if (typeof relativePath !== "string" || !relativePath || path.isAbsolute(relativePath)
      || typeof entry.hash !== "string" || !/^[a-f0-9]{64}$/.test(entry.hash)) throw new Error("Invalid import recovery path");
    const target = path.resolve(record.targetVaultPath, relativePath);
    const relative = path.relative(record.targetVaultPath, target);
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("Invalid import recovery path");
    let status;
    try {
      const realVault = await fs.realpath(record.targetVaultPath), realTarget = await fs.realpath(target);
      const actualRelative = path.relative(realVault, realTarget);
      if (actualRelative === ".." || actualRelative.startsWith(`..${path.sep}`) || path.isAbsolute(actualRelative)) throw new Error("Import recovery path escaped its vault");
      const hash = createHash("sha256").update(await fs.readFile(realTarget)).digest("hex");
      status = hash === entry.hash ? "verified" : "changed";
    } catch (error) { if (error.code !== "ENOENT") throw error; status = "missing"; }
    files.push({ ...entry, status });
  }
  return { files, pending: record.writeProgress?.pending || null,
    skipped: record.writeProgress?.skipped || [], checkpointAvailable: Boolean(record.writeProgress) };
}
