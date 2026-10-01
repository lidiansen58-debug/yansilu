import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const validId = id => typeof id === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(id);
const failure = () => Object.assign(new Error("无法读取保存记录，请核对笔记库后再试。"), { code: "NOTE_SAVE_JOURNAL_INVALID" });

export function createNoteSaveJournal() {
  const location = (id, vaultPath) => {
    if (!validId(id)) throw failure();
    return path.join(vaultPath, ".yansilu", "save-operations", `${id}.json`);
  };
  return {
    read(id, vaultPath) {
      const filename = location(id, vaultPath);
      let record;
      try { record = JSON.parse(fs.readFileSync(filename, "utf8")); }
      catch (error) { if (error.code === "ENOENT") return null; throw failure(); }
      if (record.operationId !== id || record.vaultPath !== vaultPath || typeof record.noteId !== "string"
        || !["pending", "completed", "failed"].includes(record.state)
        || (record.state !== "pending" && !Number.isFinite(record.finishedAt))
        || (record.state === "completed" && typeof record.fileRevision !== "string")) throw failure();
      return record;
    },
    write(id, record) {
      const filename = location(id, record.vaultPath);
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      const temporary = `${filename}.${randomUUID()}.tmp`;
      try {
        fs.writeFileSync(temporary, JSON.stringify({ ...record, operationId: id }), { encoding: "utf8", flag: "wx" });
        fs.renameSync(temporary, filename);
      } finally {
        try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== "ENOENT") throw error; }
      }
    }
  };
}
