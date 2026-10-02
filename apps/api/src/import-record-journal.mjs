import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { inspectInterruptedImport } from "./import-write-progress.mjs";

const invalid = () => Object.assign(new Error("导入恢复记录无法读取，请核对本地笔记库。"), { code: "IMPORT_JOURNAL_INVALID" });
const validId = id => typeof id === "string" && /^imp_[a-zA-Z0-9_-]+$/.test(id) && id.length <= 100;

export function createImportRecordJournal() {
  const directory = vault => path.join(vault, ".yansilu", "import-records");
  const filename = (vault, id) => {
    if (!validId(id)) throw invalid();
    return path.join(directory(vault), `${id}.json`);
  };
  return {
    async write(record) {
      const target = filename(record.targetVaultPath, record.importRecordId);
      await fs.mkdir(path.dirname(target), { recursive: true });
      const temporary = `${target}.${randomUUID()}.tmp`;
      try {
        await fs.writeFile(temporary, JSON.stringify(record), { encoding: "utf8", flag: "wx" });
        await fs.rename(temporary, target);
      } finally { await fs.rm(temporary, { force: true }); }
    },
    async read(vault, id) {
      let record;
      try { record = JSON.parse(await fs.readFile(filename(vault, id), "utf8")); }
      catch (error) { if (error.code === "ENOENT") return null; throw invalid(); }
      if (record?.importRecordId !== id || record.targetVaultPath !== vault
        || !["preview", "confirming", "completed", "failed", "cancelled"].includes(record.state)) throw invalid();
      // A previous process cannot still own this operation.
      if (record.state === "confirming") {
        let recoveryResult;
        try { recoveryResult = await inspectInterruptedImport(record); } catch { throw invalid(); }
        return { ...record, state: "interrupted", recoveryResult,
          recoveryMessage: "服务曾在导入期间停止，已核对有检查点的文件；未确认项不会自动重复执行。" };
      }
      return record;
    },
    async list(vault) {
      let names;
      try { names = await fs.readdir(directory(vault)); }
      catch (error) { if (error.code === "ENOENT") return []; throw error; }
      const records = [];
      for (const name of names.filter(name => name.endsWith(".json"))) {
        const record = await this.read(vault, name.slice(0, -5));
        if (record) records.push(record);
      }
      return records;
    }
  };
}
