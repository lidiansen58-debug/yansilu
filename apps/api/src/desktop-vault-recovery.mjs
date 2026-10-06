import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function createDesktopVaultRecovery(filename = "") {
  const recoveryPath = String(filename || "").trim();
  if (recoveryPath && !path.isAbsolute(recoveryPath)) throw new Error("Desktop Vault recovery path must be absolute.");
  return {
    recoveryPath,
    commit(vaultPath) {
      if (!recoveryPath) return;
      const temporary = `${recoveryPath}.${randomUUID()}.tmp`;
      let descriptor;
      try {
        fs.mkdirSync(path.dirname(recoveryPath), { recursive: true });
        descriptor = fs.openSync(temporary, "wx");
        fs.writeFileSync(descriptor, JSON.stringify({ app: "yansilu", version: 1, vaultPath: path.resolve(vaultPath) }), "utf8");
        fs.fsyncSync(descriptor);
        fs.closeSync(descriptor);
        descriptor = undefined;
        fs.renameSync(temporary, recoveryPath);
      } finally {
        if (descriptor !== undefined) fs.closeSync(descriptor);
        try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== "ENOENT") throw error; }
      }
    }
  };
}
