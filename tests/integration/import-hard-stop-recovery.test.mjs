import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createImportRecordJournal } from "../../apps/api/src/import-record-journal.mjs";
import { publicImportRecord } from "../../packages/connectors/src/index.mjs";

for (const afterWrite of [false, true]) test(`hard-stopped import ${afterWrite ? "after uncheckpointed write" : "before second write"} reconciles actual files without replay`, { timeout: 20000 }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-import-hard-stop-"));
  const vault = path.join(root, "vault"), source = path.join(root, "source");
  await fs.mkdir(source);
  await fs.writeFile(path.join(source, "one.md"), "# First\n\nOriginal first body", "utf8");
  await fs.writeFile(path.join(source, "two.md"), "# Second\n\nOriginal second body", "utf8");
  const beforeSource = await fs.readFile(path.join(source, "one.md"));
  const script = `
    import { createImportExportService } from './apps/api/src/import-export-service.mjs';
    import { createImportRecordJournal } from './apps/api/src/import-record-journal.mjs';
    import * as domain from './packages/domain/src/index.mjs';
    const [vault, source] = process.argv.slice(1);
    let writes = 0, id;
    const wrap = fn => async (...args) => {
      if (++writes === 2) {
        if (${afterWrite}) await fn(...args);
        process.send({ id }); await new Promise(() => {});
      }
      return fn(...args);
    };
    const service = createImportExportService({ getVaultPath: () => vault, getCwd: () => process.cwd(),
      importRecords: new Map(), initVault: domain.initVault, recordJournal: createImportRecordJournal(),
      writeSourceIfAbsent: wrap(domain.writeSourceIfAbsent),
      writeLiteratureNoteIfAbsent: wrap(domain.writeLiteratureNoteIfAbsent),
      writePermanentNoteIfAbsent: wrap(domain.writePermanentNoteIfAbsent),
      registerImportCatalogNote: async () => {}, deleteNoteById: domain.deleteNoteById });
    const preview = await service.createPreview('obsidian', { path: source }, {}, 'preview');
    id = preview.importRecordId;
    await service.confirmImport(await service.getImportRecord(id), { confirm: true, overrideOriginality: true }, 'confirm');
  `;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script, vault, source], {
    cwd: path.resolve(import.meta.dirname, "../.."), stdio: ["ignore", "ignore", "pipe", "ipc"]
  });
  let logs = "";
  child.stderr.on("data", value => { logs += value; });
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { child.kill("SIGKILL"); await once(child, "exit"); } await fs.rm(root, { recursive: true, force: true }); });
  const message = await Promise.race([once(child, "message").then(([value]) => value), once(child, "exit").then(() => { throw new Error(logs); })]);
  const exit = once(child, "exit");
  child.kill("SIGKILL");
  await exit;
  const journal = createImportRecordJournal();
  const record = await journal.read(vault, message.id);
  assert.equal(record.state, "interrupted");
  assert.equal(record.recoveryResult.files.length, 1);
  assert.equal(record.recoveryResult.files[0].status, "verified");
  assert.ok(record.recoveryResult.pending.noteId);
  assert.equal(publicImportRecord(record).recoveryResult.files.length, 1);
  const file = path.join(vault, record.recoveryResult.files[0].relativePath);
  const before = await fs.readFile(file), stat = await fs.stat(file);
  await journal.list(vault);
  assert.deepEqual(await fs.readFile(file), before);
  assert.equal((await fs.stat(file)).mtimeMs, stat.mtimeMs);
  assert.deepEqual(await fs.readFile(path.join(source, "one.md")), beforeSource);
  await fs.appendFile(file, "\nExternal change", "utf8");
  assert.equal((await journal.read(vault, message.id)).recoveryResult.files[0].status, "changed");
  await fs.unlink(file);
  assert.equal((await journal.read(vault, message.id)).recoveryResult.files[0].status, "missing");
});
